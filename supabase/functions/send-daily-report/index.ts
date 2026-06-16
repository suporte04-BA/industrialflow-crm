import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: contratos, error: ctError } = await supabase
      .from('contratos')
      .select('*')
      .in('status', ['ativo', 'vencendo'])

    if (ctError) throw ctError

    const hoje = new Date()
    const alertas = []

    for (const ct of contratos || []) {
      const fim = new Date(ct.fim)
      const diasRestantes = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24))

      if (diasRestantes <= 30) {
        alertas.push({
          contrato_id: ct.id,
          cliente: ct.cliente,
          dias_restantes: diasRestantes,
          valor_mensal: ct.valor_mensal,
          status: diasRestantes <= 0 ? 'vencido' : 'vencendo',
        })
      }
    }

    const { data: osAbertas, error: osError } = await supabase
      .from('ordens_servico')
      .select('id, cliente, equipamento, prioridade, previsao')
      .eq('status', 'pendente')
      .order('previsao', { ascending: true })

    if (osError) throw osError

    const relatorio = {
      geradoEm: new Date().toISOString(),
      resumo: {
        totalContratos: contratos?.length || 0,
        alertasVencimento: alertas.length,
        osPendentes: osAbertas?.length || 0,
      },
      alertasContratos: alertas,
      osPendentes: osAbertas || [],
    }

    return new Response(JSON.stringify({ data: relatorio }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
