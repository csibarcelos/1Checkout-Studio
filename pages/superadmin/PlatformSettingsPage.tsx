
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { settingsService } from '../../services/settingsService';
import { PlatformSettings } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { CogIcon, CurrencyDollarIcon, KeyIcon } from '../../constants'; // Updated import

export const PlatformSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [fixedFeeInCents, setFixedFeeInCents] = useState('');
  const [platformAccountId, setPlatformAccountId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const fetchPlatformSettings = useCallback(async () => {
    if (!accessToken) {
        setIsLoading(false);
        setError("Autenticação de super admin necessária.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSettings = await settingsService.getPlatformSettings(accessToken);
      setSettings(fetchedSettings);
      setCommissionPercentage((fetchedSettings.platformCommissionPercentage * 100).toFixed(2)); // Store as % string
      setFixedFeeInCents((fetchedSettings.platformFixedFeeInCents / 100).toFixed(2)); // Store as R$ string
      setPlatformAccountId(fetchedSettings.platformAccountIdPushInPay);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar configurações da plataforma.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPlatformSettings();
  }, [fetchPlatformSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setError("Autenticação de super admin necessária para salvar.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const parsedPercentage = parseFloat(commissionPercentage.replace(',', '.')) / 100;
    const parsedFixedFee = Math.round(parseFloat(fixedFeeInCents.replace(',', '.')) * 100);

    if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 1) {
      setError("Percentual de comissão inválido. Deve ser entre 0 e 100%.");
      setIsSaving(false);
      return;
    }
    if (isNaN(parsedFixedFee) || parsedFixedFee < 0) {
      setError("Taxa fixa inválida.");
      setIsSaving(false);
      return;
    }
    if (!platformAccountId.trim()) {
        setError("ID da Conta PushInPay da Plataforma é obrigatório.");
        setIsSaving(false);
        return;
    }

    try {
      const settingsToSave: Partial<PlatformSettings> = {
        platformCommissionPercentage: parsedPercentage,
        platformFixedFeeInCents: parsedFixedFee,
        platformAccountIdPushInPay: platformAccountId.trim(),
      };
      await settingsService.savePlatformSettings(settingsToSave, accessToken);
      setSuccessMessage('Configurações da plataforma salvas com sucesso!');
      // Optionally re-fetch or update local state directly if API returns the full updated object
      if (settings) { // Update local state if already loaded
        setSettings(prev => prev ? ({...prev, ...settingsToSave, id: 'global'}) : null);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar configurações da plataforma.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <CogIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Configurações da Plataforma</h1>
      </div>

      <Card title="Definições de Comissão e Pagamento">
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-neutral-600">
            Defina as taxas de comissão da plataforma e a conta para recebimento.
          </p>
          
          <Input
            label="Comissão da Plataforma (%)"
            name="commissionPercentage"
            type="text"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            placeholder="Ex: 1.00 para 1%"
            icon={<CurrencyDollarIcon className="h-5 w-5 text-neutral-400" />}
            disabled={isSaving}
          />
          <Input
            label="Taxa Fixa da Plataforma (R$)"
            name="fixedFeeInCents"
            type="text"
            value={fixedFeeInCents}
            onChange={(e) => setFixedFeeInCents(e.target.value)}
            placeholder="Ex: 1,00 para R$1,00"
            icon={<CurrencyDollarIcon className="h-5 w-5 text-neutral-400" />}
            disabled={isSaving}
          />
           <Input
            label="ID da Conta PushInPay da Plataforma"
            name="platformAccountId"
            type="text"
            value={platformAccountId}
            onChange={(e) => setPlatformAccountId(e.target.value)}
            placeholder="UUID da conta PushInPay"
            icon={<KeyIcon className="h-5 w-5 text-neutral-400" />}
            disabled={isSaving}
          />

          {error && <p className="text-sm text-red-600 p-3 bg-red-50 rounded-md">{error}</p>}
          {successMessage && <p className="text-sm text-green-600 p-3 bg-green-50 rounded-md">{successMessage}</p>}
          
          <div className="flex justify-end pt-4 border-t border-neutral-200">
            <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
              Salvar Configurações da Plataforma
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};