
// services/settingsService.ts
import { AppSettings, PlatformSettings } from '../types'; // Adjusted path if types.ts is at root
import { apiClient } from '../apiClient'; // Adjusted path to root apiClient

export const settingsService = {
  getAppSettings: async (token: string | null): Promise<AppSettings> => {
    try {
      const settings = await apiClient.request<AppSettings>({
        method: 'GET',
        endpoint: '/settings',
        token: token,
      });
      return {
        ...settings,
        apiTokens: settings.apiTokens || { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false }, 
      };
    } catch (errorResponse: any) {
      console.error('Error fetching app settings:', errorResponse);
      return { 
        checkoutIdentity: {}, 
        apiTokens: { 
          pushinPay: '', 
          utmify: '', 
          pushinPayEnabled: false, 
          utmifyEnabled: false 
        } 
      };
    }
  },

  saveAppSettings: async (settings: Partial<AppSettings>, token: string | null): Promise<AppSettings> => {
    try {
      return await apiClient.request<AppSettings, Partial<AppSettings>>({
        method: 'POST', 
        endpoint: '/settings',
        body: settings,
        token: token,
      });
    } catch (errorResponse: any) {
      console.error('Error saving app settings:', errorResponse);
      throw new Error(errorResponse?.error?.message || 'Falha ao salvar configurações do usuário');
    }
  },

  // For Super Admin
  getPlatformSettings: async (token: string | null): Promise<PlatformSettings> => {
    try {
      return await apiClient.request<PlatformSettings>({
        method: 'GET',
        endpoint: '/platform-settings', // Super admin endpoint
        token: token, // Requires super admin token
      });
    } catch (errorResponse: any) {
      console.error('Error fetching platform settings:', errorResponse);
      // Return a default or throw, depending on desired error handling
      throw new Error(errorResponse?.error?.message || 'Falha ao buscar configurações da plataforma');
    }
  },

  savePlatformSettings: async (settings: Partial<PlatformSettings>, token: string | null): Promise<PlatformSettings> => {
    try {
      return await apiClient.request<PlatformSettings, Partial<PlatformSettings>>({
        method: 'POST',
        endpoint: '/platform-settings', // Super admin endpoint
        body: settings,
        token: token, // Requires super admin token
      });
    } catch (errorResponse: any) {
      console.error('Error saving platform settings:', errorResponse);
      throw new Error(errorResponse?.error?.message || 'Falha ao salvar configurações da plataforma');
    }
  },
};