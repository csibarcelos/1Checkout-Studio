import { AppSettings, PlatformSettings, PixelIntegration } from '../types';
import { supabase, getSupabaseUserId } from '../supabaseClient'; // Updated import
import { Database, Json } from '../types/supabase';
import { COLOR_PALETTE_OPTIONS } from '@/constants.tsx';

type AppSettingsRow = Database['public']['Tables']['app_settings']['Row'];
type AppSettingsInsert = Database['public']['Tables']['app_settings']['Insert']; // Use Insert type for upsert payload

type PlatformSettingsRow = Database['public']['Tables']['platform_settings']['Row'];

const parseJsonField = <T>(field: Json | null | undefined, defaultValue: T): T => {
  if (field === null || field === undefined) {
    return defaultValue;
  }
  if (typeof field === 'object' && field !== null) { 
    return field as T;
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch (e) {
      console.warn('Failed to parse JSON string field:', field, e);
      return defaultValue;
    }
  }
  console.warn('Unexpected type for JSON field, returning default:', typeof field, field);
  return defaultValue;
};

const fromSupabaseAppSettingsRow = (row: AppSettingsRow | null): AppSettings => {
  const defaults: AppSettings = {
    checkoutIdentity: { logoUrl: '', faviconUrl: '', brandColor: COLOR_PALETTE_OPTIONS[0].value },
    customDomain: '',
    smtpSettings: { host: '', port: 587, user: '', pass: '' },
    apiTokens: { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false },
    pixelIntegrations: [],
  };
  if (!row) return defaults;

  const storedCheckoutIdentity = parseJsonField(row.checkout_identity, defaults.checkoutIdentity);
  const storedSmtpSettings = parseJsonField(row.smtp_settings, defaults.smtpSettings);
  const storedApiTokens = parseJsonField(row.api_tokens, defaults.apiTokens);
  const storedPixelIntegrations = parseJsonField<PixelIntegration[]>(row.pixel_integrations, defaults.pixelIntegrations || []);

  return {
    customDomain: row.custom_domain ?? defaults.customDomain,
    checkoutIdentity: {
      logoUrl: storedCheckoutIdentity?.logoUrl ?? defaults.checkoutIdentity.logoUrl,
      faviconUrl: storedCheckoutIdentity?.faviconUrl ?? defaults.checkoutIdentity.faviconUrl,
      brandColor: storedCheckoutIdentity?.brandColor ?? defaults.checkoutIdentity.brandColor,
    },
    smtpSettings: {
      host: storedSmtpSettings?.host ?? defaults.smtpSettings!.host,
      port: storedSmtpSettings?.port ?? defaults.smtpSettings!.port,
      user: storedSmtpSettings?.user ?? defaults.smtpSettings!.user,
      pass: storedSmtpSettings?.pass ?? defaults.smtpSettings!.pass,
    },
    apiTokens: {
        pushinPay: storedApiTokens?.pushinPay ?? defaults.apiTokens.pushinPay,
        utmify: storedApiTokens?.utmify ?? defaults.apiTokens.utmify,
        pushinPayEnabled: storedApiTokens?.pushinPayEnabled ?? defaults.apiTokens.pushinPayEnabled,
        utmifyEnabled: storedApiTokens?.utmifyEnabled ?? defaults.apiTokens.utmifyEnabled,
    },
    pixelIntegrations: storedPixelIntegrations ?? [], 
  };
};

const toSupabaseAppSettingsDbObjectForUpsert = (userId: string, settings: Partial<AppSettings>): AppSettingsInsert => {
  const dbObject: AppSettingsInsert = {
    platform_user_id: userId,
    updated_at: new Date().toISOString(),
    custom_domain: settings.customDomain !== undefined ? settings.customDomain : null,
    checkout_identity: settings.checkoutIdentity !== undefined ? settings.checkoutIdentity as unknown as Json : null,
    smtp_settings: settings.smtpSettings !== undefined ? settings.smtpSettings as unknown as Json : null,
    api_tokens: settings.apiTokens !== undefined ? settings.apiTokens as unknown as Json : null,
    pixel_integrations: settings.pixelIntegrations !== undefined ? settings.pixelIntegrations as unknown as Json : null,
  };
  
  if (settings.customDomain !== undefined) dbObject.custom_domain = settings.customDomain;
  if (settings.checkoutIdentity !== undefined) dbObject.checkout_identity = settings.checkoutIdentity as unknown as Json;
  if (settings.smtpSettings !== undefined) dbObject.smtp_settings = settings.smtpSettings as unknown as Json;
  if (settings.apiTokens !== undefined) dbObject.api_tokens = settings.apiTokens as unknown as Json;
  if (settings.pixelIntegrations !== undefined) dbObject.pixel_integrations = settings.pixelIntegrations as unknown as Json;
  
  return dbObject;
};

const fromSupabasePlatformSettingsRow = (row: PlatformSettingsRow | null): PlatformSettings => {
    const defaults: PlatformSettings = {
        id: 'global', platformCommissionPercentage: 0.01,
        platformFixedFeeInCents: 100, platformAccountIdPushInPay: '',
    };
    if (!row) return defaults;
    return {
        id: 'global',
        platformCommissionPercentage: row.platform_commission_percentage ?? defaults.platformCommissionPercentage,
        platformFixedFeeInCents: row.platform_fixed_fee_in_cents ?? defaults.platformFixedFeeInCents,
        platformAccountIdPushInPay: row.platform_account_id_push_in_pay ?? defaults.platformAccountIdPushInPay,
    };
};

