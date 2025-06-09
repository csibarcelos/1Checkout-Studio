
import { Sale, SaleProductItem, PaymentMethod, PaymentStatus } from '../types'; 
import { getSupabaseClient, getSupabaseUserId } from '../supabaseClient';
import { Database, Json } from '../types/supabase';

type SaleRow = Database['public']['Tables']['sales']['Row'];

const fromSupabaseSaleRow = (row: SaleRow): Sale => {
  const productsArray = row.products as unknown as SaleProductItem[];
  const trackingParams = row.tracking_parameters as unknown as Record<string, string> | null;

  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    pushInPayTransactionId: row.push_in_pay_transaction_id,
    upsellPushInPayTransactionId: row.upsell_push_in_pay_transaction_id || undefined,
    orderIdUrmify: row.order_id_urmify || undefined,
    products: productsArray || [],
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      ip: row.customer_ip || undefined,
      whatsapp: row.customer_whatsapp,
    },
    paymentMethod: row.payment_method as PaymentMethod,
    status: row.status as PaymentStatus,
    upsellStatus: row.upsell_status ? row.upsell_status as PaymentStatus : undefined,
    totalAmountInCents: row.total_amount_in_cents,
    upsellAmountInCents: row.upsell_amount_in_cents || undefined,
    originalAmountBeforeDiscountInCents: row.original_amount_before_discount_in_cents,
    discountAppliedInCents: row.discount_applied_in_cents || undefined,
    couponCodeUsed: row.coupon_code_used || undefined,
    createdAt: row.created_at,
    paidAt: row.paid_at || undefined,
    trackingParameters: trackingParams || undefined,
    commission: (row.commission_total_price_in_cents !== null && row.commission_gateway_fee_in_cents !== null && row.commission_user_commission_in_cents !== null && row.commission_currency !== null) ? {
      totalPriceInCents: row.commission_total_price_in_cents,
      gatewayFeeInCents: row.commission_gateway_fee_in_cents,
      userCommissionInCents: row.commission_user_commission_in_cents,
      currency: row.commission_currency,
    } : undefined,
    platformCommissionInCents: row.platform_commission_in_cents || undefined,
  };
};

export const salesService = {
  getSales: async (_token: string | null): Promise<Sale[]> => { 
    const supabase = getSupabaseClient();
    const userId = await getSupabaseUserId();
    if (!userId) {
        console.warn("salesService.getSales: User ID não encontrado. Retornando lista vazia.");
        return [];
    }

    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('platform_user_id', userId);

      if (error) {
        const isMissingTableError = error.code === '42P01' || 
                                  (typeof error.message === 'string' && 
                                   error.message.toLowerCase().includes('relation') && 
                                   error.message.toLowerCase().includes('does not exist'));
        if (isMissingTableError) {
          console.warn(`Supabase getSales: Tabela "sales" não encontrada (code: ${error.code}). Retornando lista vazia.`);
          return [];
        }
        console.error('Supabase getSales error:', error);
        throw new Error(error.message || 'Falha ao buscar vendas.');
      }
      return data ? data.map(fromSupabaseSaleRow) : [];
    } catch (genericError: any) {
      console.error('Exception in getSales:', genericError);
      // Se o erro genérico ainda indicar tabela faltando, retorna vazio. Senão, relança.
      const isMissingTableInGenericError = typeof genericError.message === 'string' &&
                                           genericError.message.toLowerCase().includes('relation') &&
                                           genericError.message.toLowerCase().includes('does not exist');
      if (genericError.code === '42P01' || isMissingTableInGenericError) {
        console.warn('Supabase getSales: Tabela "sales" não encontrada (capturado em exceção). Retornando lista vazia.');
        return [];
      }
      throw new Error(genericError.message || 'Falha geral ao buscar vendas.');
    }
  },

  getSaleById: async (id: string, _token: string | null): Promise<Sale | undefined> => { 
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .or(`id.eq.${id},push_in_pay_transaction_id.eq.${id},upsell_push_in_pay_transaction_id.eq.${id}`) 
        .maybeSingle<SaleRow>(); 

      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found is a valid case

        const isMissingTableError = error.code === '42P01' || 
                                  (typeof error.message === 'string' && 
                                   error.message.toLowerCase().includes('relation') && 
                                   error.message.toLowerCase().includes('does not exist'));
        if (isMissingTableError) {
          console.warn(`Supabase getSaleById: Tabela "sales" não encontrada ao buscar ID ${id} (code: ${error.code}). Retornando undefined.`);
          return undefined;
        }
        console.error('Supabase getSaleById error:', error);
        throw new Error(error.message || 'Falha ao buscar venda.');
      }
      return data ? fromSupabaseSaleRow(data) : undefined;
    } catch (genericError: any) {
      console.error('Exception in getSaleById:', genericError);
      const isMissingTableInGenericError = typeof genericError.message === 'string' &&
                                           genericError.message.toLowerCase().includes('relation') &&
                                           genericError.message.toLowerCase().includes('does not exist');
      if (genericError.code === '42P01' || isMissingTableInGenericError) {
         console.warn(`Supabase getSaleById: Tabela "sales" não encontrada ao buscar ID ${id} (capturado em exceção). Retornando undefined.`);
        return undefined;
      }
      throw new Error(genericError.message || 'Falha geral ao buscar venda.');
    }
  },
};
