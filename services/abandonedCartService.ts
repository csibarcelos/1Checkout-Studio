

import { AbandonedCart, AbandonedCartStatus, ApiErrorResponse } from '../types'; // Updated path
import { apiClient } from '../apiClient'; // Updated path

export interface CreateAbandonedCartPayload {
  productId: string;
  productName: string;
  potentialValueInCents: number;
  customerName?: string; // Made optional to align with some call sites, but CheckoutPage sends it.
  customerEmail: string;
  customerWhatsapp: string; // Added this field
}

export const abandonedCartService = {
  createAbandonedCartAttempt: async (payload: CreateAbandonedCartPayload): Promise<AbandonedCart> => {
    try {
      // The token for this operation relates to the product owner's context,
      // which apiClient.request should handle internally if it needs to derive platformUserId for storage.
      // For a public checkout page initiating this, the active user token (if any) isn't for the product owner.
      // So, passing null, assuming apiClient handles context based on product.
      return await apiClient.request<AbandonedCart, CreateAbandonedCartPayload>({
        method: 'POST',
        endpoint: '/abandoned-carts',
        body: payload,
        token: null, // Context is derived from product in payload by apiClient
      });
    } catch (error: any) {
      console.error('AbandonedCartService Error - createAbandonedCartAttempt:', error);
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError?.error?.message || 'Falha ao registrar tentativa de carrinho abandonado');
    }
  },

  getAbandonedCarts: async (token: string | null): Promise<AbandonedCart[]> => {
    try {
      return await apiClient.request<AbandonedCart[]>({
        method: 'GET',
        endpoint: '/abandoned-carts',
        token: token, // User's token to get their carts
      });
    } catch (error: any) {
      console.error('AbandonedCartService Error - getAbandonedCarts:', error);
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError?.error?.message || 'Falha ao buscar carrinhos abandonados');
    }
  },

  updateAbandonedCartStatus: async (cartId: string, status: AbandonedCartStatus, token: string | null): Promise<AbandonedCart> => {
    try {
      return await apiClient.request<AbandonedCart, AbandonedCartStatus>({
        method: 'PUT',
        endpoint: `/abandoned-carts/${cartId}/status`,
        body: status,
        token: token, // User's token to update their cart
      });
    } catch (error: any) {
      console.error('AbandonedCartService Error - updateAbandonedCartStatus:', error);
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError?.error?.message || 'Falha ao atualizar status do carrinho abandonado');
    }
  },

  deleteAbandonedCart: async (cartId: string, token: string | null): Promise<{ success: boolean }> => {
    try {
      return await apiClient.request<{ success: boolean }>({
        method: 'DELETE',
        endpoint: `/abandoned-carts/${cartId}`,
        token: token, // User's token to delete their cart
      });
    } catch (error: any) {
      console.error('AbandonedCartService Error - deleteAbandonedCart:', error);
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError?.error?.message || 'Falha ao deletar carrinho abandonado');
    }
  },
};