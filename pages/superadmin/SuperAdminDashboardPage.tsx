

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { User, Sale, PaymentStatus, PlatformSettings } from '../../types';
import { apiClient } from '../../services/apiClient';
import { settingsService } from '../../services/settingsService';
import { useAuth } from '../../contexts/AuthContext';
import { UsersIcon, ShoppingCartIcon, CogIcon, CurrencyDollarIcon as CurrencyDollarHeroIcon, PresentationChartLineIcon as ChartBarIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

interface DashboardStat {
    title: string;
    value: string | number;
    icon: React.ElementType;
}

const getStartOfDate = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getEndOfDate = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

const filterDataByDateRange = <T extends { createdAt?: string; paidAt?: string }>(
  data: T[],
  dateRange: string,
  dateField: 'createdAt' | 'paidAt' = 'createdAt' // Default to createdAt, use paidAt for paid sales
): T[] => {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (dateRange) {
    case 'today':
      startDate = getStartOfDate(now);
      endDate = getEndOfDate(now);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startDate = getStartOfDate(yesterday);
      endDate = getEndOfDate(yesterday);
      break;
    case 'last7days':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      endDate = getEndOfDate(now);
      break;
    case 'last30days':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      endDate = getEndOfDate(now);
      break;
    case 'thisMonth':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), 1));
      endDate = getEndOfDate(now);
      break;
    case 'lastMonth':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      endDate = getEndOfDate(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case 'allTime':
    default:
      return data;
  }

  return data.filter(item => {
    const itemDateStr = dateField === 'paidAt' ? item.paidAt : item.createdAt;
    if (!itemDateStr) return dateField === 'paidAt' ? false : true; // if filtering by paidAt and it's not set, exclude
    const itemDate = new Date(itemDateStr);
    if (isNaN(itemDate.getTime())) return false;
    
    let include = true;
    if (startDate) include = include && itemDate >= startDate;
    if (endDate) include = include && itemDate <= endDate;
    return include;
  });
};

