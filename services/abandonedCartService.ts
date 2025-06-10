
import { AbandonedCart, AbandonedCartStatus, Json } from '../types';
import { supabase, getSupabaseUserId } from '../supabaseClient'; // Updated import
import { Database } from '../types/supabase';

type AbandonedCartRow = Database['public']['Tables']['abandoned_carts']['Row'];
type AbandonedCartInsert = Database['public']['Tables']['abandoned_carts']['Insert'];
type AbandonedCartUpdate = Database['public']['Tables']['abandoned_carts']['Update'];


const parseJsonField = <T>(field: Json | null | undefined, defaultValue: T): T => {
  if (field === null || field === undefined) {
    return defaultValue;
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch (e) {
      console.warn('Failed to parse JSON string field:', field, e);
      return defaultValue;
    }
  }
  return field as T;
};

const fromSupabaseAbandonedCartRow = (row: AbandonedCartRow): AbandonedCart => ({
  id: row.id,
  platformUserId: row.platform_user_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerWhatsapp: row.customer_whatsapp,
  productId: row.product_id,
  productName: row.product_name,
  potentialValueInCents: row.potential_value_in_cents,
  date: row.created_at, 
  lastInteractionAt: row.last_interaction_at,
  status: row.status as AbandonedCartStatus,
  trackingParameters: parseJsonField<Record<string, string> | undefined>(row.tracking_parameters, undefined),
});

export interface CreateAbandonedCartPayload {
  productId?: string;
  productName?: string;
  potentialValueInCents?: number;
  customerName?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
  platformUserId?: string; 
  trackingParameters?: Record<string, string>;
  status?: AbandonedCartStatus;
}