export const settingsService = {
  getAppSettings: async (_token?: string | null): Promise<AppSettings> => {
    const userId = await getSupabaseUserId();
    if (!userId) {
        console.warn('getAppSettings: User not authenticated. Returning default settings.');
        return fromSupabaseAppSettingsRow(null);
    }
    try {
      const { data, error } = await supabase.from('app_settings').select('*').eq('platform_user_id', userId).single(); 
      if (error && error.code !== 'PGRST116') { 
        console.error('Supabase getAppSettings error:', error.message, `Details: ${error.details}`, `Hint: ${error.hint}`, `Code: ${error.code}`); 
        throw new Error(error.message || 'Falha ao buscar configurações do usuário');
      }
      return fromSupabaseAppSettingsRow(data as AppSettingsRow | null);
    } catch (error: any) { 
      console.error('Exception in getAppSettings:', error); 
      throw new Error(error.message || 'Falha geral ao buscar configurações do usuário'); 
    }
  },

  getAppSettingsByUserId: async (targetUserId: string, _token?: string | null): Promise<AppSettings> => {
    try {
      const { data, error } = await supabase 
        .from('app_settings')
        .select('*')
        .eq('platform_user_id', targetUserId)
        .limit(1); 

      if (error) {
        console.error(`Supabase getAppSettingsByUserId (target: ${targetUserId}) error:`, error.message, `Details: ${error.details}`, `Hint: ${error.hint}`, `Code: ${error.code}`);
        throw new Error(error.message || `Falha ao buscar configurações para o usuário ${targetUserId}`);
      }
      const rowData = data && data.length > 0 ? data[0] : null;
      return fromSupabaseAppSettingsRow(rowData as AppSettingsRow | null);
    } catch (error: any) {
      console.error(`Exception in getAppSettingsByUserId (target: ${targetUserId}):`, error);
      throw new Error(error.message || `Falha geral ao buscar configurações para o usuário ${targetUserId}`);
    }
  },

  saveAppSettings: async (settings: Partial<AppSettings>, _token?: string | null): Promise<AppSettings> => {
    const userId = await getSupabaseUserId();
    if (!userId) throw new Error('Usuário não autenticado para salvar configurações.');
    
    const dbObject = toSupabaseAppSettingsDbObjectForUpsert(userId, settings);

    try {
      const { data, error } = await supabase 
        .from('app_settings')
        .upsert(dbObject, { onConflict: 'platform_user_id' }) 
        .select()
        .single();
        
      if (error) { 
        console.error('Supabase saveAppSettings error:', error.message, `Details: ${error.details}`, `Hint: ${error.hint}`, `Code: ${error.code}`); 
        throw new Error(error.message || 'Falha ao salvar configurações do usuário'); 
      }
      if (!data) throw new Error('Falha ao salvar configurações, dados não retornados.');
      return fromSupabaseAppSettingsRow(data as AppSettingsRow);
    } catch (error: any) { 
      console.error('Exception in saveAppSettings:', error); 
      throw new Error(error.message || 'Falha geral ao salvar configurações do usuário'); 
    }
  },

  getPlatformSettings: async (_token?: string | null): Promise<PlatformSettings> => {
    try {
      const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 'global').single(); 
      if (error && error.code !== 'PGRST116') { 
        console.error('Supabase getPlatformSettings error:', error.message, `Details: ${error.details}`, `Hint: ${error.hint}`, `Code: ${error.code}`); 
        throw new Error(error.message || 'Falha ao buscar configurações da plataforma'); 
      }
      return fromSupabasePlatformSettingsRow(data as PlatformSettingsRow | null);
    } catch (error: any) { 
      console.error('Exception in getPlatformSettings:', error); 
      throw new Error(error.message || 'Falha geral ao buscar configurações da plataforma'); 
    }
  },

  savePlatformSettings: async (settings: Partial<PlatformSettings>, _token?: string | null): Promise<PlatformSettings> => {
    const dataForUpsert: Database['public']['Tables']['platform_settings']['Insert'] = { 
        id: 'global',
        platform_commission_percentage: settings.platformCommissionPercentage ?? 0,
        platform_fixed_fee_in_cents: settings.platformFixedFeeInCents ?? 0,       
        platform_account_id_push_in_pay: settings.platformAccountIdPushInPay ?? "", 
        updated_at: new Date().toISOString(),
    };
    
    try {
      const { data, error } = await supabase 
        .from('platform_settings')
        .upsert(dataForUpsert, { onConflict: 'id' }) 
        .select()
        .single();

      if (error) { 
        console.error('Supabase savePlatformSettings error:', error.message, `Details: ${error.details}`, `Hint: ${error.hint}`, `Code: ${error.code}`); 
        if (error.details) console.error('Supabase error details:', error.details);
        if (error.hint) console.error('Supabase error hint:', error.hint);
        throw new Error(error.message || 'Falha ao salvar configurações da plataforma');
      }
      if (!data) throw new Error('Falha ao salvar configurações da plataforma, dados não retornados.');
      return fromSupabasePlatformSettingsRow(data as PlatformSettingsRow);
    } catch (error: any) { 
      console.error('Exception in savePlatformSettings:', error); 
      throw new Error(error.message || 'Falha geral ao salvar configurações da plataforma');
    }
  },
};