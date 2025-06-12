
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Sale, PaymentStatus, PaymentMethod, SaleProductItem } from '../types';
import { salesService } from '../services/salesService';
import { ShoppingCartIcon, WhatsAppIcon, generateWhatsAppLink } from '@/constants';
import { useAuth } from '../contexts/AuthContext';

const getStatusClass = (status: PaymentStatus) => {
  switch (status) {
    case PaymentStatus.PAID: return 'bg-green-600/20 text-green-500'; // Darker theme adjustment
    case PaymentStatus.WAITING_PAYMENT: return 'bg-yellow-500/20 text-yellow-400'; // Darker theme adjustment
    case PaymentStatus.CANCELLED:
    case PaymentStatus.EXPIRED:
    case PaymentStatus.FAILED:
      return 'bg-red-600/20 text-red-400'; // Darker theme adjustment
    default: return 'bg-neutral-700 text-neutral-300'; // Darker theme adjustment
  }
};

const getPaymentMethodLabel = (method: PaymentMethod) => {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.PIX]: 'PIX',
    [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
    [PaymentMethod.BOLETO]: 'Boleto',
  };
  return labels[method] || 'Desconhecido';
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


export const VendasPage: React.FC = () => {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | ''>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<PaymentMethod | ''>('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const { accessToken } = useAuth();

  const fetchSales = useCallback(async () => {
    if (!accessToken) {
        setIsLoading(false);
        // setError("Autenticação necessária."); // Can be silent as auth context handles redirects
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesService.getSales(accessToken);
      setAllSales(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setFilteredSales(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar vendas.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    let currentSales = [...allSales];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      currentSales = currentSales.filter(sale =>
        sale.customer.name?.toLowerCase().includes(term) ||
        sale.customer.email?.toLowerCase().includes(term) ||
        sale.id?.toLowerCase().includes(term) ||
        (Array.isArray(sale.products) && sale.products.some(p => p.name?.toLowerCase().includes(term)))
      );
    }
    if (filterStatus) {
      currentSales = currentSales.filter(sale => sale.status === filterStatus);
    }
    if (filterPaymentMethod) {
      currentSales = currentSales.filter(sale => sale.paymentMethod === filterPaymentMethod);
    }
    setFilteredSales(currentSales);
  }, [searchTerm, filterStatus, filterPaymentMethod, allSales]);

  const handleOpenDetailsModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedSale(null);
    setIsDetailsModalOpen(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-400 p-4 bg-red-800/20 rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-100">Minhas Vendas</h1>
        {/* Can add a "Exportar CSV" button here in future */}
      </div>

      <Card className="p-0 sm:p-0 border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-b border-neutral-700">
          <Input
            placeholder="Buscar por cliente, produto, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-400"
          />
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-300">Status do Pagamento</label>
            <select
              id="statusFilter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-neutral-700 text-neutral-200"
            >
              <option value="">Todos Status</option>
              {Object.values(PaymentStatus).map(status => (
                <option key={status} value={status}>{status.replace(/_/g, ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethodFilter" className="block text-sm font-medium text-neutral-300">Método de Pagamento</label>
            <select
              id="paymentMethodFilter"
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value as PaymentMethod | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-neutral-700 text-neutral-200"
            >
              <option value="">Todos Métodos</option>
              {Object.values(PaymentMethod).map(method => (
                <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end col-span-1 md:col-span-2 lg:col-span-1 lg:col-start-4">
             <Button variant="outline" onClick={() => {setSearchTerm(''); setFilterStatus(''); setFilterPaymentMethod('');}} className="w-full">Limpar Filtros</Button>
          </div>
        </div>

        {filteredSales.length === 0 ? (
           <div className="text-center py-12">
            <ShoppingCartIcon className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
            <p className="text-lg text-neutral-400">
              {allSales.length === 0 ? "Nenhuma venda registrada ainda." : "Nenhuma venda encontrada com os filtros atuais."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-700">
            <thead className="bg-neutral-700/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">ID Venda</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Produtos</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Valor Total</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Método</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-neutral-800 divide-y divide-neutral-700">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-neutral-700/70 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{sale.id.split('_').pop()?.substring(0,8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-200">{sale.customer.name}</div>
                    <div className="text-xs text-neutral-400">{sale.customer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">
                    {Array.isArray(sale.products) ? sale.products.map(p => p.name).join(', ') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{formatCurrency(sale.totalAmountInCents)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(sale.status)}`}>
                      {sale.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">{getPaymentMethodLabel(sale.paymentMethod)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(sale)} className="text-neutral-300 hover:text-primary">Detalhes</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {selectedSale && (
        <Modal
            isOpen={isDetailsModalOpen}
            onClose={handleCloseDetailsModal}
            title={`Detalhes da Venda: #${selectedSale.id.split('_').pop()?.substring(0,8)}`}
            size="xl"
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 text-sm"> {/* Added pr-2 for scrollbar space */}
            <section>
              <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Informações Gerais</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <InfoItem label="ID Venda Completo" value={selectedSale.id} />
                <InfoItem label="ID Transação PushInPay" value={selectedSale.pushInPayTransactionId} />
                {selectedSale.upsellPushInPayTransactionId && <InfoItem label="ID Transação Upsell" value={selectedSale.upsellPushInPayTransactionId} />}
                <InfoItem label="Valor Total" value={<span className="font-bold text-primary">{formatCurrency(selectedSale.totalAmountInCents)}</span>} />
                {selectedSale.upsellAmountInCents !== undefined && <InfoItem label="Valor Upsell" value={formatCurrency(selectedSale.upsellAmountInCents)} />}
                {selectedSale.discountAppliedInCents && selectedSale.discountAppliedInCents > 0 && (
                  <>
                    <InfoItem label="Valor Original" value={formatCurrency(selectedSale.originalAmountBeforeDiscountInCents)} />
                    <InfoItem label={`Desconto (${selectedSale.couponCodeUsed || 'Aplicado'})`} value={<span className="text-red-400">-{formatCurrency(selectedSale.discountAppliedInCents)}</span>} />
                  </>
                )}
                <InfoItem label="Comissão da Plataforma" value={selectedSale.platformCommissionInCents !== undefined ? formatCurrency(selectedSale.platformCommissionInCents) : 'N/A'} />
                <InfoItem label="Data" value={new Date(selectedSale.createdAt).toLocaleString()} />
                <InfoItem label="Data Pagamento" value={selectedSale.paidAt ? new Date(selectedSale.paidAt).toLocaleString() : 'N/A'} />
                <InfoItem label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(selectedSale.status)}`}>{selectedSale.status.replace(/_/g, ' ').toUpperCase()}</span>} />
                <InfoItem label="Método de Pagamento" value={getPaymentMethodLabel(selectedSale.paymentMethod)} />
               </div>
            </section>
             <section>
                <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <InfoItem label="Nome" value={selectedSale.customer.name} />
                  <InfoItem label="Email" value={selectedSale.customer.email} />
                  <InfoItem 
                    label="WhatsApp" 
                    value={selectedSale.customer.whatsapp}
                    isWhatsApp={!!selectedSale.customer.whatsapp}
                    whatsAppUrl={selectedSale.customer.whatsapp ? generateWhatsAppLink(selectedSale.customer.whatsapp, `Olá ${selectedSale.customer.name || 'Cliente'}, sobre seu pedido...`) : undefined}
                   />
                  <InfoItem label="IP" value={selectedSale.customer.ip || 'N/A'} />
                </div>
             </section>
             <section>
                <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Produtos</h3>
                {Array.isArray(selectedSale.products) && selectedSale.products.map((item: SaleProductItem, idx: number) => (
                    <div key={idx} className="mb-2 p-3 bg-neutral-700/50 rounded-md">
                        <p className="font-semibold text-neutral-100">{item.name} {item.isOrderBump ? '(Order Bump)' : item.isUpsell ? '(Upsell)' : ''}</p>
                        <div className="grid grid-cols-2 gap-x-2 text-xs">
                          <InfoItem label="ID Produto" value={item.productId} />
                          <InfoItem label="Qtd" value={item.quantity} />
                          <InfoItem label="Preço Orig." value={formatCurrency(item.originalPriceInCents)} />
                          <InfoItem label="Preço Pago" value={formatCurrency(item.priceInCents)} />
                        </div>
                    </div>
                ))}
             </section>
             {selectedSale.trackingParameters && Object.keys(selectedSale.trackingParameters).length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Parâmetros de Rastreamento (UTMs)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        {Object.entries(selectedSale.trackingParameters).map(([key, value]) => (
                            <InfoItem key={key} label={key} value={value as string} />
                        ))}
                    </div>
                </section>
             )}
          </div>
          <div className="mt-8 flex justify-end">
            <Button variant="outline" onClick={handleCloseDetailsModal}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
