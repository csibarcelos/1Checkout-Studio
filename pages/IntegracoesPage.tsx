
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button, ToggleSwitch } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { settingsService } from '../services/settingsService';
import { AppSettings } from '../types';
import { LinkIcon, KeyIcon } from '../constants'; 
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

export const IntegracoesPage: React.FC = () => {
  const [pushinPayToken, setPushinPayToken] = useState('');
  const [utmifyToken, setUtmifyToken] = useState('');
  const [pushinPayEnabled, setPushinPayEnabled] = useState(false);
  const [utmifyEnabled, setUtmifyEnabled] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { accessToken } = useAuth(); // Get accessToken

  const fetchSettings = useCallback(async () => {
    if (!accessToken) {
        // setIsLoading(false); // No need to set loading if there's no accessToken yet, useEffect below handles it.
        // setError("Autenticação necessária para carregar configurações."); // Or handle silently
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const settings = await settingsService.getAppSettings(accessToken); // Pass accessToken
      setPushinPayToken(settings.apiTokens?.pushinPay || '');
      setUtmifyToken(settings.apiTokens?.utmify || '');
      setPushinPayEnabled(settings.apiTokens?.pushinPayEnabled || false);
      setUtmifyEnabled(settings.apiTokens?.utmifyEnabled || false);
    } catch (err) {
      setError('Falha ao carregar configurações de integração.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // Only fetch if accessToken is available. AuthContext handles initial accessToken loading.
    if (accessToken) {
        fetchSettings();
    } else if (accessToken === null && !isLoading) { // Explicitly null means auth check done, no accessToken
        setIsLoading(false); // Stop loading if no accessToken and not already loading.
        setError("Faça login para gerenciar integrações."); // Or a gentler message
    }
  }, [fetchSettings, accessToken, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
        setError("Autenticação necessária para salvar configurações.");
        return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Fetch current settings again to ensure we're not overwriting other parts unintentionally
      // This is good practice if AppSettings becomes more complex.
      // For now, since we are only modifying apiTokens, we could construct it directly.
      // const currentSettings = await settingsService.getAppSettings(accessToken); 
      
      const settingsToSave: Partial<AppSettings> = { // Send only what's changing
        apiTokens: {
            pushinPay: pushinPayToken.trim(),
            utmify: utmifyToken.trim(),
            pushinPayEnabled: pushinPayEnabled,
            utmifyEnabled: utmifyEnabled,
        }
      };

      await settingsService.saveAppSettings(settingsToSave, accessToken); // Pass accessToken
      setSuccessMessage('Configurações de integração salvas com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar configurações.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-neutral-600">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <LinkIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Integrações</h1>
      </div>
      
      <Card title="Tokens de API">
        <form onSubmit={handleSubmit} className="space-y-8">
          <p className="text-sm text-neutral-600">
            Insira seus tokens de API para integrar com serviços externos e habilite as integrações desejadas.
          </p>
          
          <div className="space-y-3">
            <Input
              label="Token da API PushInPay"
              name="pushinPayToken"
              type="password" 
              value={pushinPayToken}
              onChange={(e) => setPushinPayToken(e.target.value)}
              placeholder="Cole seu token da PushInPay aqui"
              icon={<KeyIcon className="h-5 w-5 text-neutral-400" />}
              autoComplete="off"
              disabled={isSaving || !accessToken}
            />
            <ToggleSwitch
              label="Habilitar Integração PushInPay"
              enabled={pushinPayEnabled}
              onChange={setPushinPayEnabled}
            />
          </div>
          
          <div className="space-y-3">
            <Input
              label="Token da API UTMify"
              name="utmifyToken"
              type="password"
              value={utmifyToken}
              onChange={(e) => setUtmifyToken(e.target.value)}
              placeholder="Cole seu token da UTMify aqui"
              icon={<KeyIcon className="h-5 w-5 text-neutral-400" />}
              autoComplete="off"
              disabled={isSaving || !accessToken}
            />
             <ToggleSwitch
              label="Habilitar Integração UTMify"
              enabled={utmifyEnabled}
              onChange={setUtmifyEnabled}
            />
          </div>

          {error && <p className="text-sm text-red-600 p-3 bg-red-50 rounded-md">{error}</p>}
          {successMessage && <p className="text-sm text-green-600 p-3 bg-green-50 rounded-md">{successMessage}</p>}
          
          <div className="flex justify-end pt-4 border-t border-neutral-200">
            <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving || !accessToken}>
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Card>

       <Card title="Outras Integrações">
        <div className="text-center py-10">
          <LinkIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 max-w-md mx-auto">
            Pixels de rastreamento (Facebook, Google Ads, TikTok), webhooks e outras integrações avançadas estarão disponíveis aqui em breve.
          </p>
          <div className="mt-6">
            <span className="inline-block bg-yellow-200 text-yellow-800 text-sm font-semibold px-3 py-1.5 rounded-full">
              EM BREVE
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};