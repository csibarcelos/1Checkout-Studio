
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';

let supabaseInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const env = (import.meta as any).env;

  if (!env) {
    console.error("CRITICAL ERROR: import.meta.env is undefined inside getSupabaseClient(). This should not happen if Vite is working correctly.");
    throw new Error(
      'As variáveis de ambiente do Vite (import.meta.env) não estão disponíveis. ' +
      'Verifique a configuração do seu projeto Vite e o arquivo .env.'
    );
  }

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    let errorMessage = 'A URL e/ou a Chave Anônima do Supabase estão ausentes nas variáveis de ambiente. ';
    errorMessage += 'Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no seu arquivo .env na raiz do projeto, ';
    errorMessage += 'e que o servidor de desenvolvimento Vite foi reiniciado após quaisquer alterações no arquivo .env.';

    if (!env.VITE_SUPABASE_URL) {
      errorMessage += ' A variável VITE_SUPABASE_URL está faltando.';
      console.error("Supabase Env: VITE_SUPABASE_URL is missing from env object:", env);
    }
    if (!env.VITE_SUPABASE_ANON_KEY) {
      errorMessage += ' A variável VITE_SUPABASE_ANON_KEY está faltando.';
      console.error("Supabase Env: VITE_SUPABASE_ANON_KEY is missing from env object:", env);
    }
    throw new Error(errorMessage);
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};

// Helper para obter o ID do usuário logado de forma segura
export const getSupabaseUserId = async (): Promise<string | null> => {
  const client = getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  return session?.user?.id || null;
};

// Exporta uma instância para uso imediato, mas ela será inicializada na primeira chamada a getSupabaseClient.
// Isso é principalmente para manter a compatibilidade com importações diretas se alguma ainda existir,
// mas o ideal é sempre chamar getSupabaseClient().
export const supabase = {
    auth: {
        getSession: () => getSupabaseClient().auth.getSession(),
        onAuthStateChange: (callback: any) => getSupabaseClient().auth.onAuthStateChange(callback),
        signInWithPassword: (credentials: any) => getSupabaseClient().auth.signInWithPassword(credentials),
        signUp: (credentials: any) => getSupabaseClient().auth.signUp(credentials),
        signOut: () => getSupabaseClient().auth.signOut(),
        // Adicione outros métodos do supabase.auth que você usa aqui, delegando para getSupabaseClient().auth.METODO()
    },
    from: <T extends keyof Database['public']['Tables']>(table: T) => getSupabaseClient().from(table),
    // Adicione outros métodos do cliente Supabase de alto nível que você usa (rpc, storage, etc.)
} as SupabaseClient<Database>; // Cast para o tipo SupabaseClient para satisfazer o TypeScript
