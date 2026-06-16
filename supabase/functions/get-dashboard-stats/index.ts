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

    const { data: os, error: osError } = await supabase
      .from('ordens_servico')
      .select('*')

    if (osError) throw osError

    const { data: eq, error: eqError } = await supabase
      .from('equipamentos')
      .select('*')

    if (eqError) throw eqError

    const { data: ct, error: ctError } = await supabase
      .from('contratos')
      .select('*')

    if (ctError) throw ctError

    const totalOS = os?.length || 0
    const osAbertas = os?.filter(o => o.status === 'pendente' || o.status === 'em_andamento').length || 0
    const osConcluidas = os?.filter(o => o.status === 'concluido').length || 0
    const eqLocados = eq?.filter(e => e.status === 'locado').length || 0
    const eqDisponiveis = eq?.filter(e => e.status === 'disponivel').length || 0
    const receitaMensal = ct?.filter(c => c.status === 'ativo').reduce((sum, c) => sum + (c.valor_mensal || 0), 0) || 0

    const stats = {
      totalOS,
      osAbertas,
      osConcluidas,
      equipamentosLocados: eqLocados,
      equipamentosDisponiveis: eqDisponiveis,
      contratosAtivos: ct?.filter(c => c.status === 'ativo').length || 0,
      receitaMensal,
      geradoEm: new Date().toISOString(),
    }

    return new Response(JSON.stringify({ data: stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