export const abandonedCartService = {
  createAbandonedCartAttempt: async (payload: CreateAbandonedCartPayload): Promise<AbandonedCart> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    if (!payload.platformUserId) {
        throw new Error('Platform User ID é obrigatório para criar carrinho abandonado.');
    }
    if (!payload.productId) {
        throw new Error('Product ID é obrigatório para criar carrinho abandonado.');
    }
    if (!payload.customerEmail) {
        throw new Error('Customer Email é obrigatório para criar carrinho abandonado.');
    }

    const newCartData: AbandonedCartInsert = {
      platform_user_id: payload.platformUserId,
      customer_name: payload.customerName || payload.customerEmail.split('@')[0],
      customer_email: payload.customerEmail,
      customer_whatsapp: payload.customerWhatsapp || '', 
      product_id: payload.productId,
      product_name: payload.productName || 'Produto Desconhecido',
      potential_value_in_cents: payload.potentialValueInCents || 0,
      status: AbandonedCartStatus.NOT_CONTACTED,
      created_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString(),
      tracking_parameters: payload.trackingParameters as Json | undefined,
    };

    try {
      const { data, error } = await supabase // Use imported supabase
        .from('abandoned_carts')
        .insert(newCartData)
        .select()
        .single<AbandonedCartRow>();

      if (error) throw error;
      if (!data) throw new Error('Falha ao registrar carrinho abandonado, dados não retornados.');
      return fromSupabaseAbandonedCartRow(data);
    } catch (error: any) {
      console.error('Supabase createAbandonedCartAttempt error:', error);
      throw new Error(error.message || 'Falha ao registrar tentativa de carrinho abandonado');
    }
  },

  updateAbandonedCartAttempt: async (cartId: string, payload: Partial<CreateAbandonedCartPayload>): Promise<AbandonedCart> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    
    const updates: AbandonedCartUpdate = {
        ...(payload.customerName && { customer_name: payload.customerName }),
        ...(payload.customerEmail && { customer_email: payload.customerEmail }),
        ...(payload.customerWhatsapp !== undefined && { customer_whatsapp: payload.customerWhatsapp }),
        ...(payload.potentialValueInCents !== undefined && { potential_value_in_cents: payload.potentialValueInCents }),
        ...(payload.trackingParameters && { tracking_parameters: payload.trackingParameters as Json | undefined }),
        ...(payload.status && { status: payload.status }),
        last_interaction_at: new Date().toISOString(),
    };

    if (payload.platformUserId) delete (updates as any).platform_user_id;
    if (payload.productId) delete (updates as any).product_id;

    if (Object.keys(updates).length <= 1 && !updates.last_interaction_at) { 
        console.log("No meaningful updates for abandoned cart, skipping Supabase call.");
        const currentCart = await abandonedCartService.getAbandonedCartById(cartId);
        if (!currentCart) throw new Error('Carrinho não encontrado para "atualização" sem alterações.');
        return currentCart;
    }
    
    try {
        const { data, error } = await supabase // Use imported supabase
            .from('abandoned_carts')
            .update(updates)
            .eq('id', cartId)
            .select()
            .single<AbandonedCartRow>();

        if (error) throw error;
        if (!data) throw new Error('Carrinho não encontrado para atualização.');
        return fromSupabaseAbandonedCartRow(data);
    } catch (error: any) {
        console.error('Supabase updateAbandonedCartAttempt error:', error);
        throw new Error(error.message || 'Falha ao atualizar tentativa de carrinho abandonado');
    }
  },

  getAbandonedCartById: async (cartId: string, _token?: string | null): Promise<AbandonedCart | null> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId(); 
    if (!userId && !_token) { 
        console.warn("getAbandonedCartById: User ID or super admin token needed.");
        return null;
    }

    try {
        const query = supabase // Use imported supabase
            .from('abandoned_carts')
            .select('*')
            .eq('id', cartId);
        
        const { data, error } = await query.single<AbandonedCartRow>();

        if (error) {
            if (error.code === 'PGRST116') return null; 
            throw error;
        }
        return data ? fromSupabaseAbandonedCartRow(data) : null;
    } catch (error: any) {
        console.error(`Supabase getAbandonedCartById (${cartId}) error:`, error);
        throw new Error(error.message || `Falha ao buscar carrinho abandonado ${cartId}`);
    }
  },

  getAbandonedCarts: async (_token?: string | null): Promise<AbandonedCart[]> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para buscar carrinhos abandonados.');

    try {
      const { data, error } = await supabase // Use imported supabase
        .from('abandoned_carts')
        .select('*')
        .eq('platform_user_id', userId)
        .order('last_interaction_at', { ascending: false });

      if (error) throw error;
      return data ? data.map(fromSupabaseAbandonedCartRow) : [];
    } catch (error: any) {
      console.error('Supabase getAbandonedCarts error:', error);
      throw new Error(error.message || 'Falha ao buscar carrinhos abandonados');
    }
  },

  updateAbandonedCartStatus: async (cartId: string, status: AbandonedCartStatus, _token?: string | null): Promise<AbandonedCart> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para atualizar carrinho.');

    try {
      const { data, error } = await supabase // Use imported supabase
        .from('abandoned_carts')
        .update({ status: status, last_interaction_at: new Date().toISOString() })
        .eq('id', cartId)
        .eq('platform_user_id', userId) 
        .select()
        .single<AbandonedCartRow>();

      if (error) throw error;
      if (!data) throw new Error('Carrinho não encontrado ou não pertence ao usuário.');
      return fromSupabaseAbandonedCartRow(data);
    } catch (error: any) {
      console.error('Supabase updateAbandonedCartStatus error:', error);
      throw new Error(error.message || 'Falha ao atualizar status do carrinho abandonado');
    }
  },

  deleteAbandonedCart: async (cartId: string, _token?: string | null): Promise<{ success: boolean }> => {
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para deletar carrinho.');

    try {
      const { error, count } = await supabase // Use imported supabase
        .from('abandoned_carts')
        .delete({ count: 'exact' })
        .eq('id', cartId)
        .eq('platform_user_id', userId); 

      if (error) throw error;
      if (count === 0) throw new Error('Carrinho não encontrado ou não pertence ao usuário.');
      return { success: true };
    } catch (error: any) {
      console.error('Supabase deleteAbandonedCart error:', error);
      throw new Error(error.message || 'Falha ao deletar carrinho abandonado');
    }
  },
};
