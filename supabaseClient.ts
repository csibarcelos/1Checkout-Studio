// Caminho: lib/supabase.ts (ou supabaseClient.ts)

import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types' // Verifique se este caminho está correto para seus tipos

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.')
}

// Exporta a instância única e corretamente inicializada do cliente
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// No final do seu arquivo supabaseClient.ts

// Helper para obter o ID do usuário logado de forma segura
export const getSupabaseUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

