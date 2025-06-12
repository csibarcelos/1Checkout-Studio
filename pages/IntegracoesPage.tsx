
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button, ToggleSwitch } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { settingsService } from '../services/settingsService';
import { AppSettings, PixelIntegration, PixelType } from '../types';
import { LinkIcon, KeyIcon, PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@/constants.tsx';
import { useAuth } from '../contexts/AuthContext';

const PIXEL_TYPES: PixelType[] = ['Facebook Pixel', 'Google Ads', 'GTM', 'TikTok Pixel'];

export const IntegracoesPage: React.FC = () => {
  const [pushinPayToken, setPushinPayToken] = useState('');
  const [utmifyToken, setUtmifyToken] = useState('');
  const [pushinPayEnabled, setPushinPayEnabled] = useState(false);
  const [utmifyEnabled, setUtmifyEnabled] = useState(false);
  const [pixelIntegrations, setPixelIntegrations] = useState<PixelIntegration[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<PixelIntegration | null>(null);
  const [currentPixelType, setCurrentPixelType] = useState<PixelType>(PIXEL_TYPES[0]);
  const [currentPixelSettings, setCurrentPixelSettings] = useState<Record<string, string>>({});
  const [currentPixelEnabled, setCurrentPixelEnabled] = useState(true);
  const [pixelModalError, setPixelModalError] = useState<string | null>(null);


  const { accessToken, isLoading: authIsLoading } = useAuth(); // Renomeado isLoading de useAuth

  const fetchSettings = useCallback(async () => {
    if (!accessToken) {
      // Não definir isLoading aqui, pois o efeito principal já lida com authIsLoading
      setError("Autenticação necessária para carregar configurações.");
      return;
    }
    setIsLoading(true); // Loading da página de Integrações
    setError(null);
    try {
      const settings = await settingsService.getAppSettings(accessToken);
      setPushinPayToken(settings.apiTokens?.pushinPay || '');
      setUtmifyToken(settings.apiTokens?.utmify || '');
      setPushinPayEnabled(settings.apiTokens?.pushinPayEnabled || false);
      setUtmifyEnabled(settings.apiTokens?.utmifyEnabled || false);
      setPixelIntegrations(settings.pixelIntegrations || []);
    } catch (err) {
      setError('Falha ao carregar configurações de integração.');
      console.error(err);
    } finally {
      setIsLoading(false); // Loading da página de Integrações
    }
  }, [accessToken]);

  useEffect(() => {
    if (authIsLoading) { // Esperar o AuthContext carregar
        setIsLoading(true); // Manter a página de integrações em loading
        return;
    }
    if (accessToken) {
        fetchSettings();
    } else {
        setIsLoading(false); // Auth carregou, mas não há token
        setError("Faça login para gerenciar integrações.");
    }
  }, [fetchSettings, accessToken, authIsLoading]);

  const handleSubmitApiTokens = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accessToken) {
        setError("Autenticação necessária para salvar configurações.");
        return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const settingsToSave: Partial<AppSettings> = {
        apiTokens: {
            pushinPay: pushinPayToken.trim(),
            utmify: utmifyToken.trim(),
            pushinPayEnabled: pushinPayEnabled,
            utmifyEnabled: utmifyEnabled,
        },
        pixelIntegrations: pixelIntegrations
      };
      await settingsService.saveAppSettings(settingsToSave, accessToken);
      setSuccessMessage('Configurações de API salvas com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar tokens de API.');
    } finally {
      setIsSaving(false);
    }
  };

  const openPixelModal = (pixel?: PixelIntegration) => {
    setEditingPixel(pixel || null);
    const typeToSet = pixel?.type || PIXEL_TYPES[0];
    setCurrentPixelType(typeToSet);
    
    let initialSettings: Record<string, string> = {};
    switch(typeToSet) {
        case 'Facebook Pixel': initialSettings = { pixelId: '' }; break;
        case 'Google Ads': initialSettings = { conversionId: '', conversionLabel: '' }; break;
        case 'GTM': initialSettings = { containerId: '' }; break;
        case 'TikTok Pixel': initialSettings = { pixelId: '' }; break;
    }

    setCurrentPixelSettings(pixel?.settings || initialSettings);
    setCurrentPixelEnabled(pixel ? pixel.enabled : true);
    setPixelModalError(null);
    setIsPixelModalOpen(true);
  };

  const closePixelModal = () => {
    setIsPixelModalOpen(false);
    setEditingPixel(null);
    setPixelModalError(null);
  };

  const handleSavePixel = async () => {
    setPixelModalError(null);
    let requiredSettingsMet = true;
    switch(currentPixelType) {
        case 'Facebook Pixel': if(!currentPixelSettings.pixelId?.trim()) requiredSettingsMet = false; break;
        case 'Google Ads': if(!currentPixelSettings.conversionId?.trim() || !currentPixelSettings.conversionLabel?.trim()) requiredSettingsMet = false; break;
        case 'GTM': if(!currentPixelSettings.containerId?.trim()) requiredSettingsMet = false; break;
        case 'TikTok Pixel': if(!currentPixelSettings.pixelId?.trim()) requiredSettingsMet = false; break;
    }
    if(!requiredSettingsMet) {
        setPixelModalError("Preencha todos os campos obrigatórios para este tipo de pixel.");
        return;
    }

    let updatedPixels;
    if (editingPixel) {
      updatedPixels = pixelIntegrations.map(p =>
        p.id === editingPixel.id ? { ...p, type: currentPixelType, settings: currentPixelSettings, enabled: currentPixelEnabled } : p
      );
    } else {
      const newPixel: PixelIntegration = {
        id: `pixel_${Date.now()}`,
        type: currentPixelType,
        settings: currentPixelSettings,
        enabled: currentPixelEnabled,
      };
      updatedPixels = [...pixelIntegrations, newPixel];
    }
    setPixelIntegrations(updatedPixels);
    
    if (!accessToken) {
        setError("Autenticação necessária para salvar configurações.");
        return;
    }
    setIsSaving(true); setError(null); setSuccessMessage(null);
    try {
        const settingsToSave: Partial<AppSettings> = {
            apiTokens: { pushinPay: pushinPayToken.trim(), utmify: utmifyToken.trim(), pushinPayEnabled, utmifyEnabled },
            pixelIntegrations: updatedPixels
        };
        await settingsService.saveAppSettings(settingsToSave, accessToken);
        setSuccessMessage('Pixel salvo com sucesso!');
        closePixelModal();
    } catch (err: any) {
        setError(err.message || 'Falha ao salvar pixel.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeletePixel = async (pixelId: string) => {
    const updatedPixels = pixelIntegrations.filter(p => p.id !== pixelId);
    setPixelIntegrations(updatedPixels);

    if (!accessToken) {
        setError("Autenticação necessária para salvar configurações.");
        return;
    }
    setIsSaving(true); setError(null); setSuccessMessage(null);
    try {
        const settingsToSave: Partial<AppSettings> = {
            apiTokens: { pushinPay: pushinPayToken.trim(), utmify: utmifyToken.trim(), pushinPayEnabled, utmifyEnabled },
            pixelIntegrations: updatedPixels
        };
        await settingsService.saveAppSettings(settingsToSave, accessToken);
        setSuccessMessage('Pixel excluído com sucesso!');
    } catch (err: any) {
        setError(err.message || 'Falha ao excluir pixel.');
    } finally {
        setIsSaving(false);
    }
  };
  
  const handlePixelSettingChange = (key: string, value: string) => {
    setCurrentPixelSettings(prev => ({...prev, [key]: value}));
  };

  const handlePixelTypeChange = (newType: PixelType) => {
    setCurrentPixelType(newType);
    let initialSettings: Record<string, string> = {};
     switch(newType) {
        case 'Facebook Pixel': initialSettings = { pixelId: '' }; break;
        case 'Google Ads': initialSettings = { conversionId: '', conversionLabel: '' }; break;
        case 'GTM': initialSettings = { containerId: '' }; break;
        case 'TikTok Pixel': initialSettings = { pixelId: '' }; break;
    }
    setCurrentPixelSettings(initialSettings);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-neutral-400">Carregando integrações...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 text-neutral-100">
      <div className="flex items-center space-x-3">
        <LinkIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Integrações</h1>
      </div>

      {error && <p className="my-4 text-sm text-red-400 p-3 bg-red-800/20 rounded-md border border-red-600/50">{error}</p>}
      {successMessage && <p className="my-4 text-sm text-green-400 p-3 bg-green-800/20 rounded-md border border-green-600/50">{successMessage}</p>}

      <form onSubmit={handleSubmitApiTokens}>
        <Card title="Chaves de API (Tokens)" className="bg-neutral-800 border-neutral-700">
            <div className="space-y-6">
                <div className="space-y-3 p-4 border border-neutral-700 rounded-lg bg-neutral-700/30">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-neutral-100">PushInPay (Gateway de Pagamento PIX)</h3>
                        <ToggleSwitch label="Habilitar" srLabel="Habilitar PushInPay" enabled={pushinPayEnabled} onChange={setPushinPayEnabled} disabled={isSaving}/>
                    </div>
                    <Input
                        label="Token da API PushInPay"
                        name="pushinPayToken"
                        type="password"
                        value={pushinPayToken}
                        onChange={(e) => setPushinPayToken(e.target.value)}
                        placeholder="Cole seu token da API PushInPay aqui"
                        icon={<KeyIcon className="h-5 w-5 text-neutral-400" />}
                        disabled={isSaving || !pushinPayEnabled}
                        autoComplete="new-password"
                    />
                     <p className="text-xs text-neutral-400">Integração para processamento de pagamentos PIX.</p>
                </div>

                 <div className="space-y-3 p-4 border border-neutral-700 rounded-lg bg-neutral-700/30">
                    <div className="flex justify-between items-center">
                         <h3 className="text-lg font-semibold text-neutral-100">UTMify (Rastreamento Avançado)</h3>
                        <ToggleSwitch label="Habilitar" srLabel="Habilitar UTMify" enabled={utmifyEnabled} onChange={setUtmifyEnabled} disabled={isSaving}/>
                    </div>
                    <Input
                        label="Token da API UTMify"
                        name="utmifyToken"
                        type="password"
                        value={utmifyToken}
                        onChange={(e) => setUtmifyToken(e.target.value)}
                        placeholder="Cole seu token da API UTMify aqui"
                        icon={<KeyIcon className="h-5 w-5 text-neutral-400" />}
                        disabled={isSaving || !utmifyEnabled}
                        autoComplete="new-password"
                    />
                    <p className="text-xs text-neutral-400">Integração para rastreamento de UTMs e comissões.</p>
                </div>
            </div>
             <div className="mt-6 flex justify-end pt-4 border-t border-neutral-700">
                <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
                    Salvar Chaves de API
                </Button>
            </div>
        </Card>
      </form>
      
      <Card title="Pixels de Rastreamento" className="bg-neutral-800 border-neutral-700">
        <div className="space-y-4">
            {pixelIntegrations.length === 0 && <p className="text-neutral-400">Nenhum pixel de rastreamento configurado.</p>}
            {pixelIntegrations.map(pixel => (
                <div key={pixel.id} className="p-4 border border-neutral-700 rounded-lg bg-neutral-700/30 flex justify-between items-center">
                    <div>
                        <h4 className="text-md font-semibold text-neutral-100 flex items-center">
                           <TagIcon className="h-5 w-5 mr-2 text-primary"/> {pixel.type}
                        </h4>
                        <p className="text-xs text-neutral-400">
                            {Object.entries(pixel.settings).map(([key, val]) => `${key}: ${val.substring(0,20)}${val.length > 20 ? '...' : ''}`).join(', ')}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${pixel.enabled ? 'bg-green-600/50 text-green-300' : 'bg-neutral-600 text-neutral-300'}`}>
                            {pixel.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => openPixelModal(pixel)} title="Editar Pixel"><PencilIcon className="h-5 w-5"/></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePixel(pixel.id)} title="Excluir Pixel" className="text-red-500 hover:text-red-400"><TrashIcon className="h-5 w-5"/></Button>
                    </div>
                </div>
            ))}
             <Button variant="secondary" onClick={() => openPixelModal()} leftIcon={<PlusIcon className="h-5 w-5"/>} className="w-full mt-2">
                Adicionar Novo Pixel
            </Button>
        </div>
      </Card>
      
      {isPixelModalOpen && (
         <Modal isOpen={isPixelModalOpen} onClose={closePixelModal} title={editingPixel ? "Editar Pixel" : "Adicionar Novo Pixel"} size="lg">
            <div className="space-y-4 text-neutral-300">
                 <div>
                    <label htmlFor="pixelType" className="block text-sm font-medium mb-1">Tipo de Pixel</label>
                    <select 
                        id="pixelType" 
                        value={currentPixelType}
                        onChange={(e) => handlePixelTypeChange(e.target.value as PixelType)}
                        className="block w-full p-2.5 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150 bg-neutral-700 border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400"
                        disabled={isSaving}
                    >
                        {PIXEL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                 </div>

                {currentPixelType === 'Facebook Pixel' && (
                    <Input label="ID do Pixel do Facebook" value={currentPixelSettings.pixelId || ''} onChange={(e) => handlePixelSettingChange('pixelId', e.target.value)} placeholder="Ex: 123456789012345" disabled={isSaving}/>
                )}
                {currentPixelType === 'Google Ads' && (<>
                    <Input label="ID de Conversão Google Ads" value={currentPixelSettings.conversionId || ''} onChange={(e) => handlePixelSettingChange('conversionId', e.target.value)} placeholder="Ex: AW-123456789" disabled={isSaving}/>
                    <Input label="Rótulo de Conversão Google Ads" value={currentPixelSettings.conversionLabel || ''} onChange={(e) => handlePixelSettingChange('conversionLabel', e.target.value)} placeholder="Ex: abcDEfghiJKLmnopQRS" disabled={isSaving}/>
                </>)}
                {currentPixelType === 'GTM' && (
                    <Input label="ID do Contêiner GTM" value={currentPixelSettings.containerId || ''} onChange={(e) => handlePixelSettingChange('containerId', e.target.value)} placeholder="Ex: GTM-XXXXXXX" disabled={isSaving}/>
                )}
                {currentPixelType === 'TikTok Pixel' && (
                     <Input label="ID do Pixel do TikTok" value={currentPixelSettings.pixelId || ''} onChange={(e) => handlePixelSettingChange('pixelId', e.target.value)} placeholder="Ex: ABCDEFGHIJKLMN" disabled={isSaving}/>
                )}
                
                <ToggleSwitch label="Habilitar Pixel" enabled={currentPixelEnabled} onChange={setCurrentPixelEnabled} disabled={isSaving}/>
                
                {pixelModalError && <p className="text-sm text-red-400 p-2 bg-red-800/20 rounded-md border border-red-600/50">{pixelModalError}</p>}

                <div className="flex justify-end space-x-3 pt-3">
                    <Button variant="ghost" onClick={closePixelModal} disabled={isSaving}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSavePixel} isLoading={isSaving} disabled={isSaving}>Salvar Pixel</Button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};
