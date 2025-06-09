
import { getSupabaseClient } from '../supabaseClient'; // Importar a função
import { SUPER_ADMIN_EMAIL } from '../constants'; 
import { AppUser } from '../contexts/AuthContext'; 
import { AuthUser } from '@supabase/supabase-js'; 

export const authService = {
  async getCurrentSupabaseUser(): Promise<AuthUser | null> {
    const supabase = getSupabaseClient(); // Obter o cliente
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  },

  async getCurrentAppUser(): Promise<AppUser | null> {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile for getCurrentAppUser:', error);
          return null; 
      }
      if (!profile) { 
        console.warn(`Profile not found for user ${session.user.id} in getCurrentAppUser.`);
         return { 
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            isSuperAdmin: (session.user.email === SUPER_ADMIN_EMAIL), 
            isActive: true, 
         };
      }

      return {
        id: session.user.id,
        email: session.user.email || '',
        name: profile.name || session.user.user_metadata?.name,
        isSuperAdmin: profile.is_super_admin || false,
        isActive: profile.is_active !== undefined ? profile.is_active : true,
        createdAt: profile.created_at || session.user.created_at,
      };

    } catch (fetchError) {
        console.error('Exception fetching profile for getCurrentAppUser:', fetchError);
        return null;
    }
  },

  async getToken(): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }
};
