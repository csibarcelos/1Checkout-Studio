
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';

// Function to create the actual client instance, encapsulates env checks.
const createActualSupabaseClient = (): SupabaseClient<Database> => {
  const env = (import.meta as any).env;

  if (!env) {
    console.error("CRITICAL ERROR: import.meta.env is undefined inside createActualSupabaseClient(). This should not happen if Vite is working correctly.");
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

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Create and export the single instance directly.
// This runs when the module is first imported.
export const supabase: SupabaseClient<Database> = createActualSupabaseClient();

// Updated getSupabaseClient to return the already initialized instance.
// This maintains compatibility for any code still calling it as a function,
// though direct import of 'supabase' is now preferred.
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};

// Helper para obter o ID do usuário logado de forma segura, using the direct instance
export const getSupabaseUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};
