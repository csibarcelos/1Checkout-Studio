
import { Sale, SaleProductItem, PaymentMethod, PaymentStatus, PlatformSettings } from '../types'; 
import { supabase, getSupabaseUserId } from '../supabaseClient'; // Updated import
import { Database, Json } from '../types/supabase';
import { DEFAULT_CURRENCY } from '../constants.tsx'; 

type SaleRow = Database['public']['Tables']['sales']['Row'];
type SaleInsert = Database['public']['Tables']['sales']['Insert'];

const parseJsonField = <T>(field: Json | null | undefined, defaultValue: T): T => { 
  if (field === null || field === undefined) return defaultValue;
  if (typeof field === 'string') {
    try { return JSON.parse(field) as T; }
    catch (e) { console.warn('Failed to parse JSON string field:', field, e); return defaultValue; }
  }
  return field as T;
};

const fromSupabaseSaleRow = (row: SaleRow): Sale => { 
  return {
    id: row.id, platformUserId: row.platform_user_id, pushInPayTransactionId: row.push_in_pay_transaction_id,
    upsellPushInPayTransactionId: row.upsell_push_in_pay_transaction_id || undefined,
    orderIdUrmify: row.order_id_urmify || undefined,
    products: parseJsonField<SaleProductItem[]>(row.products, []),
    customer: { name: row.customer_name, email: row.customer_email, ip: row.customer_ip || undefined, whatsapp: row.customer_whatsapp, },
    paymentMethod: row.payment_method as PaymentMethod, status: row.status as PaymentStatus,
    upsellStatus: row.upsell_status ? row.upsell_status as PaymentStatus : undefined,
    totalAmountInCents: row.total_amount_in_cents, upsellAmountInCents: row.upsell_amount_in_cents || undefined,
    originalAmountBeforeDiscountInCents: row.original_amount_before_discount_in_cents,
    discountAppliedInCents: row.discount_applied_in_cents || undefined, couponCodeUsed: row.coupon_code_used || undefined,
    createdAt: row.created_at, paidAt: row.paid_at || undefined,
    trackingParameters: parseJsonField<Record<string, string> | undefined>(row.tracking_parameters, undefined),
    commission: (row.commission_total_price_in_cents !== null && row.commission_gateway_fee_in_cents !== null && row.commission_user_commission_in_cents !== null && row.commission_currency !== null) ? {
      totalPriceInCents: row.commission_total_price_in_cents, gatewayFeeInCents: row.commission_gateway_fee_in_cents,
      userCommissionInCents: row.commission_user_commission_in_cents, currency: row.commission_currency,
    } : undefined,
    platformCommissionInCents: row.platform_commission_in_cents || undefined,
  };
};

