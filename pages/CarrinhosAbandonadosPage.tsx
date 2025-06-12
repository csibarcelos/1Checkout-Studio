
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { AbandonedCart, AbandonedCartStatus } from '../types';
import { abandonedCartService } from '../services/abandonedCartService';
import { ArchiveBoxXMarkIcon, WhatsAppIcon, generateWhatsAppLink } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const getStatusLabel = (status: AbandonedCartStatus) => {
  const labels: Record<AbandonedCartStatus, string> = {
    [AbandonedCartStatus.NOT_CONTACTED]: 'Não Contactado',
    [AbandonedCartStatus.EMAIL_SENT]: 'Email Enviado',
    [AbandonedCartStatus.RECOVERED]: 'Recuperado',
    [AbandonedCartStatus.IGNORED]: 'Ignorado',
  };
  return labels[status] || status;
};

const getStatusClass = (status: AbandonedCartStatus) => {
  switch (status) {
    case AbandonedCartStatus.RECOVERED: return 'bg-green-600/20 text-green-400';
    case AbandonedCartStatus.EMAIL_SENT: return 'bg-blue-600/20 text-blue-400';
    case AbandonedCartStatus.NOT_CONTACTED: return 'bg-yellow-500/20 text-yellow-400';
    case AbandonedCartStatus.IGNORED: return 'bg-neutral-700 text-neutral-400';
    default: return 'bg-neutral-700 text-neutral-300';
  }
};

const formatCurrency = (valueInCents: number) => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const InfoItem: React.FC<{ label: string; value: React.ReactNode; className?: string; isWhatsApp?: boolean; whatsAppUrl?: string }> = ({ label, value, className, isWhatsApp, whatsAppUrl }) => (
  <div className={`mb-2 ${className}`}>
    <span className="font-semibold text-neutral-400">{label}: </span>
    <span className="text-neutral-200">{value}</span>
    {isWhatsApp && whatsAppUrl && (
      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Enviar mensagem via WhatsApp"
        className="ml-2 inline-flex items-center text-green-400 hover:text-green-300"
        onClick={(e) => { if (!whatsAppUrl) e.preventDefault();}}
      >
        <WhatsAppIcon className="h-5 w-5" />
      </a>
    )}
  </div>
);


