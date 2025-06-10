
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { settingsService } from '../services/settingsService';
import { AppSettings } from '../types';
import { CogIcon, COLOR_PALETTE_OPTIONS, CheckCircleIcon, InformationCircleIcon } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const initialAppSettings: AppSettings = {
  checkoutIdentity: {
    logoUrl: '',
    faviconUrl: '',
    brandColor: COLOR_PALETTE_OPTIONS[0].value,
  },
  customDomain: '',
  smtpSettings: {
    host: '',
    port: 587,
    user: '',
    pass: '',
  },
  apiTokens: { 
    pushinPay: '',
    utmify: '',
    pushinPayEnabled: false,
    utmifyEnabled: false,
  },
  pixelIntegrations: [], 
};


export const ConfiguracoesPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(initialAppSettings);
  const [pageLoading, setPageLoading] = useState(true); 
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { accessToken, isLoading: authIsLoading } = useAuth(); 

  const fetchSettings = useCallback(async () => {
    if (!accessToken) {
      setPageLoading(false);
      setError("Autenticação necessária para carregar configurações.");
      return;
    }
    setError(null);
    try {
      const fetchedSettings = await settingsService.getAppSettings(accessToken);
      setSettings(fetchedSettings); // Confia que fetchedSettings é um AppSettings completo e defaultado.
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar configurações.');
      console.error(err);
    } finally {
      setPageLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authIsLoading) {
        setPageLoading(true); 
        return;
    }
    if (accessToken) {
      fetchSettings();
    } else {
      setPageLoading(false); 
      setError("Autenticação necessária para visualizar as configurações.");
      setSettings(initialAppSettings); 
    }
  }, [fetchSettings, accessToken, authIsLoading]);

  const handleInputChange = (section: keyof AppSettings, field: string, value: any) => {
    setSettings(prev => {
      const sectionObject = prev[section] as Record<string, any> | undefined;
      if (typeof sectionObject === 'object' && sectionObject !== null) {
        return {
          ...prev,
          [section]: {
            ...sectionObject,
            [field]: value,
          },
        };
      }
      // Para campos de nível superior como customDomain
      return { ...prev, [field]: value } as AppSettings; 
    });
    if (successMessage) setSuccessMessage(null);
    if (error) setError(null);
  };
  
  const handleDirectFieldChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({...prev, [field]: value}));
    if (successMessage) setSuccessMessage(null);
    if (error) setError(null);
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setError("Autenticação necessária para salvar.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Apenas os campos que podem ser editados nesta página são passados.
      // apiTokens e pixelIntegrations são gerenciados em IntegracoesPage.
      const settingsToSave: Partial<AppSettings> = {
        checkoutIdentity: settings.checkoutIdentity,
        customDomain: settings.customDomain,
        smtpSettings: settings.smtpSettings,
        // apiTokens e pixelIntegrations não são modificados aqui, então não são incluídos
        // para evitar sobrescrevê-los com valores incompletos do estado local desta página.
        // settingsService.saveAppSettings deve fazer um merge inteligente ou buscar os valores completos antes.
        // Melhor ainda: settingsService.saveAppSettings deve aceitar apenas os campos que esta página gerencia.
        // Para o propósito desta correção, vamos assumir que settingsService.saveAppSettings
        // fará um upsert apenas dos campos fornecidos, ou que `settings` contém o estado completo.
        // O ideal seria que o service tivesse métodos mais granulares ou que a UI
        // carregasse e enviasse o objeto AppSettings completo.
        // Dado que getAppSettings retorna o AppSettings completo, settings state DEVE estar completo.
      };
      await settingsService.saveAppSettings(settings, accessToken); // Envia o objeto 'settings' completo
      setSuccessMessage('Configurações salvas com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar configurações.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (pageLoading) { 
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-neutral-600">Carregando configurações...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <CogIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Configurações da Conta</h1>
      </div>

      {error && <p className="my-4 text-sm text-red-600 p-3 bg-red-50 rounded-md border border-red-200">{error}</p>}
      {successMessage && <p className="my-4 text-sm text-green-600 p-3 bg-green-50 rounded-md border border-green-200 flex items-center"><CheckCircleIcon className="h-5 w-5 mr-2"/>{successMessage}</p>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card title="Identidade Visual Padrão do Checkout">
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Estas configurações serão usadas como padrão para seus checkouts, caso um produto específico não tenha sua própria personalização.
            </p>
            <Input
              label="URL do Logo Padrão"
              name="logoUrl"
              type="url"
              value={settings.checkoutIdentity?.logoUrl || ''}
              onChange={(e) => handleInputChange('checkoutIdentity', 'logoUrl', e.target.value)}
              placeholder="https://suamarca.com/logo.png"
              disabled={isSaving}
            />
            <Input
              label="URL do Favicon Padrão"
              name="faviconUrl"
              type="url"
              value={settings.checkoutIdentity?.faviconUrl || ''}
              onChange={(e) => handleInputChange('checkoutIdentity', 'faviconUrl', e.target.value)}
              placeholder="https://suamarca.com/favicon.ico"
              disabled={isSaving}
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Cor da Marca Padrão</label>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-2">
                {COLOR_PALETTE_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    onClick={() => handleInputChange('checkoutIdentity', 'brandColor', color.value)}
                    className={`h-8 w-full rounded border-2 ${settings.checkoutIdentity?.brandColor === color.value ? 'ring-2 ring-offset-1 ring-white border-white' : 'border-transparent hover:border-neutral-400'}`}
                    style={{ backgroundColor: color.value }}
                    disabled={isSaving}
                  />
                ))}
              </div>
              <Input
                name="customBrandColor"
                type="color"
                value={settings.checkoutIdentity?.brandColor || '#000000'}
                onChange={(e) => handleInputChange('checkoutIdentity', 'brandColor', e.target.value)}
                className="mt-1 h-10 w-full"
                disabled={isSaving}
              />
            </div>
          </div>
        </Card>

        <Card title="Domínio Personalizado">
            <div className="space-y-4">
                <Input
                    label="Seu Domínio Personalizado"
                    name="customDomain"
                    type="text"
                    value={settings.customDomain || ''}
                    onChange={(e) => handleDirectFieldChange('customDomain', e.target.value)}
                    placeholder="Ex: checkout.suamarca.com"
                    disabled={isSaving}
                />
                 <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm flex items-center">
                    <InformationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0"/>
                    <span>A funcionalidade de verificação e aplicação de domínio personalizado será implementada em breve. Por enquanto, você pode salvar seu domínio desejado.</span>
                </div>
            </div>
        </Card>

        <Card title="Configurações de SMTP (Envio de E-mails)">
             <div className="space-y-4">
                <Input
                    label="Host SMTP"
                    name="smtpHost"
                    value={settings.smtpSettings?.host || ''}
                    onChange={(e) => handleInputChange('smtpSettings', 'host', e.target.value)}
                    placeholder="Ex: smtp.seuprovedor.com"
                    disabled={isSaving}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                        label="Porta SMTP"
                        name="smtpPort"
                        type="number"
                        value={settings.smtpSettings?.port || ''}
                        onChange={(e) => handleInputChange('smtpSettings', 'port', parseInt(e.target.value))}
                        placeholder="Ex: 587"
                        disabled={isSaving}
                        className="sm:col-span-1"
                    />
                    <Input
                        label="Usuário SMTP"
                        name="smtpUser"
                        value={settings.smtpSettings?.user || ''}
                        onChange={(e) => handleInputChange('smtpSettings', 'user', e.target.value)}
                        placeholder="Seu email ou usuário SMTP"
                        disabled={isSaving}
                        className="sm:col-span-2"
                    />
                </div>
                <Input
                    label="Senha SMTP"
                    name="smtpPass"
                    type="password"
                    value={settings.smtpSettings?.pass || ''}
                    onChange={(e) => handleInputChange('smtpSettings', 'pass', e.target.value)}
                    placeholder="Sua senha SMTP"
                    disabled={isSaving}
                    autoComplete="new-password"
                />
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm flex items-center">
                     <InformationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0"/>
                    <span>A funcionalidade de teste de conexão e uso do SMTP personalizado para e-mails transacionais será implementada em breve.</span>
                </div>
             </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving || pageLoading || !accessToken}>
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  );
};
