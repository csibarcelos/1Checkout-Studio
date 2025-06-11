
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button, ToggleSwitch } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { settingsService } from '../services/settingsService';
import { AppSettings, PixelIntegration, PixelType } from '../types';
import { LinkIcon, KeyIcon, PlusIcon, PencilIcon, TrashIcon, TagIcon } from '../constants.tsx'; 
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

  const renderPixelSpecificFields = () => {
    switch (currentPixelType) {
      case 'Facebook Pixel':
        return <Input name="pixelId" label="ID do Pixel (Facebook)" value={currentPixelSettings.pixelId || ''} onChange={e => handlePixelSettingChange('pixelId', e.target.value)} placeholder="Ex: 123456789012345" />;
      case 'Google Ads':
        return <>
          <Input name="conversionId" label="ID de Conversão (Google Ads)" value={currentPixelSettings.conversionId || ''} onChange={e => handlePixelSettingChange('conversionId', e.target.value)} placeholder="Ex: AW-123456789" />
          <Input name="conversionLabel" label="Rótulo de Conversão (Google Ads)" value={currentPixelSettings.conversionLabel || ''} onChange={e => handlePixelSettingChange('conversionLabel', e.target.value)} placeholder="Ex: abcdefghijklmnop" />
        </>;
      case 'GTM':
        return <Input name="containerId" label="ID do Contêiner (GTM)" value={currentPixelSettings.containerId || ''} onChange={e => handlePixelSettingChange('containerId', e.target.value)} placeholder="Ex: GTM-XXXXXXX" />;
      case 'TikTok Pixel':
        return <Input name="tiktokPixelId" label="ID do Pixel (TikTok)" value={currentPixelSettings.pixelId || ''} onChange={e => handlePixelSettingChange('pixelId', e.target.value)} placeholder="Ex: ABCDEFGHIJ1234567890" />;
      default: return null;
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
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <LinkIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Integrações</h1>
      </div>
      
      {error && <p className="text-sm text-red-600 p-3 bg-red-50 rounded-md border border-red-200">{error}</p>}
      {successMessage && <p className="text-sm text-green-600 p-3 bg-green-50 rounded-md border border-green-200">{successMessage}</p>}

      <Card title="Tokens de API">
        <form onSubmit={handleSubmitApiTokens} className="space-y-8">
          <p className="text-sm text-neutral-600">
            Insira seus tokens de API para integrar com serviços externos e habilite as integrações desejadas.
          </p>
          
          <div className="space-y-3">
            <Input
              label="Token da API PushInPay" name="pushinPayToken" type="password" value={pushinPayToken}
              onChange={(e) => setPushinPayToken(e.target.value)} placeholder="Cole seu token da PushInPay aqui"
              icon={<KeyIcon className="h-5 w-5 text-neutral-400" />} autoComplete="off" disabled={isSaving || !accessToken}
            />
            <ToggleSwitch label="Habilitar Integração PushInPay" enabled={pushinPayEnabled} onChange={setPushinPayEnabled} disabled={isSaving || !accessToken}/>
          </div>
          
          <div className="space-y-3">
            <Input
              label="Token da API UTMify" name="utmifyToken" type="password" value={utmifyToken}
              onChange={(e) => setUtmifyToken(e.target.value)} placeholder="Cole seu token da UTMify aqui"
              icon={<KeyIcon className="h-5 w-5 text-neutral-400" />} autoComplete="off" disabled={isSaving || !accessToken}
            />
             <ToggleSwitch label="Habilitar Integração UTMify" enabled={utmifyEnabled} onChange={setUtmifyEnabled} disabled={isSaving || !accessToken}/>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-neutral-200">
            <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving || !accessToken}>
              Salvar Tokens de API
            </Button>
          </div>
        </form>
      </Card>

       <Card title="Pixels de Rastreamento">
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <p className="text-sm text-neutral-600">
                    Configure pixels para rastrear eventos de compra e otimizar suas campanhas.
                </p>
                <Button onClick={() => openPixelModal()} variant="secondary" leftIcon={<PlusIcon className="h-5 w-5"/>} disabled={isSaving || !accessToken}>
                    Adicionar Pixel
                </Button>
            </div>

            {pixelIntegrations.length === 0 && (
                <p className="text-neutral-500 text-center py-4">Nenhum pixel configurado.</p>
            )}

            <div className="space-y-3">
                {pixelIntegrations.map(pixel => (
                    <div key={pixel.id} className="p-4 border border-neutral-200 rounded-md bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-grow">
                            <div className="flex items-center mb-1">
                                <TagIcon className="h-5 w-5 text-primary mr-2"/>
                                <span className="font-semibold text-neutral-700">{pixel.type}</span>
                            </div>
                            <p className="text-xs text-neutral-500">
                                {pixel.type === 'Facebook Pixel' && `ID: ${pixel.settings.pixelId || 'N/A'}`}
                                {pixel.type === 'Google Ads' && `ID Conversão: ${pixel.settings.conversionId || 'N/A'}`}
                                {pixel.type === 'GTM' && `ID Contêiner: ${pixel.settings.containerId || 'N/A'}`}
                                {pixel.type === 'TikTok Pixel' && `ID: ${pixel.settings.pixelId || 'N/A'}`}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0 flex-shrink-0">
                            <ToggleSwitch enabled={pixel.enabled} onChange={async (enabled) => {
                                const updatedPixels = pixelIntegrations.map(p => p.id === pixel.id ? {...p, enabled} : p);
                                setPixelIntegrations(updatedPixels);
                                if (!accessToken) return;
                                setIsSaving(true);
                                try {
                                    await settingsService.saveAppSettings({ pixelIntegrations: updatedPixels, apiTokens: { pushinPay: pushinPayToken.trim(), utmify: utmifyToken.trim(), pushinPayEnabled, utmifyEnabled } }, accessToken);
                                    setSuccessMessage('Status do pixel atualizado.');
                                } catch (err) { setError('Falha ao atualizar status do pixel.')}
                                finally { setIsSaving(false); }
                            }} srLabel={`Habilitar ${pixel.type}`} disabled={isSaving}/>
                            <Button variant="ghost" size="sm" onClick={() => openPixelModal(pixel)} className="p-1.5" title="Editar">
                                <PencilIcon className="h-5 w-5 text-neutral-500 hover:text-primary"/>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePixel(pixel.id)} className="p-1.5" title="Excluir">
                                <TrashIcon className="h-5 w-5 text-neutral-500 hover:text-red-500"/>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </Card>

      {isPixelModalOpen && (
        <Modal isOpen={isPixelModalOpen} onClose={closePixelModal} title={editingPixel ? "Editar Pixel" : "Adicionar Novo Pixel"}>
            <div className="space-y-4 text-neutral-700">
                <div>
                    <label htmlFor="pixelType" className="block text-sm font-medium text-neutral-700 mb-1">Tipo de Pixel</label>
                    <select id="pixelType" value={currentPixelType} onChange={e => handlePixelTypeChange(e.target.value as PixelType)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                        {PIXEL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                {renderPixelSpecificFields()}
                <ToggleSwitch label="Habilitar este Pixel" enabled={currentPixelEnabled} onChange={setCurrentPixelEnabled} />
                {pixelModalError && <p className="text-sm text-red-500 p-2 bg-red-50 rounded-md">{pixelModalError}</p>}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button variant="ghost" onClick={closePixelModal} disabled={isSaving}>Cancelar</Button>
                <Button variant="primary" onClick={handleSavePixel} isLoading={isSaving} disabled={isSaving}>Salvar Pixel</Button>
            </div>
        </Modal>
      )}

       <Card title="Outras Integrações Avançadas">
        <div className="text-center py-10">
          <LinkIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 max-w-md mx-auto">
            Webhooks para notificar sistemas externos sobre vendas e outros eventos estarão disponíveis aqui em breve.
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
