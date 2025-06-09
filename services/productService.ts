
import { Product, Coupon, OrderBumpOffer, UpsellOffer, ProductCheckoutCustomization } from '../types';
import { getSupabaseClient, getSupabaseUserId } from '../supabaseClient'; // Importar a função
import { Database, Json } from '../types/supabase';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

const generateSlugFromName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') 
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-') 
    .substring(0, 50) + `-${Math.random().toString(36).substring(2, 7)}`; 
};

const fromSupabaseRow = (row: ProductRow): Product => {
  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceInCents: row.price_in_cents,
    imageUrl: row.image_url || undefined,
    checkoutCustomization: (row.checkout_customization as unknown as ProductCheckoutCustomization) || {},
    deliveryUrl: row.delivery_url || undefined,
    totalSales: row.total_sales || 0,
    clicks: row.clicks || 0,
    checkoutViews: row.checkout_views || 0,
    conversionRate: row.conversion_rate || 0,
    abandonmentRate: row.abandonment_rate || 0,
    orderBump: row.order_bump ? (row.order_bump as unknown as OrderBumpOffer) : undefined,
    upsell: row.upsell ? (row.upsell as unknown as UpsellOffer) : undefined,
    coupons: row.coupons ? (row.coupons as unknown as Coupon[]) : [],
  };
};


export const productService = {
  getProducts: async (_token: string | null): Promise<Product[]> => {
    const supabase = getSupabaseClient(); // Obter o cliente
    const userId = await getSupabaseUserId();
    if (!userId) {
        console.warn("productService.getProducts: User ID não encontrado. Retornando lista vazia.");
        return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('platform_user_id', userId); 

      if (error) throw error;
      return data ? data.map(fromSupabaseRow) : [];
    } catch (error: any) {
      console.error('Supabase getProducts error:', error);
      throw new Error(error.message || 'Falha ao buscar produtos');
    }
  },

  getProductById: async (id: string, _token: string | null): Promise<Product | undefined> => {
    const supabase = getSupabaseClient();
    const userId = await getSupabaseUserId(); 

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single<ProductRow>();

      if (error) {
        if (error.code === 'PGRST116') return undefined; 
        throw error;
      }
      // RLS should handle this, but an extra client-side check can be added if desired.
      // if (data && userId && data.platform_user_id !== userId) { /* ... */ }
      return data ? fromSupabaseRow(data) : undefined;
    } catch (error: any) {
      console.error('Supabase getProductById error:', error);
      throw new Error(error.message || 'Falha ao buscar produto');
    }
  },

  getProductBySlug: async (slug: string, _token: string | null): Promise<Product | undefined> => {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single<ProductRow>();

      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return data ? fromSupabaseRow(data) : undefined;
    } catch (error: any) {
      console.error('Supabase getProductBySlug error:', error);
      throw new Error(error.message || 'Falha ao buscar produto pelo slug');
    }
  },

  createProduct: async (
    productData: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'slug'>,
    _token: string | null
  ): Promise<Product> => {
    const supabase = getSupabaseClient();
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para criar produto.');

    const slug = generateSlugFromName(productData.name);

    const newProductData: ProductInsert = {
      platform_user_id: userId,
      slug: slug,
      name: productData.name,
      description: productData.description,
      price_in_cents: productData.priceInCents,
      image_url: productData.imageUrl,
      checkout_customization: productData.checkoutCustomization as unknown as Json,
      delivery_url: productData.deliveryUrl,
      order_bump: productData.orderBump as unknown as Json,
      upsell: productData.upsell as unknown as Json,
      coupons: productData.coupons as unknown as Json,
    };

    try {
      const { data, error } = await supabase
        .from('products')
        .insert(newProductData)
        .select()
        .single<ProductRow>();

      if (error) throw error;
      if (!data) throw new Error('Falha ao criar produto, dados não retornados.');
      return fromSupabaseRow(data);
    } catch (error: any) {
      console.error('Supabase createProduct error:', error);
      throw new Error(error.message || 'Falha ao criar produto');
    }
  },

  updateProduct: async (id: string, updates: Partial<Omit<Product, 'id' | 'platformUserId' | 'slug'>>, _token: string | null): Promise<Product | undefined> => {
    const supabase = getSupabaseClient();
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para atualizar produto.');
    
    const updatesForSupabase: ProductUpdate = {
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
        ...(updates.priceInCents !== undefined && { price_in_cents: updates.priceInCents }),
        ...(updates.imageUrl !== undefined && { image_url: updates.imageUrl }),
        ...(updates.checkoutCustomization && { checkout_customization: updates.checkoutCustomization as unknown as Json }),
        ...(updates.deliveryUrl !== undefined && { delivery_url: updates.deliveryUrl }),
        ...(updates.orderBump !== undefined && { order_bump: updates.orderBump as unknown as Json }),
        ...(updates.upsell !== undefined && { upsell: updates.upsell as unknown as Json }),
        ...(updates.coupons !== undefined && { coupons: updates.coupons as unknown as Json }),
    };

    try {
      const { data, error } = await supabase
        .from('products')
        .update(updatesForSupabase)
        .eq('id', id)
        .select()
        .single<ProductRow>();
        
      if (error) {
        if (error.code === 'PGRST116') return undefined; 
        throw error;
      }
      if (!data) throw new Error('Falha ao atualizar produto, dados não retornados.');
      return fromSupabaseRow(data);
    } catch (error: any) {
      console.error('Supabase updateProduct error:', error);
      throw new Error(error.message || 'Falha ao atualizar produto');
    }
  },

  deleteProduct: async (id: string, _token: string | null): Promise<boolean> => {
    const supabase = getSupabaseClient();
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para deletar produto.');
    try {
      const { error, count } = await supabase
        .from('products')
        .delete({ count: 'exact' }) 
        .eq('id', id);
        
      if (error) throw error;
      return count !== null && count > 0;
    } catch (error: any) {
      console.error('Supabase deleteProduct error:', error);
      throw new Error(error.message || 'Falha ao deletar produto');
    }
  },

  cloneProduct: async (id: string, token: string | null): Promise<Product | undefined> => {
    const userId = await getSupabaseUserId();
    if (!userId || !token) throw new Error('Usuário não autenticado para clonar produto.');

    try {
      const originalProduct = await productService.getProductById(id, token); 
      if (!originalProduct) throw new Error('Produto original não encontrado para clonar.');

      const {
        id: _id, platformUserId: _puid, slug: _slug, totalSales: _ts, clicks: _c,
        checkoutViews: _cv, conversionRate: _cr, abandonmentRate: _ar,
        ...clonableData
      } = originalProduct;
      
      const clonedProductData: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'slug'> = {
        ...clonableData,
        name: `${originalProduct.name} (Cópia)`,
      };
      return await productService.createProduct(clonedProductData, token); 
    } catch (error: any) {
      console.error('Supabase cloneProduct error:', error);
      throw new Error(error.message || 'Falha ao clonar produto');
    }
  }
};
