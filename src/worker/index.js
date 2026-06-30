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

function json(data, status = 200, corsHeaders = null, cacheControl = null) {
  const h = corsHeaders || getCorsHeaders({ headers: new Headers() });
  if (cacheControl) h['Cache-Control'] = cacheControl;
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

  if (path === '/api/ai/extract-pdf' && method === 'POST') {
    return handleAiExtractPdf(request, env, corsHeaders);
  }

  if (path.startsWith('/api/edge/')) {
    return handleEdgeProxy(path, method, request, env, corsHeaders);
  }

  return json({ error: 'API route not found' }, 404, corsHeaders);
}

async function handleDashboard(env, corsHeaders) {
  try {
    const [os, eq, ct] = await Promise.all([
      supabaseRequest(env, 'GET', '/ordens_servico?select=id,status,created_at,cliente,equipamento,valor,prioridade&order=created_at.desc&limit=200'),
      supabaseRequest(env, 'GET', '/equipamentos?select=id,status&limit=200'),
      supabaseRequest(env, 'GET', '/contratos?select=id,numero,cliente,status,valor_mensal,assinado,fim&limit=200'),
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
    }, 200, corsHeaders, 'private, max-age=30, must-revalidate');
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
    const result = await supabaseRequest(env, 'GET', `/${table}?id=eq.${id}&select=*`);
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

async function handleEmailSend(request, env, corsHeaders) {
  const parsed = await parseBody(request);
  if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);

  const { tipo, contrato_id, comprovante_id, destinatario: reqDest, contrato, comprovante, signatario, devolucao } = parsed.data;
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
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`,
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
    : emailTipo === 'devolucao_registrada'
    ? `Comprovante de Devolucao ${devolucao?.numero || ''} - TransObra`
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

async function handleAiExtractPdf(request, env, corsHeaders) {
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

  // Helper: validate and clean AI response
  function validateAiResponse(data) {
    if (!data || typeof data !== 'object') return null;
    if (Array.isArray(data)) return null;

    // Ensure required fields exist with defaults
    const defaults = {
      contrato: '',
      atendente: '',
      locatario: '',
      cpf_cnpj: '',
      rg: '',
      telefone: '',
      contato: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      local_entrega: '',
      telefone_entrega: '',
      referencia: '',
      data_retirada: '',
      data_devolucao: '',
      hora: '',
      observacao: '',
      itens: [],
      valor_total: 0,
      valor_mensal: 0,
      tipo_documento: isDevolucao ? 'devolucao' : 'entrega',
      condicoes: { danificado: false, extraviado: false, testarEmpresa: false },
    };

    const result = { ...defaults, ...data };

    // Ensure itens is array of objects
    if (!Array.isArray(result.itens)) result.itens = [];
    result.itens = result.itens.map(it => ({
      quantidade: Number(it.quantidade) || 1,
      descricao: String(it.descricao || ''),
      patrimonio: String(it.patrimonio || ''),
      valor_unitario: Number(it.valor_unitario) || 0,
    }));

    // Ensure numeric values
    result.valor_total = Number(result.valor_total) || 0;
    result.valor_mensal = Number(result.valor_mensal) || 0;

    // Ensure tipo_documento
    if (result.tipo_documento !== 'devolucao' && result.tipo_documento !== 'entrega') {
      result.tipo_documento = isDevolucao ? 'devolucao' : 'entrega';
    }

    // For devolucao, set data_devolucao from data_retirada if empty
    if (result.tipo_documento === 'devolucao' && !result.data_devolucao && result.data_retirada) {
      result.data_devolucao = result.data_retirada;
    }

    return result;
  }

  // Helper: call AI provider with retry
  async function callAI(provider, url, headers, body, extractFn) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error?.message || `${provider} API error`;
        console.error(`${provider} error:`, res.status, errMsg);
        if (res.status === 429) {
          return { error: `${provider} quota exceeded`, fallback: true };
        }
        return { error: errMsg };
      }

      const content = extractFn(data);
      if (!content) return { error: `${provider} returned empty content` };

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { error: `${provider} returned invalid JSON`, raw: content };

      try {
        const extracted = JSON.parse(jsonMatch[0]);
        const validated = validateAiResponse(extracted);
        if (!validated) return { error: `${provider} returned invalid structure` };
        return { success: true, data: validated };
      } catch {
        return { error: `${provider} JSON parse error` };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  // Try Mistral first
  if (mistralKey) {
    const result = await callAI(
      'Mistral',
      'https://api.mistral.ai/v1/chat/completions',
      {
        'Authorization': `Bearer ${mistralKey}`,
        'Content-Type': 'application/json',
      },
      {
        model: 'mistral-small-latest',
        temperature: 0,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      },
      (data) => data.choices?.[0]?.message?.content || ''
    );

    if (result.success) return json(result, 200, corsHeaders);
    if (result.fallback) return json(result, 200, corsHeaders);
  }

  // Try Gemini
  if (geminiKey) {
    const result = await callAI(
      'Gemini',
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      { 'Content-Type': 'application/json' },
      {
        contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      },
      (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    );

    if (result.success) return json(result, 200, corsHeaders);
    if (result.fallback) return json(result, 200, corsHeaders);
  }

  // Try OpenAI
  if (openaiKey) {
    const result = await callAI(
      'OpenAI',
      'https://api.openai.com/v1/chat/completions',
      {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      {
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      },
      (data) => data.choices?.[0]?.message?.content || ''
    );

    if (result.success) return json(result, 200, corsHeaders);
    return json({ ...result, fallback: true }, 502, corsHeaders);
  }

  return json({ error: 'No AI provider available', fallback: true }, 200, corsHeaders);
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
