import { Sale, Customer, Product, PaymentStatus, SaleProductItem } from '../types'; // Updated path

export interface DashboardData {
  totalRevenue: number;
  numberOfSales: number;
  averageTicket: number;
  newCustomers: number;
  salesTrend: { periodLabel: string; amount: number }[];
  // Add other Kiwify-like metrics here if needed in future
  // e.g., approvalRate: number; oneClickSalesValue: number; refundsValue: number; boletoConversion: number;
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

const filterSalesByDateRange = (sales: Sale[], dateRange: string): Sale[] => {
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
      endDate = getEndOfDate(now); // Includes today up to current time
      break;
    case 'last30days':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      endDate = getEndOfDate(now); // Includes today
      break;
    case 'thisMonth':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), 1));
      endDate = getEndOfDate(now); // Up to current day in month
      break;
    case 'lastMonth':
      startDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      endDate = getEndOfDate(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case 'all':
    default:
      return sales; // No date filtering
  }

  return sales.filter(sale => {
    const saleDate = new Date(sale.paidAt || sale.createdAt);
    // Ensure saleDate is valid before comparison
    if (isNaN(saleDate.getTime())) return false;
    
    let include = true;
    if (startDate) include = include && saleDate >= startDate;
    if (endDate) include = include && saleDate <= endDate;
    return include;
  });
};

const filterSalesByProduct = (sales: Sale[], productId: string): Sale[] => {
  if (productId === 'all') {
    return sales;
  }
  return sales.filter(sale => Array.isArray(sale.products) && sale.products.some(p => p.productId === productId));
};


export const dashboardService = {
  getDashboardData: (params: {
    sales: Sale[];
    customers: Customer[];
    products: Product[];
    dateRange: string;
    productId: string;
  }): DashboardData => {
    const { sales, customers, products, dateRange, productId } = params;

    let filteredSales = filterSalesByDateRange(sales, dateRange);
    filteredSales = filterSalesByProduct(filteredSales, productId);
    
    const paidSales = filteredSales.filter(sale => sale.status === PaymentStatus.PAID);

    const totalRevenue = paidSales.reduce((sum, sale) => sum + sale.totalAmountInCents, 0);
    const numberOfSales = paidSales.length;
    const averageTicket = numberOfSales > 0 ? totalRevenue / numberOfSales : 0;

    const newCustomersList = customers.filter(customer => {
        const firstPurchaseDate = new Date(customer.firstPurchaseDate);
        if (isNaN(firstPurchaseDate.getTime())) return false;
        
        const dashboardDateRangeSales = filterSalesByDateRange(sales, dateRange); 
        const customerFirstSale = dashboardDateRangeSales.find(s => s.id === customer.saleIds[0] && s.status === PaymentStatus.PAID);

        if (!customerFirstSale) return false; 

        const isFirstPurchaseInDateRange = filterSalesByDateRange([customerFirstSale], dateRange).length > 0;

        if (productId !== 'all') {
            // Ensure customerFirstSale.products is an array before calling .some
            const saleProducts = Array.isArray(customerFirstSale.products) ? customerFirstSale.products : [];
            return isFirstPurchaseInDateRange && saleProducts.some(p => p.productId === productId);
        }
        return isFirstPurchaseInDateRange;
    });
    const newCustomers = newCustomersList.length;


    // Prepare Sales Trend Data
    const salesTrend: { periodLabel: string; amount: number }[] = [];
    if (dateRange === 'today') {
      const hourlySales: { [hour: string]: number } = {};
      for (let i = 0; i < 24; i++) {
        hourlySales[String(i).padStart(2, '0') + 'h'] = 0;
      }
      paidSales.forEach(sale => {
        const saleDate = new Date(sale.paidAt || sale.createdAt);
        if (!isNaN(saleDate.getTime())) {
            const hour = String(saleDate.getHours()).padStart(2, '0') + 'h';
            hourlySales[hour] = (hourlySales[hour] || 0) + sale.totalAmountInCents;
        }
      });
      for (const hour in hourlySales) {
        salesTrend.push({ periodLabel: hour, amount: hourlySales[hour] });
      }
    } else {
      const dailySales: { [day: string]: number } = {};
      let loopStartDate: Date;
      const now = new Date();
      if (dateRange === 'last7days') loopStartDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      else if (dateRange === 'last30days') loopStartDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      else if (dateRange === 'thisMonth') loopStartDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth(), 1));
      else if (dateRange === 'lastMonth') loopStartDate = getStartOfDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      else loopStartDate = paidSales.length > 0 ? getStartOfDate(new Date(paidSales.reduce((min, s) => Math.min(min, new Date(s.paidAt || s.createdAt).getTime()), Infinity))) : now;
      
      let loopEndDate = getEndOfDate(now);
      if(dateRange === 'lastMonth') loopEndDate = getEndOfDate(new Date(now.getFullYear(), now.getMonth(), 0));


      if (!isNaN(loopStartDate.getTime())) { 
        for (let d = new Date(loopStartDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
            const dayKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            dailySales[dayKey] = 0;
        }
      }


      paidSales.forEach(sale => {
        const saleDate = new Date(sale.paidAt || sale.createdAt);
        if (!isNaN(saleDate.getTime())) {
            const dayKey = `${String(saleDate.getDate()).padStart(2, '0')}/${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
            dailySales[dayKey] = (dailySales[dayKey] || 0) + sale.totalAmountInCents;
        }
      });
      for (const day in dailySales) {
        salesTrend.push({ periodLabel: day, amount: dailySales[day] });
      }
      salesTrend.sort((a, b) => { 
        const [dayA, monthA] = a.periodLabel.split('/').map(Number);
        const [dayB, monthB] = b.periodLabel.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      });
    }

    return {
      totalRevenue,
      numberOfSales,
      averageTicket,
      newCustomers,
      salesTrend,
    };
  },
};