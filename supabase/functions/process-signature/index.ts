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

    const { comprovante_id, nome_signatario, cpf_signatario, assinatura_imagem } = await req.json()

    if (!comprovante_id || !nome_signatario || !assinatura_imagem) {
      return new Response(
        JSON.stringify({ error: 'comprovante_id, nome_signatario e assinatura_imagem sao obrigatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: comprovante, error: compError } = await supabase
      .from('comprovantes_entrega')
      .select('*')
      .eq('id', comprovante_id)
      .single()

    if (compError || !comprovante) {
      return new Response(
        JSON.stringify({ error: 'Comprovante nao encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let imagemUrl = assinatura_imagem
    if (assinatura_imagem.startsWith('data:image')) {
      const base64Data = assinatura_imagem.split(',')[1]
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const fileName = `assinaturas/${comprovante_id}_${Date.now()}.png`

      const { error: uploadError } = await supabase.storage
        .from('assinaturas')
        .upload(fileName, binaryData, { contentType: 'image/png' })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('assinaturas')
          .getPublicUrl(fileName)
        imagemUrl = urlData.publicUrl
      }
    }

    const { data: assinatura, error: sigError } = await supabase
      .from('assinaturas')
      .insert({
        comprovante_id,
        nome_signatario,
        cpf_signatario: cpf_signatario || null,
        assinatura_imagem: imagemUrl,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      })
      .select()
      .single()

    if (sigError) throw sigError

    await supabase
      .from('comprovantes_entrega')
      .update({ status: 'assinado', assinado: true })
      .eq('id', comprovante_id)

    return new Response(JSON.stringify({ data: assinatura }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
