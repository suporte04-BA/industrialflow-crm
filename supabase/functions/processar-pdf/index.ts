import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bytes = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))

    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY nao configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Voce e um extrator de dados de comprovantes de entrega de equipamentos locados.
Extraia TODOS os dados e retorne um JSON com exatamente esta estrutura:
{
  "contrato": "numero do contrato",
  "atendente": "nome do atendente",
  "data": "DD/MM/AAAA",
  "hora": "HH:MM",
  "locatario": "nome do locatario",
  "cpf": "cpf",
  "rg": "rg",
  "fone": "telefone",
  "contato": "nome do contato",
  "endereco": "endereco completo",
  "numero": "numero",
  "bairro": "bairro",
  "cidade": "cidade",
  "estado": "UF",
  "cep": "cep",
  "localEntrega": "local de entrega",
  "telefoneEntrega": "telefone do local de entrega",
  "observacao": "observacoes",
  "itens": [{ "descricao": "descricao do item", "quantidade": "1", "valorUnitario": "0" }]
}
Se um campo nao for encontrado, retorne string vazia.`
            },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64}` }
            }
          ]
        }]
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Response(
        JSON.stringify({ error: `Erro na API OpenAI: ${res.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await res.json()
    const extracted = JSON.parse(result.choices[0].message.content)

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
