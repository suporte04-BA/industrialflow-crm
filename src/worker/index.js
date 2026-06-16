// Cloudflare Worker - IndustrialFlow CRM API Proxy
// Roda em: transobras.suporte04.workers.dev

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
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

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const authHeader = request.headers.get('Authorization');

    // Health check
    if (path === '/api/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Dashboard stats (usa service role para bypass RLS)
    if (path === '/api/dashboard' && method === 'GET') {
      const [os, eq, ct] = await Promise.all([
        supabaseRequest(env, 'GET', '/ordens_servico?select=*'),
        supabaseRequest(env, 'GET', '/equipamentos?select=*'),
        supabaseRequest(env, 'GET', '/contratos?select=*'),
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
      });
    }

    // CRUD: Ordens de Servico
    if (path.startsWith('/api/ordens')) {
      const id = path.split('/').pop();
      if (method === 'GET' && id && id !== 'ordens') {
        const result = await supabaseRequest(env, 'GET', `/ordens_servico?id=eq.${id}&select=*`);
        return json(result.data?.[0] || { error: 'Not found' }, result.status);
      }
      if (method === 'POST') {
        const body = await request.json();
        const result = await supabaseRequest(env, 'POST', '/ordens_servico', body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'PUT' && id) {
        const body = await request.json();
        const result = await supabaseRequest(env, 'PATCH', `/ordens_servico?id=eq.${id}`, body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'DELETE' && id) {
        const result = await supabaseRequest(env, 'DELETE', `/ordens_servico?id=eq.${id}`, null, authHeader);
        return json({ success: true }, result.status);
      }
      const result = await supabaseRequest(env, 'GET', '/ordens_servico?select=*&order=created_at.desc');
      return json(result.data, result.status);
    }

    // CRUD: Equipamentos
    if (path.startsWith('/api/equipamentos')) {
      const id = path.split('/').pop();
      if (method === 'POST') {
        const body = await request.json();
        const result = await supabaseRequest(env, 'POST', '/equipamentos', body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'PUT' && id) {
        const body = await request.json();
        const result = await supabaseRequest(env, 'PATCH', `/equipamentos?id=eq.${id}`, body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'DELETE' && id) {
        const result = await supabaseRequest(env, 'DELETE', `/equipamentos?id=eq.${id}`, null, authHeader);
        return json({ success: true }, result.status);
      }
      const result = await supabaseRequest(env, 'GET', '/equipamentos?select=*&order=created_at.desc');
      return json(result.data, result.status);
    }

    // CRUD: Contratos
    if (path.startsWith('/api/contratos')) {
      const id = path.split('/').pop();
      if (method === 'POST') {
        const body = await request.json();
        const result = await supabaseRequest(env, 'POST', '/contratos', body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'PUT' && id) {
        const body = await request.json();
        const result = await supabaseRequest(env, 'PATCH', `/contratos?id=eq.${id}`, body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'DELETE' && id) {
        const result = await supabaseRequest(env, 'DELETE', `/contratos?id=eq.${id}`, null, authHeader);
        return json({ success: true }, result.status);
      }
      const result = await supabaseRequest(env, 'GET', '/contratos?select=*&order=created_at.desc');
      return json(result.data, result.status);
    }

    // CRUD: Comprovantes
    if (path.startsWith('/api/comprovantes')) {
      const id = path.split('/').pop();
      if (method === 'POST') {
        const body = await request.json();
        const result = await supabaseRequest(env, 'POST', '/comprovantes_entrega', body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'PUT' && id) {
        const body = await request.json();
        const result = await supabaseRequest(env, 'PATCH', `/comprovantes_entrega?id=eq.${id}`, body, authHeader);
        return json(result.data, result.status);
      }
      const result = await supabaseRequest(env, 'GET', '/comprovantes_entrega?select=*&order=created_at.desc');
      return json(result.data, result.status);
    }

    // CRUD: Notas
    if (path.startsWith('/api/notas')) {
      const id = path.split('/').pop();
      if (method === 'POST') {
        const body = await request.json();
        const result = await supabaseRequest(env, 'POST', '/notas', body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'PUT' && id) {
        const body = await request.json();
        const result = await supabaseRequest(env, 'PATCH', `/notas?id=eq.${id}`, body, authHeader);
        return json(result.data, result.status);
      }
      if (method === 'DELETE' && id) {
        const result = await supabaseRequest(env, 'DELETE', `/notas?id=eq.${id}`, null, authHeader);
        return json({ success: true }, result.status);
      }
      const result = await supabaseRequest(env, 'GET', '/notas?select=*&order=updated_at.desc');
      return json(result.data, result.status);
    }

    // Assinaturas
    if (path.startsWith('/api/assinaturas') && method === 'POST') {
      const body = await request.json();
      const result = await supabaseRequest(env, 'POST', '/assinaturas', body, authHeader);
      return json(result.data, result.status);
    }

    // Edge Function proxy (chama functions do Supabase)
    if (path.startsWith('/api/edge/')) {
      const funcName = path.replace('/api/edge/', '');
      const body = method === 'POST' ? await request.json() : null;
      const edgeUrl = `${env.SUPABASE_URL}/functions/v1/${funcName}`;
      const edgeRes = await fetch(edgeUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const edgeData = await edgeRes.json();
      return json(edgeData, edgeRes.status);
    }

    return json({ error: 'Not found', path }, 404);
  },
};
