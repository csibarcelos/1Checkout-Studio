import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Product, User, Coupon, OrderBumpOffer, UpsellOffer } from '../../types';
// import { apiClient } from '../../services/apiClient'; // Removido
import { useAuth } from '../../contexts/AuthContext';
import { CubeIcon, ChartPieIcon } from '@/constants.tsx'; 

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const InfoItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={`mb-1 ${className}`}>
    <span className="font-semibold text-xs text-neutral-500 uppercase">{label}: </span>
    <span className="text-sm text-neutral-800">{value}</span>
  </div>
);

type ProductSortableKeys = 'name' | 'priceInCents' | 'totalSales';
type SortableKeys = ProductSortableKeys | 'ownerEmail';


interface SortConfig {
    key: SortableKeys | null;
    direction: 'ascending' | 'descending';
}

export const SuperAdminAllProductsPage: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

  const getUserEmail = useCallback((userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.email || 'Desconhecido';
  }, [allUsers]);

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError("Autenticação de super admin necessária.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implementar chamadas diretas ao Supabase para buscar todos os produtos e usuários.
      // const productsData = await someSuperAdminProductService.getAllProducts(accessToken);
      // const usersData = await someSuperAdminUserService.getAllUsers(accessToken);
      const productsData: Product[] = []; // Placeholder
      const usersData: User[] = []; // Placeholder
      
      setAllProducts(productsData);
      setAllUsers(usersData);
      if (productsData.length === 0) {
        setError("SuperAdmin Products: Integração de dados via Supabase pendente ou nenhum produto encontrado.");
      }
    } catch (err: any) {
      setError(err.error?.message || 'Falha ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = useMemo(() => {
    let sortableItems = [...allProducts];
    if (sortConfig.key) {
      const key = sortConfig.key;
      sortableItems.sort((a, b) => {
        if (key === 'ownerEmail') {
          const emailA = getUserEmail(a.platformUserId);
          const emailB = getUserEmail(b.platformUserId);
          return sortConfig.direction === 'ascending' ? emailA.localeCompare(emailB) : emailB.localeCompare(emailA);
        } else {
          // key is 'name', 'priceInCents', or 'totalSales'
          const valA_raw = a[key as ProductSortableKeys];
          const valB_raw = b[key as ProductSortableKeys];

          if (key === 'name') {
            const strA = valA_raw as string;
            const strB = valB_raw as string;
            return sortConfig.direction === 'ascending' ? strA.localeCompare(strB) : strB.localeCompare(strA);
          } else { // 'priceInCents' or 'totalSales'
            let numA = valA_raw as number | undefined | null; 
            let numB = valB_raw as number | undefined | null;

            numA = (numA === null || numA === undefined) ? (sortConfig.direction === 'ascending' ? Infinity : -Infinity) : numA;
            numB = (numB === null || numB === undefined) ? (sortConfig.direction === 'ascending' ? Infinity : -Infinity) : numB;
            
            return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
          }
        }
      });
    }
    return sortableItems;
  }, [allProducts, sortConfig, getUserEmail]);

  const getSortIndicator = (key: SortableKeys) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleOpenProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  };

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
    setIsDetailsModalOpen(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        {typeof ChartPieIcon === 'function' ? <ChartPieIcon className="h-8 w-8 text-primary" /> : <CubeIcon className="h-8 w-8 text-primary" /> }
        <h1 className="text-3xl font-bold text-neutral-800">Todos os Produtos da Plataforma ({allProducts.length})</h1>
      </div>

      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      <Card className="p-0 sm:p-0">
        {sortedProducts.length === 0 && !isLoading ? (
          <p className="p-6 text-center text-neutral-500">{error || "Nenhum produto encontrado na plataforma."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-200/70 transition-colors"
                    onClick={() => requestSort('name')}
                  >
                    Nome do Produto{getSortIndicator('name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-200/70 transition-colors"
                    onClick={() => requestSort('priceInCents')}
                  >
                    Preço{getSortIndicator('priceInCents')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-200/70 transition-colors"
                    onClick={() => requestSort('ownerEmail')}
                  >
                    Usuário Dono (Email){getSortIndicator('ownerEmail')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-200/70 transition-colors"
                    onClick={() => requestSort('totalSales')}
                  >
                    Vendas (Total){getSortIndicator('totalSales')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-primary-light/10">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">{product.name}</div>
                        <div className="text-xs text-neutral-500">ID: {product.id.substring(0,10)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatCurrency(product.priceInCents)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{getUserEmail(product.platformUserId)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{product.totalSales || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenProductDetails(product)}>
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedProduct && (
        <Modal isOpen={isDetailsModalOpen} onClose={handleCloseProductDetails} title={`Detalhes do Produto: ${selectedProduct.name}`} size="xl">
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 text-sm">
            <InfoItem label="ID Produto" value={selectedProduct.id} />
            <InfoItem label="ID Usuário Dono" value={selectedProduct.platformUserId} />
            <InfoItem label="Email Dono" value={getUserEmail(selectedProduct.platformUserId)} />
            <InfoItem label="Nome" value={selectedProduct.name} />
            <InfoItem label="Descrição" value={<p className="whitespace-pre-wrap">{selectedProduct.description}</p>} />
            <InfoItem label="Preço" value={formatCurrency(selectedProduct.priceInCents)} />
            <InfoItem label="URL de Entrega" value={selectedProduct.deliveryUrl || 'N/A'} />
            <InfoItem label="Total de Vendas" value={selectedProduct.totalSales || 0} />

            <div className="mt-3 pt-3 border-t">
              <h4 className="text-md font-semibold text-neutral-700 mb-1">Personalização do Checkout:</h4>
              <InfoItem label="Cor Primária" value={
                  <div className="flex items-center">
                    <span>{selectedProduct.checkoutCustomization.primaryColor || 'Padrão'}</span>
                    {selectedProduct.checkoutCustomization.primaryColor && 
                        <div className="ml-2 h-4 w-4 rounded border" style={{backgroundColor: selectedProduct.checkoutCustomization.primaryColor}}></div>
                    }
                  </div>
                } 
              />
              <InfoItem label="URL Logo" value={selectedProduct.checkoutCustomization.logoUrl || 'N/A'} />
              <InfoItem label="URL Vídeo" value={selectedProduct.checkoutCustomization.videoUrl || 'N/A'} />
              <InfoItem label="Copy de Vendas" value={selectedProduct.checkoutCustomization.salesCopy ? 'Presente' : 'Ausente'} />
            </div>
            
            {selectedProduct.orderBump && (
                <div className="mt-3 pt-3 border-t">
                    <h4 className="text-md font-semibold text-neutral-700 mb-1">Order Bump:</h4>
                    <InfoItem label="Nome" value={selectedProduct.orderBump.name} />
                    <InfoItem label="Preço Customizado" value={selectedProduct.orderBump.customPriceInCents ? formatCurrency(selectedProduct.orderBump.customPriceInCents) : 'Preço Original'} />
                </div>
            )}
            {selectedProduct.upsell && (
                <div className="mt-3 pt-3 border-t">
                    <h4 className="text-md font-semibold text-neutral-700 mb-1">Upsell:</h4>
                    <InfoItem label="Nome" value={selectedProduct.upsell.name} />
                    <InfoItem label="Preço Customizado" value={selectedProduct.upsell.customPriceInCents ? formatCurrency(selectedProduct.upsell.customPriceInCents) : 'Preço Original'} />
                </div>
            )}
            {selectedProduct.coupons && selectedProduct.coupons.length > 0 && (
                 <div className="mt-3 pt-3 border-t">
                    <h4 className="text-md font-semibold text-neutral-700 mb-1">Cupons ({selectedProduct.coupons.length}):</h4>
                    {selectedProduct.coupons.map((coupon: Coupon) => (
                        <div key={coupon.id} className="text-xs p-1.5 my-1 bg-neutral-100 rounded">
                            <span className="font-semibold">{coupon.code}</span>: {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)} OFF. 
                            Ativo: {coupon.isActive ? 'Sim' : 'Não'}. Automático: {coupon.isAutomatic ? 'Sim' : 'Não'}.
                        </div>
                    ))}
                </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={handleCloseProductDetails}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};