const ALLOWED_ORIGINS = [
  'https://transobras.suporte04.workers.dev',
  'https://industrialflow-crm.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : null;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    ...SECURITY_HEADERS,
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

function json(data, status = 200, corsHeaders = null) {
  const h = corsHeaders || getCorsHeaders({ headers: new Headers() });
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...h, 'Content-Type': 'application/json' },
  });
}

function isValidId(id) {
  return id && /^[a-zA-Z0-9_-]{1,128}$/.test(id) && !id.includes('/');
}

function sanitizeEdgeFuncName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

async function parseBody(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    return { error: 'Content-Type must be application/json' };
  }
  try {
    const body = await request.json();
    return { data: body };
  } catch {
    return { error: 'Invalid JSON body' };
  }
}

async function supabaseRequest(env, method, path, body = null, authHeader = null) {
  const url = `${env.SUPABASE_URL}/rest/v1${path}`;
  const headers = {
    'apikey': env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
  if (authHeader) headers['Authorization'] = authHeader;
  const opts = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function handleApiRoute(path, method, request, env, corsHeaders) {
  const authHeader = request.headers.get('Authorization');

  if (path === '/api/health') {
    return json({ status: 'ok', timestamp: new Date().toISOString() }, 200, corsHeaders);
  }

  if (path === '/api/config' && method === 'GET') {
    return json({
      emailRecipient: env.EMAIL_RECIPIENT || 'gestores@transobra.com.br',
      emailFrom: env.EMAIL_FROM || 'TransObra <onboarding@resend.dev>',
      resendConfigured: !!env.RESEND_API_KEY,
    }, 200, corsHeaders);
  }

  if (path === '/api/dashboard' && method === 'GET') {
    return handleDashboard(env, corsHeaders);
  }

  if (path.startsWith('/api/ordens')) {
    return handleCrud(path, method, request, env, authHeader, corsHeaders, 'ordens_servico', 'ordens');
  }

  if (path.startsWith('/api/equipamentos')) {
    return handleCrud(path, method, request, env, authHeader, corsHeaders, 'equipamentos', 'equipamentos');
  }

  if (path.startsWith('/api/contratos')) {
    return handleCrud(path, method, request, env, authHeader, corsHeaders, 'contratos', 'contratos');
  }

  if (path.startsWith('/api/comprovantes')) {
    return handleCrud(path, method, request, env, authHeader, corsHeaders, 'comprovantes_entrega', 'comprovantes');
  }

  if (path.startsWith('/api/notas')) {
    return handleCrud(path, method, request, env, authHeader, corsHeaders, 'notas', 'notas');
  }

  if (path.startsWith('/api/assinaturas') && method === 'POST') {
    return handleAssinaturaCreate(request, env, authHeader, corsHeaders);
  }

  if (path === '/api/email/send' && method === 'POST') {
    return handleEmailSend(request, env, corsHeaders);
  }

  if (path.startsWith('/api/edge/')) {
    return handleEdgeProxy(path, method, request, env, corsHeaders);
  }

  return json({ error: 'API route not found' }, 404, corsHeaders);
}

async function handleDashboard(env, corsHeaders) {
  try {
    const [os, eq, ct] = await Promise.all([
      supabaseRequest(env, 'GET', '/ordens_servico?select=*&limit=500'),
      supabaseRequest(env, 'GET', '/equipamentos?select=*&limit=200'),
      supabaseRequest(env, 'GET', '/contratos?select=*&limit=200'),
    ]);
    const osData = Array.isArray(os.data) ? os.data : [];
    const eqData = Array.isArray(eq.data) ? eq.data : [];
    const ctData = Array.isArray(ct.data) ? ct.data : [];
    return json({
      metricas: {
        totalOS: osData.length,
        osAbertas: osData.filter(o => o.status === 'pendente' || o.status === 'em_andamento').length,
        osConcluidas: osData.filter(o => o.status === 'concluido').length,
        equipamentosLocados: eqData.filter(e => e.status === 'locado').length,
        equipamentosDisponiveis: eqData.filter(e => e.status === 'disponivel').length,
        equipamentosManutencao: eqData.filter(e => e.status === 'manutencao').length,
        contratosAtivos: ctData.filter(c => c.status === 'ativo').length,
        contratosVencendo: ctData.filter(c => c.status === 'vencendo').length,
        contratosVencidos: ctData.filter(c => c.status === 'vencido').length,
        receitaMensal: ctData.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.valor_mensal || 0), 0),
      },
      recentOS: osData.slice(0, 5),
      alertasContratos: ctData.filter(c => c.status === 'vencendo' || c.status === 'vencido' || !c.assinado),
    }, 200, corsHeaders);
  } catch {
    return json({ error: 'Failed to fetch dashboard' }, 500, corsHeaders);
  }
}