export const SuperAdminDashboardPage: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  
  // Filtered data for display
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  // Metrics based on filtered data
  const [totalUsersCount, setTotalUsersCount] = useState(0); // Always total
  const [newUsersInPeriod, setNewUsersInPeriod] = useState(0);
  const [salesInPeriodCount, setSalesInPeriodCount] = useState(0);
  const [salesValueInPeriod, setSalesValueInPeriod] = useState(0);
  const [platformCommissionsInPeriod, setPlatformCommissionsInPeriod] = useState(0);
  const [averageTicketInPeriod, setAverageTicketInPeriod] = useState(0);
  
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  const [dateRangeFilter, setDateRangeFilter] = useState('thisMonth');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const dateRangeOptions = [
    { label: 'Hoje', value: 'today' },
    { label: 'Ontem', value: 'yesterday' },
    { label: 'Últimos 7 dias', value: 'last7days' },
    { label: 'Últimos 30 dias', value: 'last30days' },
    { label: 'Este Mês', value: 'thisMonth' },
    { label: 'Mês Anterior', value: 'lastMonth' },
    { label: 'Todo o Período', value: 'allTime' },
  ];

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError("Autenticação de super admin necessária.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, salesData, platSettings] = await Promise.all([
        apiClient.request<User[]>({ method: 'GET', endpoint: '/superadmin/users', token: accessToken }),
        apiClient.request<Sale[]>({ method: 'GET', endpoint: '/superadmin/sales', token: accessToken }),
        settingsService.getPlatformSettings(accessToken)
      ]);
      
      setAllUsers(usersData);
      setAllSales(salesData);
      setPlatformSettings(platSettings);
      setTotalUsersCount(usersData.length); // Set total users count here

      // Set recent activities (not affected by date filter)
      setRecentSales(salesData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,5));
      setRecentUsers(usersData.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0,5));


    } catch (err: any) {
      setError(err.error?.message || err.message || 'Falha ao carregar dados do dashboard de super admin.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recalculate metrics when filters or base data change
  useEffect(() => {
    if (isLoading || !platformSettings) return; // Don't process if still loading or settings not fetched

    const currentFilteredUsers = filterDataByDateRange(allUsers, dateRangeFilter, 'createdAt');
    setFilteredUsers(currentFilteredUsers);
    setNewUsersInPeriod(currentFilteredUsers.length);

    // For sales, filter by paidAt when considering revenue, commission, ticket
    const salesForPeriodMetrics = filterDataByDateRange(allSales, dateRangeFilter, 'paidAt')
                                 .filter(s => s.status === PaymentStatus.PAID);
    
    // For total sales count in period, consider all sales (not just paid) created in period
    const allSalesCreatedInPeriod = filterDataByDateRange(allSales, dateRangeFilter, 'createdAt');
    setSalesInPeriodCount(allSalesCreatedInPeriod.length);

    setFilteredSales(salesForPeriodMetrics); // Store paid sales in period for potential detailed views

    const currentSalesValue = salesForPeriodMetrics.reduce((sum, sale) => sum + sale.totalAmountInCents, 0);
    setSalesValueInPeriod(currentSalesValue);

    let calculatedCommissions = 0;
    salesForPeriodMetrics.forEach(sale => {
      if (sale.platformCommissionInCents !== undefined) {
          calculatedCommissions += sale.platformCommissionInCents;
      } else {
          const commissionForSale = Math.round(sale.totalAmountInCents * platformSettings.platformCommissionPercentage) + platformSettings.platformFixedFeeInCents;
          calculatedCommissions += commissionForSale;
      }
    });
    setPlatformCommissionsInPeriod(calculatedCommissions);

    const paidSalesCountInPeriod = salesForPeriodMetrics.length;
    setAverageTicketInPeriod(paidSalesCountInPeriod > 0 ? currentSalesValue / paidSalesCountInPeriod : 0);

  }, [allUsers, allSales, dateRangeFilter, platformSettings, isLoading]);
  
  const stats: DashboardStat[] = [
    { title: "Total de Usuários", value: totalUsersCount, icon: UsersIcon }, // Total geral
    { title: "Novos Usuários (Período)", value: newUsersInPeriod, icon: UsersIcon },
    { title: "Vendas (Período)", value: salesInPeriodCount, icon: ShoppingCartIcon }, // All sales in period
    { title: "Valor Vendido (Período)", value: formatCurrency(salesValueInPeriod), icon: CurrencyDollarHeroIcon }, // Paid sales
    { title: "Comissão Plataforma (Período)", value: formatCurrency(platformCommissionsInPeriod), icon: ChartBarIcon },
    { title: "Ticket Médio (Período)", value: formatCurrency(averageTicketInPeriod), icon: CurrencyDollarHeroIcon },
  ];


  if (isLoading && totalUsersCount === 0 && allSales.length === 0) { // Corrected typo here
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-800">Dashboard do Super Administrador</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="p-2 border border-neutral-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm w-full"
            >
                {dateRangeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <Button to="/superadmin/configuracoes-plataforma" variant="primary" leftIcon={<CogIcon className="h-5 w-5"/>} className="flex-shrink-0">
                Config.
            </Button>
        </div>
      </div>

      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(stat => (
            <Card key={stat.title} className="shadow-lg">
                 <div className="flex items-center">
                    <div className="p-3 bg-primary-light rounded-full mr-4">
                        <stat.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-500">{stat.title}</p>
                        <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
                    </div>
                </div>
            </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Vendas Recentes (Últimas 5 Globais)">
          {recentSales.length > 0 ? (
            <ul className="divide-y divide-neutral-200">
              {recentSales.map(sale => (
                <li key={sale.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">Venda <Link to={`/superadmin/vendas-gerais`} className="text-primary hover:underline">#{sale.id.substring(0,8)}</Link></p>
                      <p className="text-xs text-neutral-500">Cliente: {sale.customer.email} | Por: {sale.platformUserId.substring(0,10)}...</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(sale.totalAmountInCents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-neutral-500 text-sm">Nenhuma venda recente.</p>}
           <div className="mt-4 text-right">
            <Link to="/superadmin/vendas-gerais" className="text-sm font-medium text-primary hover:text-primary-dark">Ver todas &rarr;</Link>
          </div>
        </Card>

        <Card title="Usuários Recentes (Últimos 5 Globais)">
           {recentUsers.length > 0 ? (
            <ul className="divide-y divide-neutral-200">
              {recentUsers.map(user => (
                <li key={user.id} className="py-3">
                   <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-neutral-800">{user.name || 'N/A'}</p>
                        <p className="text-xs text-neutral-500">{user.email} {user.createdAt ? `(Criado: ${new Date(user.createdAt).toLocaleDateString()})` : ''}</p>
                    </div>
                    {user.isSuperAdmin && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Super Admin</span>}
                   </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-neutral-500 text-sm">Nenhum usuário recente.</p>}
           <div className="mt-4 text-right">
            <Link to="/superadmin/usuarios" className="text-sm font-medium text-primary hover:text-primary-dark">Ver todos &rarr;</Link>
          </div>
        </Card>
      </div>

    </div>
  );
};