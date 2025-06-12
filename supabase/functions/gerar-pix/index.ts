// Caminho: supabase/functions/gerar-pix/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/db_types.ts'

// Interface para o payload que o frontend envia
interface RequestBody {
  payload: any;
  productOwnerUserId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { payload, productOwnerUserId }: RequestBody = await req.json()

    if (!productOwnerUserId) {
      throw new Error("ID do vendedor é obrigatório.")
    }

    const adminClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Busca as configurações do vendedor (dono do produto)
    const { data: settings, error: settingsError } = await adminClient
      .from('app_settings')
      .select('api_tokens')
      .eq('user_id', productOwnerUserId)
      .single()

    if (settingsError || !settings) {
      throw new Error(`Configurações de API não encontradas para o vendedor.`)
    }

    const apiTokens = settings.api_tokens as any;
    const pushinPayToken = apiTokens?.pushinPay;
    const isPushinPayEnabled = apiTokens?.pushinPayEnabled;

    if (!isPushinPayEnabled || !pushinPayToken) {
      throw new Error('Pagamento via PIX (PushInPay) não está habilitado ou configurado para este vendedor.');
    }
    
    // 2. Monta e executa a chamada REAL para a API da PushInPay
    console.log("Edge Function: Chamando a API REAL da PushInPay...");
    const pushinPayResponse = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pushinPayToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            value: payload.value,
            webhook_url: payload.webhook_url
        })
    });

    const pushinPayData = await pushinPayResponse.json();

    if (!pushinPayResponse.ok) {
        // Se a API da PushInPay deu erro, lança o erro para o frontend
        throw new Error(pushinPayData.message || 'Erro na comunicação com o gateway de pagamento.');
    }

    // 3. TODO: Disparar evento de "venda pendente" para a UTMify aqui
    // A lógica para chamar a UTMify seria adicionada aqui, usando o pushinPayData.data.id

    // 4. Retorna a resposta segura da PushInPay para o frontend
    return new Response(
      JSON.stringify(pushinPayData), // Retorna a resposta completa da PushInPay
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err: any) {
    console.error("Erro na Edge Function 'gerar-pix':", err.message);
    return new Response(
        JSON.stringify({ success: false, message: err.message }), 
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
        }
    )
  }
})