const ALLOWED_ORIGINS = [
  'https://transobras.suporte04.workers.dev',
  'https://industrialflow-crm.pages.dev',
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const MAX_BODY_SIZE = 1024 * 1024;

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : null;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
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
  return id && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

async function parseBody(request) {
  const cl = request.headers.get('Content-Length');
  if (cl && parseInt(cl) > MAX_BODY_SIZE) {
    return { error: 'Request body too large' };
  }
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

async function verifyJwt(token, env) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (!payload.sub) return null;

    const verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': env.SUPABASE_ANON_KEY,
      },
    });

    if (!verifyRes.ok) return null;

    const userData = await verifyRes.json();
    if (!userData || !userData.id) return null;

    return { sub: userData.id, role: payload.role };
  } catch {
    return null;
  }
}

async function getAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  const payload = await verifyJwt(token, env);
  if (!payload || !payload.sub) return null;

  const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;
  const result = await supabaseRequest(env, 'GET', `/profiles?id=eq.${payload.sub}&select=role`, null, serviceAuth);

  const role = (Array.isArray(result.data) && result.data.length > 0) ? result.data[0].role : null;
  return { userId: payload.sub, role };
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

async function handleApiRoute(path, method, request, env, corsHeaders) {
  if (path === '/api/health') {
    return json({ status: 'ok', timestamp: new Date().toISOString() }, 200, corsHeaders);
  }

  if (path === '/api/config' && method === 'GET') {
    return json({
      emailRecipient: env.EMAIL_RECIPIENT || 'gestores@transobra.com.br',
      emailFrom: env.EMAIL_FROM || 'TransObra <onboarding@resend.dev>',
    }, 200, corsHeaders);
  }

  if (path === '/api/profiles' && method === 'POST') {
    return handleProfileFetch(request, env, corsHeaders);
  }

  if (path.startsWith('/api/profiles')) {
    const authHeader = request.headers.get('Authorization');
    return handleCrud(path, method, request, env, authHeader, corsHeaders, 'profiles', 'profiles');
  }

  const authHeader = request.headers.get('Authorization');

  if (path === '/api/dashboard' && method === 'GET') {
    return handleDashboard(env, corsHeaders, authHeader);
  }

  if (path === '/api/users/create' && method === 'POST') {
    return handleUserCreate(request, env, corsHeaders, authHeader);
  }

  if (path === '/api/users/delete' && method === 'POST') {
    return handleUserDelete(request, env, corsHeaders, authHeader);
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
    return handleEmailSend(request, env, corsHeaders, authHeader);
  }

  if (path === '/api/ai/extract-pdf' && method === 'POST') {
    return handleAiExtractPdf(request, env, corsHeaders, authHeader);
  }

  return json({ error: 'API route not found' }, 404, corsHeaders);
}

