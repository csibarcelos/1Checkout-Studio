import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Sale, PaymentStatus, SaleProductItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { BanknotesIcon } from '@heroicons/react/24/outline';

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const getStatusClass = (status: PaymentStatus) => {
  switch (status) {
    case PaymentStatus.PAID: return 'bg-green-100 text-green-700';
    case PaymentStatus.WAITING_PAYMENT: return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-red-100 text-red-700';
  }
};

const InfoItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={`mb-2 ${className}`}>
    <span className="font-semibold text-neutral-600">{label}: </span>
    <span className="text-neutral-800">{value}</span>
  </div>
);


export const SuperAdminSalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailsModalOpen, setIsSaleDetailsModalOpen] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!accessToken) {
      setError("Autenticação de super admin necessária.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implementar chamada direta ao Supabase para buscar todas as vendas.
      // const salesData = await someSuperAdminSalesService.getAllSales(accessToken);
      const salesData: Sale[] = []; // Placeholder
      setSales(salesData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      if (salesData.length === 0) {
        setError("SuperAdmin Sales: Integração de dados via Supabase pendente ou nenhuma venda encontrada.");
      }
    } catch (err: any) {
      setError(err.error?.message || 'Falha ao carregar vendas.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleOpenSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsSaleDetailsModalOpen(true);
  };

  const handleCloseSaleDetails = () => {
    setSelectedSale(null);
    setIsSaleDetailsModalOpen(false);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BanknotesIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Todas as Vendas ({sales.length})</h1>
      </div>

      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      <Card className="p-0 sm:p-0">
        {sales.length === 0 && !isLoading ? (
          <p className="p-6 text-center text-neutral-500">{error || "Nenhuma venda encontrada na plataforma."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID Venda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Cliente Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Comissão Plataforma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-primary-light/10 cursor-pointer" onClick={() => handleOpenSaleDetails(sale)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{sale.id.split('_').pop()}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{sale.platformUserId.substring(0,10)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{sale.customer.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatCurrency(sale.totalAmountInCents)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{formatCurrency(sale.platformCommissionInCents || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(sale.status)}`}>
                        {sale.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenSaleDetails(sale); }}>Detalhes</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedSale && (
        <Modal isOpen={isSaleDetailsModalOpen} onClose={handleCloseSaleDetails} title={`Detalhes da Venda ${selectedSale.id.split('_').pop()}`} size="lg">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
             <section>
              <h3 className="text-md font-semibold text-neutral-700 border-b pb-1 mb-2">Informações Gerais</h3>
              <InfoItem label="ID Venda Completo" value={selectedSale.id} />
              <InfoItem label="ID Usuário Dono" value={selectedSale.platformUserId} />
              <InfoItem label="ID Transação PushInPay" value={selectedSale.pushInPayTransactionId} />
              {selectedSale.upsellPushInPayTransactionId && <InfoItem label="ID Transação Upsell" value={selectedSale.upsellPushInPayTransactionId} />}
              <InfoItem label="Valor Total" value={<span className="font-bold text-primary">{formatCurrency(selectedSale.totalAmountInCents)}</span>} />
              {selectedSale.upsellAmountInCents && <InfoItem label="Valor Upsell" value={formatCurrency(selectedSale.upsellAmountInCents)} />}
               <InfoItem label="Comissão da Plataforma" value={<span className="text-blue-700">{formatCurrency(selectedSale.platformCommissionInCents || 0)}</span>} />
              <InfoItem label="Data" value={new Date(selectedSale.createdAt).toLocaleString()} />
              <InfoItem label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(selectedSale.status)}`}>{selectedSale.status.replace(/_/g, ' ').toUpperCase()}</span>} />
             </section>
             <section>
                <h3 className="text-md font-semibold text-neutral-700 border-b pb-1 mb-2">Cliente</h3>
                <InfoItem label="Nome" value={selectedSale.customer.name} />
                <InfoItem label="Email" value={selectedSale.customer.email} />
                <InfoItem label="WhatsApp" value={selectedSale.customer.whatsapp} />
             </section>
             <section>
                <h3 className="text-md font-semibold text-neutral-700 border-b pb-1 mb-2">Produtos</h3>
                {Array.isArray(selectedSale.products) && selectedSale.products.map((item: SaleProductItem, idx: number) => (
                    <div key={idx} className="mb-1 p-2 bg-neutral-50 rounded-sm text-sm">
                        <p className="font-medium text-neutral-700">{item.name} {item.isOrderBump ? '(Order Bump)' : item.isUpsell ? '(Upsell)' : ''}</p>
                        <p>Qtd: {item.quantity} | Preço Unit.: {formatCurrency(item.priceInCents / item.quantity)} | Total: {formatCurrency(item.priceInCents)}</p>
                    </div>
                ))}
             </section>
             {selectedSale.trackingParameters && Object.keys(selectedSale.trackingParameters).length > 0 && (
                <section>
                    <h3 className="text-md font-semibold text-neutral-700 border-b pb-1 mb-2">UTMs</h3>
                    {Object.entries(selectedSale.trackingParameters).map(([key, value]) => (
                        <InfoItem key={key} label={key} value={value as string} />
                    ))}
                </section>
             )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={handleCloseSaleDetails}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};