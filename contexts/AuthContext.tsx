
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { AuthUser, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabaseClient';
import { User as AppUserType } from '../types';
import { Database } from '../types/supabase';
import { SUPER_ADMIN_EMAIL } from '../constants';

export interface AppUser extends AppUserType {
  isSuperAdmin: boolean;
  isActive: boolean;
}

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password_not_name: string) => Promise<void>;
  register: (email: string, name: string, password_not_name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_FETCH_TIMEOUT = 7000; 
const TIMEOUT_SYMBOL = Symbol("timeout");

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchUserProfile = useCallback(async (supabaseUser: AuthUser | null): Promise<AppUser | null> => {
    if (!supabaseUser?.id) {
      return null;
    }
    const client = getSupabaseClient();

    let queryResponse: { data: ProfileRow | null; error: any; status: number; count: number | null; } | null = null;

    try {
      const supabaseQueryPromise = client
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single<ProfileRow>();

      const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve(TIMEOUT_SYMBOL), PROFILE_FETCH_TIMEOUT)
      );

      const raceResult = await Promise.race([supabaseQueryPromise, timeoutPromise]);

      if (raceResult === TIMEOUT_SYMBOL) {
        console.warn(`AuthContext: fetchUserProfile - Supabase query TIMED OUT after ${PROFILE_FETCH_TIMEOUT / 1000}s for user ${supabaseUser.id}. A aplicação usará um perfil de fallback. Verifique a performance da consulta à tabela 'profiles' no Supabase (índices, RLS, etc).`);
        queryResponse = { data: null, error: { message: 'Profile fetch timed out', code: 'TIMEOUT' }, status: 0, count: null };
      } else {
        queryResponse = raceResult as { data: ProfileRow | null; error: any; status: number; count: number | null; };
      }

      const { data: profileData, error: profileError } = queryResponse;

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile not found is not a critical error, we fallback.
          console.warn(`AuthContext: fetchUserProfile - Profile not found for user ${supabaseUser.id} (PGRST116). Usando fallback.`);
        } else if (profileError.code === 'TIMEOUT') {
           // Already logged timeout warning
        } else {
          console.error(`AuthContext: fetchUserProfile - Error fetching profile (status: ${queryResponse?.status}, code: ${profileError.code}):`, profileError.message, profileError);
        }
        // Fallback user profile
        return {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário (Sem Perfil DB)',
          isSuperAdmin: supabaseUser.email === SUPER_ADMIN_EMAIL,
          isActive: true, // Assume active on error/timeout for fallback
          createdAt: supabaseUser.created_at,
        };
      }

      if (!profileData) {
        console.warn(`AuthContext: fetchUserProfile - Profile data is null for user ${supabaseUser.id}. Usando fallback.`);
        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário (Perfil Vazio DB)',
            isSuperAdmin: supabaseUser.email === SUPER_ADMIN_EMAIL,
            isActive: true, // Assume active if profile is empty for fallback
            createdAt: supabaseUser.created_at,
        };
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email || (profileData.email || ''),
        name: profileData.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário',
        isSuperAdmin: profileData.is_super_admin || (supabaseUser.email === SUPER_ADMIN_EMAIL),
        isActive: profileData.is_active !== undefined ? profileData.is_active : true,
        createdAt: profileData.created_at || supabaseUser.created_at,
      };

    } catch (fetchError: any) {
      console.error(`AuthContext: fetchUserProfile - GENERAL EXCEPTION during profile fetch for user ${supabaseUser.id}:`, fetchError.message, fetchError.stack, fetchError);
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário (Exceção Perfil)',
        isSuperAdmin: supabaseUser.email === SUPER_ADMIN_EMAIL,
        isActive: true, // Assume active on general exception for fallback
        createdAt: supabaseUser.created_at,
      };
    }
  }, []);

  const processSessionAndUser = useCallback(async (currentSession: Session | null) => {
    if (!mountedRef.current) {
      return;
    }

    if (mountedRef.current) setIsLoading(true);

    try {
      setSession(currentSession);
      let appUser: AppUser | null = null;

      if (currentSession?.user) {
        appUser = await fetchUserProfile(currentSession.user);
      }

      if (mountedRef.current) {
        setUser(appUser);
      }
    } catch (e: any) {
      console.error("AuthContext: processSessionAndUser - Error:", e.message, e.stack);
      if (mountedRef.current) {
        setUser(null);
        setSession(null); // Also clear session on error
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    mountedRef.current = true;
    const client = getSupabaseClient();

    setIsLoading(true);
    client.auth.getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!mountedRef.current) {
          return;
        }
        await processSessionAndUser(initialSession);
      })
      .catch(err => {
        if (mountedRef.current) {
          console.error("AuthContext: getSession.catch - Error fetching initial session:", err);
          setUser(null);
          setSession(null);
          setIsLoading(false);
        }
      });

    const { data: authListener } = client.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mountedRef.current) {
          return;
        }
        await processSessionAndUser(newSession);
      }
    );

    return () => {
      mountedRef.current = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [processSessionAndUser]);

  const login = useCallback(async (email: string, password_not_name: string) => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    const client = getSupabaseClient();
    try {
      const { error } = await client.auth.signInWithPassword({ email, password: password_not_name });
      if (error) throw error;
      // processSessionAndUser will be triggered by onAuthStateChange
    } catch (error: any) {
      console.error("AuthContext: login - Error:", error.message, error.stack);
      if (mountedRef.current) setIsLoading(false); // Reset loading on login failure
      throw new Error(error.message || 'Falha no login.');
    }
  }, []);

  const register = useCallback(async (email: string, name: string, password_not_name: string) => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    const client = getSupabaseClient();
    try {
      const { data: signUpResponse, error: signUpError } = await client.auth.signUp({
        email,
        password: password_not_name,
        options: { data: { name: name } },
      });
      if (signUpError) throw signUpError;
      if (!signUpResponse.user) throw new Error("Registro falhou, usuário não retornado.");
      // processSessionAndUser will be triggered by onAuthStateChange
    } catch (error: any) {
      console.error("AuthContext: register - Error:", error.message, error.stack);
      if (mountedRef.current) setIsLoading(false); // Reset loading on register failure
      throw new Error(error.message || 'Falha no registro.');
    }
  }, []);

  const logout = useCallback(async () => {
    if (!mountedRef.current) return;
    // setIsLoading(true); // Opcional: mostrar loading no logout
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      console.error("AuthContext: logout - Error during signOut:", error.message, error.stack);
       // Mesmo com erro, onAuthStateChange deve limpar a sessão.
       // Mas se onAuthStateChange falhar ou não disparar por algum motivo,
       // limpamos o estado local como fallback.
       if (mountedRef.current) {
           setUser(null);
           setSession(null);
           // setIsLoading(false); // Se o loading foi ativado no início do logout
       }
    }
    // processSessionAndUser will be triggered by onAuthStateChange to set user/session to null
  }, []);

  // isAuthenticated agora depende de `user` (que pode ser de fallback) e seu `isActive`
  // Se `user` for null, isAuthenticated será false.
  // Se `user` for um fallback, `isActive` será true. Se for do DB, será o valor do DB.
  const isAuthenticated = !!session && !!user && user.isActive !== false;
  const isSuperAdminValue = isAuthenticated && !!user?.isSuperAdmin;
  const accessToken = session?.access_token || null;

  const contextValue = useMemo(() => ({
    user,
    session,
    accessToken,
    isAuthenticated,
    isSuperAdmin: isSuperAdminValue,
    login,
    register,
    logout,
    isLoading, // Este isLoading agora fica true até o perfil ser carregado (ou timeout)
  }), [user, session, accessToken, isAuthenticated, isSuperAdminValue, login, register, logout, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
