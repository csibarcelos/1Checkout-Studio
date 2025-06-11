
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Customer, FunnelStage, Product as ProductType } from '../types';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService'; 
import { UsersIcon, WhatsAppIcon, generateWhatsAppLink } from '../constants.tsx';
import { useAuth } from '../contexts/AuthContext'; 


const getFunnelStageLabel = (stage: FunnelStage) => {
  const labels: Record<FunnelStage, string> = {
    [FunnelStage.LEAD]: 'Lead',
    [FunnelStage.PROSPECT]: 'Prospect',
    [FunnelStage.CUSTOMER]: 'Cliente',
  };
  return labels[stage] || stage;
};

const getFunnelStageClass = (stage: FunnelStage) => {
  switch (stage) {
    case FunnelStage.CUSTOMER: return 'bg-green-100 text-green-700';
    case FunnelStage.PROSPECT: return 'bg-blue-100 text-blue-700';
    case FunnelStage.LEAD: return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-neutral-100 text-neutral-700';
  }
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

export const ClientesPage: React.FC = () => {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [allProducts, setAllProducts] = useState<ProductType[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFunnelStage, setFilterFunnelStage] = useState<FunnelStage | ''>('');
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { accessToken } = useAuth(); 

  const fetchData = useCallback(async () => {
    if (!accessToken) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [customersData, productsData] = await Promise.all([
        customerService.getCustomers(accessToken), 
        productService.getProducts(accessToken) 
      ]);
      setAllCustomers(customersData.sort((a,b) => new Date(b.lastPurchaseDate || 0).getTime() - new Date(a.lastPurchaseDate || 0).getTime()));
      setFilteredCustomers(customersData);
      setAllProducts(productsData);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let currentCustomers = [...allCustomers];
    if (searchTerm) {
      currentCustomers = currentCustomers.filter(customer =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterFunnelStage) {
      currentCustomers = currentCustomers.filter(customer => customer.funnelStage === filterFunnelStage);
    }
    setFilteredCustomers(currentCustomers);
  }, [searchTerm, filterFunnelStage, allCustomers]);

  const handleOpenDetailsModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedCustomer(null);
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
      <h1 className="text-3xl font-bold text-neutral-800">Meus Clientes</h1>
      
      <Card className="p-0 sm:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-b border-neutral-200">
          <Input 
            placeholder="Buscar por nome, email, ID, WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div>
            <label htmlFor="funnelStageFilter" className="block text-sm font-medium text-neutral-700">Etapa do Funil</label>
            <select 
              id="funnelStageFilter" 
              value={filterFunnelStage}
              onChange={(e) => setFilterFunnelStage(e.target.value as FunnelStage | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="">Todas</option>
              {Object.values(FunnelStage).map(stage => (
                <option key={stage} value={stage}>{getFunnelStageLabel(stage)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end col-span-1 md:col-span-2 lg:col-span-1 lg:col-start-4">
            <Button variant="outline" onClick={() => {setSearchTerm(''); setFilterFunnelStage('');}} className="w-full">Limpar Filtros</Button>
          </div>
        </div>
      
        {filteredCustomers.length === 0 ? (
           <div className="text-center py-12">
            <UsersIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-lg text-neutral-500">
              {allCustomers.length === 0 ? "Nenhum cliente registrado ainda." : "Nenhum cliente encontrado com os filtros atuais."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-100">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">WhatsApp</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Gasto</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Pedidos</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Etapa Funil</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Última Compra</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredCustomers.map((customer) => {
                const customerName = customer.name || 'Cliente';
                const customerWhatsapp = customer.whatsapp || '';
                const whatsappMessage = customerWhatsapp 
                  ? `Olá ${customerName}, tudo bem? Sou da equipe 1Checkout.`
                  : '';
                const whatsappUrl = customerWhatsapp ? generateWhatsAppLink(customerWhatsapp, whatsappMessage) : '';

                return (
                <tr key={customer.id} className="hover:bg-primary-light/40 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{customer.email || 'N/A'}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatCurrency(customer.totalSpentInCents)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{customer.totalOrders}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getFunnelStageClass(customer.funnelStage)}`}>
                      {getFunnelStageLabel(customer.funnelStage)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(customer)}>Detalhes</Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {selectedCustomer && (
        <Modal 
            isOpen={isDetailsModalOpen} 
            onClose={handleCloseDetailsModal} 
            title={`Detalhes do Cliente: ${selectedCustomer.name || selectedCustomer.email}`}
            size="lg"
        >
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Informações Pessoais</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <InfoItem label="ID Cliente" value={selectedCustomer.id} />
                <InfoItem label="Nome" value={selectedCustomer.name} />
                <InfoItem label="Email" value={selectedCustomer.email} />
                <InfoItem 
                  label="WhatsApp" 
                  value={selectedCustomer.whatsapp}
                  isWhatsApp={!!selectedCustomer.whatsapp}
                  whatsAppUrl={selectedCustomer.whatsapp ? generateWhatsAppLink(selectedCustomer.whatsapp, `Olá ${selectedCustomer.name || 'Cliente'}, ...`) : undefined}
                />
               </div>
            </section>
            <section>
                <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 mb-3">Histórico de Compras</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoItem label="Total Gasto" value={<span className="font-bold text-primary">{formatCurrency(selectedCustomer.totalSpentInCents)}</span>} />
                    <InfoItem label="Total de Pedidos" value={selectedCustomer.totalOrders} />
                    <InfoItem label="Primeira Compra" value={selectedCustomer.firstPurchaseDate ? new Date(selectedCustomer.firstPurchaseDate).toLocaleDateString() : 'N/A'} />
                    <InfoItem label="Última Compra" value={selectedCustomer.lastPurchaseDate ? new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString() : 'N/A'} />
                </div>
                <div className="mt-3">
                    <p className="font-semibold text-neutral-600 mb-1">Produtos Comprados ({selectedCustomer.productsPurchased.length}):</p>
                    {selectedCustomer.productsPurchased.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-neutral-700 max-h-32 overflow-y-auto">
                            {selectedCustomer.productsPurchased.map(prodId => {
                                const productDetails = allProducts.find(p => p.id === prodId);
                                return <li key={prodId}>{productDetails ? productDetails.name : `ID: ${prodId}`}</li>;
                            })}
                        </ul>
                    ) : <p className="text-sm text-neutral-500">Nenhum produto registrado.</p>}
                </div>
                 <div className="mt-2">
                    <p className="font-semibold text-neutral-600 mb-1">IDs das Vendas ({selectedCustomer.saleIds.length}):</p>
                    {selectedCustomer.saleIds.length > 0 ? (
                         <p className="text-xs text-neutral-500 break-all">{selectedCustomer.saleIds.join(', ')}</p>
                    ) : <p className="text-sm text-neutral-500">Nenhum ID de venda registrado.</p>}
                </div>
            </section>
          </div>
          <div className="mt-8 flex justify-end">
            <Button variant="outline" onClick={handleCloseDetailsModal}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
