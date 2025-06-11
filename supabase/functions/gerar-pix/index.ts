// supabase/functions/gerar-pix/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/db_types.ts' // Você precisará criar este arquivo

// Tipos para o payload recebido do frontend
interface PixPayload {
  value: number;
  originalValueBeforeDiscount: number;
  webhook_url: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  products: any[]; // Simplificado, você pode usar seu tipo SaleProductItem
  trackingParameters?: Record<string, string>;
  couponCodeUsed?: string;
  discountAppliedInCents?: number;
}

interface RequestBody {
  payload: PixPayload;
  productOwnerUserId: string;
}

Deno.serve(async (req) => {
  // Tratamento de requisição OPTIONS para CORS (necessário para chamadas do navegador)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { payload, productOwnerUserId }: RequestBody = await req.json()

    if (!productOwnerUserId) {
      throw new Error("ID do dono do produto é obrigatório.")
    }

    // Crie um cliente Supabase com permissões de administrador para buscar segredos.
    // As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente no ambiente da Edge Function.
    const adminClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Buscar as configurações do vendedor (dono do produto)
    const { data: settings, error: settingsError } = await adminClient
      .from('app_settings')
      .select('api_tokens')
      .eq('user_id', productOwnerUserId)
      .single()

    if (settingsError || !settings) {
      throw new Error(`Configurações não encontradas para o vendedor: ${productOwnerUserId}. Erro: ${settingsError?.message}`)
    }

    const apiTokens = settings.api_tokens as any; // Cast para any para acessar as propriedades
    const pushinPayToken = apiTokens?.pushinPay;
    const isPushinPayEnabled = apiTokens?.pushinPayEnabled;

    if (!isPushinPayEnabled || !pushinPayToken) {
      throw new Error('Pagamento via PushInPay não está habilitado ou configurado para este vendedor.');
    }
    
    // 2. Buscar as configurações da plataforma (para o split)
    const { data: platformSettings, error: platformError } = await adminClient
        .from('platform_settings')
        .select('*')
        .eq('id', 'global')
        .single();
    
    if(platformError || !platformSettings) {
        throw new Error("Não foi possível carregar as configurações da plataforma para o split.");
    }
    
    // 3. (LÓGICA REAL) Chamar a API externa da PushInPay
    // Por enquanto, vamos manter a sua lógica de simulação (mock) aqui, 
    // mas troque o conteúdo desta seção pela chamada real quando estiver pronto.

    console.log("Edge Function: Chamando a API PushInPay (simulação)...");
    
    // SIMULAÇÃO INICIA AQUI (substitua no futuro)
    const mockPixId = `pix_real_${Date.now()}`;
    const mockQrCodeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const responseData = {
      id: mockPixId,
      qr_code: `QR_CODE_REAL_PARA_${mockPixId}`,
      qr_code_base64: mockQrCodeBase64,
      status: 'waiting_payment',
      value: payload.value,
    };
    
    const finalResponse = {
        success: true,
        data: responseData,
        message: "PIX gerado com sucesso pela Edge Function."
    };
    // SIMULAÇÃO TERMINA AQUI

    // 4. Retornar a resposta segura para o frontend
    return new Response(
      JSON.stringify(finalResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error("Erro na Edge Function:", err);
    return new Response(
        JSON.stringify({ message: err.message }), 
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
        }
    )
  }
})