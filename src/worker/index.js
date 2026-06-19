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
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    ...SECURITY_HEADERS,
  };
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const authHeader = request.headers.get('Authorization');

    if (path.startsWith('/api/')) {
      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: new Date().toISOString() }, 200, corsHeaders);
      }

      if (path === '/api/config' && method === 'GET') {
        return json({
          emailRecipient: env.EMAIL_RECIPIENT || 'gestores@transobra.com.br',
          resendConfigured: !!env.RESEND_API_KEY,
        }, 200, corsHeaders);
      }

      if (path === '/api/dashboard' && method === 'GET') {
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
        } catch (err) {
          return json({ error: 'Failed to fetch dashboard' }, 500, corsHeaders);
        }
      }

      if (path.startsWith('/api/ordens')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'GET' && id && id !== 'ordens' && isValidId(id)) {
          const result = await supabaseRequest(env, 'GET', `/ordens_servico?id=eq.${id}&select=*`);
          return json(result.data?.[0] || { error: 'Not found' }, result.status, corsHeaders);
        }
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/ordens_servico', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/ordens_servico?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/ordens_servico?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/ordens_servico?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/equipamentos')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/equipamentos', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/equipamentos?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/equipamentos?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/equipamentos?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/contratos')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/contratos', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/contratos?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/contratos?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/contratos?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/comprovantes')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/comprovantes_entrega', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/comprovantes_entrega?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/comprovantes_entrega?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/comprovantes_entrega?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/notas')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/notas', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/notas?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/notas?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/notas?select=*&order=updated_at.desc&limit=100');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/assinaturas') && method === 'POST') {
        const parsed = await parseBody(request);
        if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
        const result = await supabaseRequest(env, 'POST', '/assinaturas', parsed.data, authHeader);
        return json(result.data, result.status, corsHeaders);
      }

      if (path === '/api/email/send' && method === 'POST') {
        const parsed = await parseBody(request);
        if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
        const { contrato_id, comprovante_id, destinatario: reqDest, assunto, corpo } = parsed.data;
        const destinatario = reqDest || env.EMAIL_RECIPIENT || 'gestores@transobra.com.br';
        if (!assunto || !corpo) {
          return json({ error: 'assunto, corpo are required' }, 400, corsHeaders);
        }

        let emailBody;
        try {
          emailBody = JSON.parse(corpo);
        } catch {
          emailBody = { texto: corpo };
        }

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1C1C1C; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 18px;">TransObra - Notificacao de Contrato</h1>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
              <p style="color: #333; font-size: 14px;">Um contrato foi assinado e entregue.</p>
              ${emailBody.contrato ? `
              <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #e0e0e0;">
                <h3 style="margin: 0 0 10px; color: #1C1C1C; font-size: 14px;">Dados do Contrato</h3>
                <table style="width: 100%; font-size: 13px; color: #555;">
                  <tr><td style="padding: 3px 0;"><strong>Contrato:</strong></td><td>${escapeHtml(emailBody.contrato.id)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Cliente:</strong></td><td>${escapeHtml(emailBody.contrato.cliente)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>CNPJ:</strong></td><td>${escapeHtml(emailBody.contrato.cnpj)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Equipamentos:</strong></td><td>${escapeHtml(Array.isArray(emailBody.contrato.equipamentos) ? emailBody.contrato.equipamentos.join(', ') : '-')}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Periodo:</strong></td><td>${escapeHtml(emailBody.contrato.inicio)} a ${escapeHtml(emailBody.contrato.fim)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Valor Mensal:</strong></td><td>R$ ${Number(emailBody.contrato.valorMensal || 0).toLocaleString('pt-BR')}/mes</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Valor Total:</strong></td><td>R$ ${Number(emailBody.contrato.valorTotal || 0).toLocaleString('pt-BR')}</td></tr>
                </table>
              </div>` : ''}
              ${emailBody.comprovante ? `
              <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #e0e0e0;">
                <h3 style="margin: 0 0 10px; color: #1C1C1C; font-size: 14px;">Dados da Entrega</h3>
                <table style="width: 100%; font-size: 13px; color: #555;">
                  <tr><td style="padding: 3px 0;"><strong>Locatario:</strong></td><td>${escapeHtml(emailBody.comprovante.locatario)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Endereco:</strong></td><td>${escapeHtml(emailBody.comprovante.endereco)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Cidade:</strong></td><td>${escapeHtml(emailBody.comprovante.cidade)}</td></tr>
                  <tr><td style="padding: 3px 0;"><strong>Total:</strong></td><td>R$ ${Number(emailBody.comprovante.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
                </table>
              </div>` : ''}
              ${emailBody.signatario ? `
              <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #bbf7d0;">
                <h3 style="margin: 0 0 10px; color: #166534; font-size: 14px;">Assinatura</h3>
                <p style="font-size: 13px; color: #555;"><strong>Signatario:</strong> ${escapeHtml(emailBody.signatario.nome)}</p>
                <p style="font-size: 13px; color: #555;"><strong>Data:</strong> ${new Date(emailBody.signatario.data).toLocaleString('pt-BR')}</p>
              </div>` : ''}
              <p style="color: #999; font-size: 11px; margin-top: 20px; text-align: center;">TransObra CRM - Sistema de Gestao de Locacao</p>
            </div>
          </div>
        `;

        let emailStatus = 'pendente';
        let erroMsg = null;

        if (env.RESEND_API_KEY) {
          try {
            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'TransObra <noreply@transobra.com.br>',
                to: [destinatario],
                subject: assunto,
                html: htmlContent,
              }),
            });
            if (resendRes.ok) {
              emailStatus = 'enviado';
            } else {
              const errText = await resendRes.text();
              erroMsg = errText;
              emailStatus = 'erro';
            }
          } catch (e) {
            erroMsg = e.message;
            emailStatus = 'erro';
          }
        } else {
          erroMsg = 'RESEND_API_KEY not configured';
          emailStatus = 'erro';
        }

        await supabaseRequest(env, 'POST', '/email_logs', {
          contrato_id: contrato_id || null,
          comprovante_id: comprovante_id || null,
          destinatario,
          assunto,
          corpo: JSON.stringify(emailBody),
          status: emailStatus,
          erro_msg: erroMsg,
        });

        return json({ success: true, status: emailStatus }, 200, corsHeaders);
      }

      if (path.startsWith('/api/edge/')) {
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

      return json({ error: 'API route not found' }, 404, corsHeaders);
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
      const indexRequest = new Request(new URL('/', request.url), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return json({ error: 'Not found' }, 404, corsHeaders);
  },
};