async function handleDashboard(env, corsHeaders, authHeader) {
  const auth = await getAuth({ headers: { get: () => authHeader } }, env);
  if (!auth) return json({ error: 'Unauthorized' }, 401, corsHeaders);

  try {
    const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;
    const [os, eq, ct] = await Promise.all([
      supabaseRequest(env, 'GET', '/ordens_servico?select=id,status,created_at,cliente,equipamento,valor,prioridade&order=created_at.desc&limit=200', null, serviceAuth),
      supabaseRequest(env, 'GET', '/equipamentos?select=id,status&limit=200', null, serviceAuth),
      supabaseRequest(env, 'GET', '/contratos?select=id,numero,cliente,status,valor_mensal,assinado,fim&limit=200', null, serviceAuth),
    ]);
    const osData = Array.isArray(os.data) ? os.data : [];
    const eqData = Array.isArray(eq.data) ? eq.data : [];
    const ctData = Array.isArray(ct.data) ? ct.data : [];
    const hoje = new Date();
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const receitaMes = mesesNomes.map((_, i) => {
      return ctData.filter(c => {
        if (c.status !== 'ativo') return false;
        const inicio = new Date(c.inicio || c.data_contrato || c.data || hoje);
        const fim = new Date(c.fim || hoje);
        const mesInicio = inicio.getFullYear() * 12 + inicio.getMonth();
        const mesFim = fim.getFullYear() * 12 + fim.getMonth();
        const mesAtual = hoje.getFullYear() * 12 + i;
        return mesInicio <= mesAtual && mesFim >= mesAtual;
      }).reduce((s, c) => s + (c.valor_mensal || 0), 0);
    });
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
        receitaMes,
        meses: mesesNomes,
      },
      recentOS: osData.slice(0, 5),
      alertasContratos: ctData
        .filter(c => c.status === 'vencendo' || c.status === 'vencido' || !c.assinado)
        .map(c => ({
          ...c,
          vencimentoDias: c.fim ? Math.ceil((new Date(c.fim) - hoje) / (1000 * 60 * 60 * 24)) : null,
        })),
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

  if (method === 'GET' && id && id !== routePrefix && isValidId(id)) {
    const result = await supabaseRequest(env, 'GET', `/${table}?id=eq.${encodeURIComponent(id)}&select=*`);
    return json(result.data, result.status, corsHeaders);
  }

  if (method === 'PUT' && id && id !== routePrefix && isValidId(id)) {
    const parsed = await parseBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
    const result = await supabaseRequest(env, 'PATCH', `/${table}?id=eq.${encodeURIComponent(id)}`, parsed.data, authHeader);
    return json(result.data, result.status, corsHeaders);
  }

  if (method === 'DELETE' && id && id !== routePrefix && isValidId(id)) {
    const result = await supabaseRequest(env, 'DELETE', `/${table}?id=eq.${encodeURIComponent(id)}`, null, authHeader);
    const success = result.status >= 200 && result.status < 300;
    return json({ success, data: result.data }, result.status, corsHeaders);
  }

  const result = await supabaseRequest(env, 'GET', `/${table}?select=*&order=created_at.desc&limit=100`);
  return json(result.data, result.status, corsHeaders);
}

async function handleAssinaturaCreate(request, env, authHeader, corsHeaders) {
  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
  const result = await supabaseRequest(env, 'POST', '/assinaturas', parsed.data, authHeader);
  return json(result.data, result.status, corsHeaders);
}

