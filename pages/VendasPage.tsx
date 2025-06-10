import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Sale, PaymentStatus, PaymentMethod, SaleProductItem } from '../types'; 
import { salesService } from '../services/salesService'; 
import { ShoppingCartIcon, WhatsAppIcon, generateWhatsAppLink } from '../constants';
import { useAuth } from '../contexts/AuthContext'; 

const getStatusClass = (status: PaymentStatus) => {
  switch (status) {
    case PaymentStatus.PAID: return 'bg-green-100 text-green-700';
    case PaymentStatus.WAITING_PAYMENT: return 'bg-yellow-100 text-yellow-700';
    case PaymentStatus.CANCELLED:
    case PaymentStatus.EXPIRED:
    case PaymentStatus.FAILED:
      return 'bg-red-100 text-red-700';
    default: return 'bg-neutral-100 text-neutral-700';
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
    <span className="font-semibold text-neutral-600">{label}: </span>
    <span className="text-neutral-800">{value}</span>
    {isWhatsApp && whatsAppUrl && (
      <a 
        href={whatsAppUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        title="Enviar mensagem via WhatsApp"
        className="ml-2 inline-flex items-center text-green-500 hover:text-green-600"
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
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesService.getSales(accessToken); 
      setAllSales(data);
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
      currentSales = currentSales.filter(sale =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.pushInPayTransactionId && sale.pushInPayTransactionId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(sale.products) && sale.products.some(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())))
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
    return <div className="text-center text-red-500 p-4 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-800">Minhas Vendas</h1>
      
      <Card className="p-0 sm:p-0"> 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-b border-neutral-200">
          <Input 
            placeholder="Buscar por ID, cliente, produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700">Status</label>
            <select 
              id="statusFilter" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              {Object.values(PaymentStatus).map(status => (
                <option key={status} value={status}>{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethodFilter" className="block text-sm font-medium text-neutral-700">Método Pag.</label>
            <select 
              id="paymentMethodFilter" 
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value as PaymentMethod | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              {Object.values(PaymentMethod).map(method => (
                <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => {setSearchTerm(''); setFilterStatus(''); setFilterPaymentMethod('');}}>Limpar Filtros</Button>
          </div>
        </div>
      
        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCartIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-lg text-neutral-500">
              {allSales.length === 0 ? "Nenhuma venda registrada ainda." : "Nenhuma venda encontrada com os filtros atuais."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-100"> 
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID Venda</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">WhatsApp</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Produto(s)</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Valor Total</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Método</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredSales.map((sale) => {
                const customerName = sale.customer?.name || 'Cliente';
                const customerWhatsapp = sale.customer?.whatsapp || '';
                const productNames = Array.isArray(sale.products) ? sale.products.map(p => p.name || 'Produto Desconhecido').join(', ') : 'Produtos Indisponíveis';
                
                const whatsappMessage = customerWhatsapp 
                  ? `Olá ${customerName}, obrigado por sua compra de "${productNames}" na 1Checkout! Caso precise de ajuda ou tenha alguma dúvida sobre seu pedido, estamos à disposição.`
                  : '';
                const whatsappUrl = customerWhatsapp ? generateWhatsAppLink(customerWhatsapp, whatsappMessage) : '';

                return (
                <tr key={sale.id} className="hover:bg-primary-light/40 transition-colors duration-150"> 
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer" onClick={() => handleOpenDetailsModal(sale)}>{sale.id.split('_').pop()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">{customerName}</div>
                    <div className="text-xs text-neutral-500">{sale.customer?.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                    <div className="flex items-center">
                      <span>{customerWhatsapp || 'N/A'}</span>
                      {customerWhatsapp && whatsappUrl && (
                        <a 
                          href={whatsappUrl}
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Enviar mensagem via WhatsApp"
                          className="ml-2 text-green-500 hover:text-green-600"
                          onClick={(e) => { if (!whatsappUrl) e.preventDefault();}}
                        >
                          <WhatsAppIcon className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-neutral-700 max-w-xs">
                    {productNames}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                    {formatCurrency(sale.totalAmountInCents)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{getPaymentMethodLabel(sale.paymentMethod)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(sale.status)}`}>
                      {sale.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(sale)}>Detalhes</Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {selectedSale && (
        <Modal 
            isOpen={isDetailsModalOpen} 
            onClose={handleCloseDetailsModal} 
            title={`Detalhes da Venda ${selectedSale.id.split('_').pop()}`}
            size="lg"
        >
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Informações do Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <InfoItem label="ID da Venda (Interno)" value={selectedSale.id} />
                <InfoItem label="ID Transação PIX" value={selectedSale.pushInPayTransactionId} />
                <InfoItem label="ID UTMify" value={selectedSale.orderIdUrmify || 'N/A'} />
                <InfoItem label="Data Criação" value={new Date(selectedSale.createdAt).toLocaleString()} />
                {selectedSale.paidAt && <InfoItem label="Data Pagamento" value={new Date(selectedSale.paidAt).toLocaleString()} />}
                <InfoItem label="Valor Total" value={<span className="font-bold text-primary">{formatCurrency(selectedSale.totalAmountInCents)}</span>} />
                <InfoItem label="Método de Pagamento" value={getPaymentMethodLabel(selectedSale.paymentMethod)} />
                <InfoItem label="Status" value={
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(selectedSale.status)}`}>
                        {selectedSale.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                } />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Informações do Cliente</h3>
              <InfoItem label="Nome" value={selectedSale.customer?.name || 'N/A'} />
              <InfoItem label="E-mail" value={selectedSale.customer?.email || 'N/A'} />
              <InfoItem 
                label="WhatsApp" 
                value={selectedSale.customer?.whatsapp || 'N/A'} 
                isWhatsApp={!!selectedSale.customer?.whatsapp}
                whatsAppUrl={selectedSale.customer?.whatsapp ? generateWhatsAppLink(selectedSale.customer.whatsapp, `Olá ${selectedSale.customer.name || 'Cliente'}, obrigado por sua compra de "${(Array.isArray(selectedSale.products) ? selectedSale.products.map(p=>p.name || 'Produto') : []).join(', ')}" na 1Checkout! Caso precise de ajuda ou tenha alguma dúvida sobre seu pedido, estamos à disposição.`) : undefined}
              />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Produtos</h3>
              <ul className="space-y-3">
                {Array.isArray(selectedSale.products) && selectedSale.products.map((item, index) => (
                  <li key={index} className="p-3 bg-neutral-50 rounded-md shadow-sm">
                    <p className="font-semibold text-neutral-700">{item.name || 'Produto Desconhecido'}</p>
                    <div className="text-sm text-neutral-600 grid grid-cols-3 gap-x-2">
                        <span>Qtd: {item.quantity}</span>
                        <span>Unit.: {formatCurrency(item.priceInCents / item.quantity)}</span>
                        <span>Total Item: {formatCurrency(item.priceInCents)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {selectedSale.trackingParameters && Object.keys(selectedSale.trackingParameters).length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Parâmetros de Rastreamento (UTMs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    {Object.entries(selectedSale.trackingParameters).map(([key, value]) => (
                        <InfoItem key={key} label={key} value={value} />
                    ))}
                </div>
              </section>
            )}

            {selectedSale.commission && (
              <section>
                <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Detalhes da Comissão</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoItem label="Valor Total (Base Comissão)" value={formatCurrency(selectedSale.commission.totalPriceInCents)} />
                    <InfoItem label="Taxa do Gateway" value={formatCurrency(selectedSale.commission.gatewayFeeInCents)} />
                    <InfoItem label="Comissão Líquida" value={formatCurrency(selectedSale.commission.userCommissionInCents)} />
                    <InfoItem label="Moeda" value={selectedSale.commission.currency} />
                </div>
              </section>
            )}
            
            <div className="mt-8 flex justify-end">
              <Button variant="outline" onClick={handleCloseDetailsModal}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};