import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Customer, FunnelStage, Product as ProductType } from '../types';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService'; 
import { UsersIcon, WhatsAppIcon, generateWhatsAppLink } from '@/constants.tsx';
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
  // Adjusted for dark theme
  switch (stage) {
    case FunnelStage.CUSTOMER: return 'bg-green-600/20 text-green-400';
    case FunnelStage.PROSPECT: return 'bg-blue-600/20 text-blue-400';
    case FunnelStage.LEAD: return 'bg-yellow-500/20 text-yellow-400';
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
    return <div className="text-center text-red-400 p-4 bg-red-800/20 rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-100">Meus Clientes</h1>
      
      <Card className="p-0 sm:p-0 border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-b border-neutral-700">
          <Input 
            placeholder="Buscar por nome, email, ID, WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-700 border-neutral-600 text-neutral-200 placeholder-neutral-400"
          />
          <div>
            <label htmlFor="funnelStageFilter" className="block text-sm font-medium text-neutral-300">Etapa do Funil</label>
            <select 
              id="funnelStageFilter" 
              value={filterFunnelStage}
              onChange={(e) => setFilterFunnelStage(e.target.value as FunnelStage | '')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-neutral-700 text-neutral-200"
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
            <UsersIcon className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
            <p className="text-lg text-neutral-400">
              {allCustomers.length === 0 ? "Nenhum cliente registrado ainda." : "Nenhum cliente encontrado com os filtros atuais."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-700">
            <thead className="bg-neutral-700/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">WhatsApp</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Total Gasto</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Funil</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Última Compra</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-neutral-800 divide-y divide-neutral-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-700/70 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-100">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">{customer.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">
                  {customer.whatsapp ? (
                    <a
                      href={generateWhatsAppLink(customer.whatsapp, `Olá ${customer.name || 'Cliente'}, ...`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-400 hover:text-green-300"
                    >
                      <WhatsAppIcon className="h-4 w-4 mr-1" /> {customer.whatsapp}
                    </a>
                  ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{formatCurrency(customer.totalSpentInCents)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getFunnelStageClass(customer.funnelStage)}`}>
                      {getFunnelStageLabel(customer.funnelStage)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(customer)} className="text-neutral-300 hover:text-primary">Ver Detalhes</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {selectedCustomer && (
        <Modal 
          isOpen={isDetailsModalOpen} 
          onClose={handleCloseDetailsModal} 
          title={`Detalhes do Cliente: ${selectedCustomer.name}`}
          size="xl"
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 text-sm">
             <section>
                <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Informações de Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <InfoItem label="Nome" value={selectedCustomer.name} />
                  <InfoItem label="Email" value={selectedCustomer.email} />
                  <InfoItem 
                    label="WhatsApp" 
                    value={selectedCustomer.whatsapp} 
                    isWhatsApp={!!selectedCustomer.whatsapp}
                    whatsAppUrl={selectedCustomer.whatsapp ? generateWhatsAppLink(selectedCustomer.whatsapp, `Olá ${selectedCustomer.name || 'Cliente'}, ...`) : undefined}
                  />
                  <InfoItem label="ID Cliente" value={selectedCustomer.id} />
                </div>
            </section>
            <section>
                <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Histórico de Compras</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoItem label="Total Gasto" value={<span className="font-bold text-primary">{formatCurrency(selectedCustomer.totalSpentInCents)}</span>} />
                    <InfoItem label="Total de Pedidos" value={selectedCustomer.totalOrders} />
                    <InfoItem label="Data da Primeira Compra" value={selectedCustomer.firstPurchaseDate ? new Date(selectedCustomer.firstPurchaseDate).toLocaleDateString() : 'N/A'} />
                    <InfoItem label="Data da Última Compra" value={selectedCustomer.lastPurchaseDate ? new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString() : 'N/A'} />
                </div>
            </section>
            <section>
                <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Engajamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoItem label="Etapa do Funil" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getFunnelStageClass(selectedCustomer.funnelStage)}`}>{getFunnelStageLabel(selectedCustomer.funnelStage)}</span>} />
                </div>
            </section>
             <section>
                <h3 className="text-lg font-semibold text-neutral-100 border-b border-neutral-600 pb-2 mb-3">Produtos Comprados</h3>
                {selectedCustomer.productsPurchased.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-neutral-300">
                    {selectedCustomer.productsPurchased.map(productId => {
                      const productDetails = allProducts.find(p => p.id === productId);
                      return <li key={productId}>{productDetails ? productDetails.name : `ID: ${productId}`}</li>;
                    })}
                  </ul>
                ) : <p className="text-neutral-400">Nenhum produto comprado registrado.</p>}
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