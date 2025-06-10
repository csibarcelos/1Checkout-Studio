
import { Customer, FunnelStage } from '../types'; 
import { supabase, getSupabaseUserId } from '../supabaseClient'; // Updated import
import { Database } from '../types/supabase';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

const fromSupabaseCustomerRow = (row: CustomerRow): Customer => {
  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    productsPurchased: row.products_purchased || [],
    funnelStage: row.funnel_stage as FunnelStage,
    firstPurchaseDate: row.first_purchase_date,
    lastPurchaseDate: row.last_purchase_date,
    totalOrders: row.total_orders,
    totalSpentInCents: row.total_spent_in_cents,
    saleIds: row.sale_ids || [],
  };
};

export const customerService = {
  getCustomers: async (_token: string | null): Promise<Customer[]> => { 
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId();
    if (!userId) {
        console.warn("customerService.getCustomers: User ID não encontrado. Retornando lista vazia.");
        return [];
    }

    try {
      const { data, error } = await supabase // Use imported supabase
        .from('customers')
        .select('*')
        .eq('platform_user_id', userId);

      if (error) {
        const isMissingTableError = error.code === '42P01' || 
                                  (typeof error.message === 'string' && 
                                   error.message.toLowerCase().includes('relation') && 
                                   error.message.toLowerCase().includes('does not exist'));
        if (isMissingTableError) {
          console.warn(`Supabase getCustomers: Tabela "customers" não encontrada (code: ${error.code}). Retornando lista vazia.`);
          return [];
        }
        console.error('Supabase getCustomers error:', error);
        throw new Error(error.message || 'Falha ao buscar clientes.');
      }
      return data ? data.map(fromSupabaseCustomerRow) : [];
    } catch (genericError: any) {
      console.error('Exception in getCustomers:', genericError);
      const isMissingTableInGenericError = typeof genericError.message === 'string' &&
                                           genericError.message.toLowerCase().includes('relation') &&
                                           genericError.message.toLowerCase().includes('does not exist');
      if (genericError.code === '42P01' || isMissingTableInGenericError) {
        console.warn('Supabase getCustomers: Tabela "customers" não encontrada (capturado em exceção). Retornando lista vazia.');
        return [];
      }
      throw new Error(genericError.message || 'Falha geral ao buscar clientes.');
    }
  },

  getCustomerById: async (id: string, _token: string | null): Promise<Customer | undefined> => { 
    // const supabaseJsClient = getSupabaseClient(); // No longer needed
    const userId = await getSupabaseUserId(); 
    if (!userId) {
        console.warn("customerService.getCustomerById: User ID não encontrado.");
        return undefined;
    }
    try {
      const { data, error } = await supabase // Use imported supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('platform_user_id', userId) 
        .single<CustomerRow>();

      if (error) {
        if (error.code === 'PGRST116') return undefined; 

        const isMissingTableError = error.code === '42P01' || 
                                  (typeof error.message === 'string' && 
                                   error.message.toLowerCase().includes('relation') && 
                                   error.message.toLowerCase().includes('does not exist'));
        if (isMissingTableError) {
          console.warn(`Supabase getCustomerById: Tabela "customers" não encontrada ao buscar ID ${id} (code: ${error.code}). Retornando undefined.`);
          return undefined;
        }
        console.error('Supabase getCustomerById error:', error);
        throw new Error(error.message || 'Falha ao buscar cliente.');
      }
      return data ? fromSupabaseCustomerRow(data) : undefined;
    } catch (genericError: any) {
      console.error('Exception in getCustomerById:', genericError);
      const isMissingTableInGenericError = typeof genericError.message === 'string' &&
                                           genericError.message.toLowerCase().includes('relation') &&
                                           genericError.message.toLowerCase().includes('does not exist');
      if (genericError.code === '42P01' || isMissingTableInGenericError) {
        console.warn(`Supabase getCustomerById: Tabela "customers" não encontrada ao buscar ID ${id} (capturado em exceção). Retornando undefined.`);
        return undefined;
      }
      throw new Error(genericError.message || 'Falha geral ao buscar cliente.');
    }
  },
};
