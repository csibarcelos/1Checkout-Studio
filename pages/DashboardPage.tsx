
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Sale, Product, Customer, PaymentStatus, SaleProductItem } from '../types';
import { salesService } from '../services/salesService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { dashboardService, DashboardData } from '../services/dashboardService';
import { 
    PresentationChartLineIcon, 
    ShoppingCartIcon, 
    UserGroupIcon, 
    CurrencyDollarIcon,
    WhatsAppIcon,
    generateWhatsAppLink
} from '../constants.tsx'; // MODIFICADO DE @/constants.tsx
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (valueInCents: number, showSymbol = true): string => {
    const value = (valueInCents / 100).toFixed(2).replace('.', ',');
    return showSymbol ? `R$ ${value}` : value;
};

export const DashboardPage: React.FC = () => {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentActivity, setRecentActivity] = useState<Sale[]>([]);

  const [dateRangeFilter, setDateRangeFilter] = useState('today');
  const [productFilter, setProductFilter] = useState('all');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, isLoading: authLoading } = useAuth(); // Renomeado isLoading de useAuth

  const dateRangeOptions = [
    { label: 'Hoje', value: 'today' },
    { label: 'Ontem', value: 'yesterday' },
    { label: 'Últimos 7 dias', value: 'last7days' },
    { label: 'Últimos 30 dias', value: 'last30days' },
    { label: 'Este Mês', value: 'thisMonth' },
    { label: 'Mês Anterior', value: 'lastMonth' },
    { label: 'Todo o período', value: 'all' },
  ];

  const fetchInitialData = useCallback(async () => {
    if (authLoading) {
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        salesService.getSales(accessToken), 
        productService.getProducts(accessToken), 
        customerService.getCustomers(accessToken) 
      ]);
      setAllSales(salesRes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAllProducts(productsRes);
      setAllCustomers(customersRes);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados do dashboard.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, accessToken]); 

  useEffect(() => {
    if (!authLoading) { 
        fetchInitialData();
    }
  }, [fetchInitialData, authLoading]);

  useEffect(() => {
    if (!isLoading && allSales.length >= 0) { 
      try {
        const data = dashboardService.getDashboardData({
          sales: allSales,
          customers: allCustomers,
          products: allProducts,
          dateRange: dateRangeFilter,
          productId: productFilter,
        });
        setDashboardData(data);
        
        const sortedSalesForActivity = [...allSales]
          .filter(s => s.status === PaymentStatus.PAID || s.status === PaymentStatus.WAITING_PAYMENT)
          .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentActivity(sortedSalesForActivity.slice(0, 5));

      } catch (processingError: any) {
        console.error("Error processing dashboard data:", processingError);
        setError("Erro ao processar dados para o dashboard.");
        setDashboardData(null);
      }
    } else if (!isLoading && allSales.length === 0) {
        setDashboardData({
            totalRevenue: 0, numberOfSales: 0, averageTicket: 0, newCustomers: 0, salesTrend: []
        });
        setRecentActivity([]);
    }
  }, [allSales, allProducts, allCustomers, dateRangeFilter, productFilter, isLoading]);

  const getMainChartTitle = () => {
    const selectedOption = dateRangeOptions.find(opt => opt.value === dateRangeFilter);
    return `Vendas (${selectedOption ? selectedOption.label : dateRangeFilter})`;
  };
  
  const getMainChartSubTitle = () => {
    if (!dashboardData || !dashboardData.salesTrend || dashboardData.salesTrend.length === 0) return "Nenhum dado para o período selecionado.";
    if (dateRangeFilter === 'today') return `Hoje, ${dashboardData.salesTrend[0].periodLabel} - ${dashboardData.salesTrend[dashboardData.salesTrend.length - 1].periodLabel}`;
    
    const firstPeriod = dashboardData.salesTrend[0].periodLabel;
    const lastPeriod = dashboardData.salesTrend[dashboardData.salesTrend.length - 1].periodLabel;
    
    if (dateRangeFilter === "thisMonth" || dateRangeFilter === "lastMonth") {
        const monthName = new Date(2000, parseInt(firstPeriod.split('/')[1]) -1, 1).toLocaleString('default', { month: 'long' });
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    }
    if (dateRangeFilter === "all") return "Todo o período";

    return `${firstPeriod} - ${lastPeriod}`;
  };

  if (authLoading || (isLoading && !dashboardData)) { 
    return (
      <div className="flex justify-center items-center h-[calc(100vh-150px)]">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-xl text-neutral-400">Carregando dashboard...</p>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center text-red-400 p-6 bg-red-900/30 rounded-md shadow">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-100">Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={dateRangeFilter} 
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="p-2 border border-neutral-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm w-full sm:w-auto bg-neutral-700 text-neutral-200"
          >
            {dateRangeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select 
            value={productFilter} 
            onChange={(e) => setProductFilter(e.target.value)}
            className="p-2 border border-neutral-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm w-full sm:w-auto bg-neutral-700 text-neutral-200"
          >
            <option value="all">Todos os produtos</option>
            {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-neutral-800 border-neutral-700">
        <div className="p-3">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">{getMainChartTitle()}</h3>
              <p className="text-xs text-neutral-400">{getMainChartSubTitle()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400">Total no período</p>
              <p className="text-2xl font-bold text-primary">
                {dashboardData ? formatCurrency(dashboardData.totalRevenue) : formatCurrency(0)}
              </p>
            </div>
          </div>
          <div className="h-48 bg-neutral-700 rounded-md flex items-center justify-center border border-neutral-600 overflow-x-auto p-2">
             {dashboardData && dashboardData.salesTrend.length > 0 ? (
                <pre className="text-xs text-neutral-300 text-left whitespace-pre">
                  {`Dados do Gráfico (${dateRangeFilter === 'today' ? 'por hora' : 'por dia'}):\n`}
                  {dashboardData.salesTrend.map(item => 
                    `  ${item.periodLabel}: ${formatCurrency(item.amount, false)}\n`
                  ).join('')}
                </pre>
             ) : (
                <p className="text-neutral-400 text-center py-10">Nenhum dado de tendência de vendas para exibir.</p>
             )}
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData ? (
            <>
                <StatCard title="Receita Total" value={formatCurrency(dashboardData.totalRevenue)} icon={CurrencyDollarIcon} />
                <StatCard title="Vendas Realizadas" value={dashboardData.numberOfSales} icon={ShoppingCartIcon} />
                <StatCard title="Ticket Médio" value={formatCurrency(dashboardData.averageTicket)} icon={CurrencyDollarIcon} />
                <StatCard title="Novos Clientes" value={dashboardData.newCustomers} icon={UserGroupIcon} />
            </>
        ) : (
            Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="bg-neutral-800 border-neutral-700 shadow-lg">
                    <div className="animate-pulse flex space-x-4">
                        <div className="rounded-full bg-neutral-600 h-10 w-10"></div>
                        <div className="flex-1 space-y-3 py-1">
                            <div className="h-2 bg-neutral-600 rounded"></div>
                            <div className="h-2 bg-neutral-600 rounded w-3/4"></div>
                        </div>
                    </div>
                </Card>
            ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Atividade Recente (Últimas 5 Vendas)" className="bg-neutral-800 border-neutral-700">
          {recentActivity.length > 0 ? (
            <ul className="divide-y divide-neutral-700">
              {recentActivity.map(sale => (
                <li key={sale.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-neutral-100">
                        {Array.isArray(sale.products) ? sale.products.map((p: SaleProductItem) => p.name).join(', ') : 'Produtos Indisponíveis'}
                      </p>
                      <p className="text-xs text-neutral-400">Para: {sale.customer.email}</p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === PaymentStatus.PAID ? 'bg-green-700 text-green-100' : 'bg-yellow-600 text-yellow-100'}`}>
                      {sale.status === PaymentStatus.PAID ? 'PAGO' : 'AG. PAG.'}
                    </span>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(sale.totalAmountInCents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-400 text-sm">Nenhuma atividade recente de vendas.</p>
          )}
        </Card>

        <Card title="Produtos Mais Vendidos (Top 3)" className="bg-neutral-800 border-neutral-700">
          <div className="text-neutral-400 text-sm">
            { dashboardData && dashboardData.salesTrend.length > 0 ? 
                "Funcionalidade de produtos mais vendidos será implementada em breve." : 
                "Sem dados de vendas para mostrar produtos mais vendidos."}
          </div>
        </Card>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon }) => {
  return (
    <Card className="bg-neutral-800 border-neutral-700 shadow-lg">
      <div className="flex items-center">
        <div className="p-3 bg-primary/20 rounded-full mr-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-neutral-400">{title}</p>
          <p className="text-2xl font-bold text-neutral-100">{value}</p>
        </div>
      </div>
    </Card>
  );
};