export const salesService = {
  getSales: async (_token: string | null): Promise<Sale[]> => { 
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId();
    if (!userId) { console.warn("salesService.getSales: User ID não encontrado. Retornando lista vazia."); return []; }
    try {
      const { data, error } = await supabase.from('sales').select('*').eq('platform_user_id', userId); // Use imported supabase
      if (error) {
        const isMissingTableError = error.code === '42P01' || (typeof error.message === 'string' && error.message.toLowerCase().includes('relation') && error.message.toLowerCase().includes('does not exist'));
        if (isMissingTableError) { console.warn(`Supabase getSales: Tabela "sales" não encontrada (code: ${error.code}). Retornando lista vazia.`); return []; }
        console.error('Supabase getSales error:', error); throw new Error(error.message || 'Falha ao buscar vendas.');
      }
      return data ? data.map(fromSupabaseSaleRow) : [];
    } catch (genericError: any) {
      console.error('Exception in getSales:', genericError);
      const isMissingTableInGenericError = typeof genericError.message === 'string' && genericError.message.toLowerCase().includes('relation') && genericError.message.toLowerCase().includes('does not exist');
      if (genericError.code === '42P01' || isMissingTableInGenericError) { console.warn('Supabase getSales: Tabela "sales" não encontrada (capturado em exceção). Retornando lista vazia.'); return []; }
      throw new Error(genericError.message || 'Falha geral ao buscar vendas.');
    }
  },
  getSaleById: async (id: string, _token: string | null): Promise<Sale | undefined> => { 
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    try {
      const { data, error } = await supabase.from('sales').select('*').or(`id.eq.${id},push_in_pay_transaction_id.eq.${id},upsell_push_in_pay_transaction_id.eq.${id}`).maybeSingle<SaleRow>();  // Use imported supabase
      if (error) {
        if (error.code === 'PGRST116') return undefined; 
        const isMissingTableError = error.code === '42P01' || (typeof error.message === 'string' && error.message.toLowerCase().includes('relation') && error.message.toLowerCase().includes('does not exist'));
        if (isMissingTableError) { console.warn(`Supabase getSaleById: Tabela "sales" não encontrada ao buscar ID ${id} (code: ${error.code}). Retornando undefined.`); return undefined; }
        console.error('Supabase getSaleById error:', error); throw new Error(error.message || 'Falha ao buscar venda.');
      }
      return data ? fromSupabaseSaleRow(data) : undefined;
    } catch (genericError: any) {
      console.error('Exception in getSaleById:', genericError);
      const isMissingTableInGenericError = typeof genericError.message === 'string' && genericError.message.toLowerCase().includes('relation') && genericError.message.toLowerCase().includes('does not exist');
      if (genericError.code === '42P01' || isMissingTableInGenericError) { console.warn(`Supabase getSaleById: Tabela "sales" não encontrada ao buscar ID ${id} (capturado em exceção). Retornando undefined.`); return undefined; }
      throw new Error(genericError.message || 'Falha geral ao buscar venda.');
    }
  },

  createSale: async (
    saleData: Omit<Sale, 'id' | 'createdAt' | 'platformCommissionInCents' | 'commission'>,
    platformSettings: PlatformSettings,
    _token: string | null
  ): Promise<Sale> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    if (!saleData.platformUserId) {
      throw new Error("platformUserId (do dono do produto) é obrigatório para criar a venda.");
    }

    const gatewayFeeInCents = 0; 
    const platformCommissionBase = saleData.totalAmountInCents - gatewayFeeInCents;
    const platformCommissionCalculated = Math.round(platformCommissionBase * platformSettings.platformCommissionPercentage) + platformSettings.platformFixedFeeInCents;
    const userNetRevenue = platformCommissionBase - platformCommissionCalculated;

    const fullSaleData: SaleInsert = {
      platform_user_id: saleData.platformUserId,
      push_in_pay_transaction_id: saleData.pushInPayTransactionId,
      upsell_push_in_pay_transaction_id: saleData.upsellPushInPayTransactionId,
      order_id_urmify: saleData.orderIdUrmify,
      products: saleData.products as unknown as Json,
      customer_name: saleData.customer.name,
      customer_email: saleData.customer.email,
      customer_ip: saleData.customer.ip,
      customer_whatsapp: saleData.customer.whatsapp,
      payment_method: saleData.paymentMethod,
      status: saleData.status,
      upsell_status: saleData.upsellStatus,
      total_amount_in_cents: saleData.totalAmountInCents,
      upsell_amount_in_cents: saleData.upsellAmountInCents,
      original_amount_before_discount_in_cents: saleData.originalAmountBeforeDiscountInCents,
      discount_applied_in_cents: saleData.discountAppliedInCents,
      coupon_code_used: saleData.couponCodeUsed,
      created_at: new Date().toISOString(),
      paid_at: saleData.paidAt,
      tracking_parameters: saleData.trackingParameters as unknown as Json,
      platform_commission_in_cents: platformCommissionCalculated,
      commission_total_price_in_cents: platformCommissionBase,
      commission_gateway_fee_in_cents: gatewayFeeInCents,
      commission_user_commission_in_cents: userNetRevenue,
      commission_currency: DEFAULT_CURRENCY,
    };

    try {
      const { data, error } = await supabase
        .from('sales')
        .insert(fullSaleData)
        .select()
        .single<SaleRow>();

      if (error) {
        console.error('Supabase createSale error:', error);
        throw new Error(error.message || 'Falha ao criar venda');
      }
      if (!data) {
        throw new Error('Falha ao criar venda, dados não retornados.');
      }
      return fromSupabaseSaleRow(data);
    } catch (error: any) {
      console.error('Exception in createSale:', error);
      throw new Error(error.message || 'Falha geral ao criar venda.');
    }
  },
};