async function handleCrud(path, method, request, env, authHeader, corsHeaders, table, routePrefix) {
  const segments = path.split('/');
  const id = segments[segments.length - 1];

  if (method === 'POST') {
    const parsed = await parseBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
    const result = await supabaseRequest(env, 'POST', `/${table}`, parsed.data, authHeader);
    return json(result.data, result.status, corsHeaders);
  }

  if (method === 'PUT' && id && id !== routePrefix && isValidId(id)) {
    const parsed = await parseBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
    const result = await supabaseRequest(env, 'PATCH', `/${table}?id=eq.${id}`, parsed.data, authHeader);
    return json(result.data, result.status, corsHeaders);
  }

  if (method === 'DELETE' && id && id !== routePrefix && isValidId(id)) {
    const result = await supabaseRequest(env, 'DELETE', `/${table}?id=eq.${id}`, null, authHeader);
    return json({ success: true }, result.status, corsHeaders);
  }

  const result = await supabaseRequest(env, 'GET', `/${table}?select=*&order=created_at.desc&limit=200`);
  return json(result.data, result.status, corsHeaders);
}

async function handleAssinaturaCreate(request, env, authHeader, corsHeaders) {
  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
  const result = await supabaseRequest(env, 'POST', '/assinaturas', parsed.data, authHeader);
  return json(result.data, result.status, corsHeaders);
}

async function handleEmailSend(request, env, corsHeaders) {
  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { tipo, contrato_id, comprovante_id, destinatario: reqDest, contrato, comprovante, signatario } = parsed.data;
  const emailTipo = tipo || 'contrato_assinado';

  let recipients = [];
  if (reqDest) {
    recipients = [reqDest];
  } else {
    try {
      const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`;
      const profilesResult = await supabaseRequest(env, 'GET', '/profiles?role=eq.gestor&select=email', null, serviceAuth);
      if (profilesResult.data && Array.isArray(profilesResult.data) && profilesResult.data.length > 0) {
        recipients = profilesResult.data.map((p) => p.email).filter(Boolean);
      }
    } catch { /* fallback below */ }
    if (recipients.length === 0) {
      recipients = [env.EMAIL_RECIPIENT || 'suporte04@baeletrica.com.br'];
    }
  }

  let lastStatus = 'pendente';
  let lastError = null;
  let sentCount = 0;

  for (const recipient of recipients) {
    try {
      const edgeRes = await fetch(`${env.SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tipo: emailTipo, contrato, comprovante, signatario, destinatario: recipient }),
      });
      const edgeData = await edgeRes.json();
      if (edgeRes.ok && edgeData.success && !edgeData.skipped) {
        sentCount++;
        lastStatus = 'enviado';
      } else if (edgeData.skipped) {
        lastStatus = 'skipped';
      } else {
        lastError = edgeData.error ? JSON.stringify(edgeData.error) : 'Edge function failed';
        lastStatus = 'erro';
      }
    } catch (e) {
      lastError = e.message;
      lastStatus = 'erro';
    }
  }

  const emailStatus = sentCount > 0 ? 'enviado' : lastStatus;
  const erroMsg = sentCount > 0 ? null : lastError;
  const assunto = emailTipo === 'contrato_criado'
    ? `Novo Contrato ${contrato?.numero || contrato?.id || ''} - ${contrato?.cliente || ''}`
    : `Contrato ${contrato?.numero || contrato?.id || comprovante?.contrato || ''} assinado`;

  try {
    const logSignatario = signatario ? { nome: signatario.nome, cpf: signatario.cpf, data: signatario.data } : null;
    await supabaseRequest(env, 'POST', '/email_logs', {
      contrato_id: contrato_id || null,
      comprovante_id: comprovante_id || null,
      destinatario: recipients.join(', '),
      assunto,
      corpo: JSON.stringify({ tipo: emailTipo, contrato, comprovante, signatario: logSignatario }),
      status: emailStatus,
      erro_msg: erroMsg,
    });
  } catch { /* email logging is best-effort */ }

  return json({ success: emailStatus === 'enviado' || emailStatus === 'skipped', status: emailStatus, sentTo: sentCount }, emailStatus === 'erro' ? 500 : 200, corsHeaders);
}

async function handleEdgeProxy(path, method, request, env, corsHeaders) {
  const rawName = path.replace('/api/edge/', '');
  const funcName = sanitizeEdgeFuncName(rawName);
  if (!funcName) return json({ error: 'Invalid function name' }, 400, corsHeaders);

  let body = null;
  if (method === 'POST') {
    const parsed = await parseBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
    body = parsed.data;
  }

  try {
    const edgeUrl = `${env.SUPABASE_URL}/functions/v1/${funcName}`;
    const edgeRes = await fetch(edgeUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await edgeRes.text();
    let edgeData;
    try { edgeData = JSON.parse(text); } catch { edgeData = { raw: text }; }
    return json(edgeData, edgeRes.status, corsHeaders);
  } catch {
    return json({ error: 'Edge function call failed' }, 502, corsHeaders);
  }
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path.startsWith('/api/')) {
      return handleApiRoute(path, method, request, env, corsHeaders);
    }

    return env.ASSETS.fetch(request);
  },
};