export const CarrinhosAbandonadosPage: React.FC = () => {
  const [allCarts, setAllCarts] = useState<AbandonedCart[]>([]);
  const [filteredCarts, setFilteredCarts] = useState<AbandonedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AbandonedCartStatus | ''>('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { accessToken } = useAuth();

  const fetchAbandonedCarts = useCallback(async () => {
    if (!accessToken) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await abandonedCartService.getAbandonedCarts(accessToken);
      const sortedData = data.sort((a,b) => new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime());
      setAllCarts(sortedData);
      setFilteredCarts(sortedData);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar carrinhos abandonados.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAbandonedCarts();
  }, [fetchAbandonedCarts]);

  useEffect(() => {
    let currentCarts = [...allCarts];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      currentCarts = currentCarts.filter(cart =>
        cart.customerName?.toLowerCase().includes(term) ||
        cart.customerEmail?.toLowerCase().includes(term) ||
        cart.productName?.toLowerCase().includes(term) ||
        cart.id?.toLowerCase().includes(term)
      );
    }
    if (filterStatus) {
      currentCarts = currentCarts.filter(cart => cart.status === filterStatus);
    }
    setFilteredCarts(currentCarts);
  }, [searchTerm, filterStatus, allCarts]);

  const handleOpenDetailsModal = (cart: AbandonedCart) => {
    setSelectedCart(cart);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedCart(null);
    setIsDetailsModalOpen(false);
  };
  
  const handleUpdateStatus = async (cartId: string, newStatus: AbandonedCartStatus) => {
    if (!accessToken) {
      setError("Autenticação necessária para atualizar status.");
      return;
    }
    setIsUpdatingStatus(true);
    try {
      const updatedCart = await abandonedCartService.updateAbandonedCartStatus(cartId, newStatus, accessToken);
      setAllCarts(prevCarts => prevCarts.map(cart => cart.id === cartId ? updatedCart : cart));
      if (selectedCart && selectedCart.id === cartId) {
        setSelectedCart(updatedCart); 
      }
      // Se o status foi atualizado com sucesso e a modal estava aberta, pode-se optar por fechá-la
      // ou deixar que o usuário feche manualmente.
      // handleCloseDetailsModal(); // Opcional: fechar modal após atualização bem-sucedida
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar status do carrinho.");
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  if (error && allCarts.length === 0) {
    return <div className="text-center text-red-400 p-4 bg-red-800/20 rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-100">Carrinhos Abandonados</h1>
      </div>

      {error && allCarts.length > 0 && (
         <p className="text-sm text-red-400 p-3 bg-red-800/20 rounded-md border border-red-600/50">{error}</p>
      )}

      <Card className="p-0 sm:p-0 border-neutral-700">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-b border-neutral-700">
          <Input
            placeholder="Buscar por cliente, produto, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-400"
          />
          <div>
            <label htmlFor="statusFilterAbandoned" className="block text-sm font-medium text-neutral-300">Status</label>
            <select
              id="statusFilterAbandoned"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AbandonedCartStatus | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-neutral-700 text-neutral-200"
            >
              <option value="">Todos Status</option>
              {Object.values(AbandonedCartStatus).map(status => (
                <option key={status} value={status}>{getStatusLabel(status)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end col-span-1 md:col-span-2 lg:col-span-1 lg:col-start-4">
            <Button variant="outline" onClick={() => {setSearchTerm(''); setFilterStatus('');}} className="w-full">Limpar Filtros</Button>
          </div>
        </div>
        
        {filteredCarts.length === 0 ? (
           <div className="text-center py-12">
            <ArchiveBoxXMarkIcon className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
            <p className="text-lg text-neutral-400">
              {allCarts.length === 0 ? "Nenhum carrinho abandonado registrado." : "Nenhum carrinho encontrado com os filtros atuais."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-700">
            <thead className="bg-neutral-700/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Produto</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Valor Potencial</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Última Interação</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-neutral-800 divide-y divide-neutral-700">
              {filteredCarts.map((cart) => {
                  const customerName = cart.customerName || 'Cliente';
                  const customerWhatsapp = cart.customerWhatsapp || '';
                  const whatsappMessage = customerWhatsapp 
                    ? `Olá ${customerName}, vi que você demonstrou interesse em nosso produto "${cart.productName}" e não finalizou a compra. Gostaria de ajuda?`
                    : '';
                  const whatsappUrl = customerWhatsapp ? generateWhatsAppLink(customerWhatsapp, whatsappMessage) : '';

                return (
                <tr key={cart.id} className="hover:bg-neutral-700/70 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-200">{customerName}</div>
                    <div className="text-xs text-neutral-400">{cart.customerEmail}</div>
                    {cart.customerWhatsapp && whatsappUrl && (
                         <a 
                          href={whatsappUrl}
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Contactar via WhatsApp"
                          className="mt-1 inline-flex items-center text-xs text-green-400 hover:text-green-300"
                          onClick={(e) => { if (!whatsappUrl) e.preventDefault();}}
                        >
                          <WhatsAppIcon className="h-4 w-4 mr-1" /> {cart.customerWhatsapp}
                        </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">{cart.productName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{formatCurrency(cart.potentialValueInCents)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(cart.status)}`}>
                      {getStatusLabel(cart.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{new Date(cart.lastInteractionAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(cart)} className="text-neutral-300 hover:text-primary">
                      Detalhes
                    </Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {selectedCart && (
        <Modal 
          isOpen={isDetailsModalOpen} 
          onClose={handleCloseDetailsModal} 
          title={`Detalhes do Carrinho: ${selectedCart.id.substring(0,8)}...`}
          size="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-sm">
            <section>
              <h3 className="text-md font-semibold text-neutral-100 border-b border-neutral-600 pb-1 mb-2">Informações do Cliente</h3>
              <InfoItem label="Nome" value={selectedCart.customerName || 'N/A'} />
              <InfoItem label="Email" value={selectedCart.customerEmail} />
              <InfoItem 
                label="WhatsApp" 
                value={selectedCart.customerWhatsapp || 'N/A'} 
                isWhatsApp={!!selectedCart.customerWhatsapp}
                whatsAppUrl={selectedCart.customerWhatsapp ? generateWhatsAppLink(selectedCart.customerWhatsapp, `Olá ${selectedCart.customerName || 'Cliente'}, sobre seu carrinho...`) : undefined}
              />
            </section>
            <section>
              <h3 className="text-md font-semibold text-neutral-100 border-b border-neutral-600 pb-1 mb-2">Detalhes do Carrinho</h3>
              <InfoItem label="Produto" value={selectedCart.productName} />
              <InfoItem label="Valor Potencial" value={<span className="font-bold text-primary">{formatCurrency(selectedCart.potentialValueInCents)}</span>} />
              <InfoItem label="Status Atual" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(selectedCart.status)}`}>{getStatusLabel(selectedCart.status)}</span>} />
              <InfoItem label="Criado em" value={new Date(selectedCart.date).toLocaleString()} />
              <InfoItem label="Última Interação" value={new Date(selectedCart.lastInteractionAt).toLocaleString()} />
            </section>
             {selectedCart.trackingParameters && Object.keys(selectedCart.trackingParameters).length > 0 && (
                <section>
                    <h3 className="text-md font-semibold text-neutral-100 border-b border-neutral-600 pb-1 mb-2">Parâmetros de Rastreamento (UTMs)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        {Object.entries(selectedCart.trackingParameters).map(([key, value]) => (
                            <InfoItem key={key} label={key} value={value as string} />
                        ))}
                    </div>
                </section>
             )}
            <section>
              <h3 className="text-md font-semibold text-neutral-100 border-b border-neutral-600 pb-1 mb-2">Atualizar Status</h3>
              <div className="flex flex-wrap gap-2">
                {(Object.values(AbandonedCartStatus) as AbandonedCartStatus[]).map(statusValue => (
                  <Button
                    key={statusValue}
                    variant={selectedCart.status === statusValue ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedCart.id, statusValue)}
                    isLoading={isUpdatingStatus && selectedCart.status !== statusValue}
                    disabled={isUpdatingStatus || selectedCart.status === statusValue}
                    className={selectedCart.status === statusValue ? 'ring-2 ring-offset-1 ring-primary ring-offset-neutral-800' : ''}
                  >
                    {getStatusLabel(statusValue)}
                  </Button>
                ))}
              </div>
              {error && isUpdatingStatus && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </section>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={handleCloseDetailsModal} disabled={isUpdatingStatus}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
