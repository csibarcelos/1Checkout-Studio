
// import { ApiSimError as OriginalApiSimError } from './types'; // Removed: ApiSimError is local, OriginalApiSimError not used.

// A classe ApiSimError pode ser útil se os serviços precisarem lançar erros lógicos
// específicos que não são diretamente do Supabase.
export class ApiSimError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ApiSimError';
    this.status = status;
  }
}

// apiClient.ts agora está essencialmente vazio de lógica de mock.
// Os serviços (`productService`, `salesService`, etc.) devem usar
// `getSupabaseClient()` e `getSupabaseUserId()` diretamente para interagir com o Supabase.

// Lógica de inicialização de dados mock, como a criação de produtos padrão
// ou usuários superadmin, foi removida. Isso agora deve ser gerenciado
// diretamente no seu banco de dados Supabase ou através de scripts de seed do Supabase.

console.log("apiClient.ts: Mock API layer has been removed. All services should now use Supabase directly.");

// Se houver funções de utilidade muito genéricas que eram usadas aqui e ainda são necessárias
// em múltiplos serviços (e não são específicas de mock), elas poderiam ser movidas para
// um arquivo de `utils.ts` separado. No entanto, a maioria das funções aqui era para
// suportar o mock.