
import { UtmifyOrderPayload, UtmifyResponse } from '../types'; // Corrected path
import { UTMIFY_API_BASE } from '../constants'; // Corrected path

export const utmifyService = {
  // UTMIFY_TOKEN is now passed directly, presumably fetched by the caller using user-specific settings
  sendOrderData: async (payload: UtmifyOrderPayload, utmifyToken?: string): Promise<UtmifyResponse> => {
    // The caller (apiClient) is responsible for checking if UTMify is enabled for the specific user
    // and for providing the correct user-specific token.

    if (!utmifyToken || utmifyToken.trim() === '') {
      const errorMessage = 'Token da API UTMify não fornecido ou inválido para o serviço UTMify.';
      console.log("UTMifyService Info:", errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
    
    console.log('UTMifyService: Attempting to send REAL order data to UTMify with provided token:', payload);
    const utmifyEndpoint = `${UTMIFY_API_BASE}/orders`;

    try {
      const response = await fetch(utmifyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': utmifyToken, 
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Falha ao enviar dados para UTMify API: ${response.status} - ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorBody.error?.message || errorBody.error || errorMessage;
          console.error('UTMifyService Error - API response body:', errorBody);
        } catch (e) {
          const textError = await response.text();
          console.error('UTMifyService Error - API non-JSON response body:', textError);
        }
        console.error('UTMifyService Error - API call failed:', errorMessage, 'Status:', response.status);
        return {
          success: false,
          message: errorMessage,
        };
      }

      const responseData = await response.json();
      console.log('UTMifyService: Successfully sent data to UTMify. Response:', responseData);
      return {
        success: true,
        message: 'Dados enviados com sucesso para UTMify.',
        data: responseData,
      };

    } catch (error: any) {
      console.error('UTMifyService Error - Network error or other JS error during sendOrderData:', error);
      return {
        success: false,
        message: error.message || 'Erro de rede ao tentar enviar dados para UTMify.',
      };
    }
  },
};
