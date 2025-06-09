

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { AbandonedCart, AbandonedCartStatus } from '../types';
import { abandonedCartService } from '../services/abandonedCartService';
import { ArchiveBoxXMarkIcon, WhatsAppIcon, generateWhatsAppLink } from '../constants'; // Using existing icon
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

const getStatusLabel = (status: AbandonedCartStatus) => {
  const labels: Record<AbandonedCartStatus, string> = {
    [AbandonedCartStatus.NOT_CONTACTED]: 'Não Contatado',
    [AbandonedCartStatus.EMAIL_SENT]: 'Email Enviado',
    [AbandonedCartStatus.RECOVERED]: 'Recuperado',
    [AbandonedCartStatus.IGNORED]: 'Ignorado',
  };
  return labels[status] || status;
};

const getStatusClass = (status: AbandonedCartStatus) => {
  switch (status) {
    case AbandonedCartStatus.RECOVERED: return 'bg-green-100 text-green-700';
    case AbandonedCartStatus.EMAIL_SENT: return 'bg-blue-100 text-blue-700';
    case AbandonedCartStatus.NOT_CONTACTED: return 'bg-yellow-100 text-yellow-700';
    case AbandonedCartStatus.IGNORED: return 'bg-neutral-200 text-neutral-600';
    default: return 'bg-neutral-100 text-neutral-700';
  }
};

const formatCurrency = (valueInCents: number) => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

export const CarrinhosAbandonadosPage: React.FC = () => {
  const [allCarts, setAllCarts] = useState<AbandonedCart[]>([]);
  const [filteredCarts, setFilteredCarts] = useState<AbandonedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AbandonedCartStatus | ''>('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<AbandonedCart | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { accessToken } = useAuth(); // Get accessToken


  const fetchCarts = useCallback(async () => {
    if (!accessToken) {
        setIsLoading(false);
        // setError("Autenticação necessária."); // Or handle silently
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await abandonedCartService.getAbandonedCarts(accessToken); // Pass accessToken
      setAllCarts(data.sort((a,b) => new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime())); // Sort by most recent interaction
      setFilteredCarts(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar carrinhos abandonados.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]); // Add accessToken to dependency array

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  useEffect(() => {
    let currentCarts = [...allCarts];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      currentCarts = currentCarts.filter(cart =>
        cart.customerName?.toLowerCase().includes(term) ||
        cart.customerEmail?.toLowerCase().includes(term) ||
        cart.customerWhatsapp?.toLowerCase().includes(term) ||
        cart.productName?.toLowerCase().includes(term) ||
        cart.id?.toLowerCase().includes(term)
      );
    }
    if (filterStatus) {
      currentCarts = currentCarts.filter(cart => cart.status === filterStatus);
    }
    setFilteredCarts(currentCarts);
  }, [searchTerm, filterStatus, allCarts]);

  const handleUpdateStatus = async (cartId: string, status: AbandonedCartStatus) => {
    setIsUpdatingStatus(true);
    try {
      await abandonedCartService.updateAbandonedCartStatus(cartId, status, accessToken); // Pass accessToken
      fetchCarts(); // Refresh list
    } catch (err: any) {
      setError(err.message || `Falha ao atualizar status do carrinho ${cartId}.`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const openDeleteModal = (cart: AbandonedCart) => {
    setCartToDelete(cart);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setCartToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteCart = async () => {
    if (!cartToDelete) return;
    setIsLoading(true); 
    try {
      await abandonedCartService.deleteAbandonedCart(cartToDelete.id, accessToken); // Pass accessToken
      fetchCarts(); 
      closeDeleteModal();
    } catch (err) {
      setError(`Falha ao deletar carrinho ${cartToDelete.id}.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading && allCarts.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }
  
  if (error) {
    return <div className="text-center text-red-500 p-4 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-800">Carrinhos Abandonados</h1>
      
      <Card className="p-0 sm:p-0"> {/* Adjusted padding for table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-b border-neutral-200">
          <Input 
            placeholder="Buscar por cliente, produto, ID, WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700">Status</label>
            <select 
              id="statusFilter" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AbandonedCartStatus | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
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
            <ArchiveBoxXMarkIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-lg text-neutral-500">
              {allCarts.length === 0 ? "Nenhum carrinho abandonado registrado ainda." : "Nenhum carrinho encontrado com os filtros atuais."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-100"> {/* Updated header background */}
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">WhatsApp</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Produto</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Valor Potencial</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Data Abandono</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredCarts.map((cart) => {
                const customerName = cart.customerName || 'Cliente';
                const productName = cart.productName || 'Produto Desconhecido';
                const customerWhatsapp = cart.customerWhatsapp || '';
                const checkoutLink = `${window.location.origin}${window.location.pathname}#/checkout/${cart.productId || ''}`;
                
                const whatsappMessage = customerWhatsapp
                  ? `Olá ${customerName}, vimos que você demonstrou interesse no produto "${productName}" mas não finalizou a compra. Gostaria de alguma ajuda ou tem alguma dúvida para prosseguir? Para retornar ao checkout: ${checkoutLink}`
                  : '';
                const whatsappUrl = customerWhatsapp ? generateWhatsAppLink(customerWhatsapp, whatsappMessage) : '';

                return (
                <tr key={cart.id} className="hover:bg-primary-light/40 transition-colors duration-150"> {/* Updated row hover */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">{customerName}</div>
                    <div className="text-xs text-neutral-500">{cart.customerEmail || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                    <div className="flex items-center">
                      <span>{customerWhatsapp || 'N/A'}</span>
                      {customerWhatsapp && whatsappUrl && (
                        <a 
                          href={whatsappUrl}
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Enviar mensagem de recuperação via WhatsApp"
                          className="ml-2 text-green-500 hover:text-green-600"
                          onClick={(e) => { if (!whatsappUrl) e.preventDefault();}}
                        >
                          <WhatsAppIcon className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{productName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatCurrency(cart.potentialValueInCents)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{new Date(cart.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(cart.status)}`}>
                      {getStatusLabel(cart.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                    {cart.status === AbandonedCartStatus.NOT_CONTACTED && (
                        <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(cart.id, AbandonedCartStatus.EMAIL_SENT)} disabled={isUpdatingStatus} className="text-blue-600 hover:text-blue-800">Contatado</Button>
                    )}
                     {(cart.status === AbandonedCartStatus.NOT_CONTACTED || cart.status === AbandonedCartStatus.EMAIL_SENT) && (
                        <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(cart.id, AbandonedCartStatus.IGNORED)} disabled={isUpdatingStatus} className="text-neutral-600 hover:text-neutral-800">Ignorar</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openDeleteModal(cart)} className="text-red-600 hover:text-red-800">Excluir</Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirmar Exclusão">
        <p className="text-neutral-600">
          Você tem certeza que deseja excluir o registro de carrinho abandonado para "{cartToDelete?.customerEmail}" referente ao produto "{cartToDelete?.productName}"?
        </p>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="ghost" onClick={closeDeleteModal} disabled={isLoading && !!cartToDelete}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeleteCart} isLoading={isLoading && !!cartToDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  );
};