async function handleProfileFetch(request, env, corsHeaders) {
  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { jwt } = parsed.data;
  if (!jwt) return json({ error: 'JWT token required' }, 400, corsHeaders);

  const payload = await verifyJwt(jwt, env);
  if (!payload || !payload.sub) return json({ error: 'Invalid or expired token' }, 401, corsHeaders);

  const userId = payload.sub;
  const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`;
  const result = await supabaseRequest(env, 'GET', `/profiles?id=eq.${userId}&select=*`, null, serviceAuth);

  if (result.status >= 200 && result.status < 300 && Array.isArray(result.data) && result.data.length > 0) {
    return json({ user: result.data[0] }, 200, corsHeaders);
  }

  return json({ error: 'Profile not found' }, 404, corsHeaders);
}

async function handleUserCreate(request, env, corsHeaders, authHeader) {
  const auth = await getAuth({ headers: { get: () => authHeader } }, env);
  if (!auth || auth.role !== 'admin') {
    return json({ error: 'Unauthorized - admin only' }, 403, corsHeaders);
  }

  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { email, password, full_name, role } = parsed.data;
  if (!email || !password || !full_name) {
    return json({ error: 'email, password, and full_name are required' }, 400, corsHeaders);
  }

  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
    return json({ error: 'Invalid email format' }, 400, corsHeaders);
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return json({ error: 'Password must be 6-128 characters' }, 400, corsHeaders);
  }
  if (typeof full_name !== 'string' || full_name.length < 2 || full_name.length > 200) {
    return json({ error: 'Name must be 2-200 characters' }, 400, corsHeaders);
  }

  const allowedRoles = ['funcionario', 'gestor', 'admin'];
  const userRole = allowedRoles.includes(role) ? role : 'funcionario';

  const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;

  const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': serviceAuth,
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: userRole },
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    return json({ error: 'Failed to create user' }, 400, corsHeaders);
  }

  const userId = createData.id;
  const profileResult = await supabaseRequest(env, 'POST', '/profiles', {
    id: userId,
    full_name,
    email,
    role: userRole,
  }, serviceAuth);

  if (profileResult.status >= 300) {
    console.error('Profile insert failed for user:', userId);
  }

  return json({ user: { id: userId, email, full_name, role: userRole } }, 200, corsHeaders);
}

async function handleUserDelete(request, env, corsHeaders, authHeader) {
  const auth = await getAuth({ headers: { get: () => authHeader } }, env);
  if (!auth || auth.role !== 'admin') {
    return json({ error: 'Unauthorized - admin only' }, 403, corsHeaders);
  }

  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { user_id } = parsed.data;
  if (!user_id || typeof user_id !== 'string' || !isValidId(user_id)) {
    return json({ error: 'Invalid user_id' }, 400, corsHeaders);
  }

  if (user_id === auth.userId) {
    return json({ error: 'Cannot delete your own account' }, 400, corsHeaders);
  }

  const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;

  await supabaseRequest(env, 'DELETE', `/profiles?id=eq.${user_id}`, null, serviceAuth);

  const deleteRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': serviceAuth,
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_ANON_KEY,
    },
  });

  if (!deleteRes.ok) {
    return json({ error: 'Failed to delete user' }, 400, corsHeaders);
  }

  return json({ success: true }, 200, corsHeaders);
}

async function handleEmailSend(request, env, corsHeaders, authHeader) {
  const auth = await getAuth({ headers: { get: () => authHeader } }, env);
  if (!auth) return json({ error: 'Unauthorized' }, 401, corsHeaders);

  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { tipo, contrato_id, comprovante_id, destinatario: reqDest, contrato, comprovante, signatario, devolucao } = parsed.data;
  const emailTipo = tipo || 'contrato_assinado';

  let recipients = [];
  if (reqDest && typeof reqDest === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqDest)) {
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

  const edgeFunctionUrl = `${env.SUPABASE_URL}/functions/v1/send-email`;
  const edgeAuth = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  let lastStatus = 'pendente';
  let lastError = null;
  let sentCount = 0;

  for (const recipient of recipients) {
    try {
      const edgeRes = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${edgeAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tipo: emailTipo, contrato, comprovante, signatario, devolucao, destinatario: recipient }),
      });
      const edgeData = await edgeRes.json();
      if (edgeRes.ok && edgeData.success && !edgeData.skipped) {
        sentCount++;
        lastStatus = 'enviado';
      } else if (edgeData.skipped) {
        lastStatus = 'skipped';
      } else {
        lastError = edgeData.error || 'Edge function failed';
        lastStatus = 'erro';
      }
    } catch {
      lastError = 'Email delivery failed';
      lastStatus = 'erro';
    }
  }

  const emailStatus = sentCount > 0 ? 'enviado' : lastStatus;

  try {
    const logSignatario = signatario ? { nome: signatario.nome, cpf: signatario.cpf, data: signatario.data } : null;
    await supabaseRequest(env, 'POST', '/email_logs', {
      contrato_id: contrato_id || null,
      comprovante_id: comprovante_id || null,
      destinatario: recipients.join(', '),
      assunto: `Email - ${emailTipo}`,
      corpo: JSON.stringify({ tipo: emailTipo }),
      status: emailStatus,
      erro_msg: sentCount > 0 ? null : lastError,
    });
  } catch { /* email logging is best-effort */ }

  return json({ success: emailStatus === 'enviado', status: emailStatus, sentTo: sentCount, error: lastError || null }, emailStatus === 'erro' ? 500 : 200, corsHeaders);
}

async function handleAiExtractPdf(request, env, corsHeaders, authHeader) {
  const auth = await getAuth({ headers: { get: () => authHeader } }, env);
  if (!auth) return json({ error: 'Unauthorized' }, 401, corsHeaders);

  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { text, tipo_documento } = parsed.data;
  if (!text || typeof text !== 'string') {
    return json({ error: 'text is required and must be a string' }, 400, corsHeaders);
  }

  if (text.trim().length < 20) {
    return json({ error: 'Text too short for extraction', fallback: true }, 200, corsHeaders);
  }

  const mistralKey = env.MISTRAL_API_KEY;
  const geminiKey = env.GEMINI_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  if (!mistralKey && !geminiKey && !openaiKey) {
    return json({ error: 'AI API key not configured', fallback: true }, 200, corsHeaders);
  }

  const isDevolucao = tipo_documento === 'devolucao' || /DEVOLU[ÇC][ÃA]O/i.test(text);

  const systemPrompt = `Voce e um extrator de dados profissional de comprovantes de locacao de equipamentos.

TAREFA: Extrair TODOS os dados do comprovante e retornar APENAS um objeto JSON valido.

TIPO DE DOCUMENTO: ${isDevolucao ? 'DEVOLUCAO (retorno de equipamentos locados)' : 'ENTREGA (entrega de equipamentos locados)'}

FORMATO DE SAIDA (JSON exato - NAO adicione campos extras):
{
  "contrato": "numero do contrato ex: 1234/26",
  "atendente": "nome do atendente",
  "locatario": "nome completo do locatario/empresa",
  "cpf_cnpj": "CPF ou CNPJ formatado",
  "rg": "numero do RG se visivel",
  "telefone": "telefone do locatario com DDD",
  "contato": "nome do contato",
  "endereco": "rua/avenida do locatario",
  "numero": "numero do endereco",
  "bairro": "bairro",
  "cidade": "cidade",
  "estado": "UF (2 letras)",
  "cep": "CEP com ou sem hifen",
  "local_entrega": "endereco completo da obra/entrega",
  "telefone_entrega": "telefone do local de entrega",
  "referencia": "ponto de referencia se houver",
  "data_retirada": "DD/MM/AAAA",
  "hora": "HH:MM",
  "observacao": "observacoes se houver",
  "itens": [
    {
      "quantidade": 1,
      "descricao": "descricao do item/equipamento",
      "patrimonio": "numero de patrimonio se houver",
      "valor_unitario": 0
    }
  ],
  "valor_total": 0,
  "valor_mensal": 0,
  "tipo_documento": "${isDevolucao ? 'devolucao' : 'entrega'}"
}

REGRAS CRITICAS:
1. tipo_documento DEVE ser "${isDevolucao ? 'devolucao' : 'entrega'}" baseado no titulo do documento
2. CONTRATO: Procure "CONTRATO Nº XXXX/YY" ou apenas "XXXX/YY". NAO confunda com numeros de orcamento
3. ITENS: Cada item tem quantidade, descricao, patrimonio (se houver), valor_unitario (0 se nao visivel)
4. VALOR: Se nao houver valor visivel, use 0
5. CAMPOS: Se um campo nao for encontrado, use string vazia ""
6. DATA: Formato DD/MM/AAAA. Se apenas HH:MM for visivel, preencha hora e deixe data vazia
7. LOCAL ENTREGA: Pode ser diferente do endereco do locatario (e a obra)
8. TELEFONE: Inclua DDD, ex: (92) 99999-0000
9. NAO retorne array, NAO retorne markdown, NAO retorne texto explicativo
10. Apenas JSON puro e valido`;

  const userMessage = `Extraia os dados deste comprovante de ${isDevolucao ? 'devolucao' : 'entrega'}:

${text.slice(0, 15000)}`;

  function validateAiResponse(data) {
    if (!data || typeof data !== 'object') return null;
    if (Array.isArray(data)) return null;

    const defaults = {
      contrato: '', atendente: '', locatario: '', cpf_cnpj: '', rg: '', telefone: '',
      contato: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
      local_entrega: '', telefone_entrega: '', referencia: '', data_retirada: '', data_devolucao: '',
      hora: '', observacao: '', itens: [], valor_total: 0, valor_mensal: 0,
      tipo_documento: isDevolucao ? 'devolucao' : 'entrega',
      condicoes: { danificado: false, extraviado: false, testarEmpresa: false },
    };

    const result = { ...defaults, ...data };

    if (!Array.isArray(result.itens)) result.itens = [];
    result.itens = result.itens.map(it => ({
      quantidade: Number(it.quantidade) || 1,
      descricao: String(it.descricao || ''),
      patrimonio: String(it.patrimonio || ''),
      valor_unitario: Number(it.valor_unitario) || 0,
    }));

    result.valor_total = Number(result.valor_total) || 0;
    result.valor_mensal = Number(result.valor_mensal) || 0;

    if (result.tipo_documento !== 'devolucao' && result.tipo_documento !== 'entrega') {
      result.tipo_documento = isDevolucao ? 'devolucao' : 'entrega';
    }

    if (result.tipo_documento === 'devolucao' && !result.data_devolucao && result.data_retirada) {
      result.data_devolucao = result.data_retirada;
    }

    return result;
  }

  async function callAI(provider, url, headers, body, extractFn) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) return { error: `${provider} quota exceeded`, fallback: true };
        return { error: `${provider} API error` };
      }
      const content = extractFn(data);
      if (!content) return { error: `${provider} returned empty content` };
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { error: `${provider} returned invalid JSON` };
      try {
        const extracted = JSON.parse(jsonMatch[0]);
        const validated = validateAiResponse(extracted);
        if (!validated) return { error: `${provider} returned invalid structure` };
        return { success: true, data: validated };
      } catch {
        return { error: `${provider} JSON parse error` };
      }
    } catch {
      return { error: `${provider} request failed` };
    }
  }

  if (mistralKey) {
    const result = await callAI('Mistral', 'https://api.mistral.ai/v1/chat/completions',
      { 'Authorization': `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
      { model: 'mistral-small-latest', temperature: 0, max_tokens: 2000,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }] },
      (d) => d.choices?.[0]?.message?.content || ''
    );
    if (result.success) return json(result, 200, corsHeaders);
    if (result.fallback) return json(result, 200, corsHeaders);
  }

  if (geminiKey) {
    const result = await callAI('Gemini',
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      { 'Content-Type': 'application/json' },
      { contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0, maxOutputTokens: 2000, responseMimeType: 'application/json' } },
      (d) => d.candidates?.[0]?.content?.parts?.[0]?.text || ''
    );
    if (result.success) return json(result, 200, corsHeaders);
    if (result.fallback) return json(result, 200, corsHeaders);
  }

  if (openaiKey) {
    const result = await callAI('OpenAI', 'https://api.openai.com/v1/chat/completions',
      { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      { model: 'gpt-4o-mini', temperature: 0, max_tokens: 2000,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }] },
      (d) => d.choices?.[0]?.message?.content || ''
    );
    if (result.success) return json(result, 200, corsHeaders);
    return json({ ...result, fallback: true }, 502, corsHeaders);
  }

  return json({ error: 'No AI provider available', fallback: true }, 200, corsHeaders);
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
      try {
        return await handleApiRoute(path, method, request, env, corsHeaders);
      } catch (e) {
        return json({ error: 'Internal server error', detail: e.message }, 500, corsHeaders);
      }
    }

    const response = await env.ASSETS.fetch(request);
    const newHeaders = new Headers(response.headers);

    if (path.startsWith('/assets/') || path.match(/\.(js|css|woff2?)$/)) {
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path === '/' || path.endsWith('.html') || (!path.includes('.') && path.startsWith('/'))) {
      newHeaders.set('Cache-Control', 'public, max-age=0, s-maxage=60');
    } else if (path.match(/\.(jpg|jpeg|png|svg|ico|gif|webp)$/)) {
      newHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    }

    return new Response(response.body, { status: response.status, headers: newHeaders });
  },
};
