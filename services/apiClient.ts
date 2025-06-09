
import {
  LOCALSTORAGE_KEYS,
  MOCK_WEBHOOK_URL,
  PLATFORM_NAME,
  DEFAULT_CURRENCY,
  SUPER_ADMIN_EMAIL,
  COLOR_PALETTE_OPTIONS,
} from '../constants'; // Corrected path
import {
  Product,
  User,
  UserWithPassword,
  AuthResponse,
  DecodedToken,
  Sale,
  SaleTransaction,
  PaymentStatus,
  PaymentMethod,
  PushInPayPixRequest,
  PushInPayPixResponseData,
  PushInPayPixResponse,
  UtmifyOrderPayload,
  UtmifyResponse,
  SaleProductItem,
  Customer,
  FunnelStage,
  AbandonedCart,
  AbandonedCartStatus,
  AppSettings,
  OrderBumpOffer,
  UpsellOffer,
  Coupon,
  PlatformSettings,
  AuditLogEntry
} from '../types'; // Corrected path
import { utmifyService } from './utmifyService'; // Corrected path
import { pushinPayService } from './pushinPayService'; // Corrected path
import { CreateAbandonedCartPayload } from './abandonedCartService'; // Corrected path

const MOCK_API_DELAY = 500;

interface InternalPixRecordPayload {
  pushInPayResponseData: PushInPayPixResponseData;
  originalRequestPayload: PushInPayPixRequest;
}

interface InternalPixConfirmPayload {
  pixTransactionId: string;
  paidAt?: string;
}

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (e) {
    console.error(`Error reading from localStorage key "${key}":`, e);
    return defaultValue;
  }
};

const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing to localStorage key "${key}":`, e);
  }
};

// Ensure globalThis stores are initialized correctly for pushinPayService mock
(globalThis as any).mockPixTransactionsStore = getFromStorage<SaleTransaction[]>(LOCALSTORAGE_KEYS.PIX_TRANSACTIONS, []);

let mockUsers = getFromStorage<UserWithPassword[]>(LOCALSTORAGE_KEYS.USERS, []);
let mockProductsStore = getFromStorage<Product[]>(LOCALSTORAGE_KEYS.PRODUCTS, []);
let mockSalesStore = getFromStorage<Sale[]>(LOCALSTORAGE_KEYS.SALES, []);
let mockPixTransactionsStore = (globalThis as any).mockPixTransactionsStore;
let mockCustomersStore = getFromStorage<Customer[]>(LOCALSTORAGE_KEYS.CUSTOMERS, []);
let mockAbandonedCartsStore = getFromStorage<AbandonedCart[]>(LOCALSTORAGE_KEYS.ABANDONED_CARTS, []);
let mockAllUserSettingsStore = getFromStorage<Record<string, AppSettings>>(LOCALSTORAGE_KEYS.APP_SETTINGS, {});
let mockPlatformSettingsStore = getFromStorage<PlatformSettings>(LOCALSTORAGE_KEYS.PLATFORM_SETTINGS, {
  id: 'global',
  platformCommissionPercentage: 0.01,
  platformFixedFeeInCents: 100,
  platformAccountIdPushInPay: 'DEFAULT_PLATFORM_ACCOUNT_ID_PUSHINPAY'
});
let mockAuditLogsStore = getFromStorage<AuditLogEntry[]>(LOCALSTORAGE_KEYS.AUDIT_LOGS, []);

interface ApiRequestOptions<TBody = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: TBody;
  token?: string | null;
}

const getDecodedTokenFromToken = (token?: string | null): DecodedToken | null => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0] !== 'mockJWT') return null;
    const payload: DecodedToken = JSON.parse(atob(parts[1]));
    if (!payload.userId || !payload.email || !payload.exp || payload.exp * 1000 < Date.now()) {
      return null;
    }
    payload.isSuperAdmin = payload.email === SUPER_ADMIN_EMAIL;
    payload.isActive = payload.isActive !== undefined ? payload.isActive : true;
    return payload;
  } catch (error) {
    return null;
  }
};

const getUserIdFromToken = (token?: string | null): string | null => {
  const decoded = getDecodedTokenFromToken(token);
  return decoded ? decoded.userId : null;
};

const isUserSuperAdmin = (token?: string | null): boolean => {
    const decoded = getDecodedTokenFromToken(token);
    return !!decoded?.isSuperAdmin;
};

const simulateRequest = <TResponse>(
  handler: () => TResponse | Promise<TResponse>
): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await handler();
        resolve(result);
      } catch (error: any) {
        if (error instanceof ApiSimError) {
          reject({ error: { message: error.message, status: error.status } });
        } else if (error instanceof Error) {
           reject({ error: { message: error.message } });
        } else {
           reject({ error: { message: 'An unknown error occurred in mock API' } });
        }
      }
    }, MOCK_API_DELAY);
  });
};

class ApiSimError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ApiSimError';
    this.status = status;
  }
}

const formatDateForUtmify = (dateInput?: string | Date | null): string => {
  let dateToProcess: Date;
  if (dateInput instanceof Date) dateToProcess = new Date(dateInput.getTime());
  else if (typeof dateInput === 'string') {
    const parsedDate = new Date(dateInput);
    dateToProcess = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  } else dateToProcess = new Date();
  dateToProcess.setHours(dateToProcess.getHours() - 3);
  return dateToProcess.toISOString();
};

const createAuditLogEntry = (logData: Omit<AuditLogEntry, 'id' | 'timestamp'>): void => {
    const newLogEntry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...logData,
    };
    mockAuditLogsStore.unshift(newLogEntry);
    if (mockAuditLogsStore.length > 500) {
        mockAuditLogsStore.splice(500);
    }
    setToStorage(LOCALSTORAGE_KEYS.AUDIT_LOGS, mockAuditLogsStore);
};

const generateAlphanumericSlug = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const getUniqueSlug = (length: number = 5): string => {
    let slug = generateAlphanumericSlug(length);
    // Check against existing slugs in mockProductsStore
    while (mockProductsStore.some(p => p.slug === slug)) {
        slug = generateAlphanumericSlug(length);
    }
    return slug;
};


const buildUtmifyPayload = (
  sourceData: SaleTransaction | Sale,
  status: PaymentStatus
): UtmifyOrderPayload => {
  // ... (implementation remains the same)
  let orderId: string, utmifyCreatedAt: string, approvedDate: string | null = null;
  let customerName: string, customerEmail: string, customerWhatsapp: string;
  let products: SaleProductItem[], trackingParametersSource: Record<string, string> | undefined;
  let totalPriceInCents: number, discountAppliedInCents: number | undefined, couponCodeUsed: string | undefined;
  let originalAmountBeforeDiscountInCents: number;
  let isUpsellTx = false;
  let originalSaleIDForUtmify: string | undefined = undefined;
  let customerDocumentForUtmify: string | null = null;

  const customerIp = "0.0.0.0";

  if ('pushInPayTransactionId' in sourceData) {
    const sale = sourceData as Sale;
    orderId = sale.id; utmifyCreatedAt = formatDateForUtmify(sale.createdAt);
    if (sale.paidAt) approvedDate = formatDateForUtmify(sale.paidAt);
    else if (status === PaymentStatus.PAID) approvedDate = formatDateForUtmify();
    customerName = sale.customer.name; customerEmail = sale.customer.email; customerWhatsapp = sale.customer.whatsapp;
    products = sale.products; trackingParametersSource = sale.trackingParameters || {};
    totalPriceInCents = sale.totalAmountInCents;
    discountAppliedInCents = sale.discountAppliedInCents;
    couponCodeUsed = sale.couponCodeUsed;
    originalAmountBeforeDiscountInCents = sale.originalAmountBeforeDiscountInCents;
  } else {
    const transaction = sourceData as SaleTransaction;
    orderId = transaction.id;
    utmifyCreatedAt = formatDateForUtmify(transaction.createdAt);
    customerName = transaction.customerName; customerEmail = transaction.customerEmail; customerWhatsapp = transaction.customerWhatsapp;
    products = transaction.products; trackingParametersSource = transaction.trackingParameters || {};
    totalPriceInCents = transaction.valueInCents;
    discountAppliedInCents = transaction.discountAppliedToTransactionInCents;
    couponCodeUsed = transaction.couponCodeUsed;
    originalAmountBeforeDiscountInCents = transaction.originalValueBeforeDiscountInCents;
    isUpsellTx = transaction.isUpsellTransaction || false;
    originalSaleIDForUtmify = transaction.originalSaleId;
    if (status === PaymentStatus.PAID) {
        approvedDate = transaction.paidAt ? formatDateForUtmify(transaction.paidAt) : formatDateForUtmify();
    }
  }

  const commissionBasePrice = totalPriceInCents;
  const platformCommPercentage = mockPlatformSettingsStore.platformCommissionPercentage;
  const platformFixedFee = mockPlatformSettingsStore.platformFixedFeeInCents;
  const platformCommission = Math.round(commissionBasePrice * platformCommPercentage) + platformFixedFee;

  const pushinPayFeeForThisTx = Math.round(commissionBasePrice * 0.01) + 100;
  const userCommissionInCents = commissionBasePrice - pushinPayFeeForThisTx - platformCommission;

  const getParamOrNull = (param?: string): string | null => (param && param.trim() !== "") ? param.trim() : null;
  const standardUtmParams: Record<string, string | null> = {
    src: getParamOrNull(trackingParametersSource?.src), sck: getParamOrNull(trackingParametersSource?.sck),
    utm_source: getParamOrNull(trackingParametersSource?.utm_source), utm_medium: getParamOrNull(trackingParametersSource?.utm_medium),
    utm_campaign: getParamOrNull(trackingParametersSource?.utm_campaign), utm_content: getParamOrNull(trackingParametersSource?.utm_content),
    utm_term: getParamOrNull(trackingParametersSource?.utm_term),
  };

  return {
    orderId: orderId, platform: PLATFORM_NAME, paymentMethod: "pix", status: status, createdAt: utmifyCreatedAt,
    approvedDate: approvedDate, refundedAt: null, isTest: false,
    customer: {
        name: customerName, email: customerEmail, whatsapp: customerWhatsapp,
        phone: customerWhatsapp, document: customerDocumentForUtmify, country: "BR", ip: customerIp
    },
    products: products.map((p: SaleProductItem) => ({
        id: p.productId,
        name: p.name,
        quantity: p.quantity,
        priceInCents: p.priceInCents,
        planId: null,
        planName: null,
        isUpsell: p.isUpsell
    })),
    trackingParameters: standardUtmParams,
    commission: { totalPriceInCents: commissionBasePrice, gatewayFeeInCents: pushinPayFeeForThisTx, userCommissionInCents: userCommissionInCents, currency: DEFAULT_CURRENCY, },
    couponCodeUsed: couponCodeUsed,
    discountAppliedInCents: discountAppliedInCents,
    originalAmountBeforeDiscountInCents: originalAmountBeforeDiscountInCents,
    isUpsellTransaction: isUpsellTx,
    originalSaleId: originalSaleIDForUtmify
  };
};

// AUTH HANDLERS (largely unchanged, ensure they return correctly)
const handleRegister = (data: Partial<UserWithPassword>): User => {
  if (!data.email || !data.passwordHash) throw new ApiSimError('Email e senha são obrigatórios.', 400);
  if (mockUsers.find(u => u.email === data.email)) throw new ApiSimError('Usuário já existe.', 409);
  const isSuper = data.email === SUPER_ADMIN_EMAIL;
  const newUser: UserWithPassword = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    passwordHash: data.passwordHash,
    isSuperAdmin: isSuper,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  mockUsers.push(newUser);
  setToStorage(LOCALSTORAGE_KEYS.USERS, mockUsers);

  mockAllUserSettingsStore[newUser.id] = {
    checkoutIdentity: {}, // Required field
    apiTokens: { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false } // Required field
  };
  setToStorage(LOCALSTORAGE_KEYS.APP_SETTINGS, mockAllUserSettingsStore);

  if (!isSuper) {
    const defaultUserProducts: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'coupons' | 'orderBump' | 'upsell' | 'slug'>[] = [
      { name: `Curso de ${newUser.name}`, description: 'Um curso incrível para começar suas vendas.', priceInCents: 19700, imageUrl: 'https://picsum.photos/seed/curso/600/400', checkoutCustomization: { primaryColor: '#0D9488'} },
      { name: `Ebook Exclusivo de ${newUser.name}`, description: 'Conteúdo valioso em formato digital para seu público.', priceInCents: 4700, imageUrl: 'https://picsum.photos/seed/ebook/600/400', checkoutCustomization: { primaryColor: '#F59E0B'} },
    ];
    defaultUserProducts.forEach(prodData => {
      const newProd: Product = {
        ...prodData,
        id: `prod_${newUser.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        slug: getUniqueSlug(), // Generate slug for new products
        platformUserId: newUser.id,
        totalSales: 0, clicks: 0, checkoutViews: 0, conversionRate: 0, abandonmentRate: 0,
        coupons: [], orderBump: undefined, upsell: undefined
      };
      mockProductsStore.push(newProd);
    });
    setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
  }

  const { passwordHash, ...userResponse } = newUser;
  return userResponse;
};

const handleLogin = (data: Pick<UserWithPassword, 'email' | 'passwordHash'>): AuthResponse => {
  if (!data.email || !data.passwordHash) throw new ApiSimError('Email e senha são obrigatórios.', 400);
  const user = mockUsers.find(u => u.email === data.email);
  if (!user || user.passwordHash !== data.passwordHash) {
    throw new ApiSimError('Email ou senha inválidos.', 401);
  }
  if (user.isActive === false) {
    throw new ApiSimError('Esta conta está desativada. Contate o suporte.', 403);
  }
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (60 * 60 * 24 * 7);
  const tokenPayload: DecodedToken = {
    userId: user.id,
    email: user.email,
    name: user.name,
    iat,
    exp,
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive,
  };
  const token = `mockJWT.${btoa(JSON.stringify(tokenPayload))}`;
  const { passwordHash, ...userResponse } = user;
  return { token, user: userResponse };
};

// PLATFORM SETTINGS HANDLERS (largely unchanged)
const handleGetPlatformSettings = (token?: string | null): PlatformSettings => {
  if (!isUserSuperAdmin(token)) throw new ApiSimError("Acesso não autorizado.", 403);
  return { ...mockPlatformSettingsStore };
};
const handleSavePlatformSettings = (settings: Partial<PlatformSettings>, token?: string | null): PlatformSettings => {
  const decodedToken = getDecodedTokenFromToken(token);
  if (!decodedToken || !decodedToken.isSuperAdmin) throw new ApiSimError("Acesso não autorizado.", 403);

  const oldSettings = { ...mockPlatformSettingsStore };
  mockPlatformSettingsStore = { ...mockPlatformSettingsStore, ...settings, id: 'global' };
  setToStorage(LOCALSTORAGE_KEYS.PLATFORM_SETTINGS, mockPlatformSettingsStore);

  createAuditLogEntry({
    actorUserId: decodedToken.userId, actorEmail: decodedToken.email,
    actionType: 'PLATFORM_SETTINGS_UPDATE', targetEntityType: 'PLATFORM_SETTINGS', targetEntityId: 'global',
    description: `Configurações da plataforma atualizadas.`,
    details: { old: oldSettings, new: mockPlatformSettingsStore }
  });
  return { ...mockPlatformSettingsStore };
};

// SUPER ADMIN DATA HANDLERS (largely unchanged)
const handleSuperAdminGetUsers = (token?: string | null): User[] => { if (!isUserSuperAdmin(token)) throw new ApiSimError("Acesso não autorizado.", 403); return mockUsers.map(({ passwordHash, ...user }) => user); };
const handleSuperAdminGetSales = (token?: string | null): Sale[] => { if (!isUserSuperAdmin(token)) throw new ApiSimError("Acesso não autorizado.", 403); return [...mockSalesStore]; };
const handleSuperAdminGetProducts = (token?: string | null): Product[] => { if (!isUserSuperAdmin(token)) throw new ApiSimError("Acesso não autorizado.", 403); return [...mockProductsStore]; };
const handleSuperAdminUpdateUser = (userIdToUpdate: string, updates: Partial<Pick<User, 'name' | 'isActive' | 'isSuperAdmin'>>, token?: string | null): User => {
  const currentSuperAdmin = getDecodedTokenFromToken(token);
  if (!currentSuperAdmin || !currentSuperAdmin.isSuperAdmin) {
      throw new ApiSimError("Acesso não autorizado.", 403);
  }
  // ... (rest of implementation)
  const userIndex = mockUsers.findIndex(u => u.id === userIdToUpdate);
  if (userIndex === -1) throw new ApiSimError("Usuário não encontrado.", 404);

  const oldUserData = { ...mockUsers[userIndex] }; // For audit log
  const targetUser = mockUsers[userIndex];

  if(updates.name !== undefined) targetUser.name = updates.name;
  if(updates.isActive !== undefined) targetUser.isActive = updates.isActive;
  if(updates.isSuperAdmin !== undefined) targetUser.isSuperAdmin = updates.isSuperAdmin;

  mockUsers[userIndex] = targetUser;
  setToStorage(LOCALSTORAGE_KEYS.USERS, mockUsers);

  // Create audit log
  createAuditLogEntry({
    actorUserId: currentSuperAdmin.userId,
    actorEmail: currentSuperAdmin.email,
    actionType: 'USER_DETAILS_UPDATE', // More generic action type for multiple field changes
    targetEntityType: 'USER',
    targetEntityId: targetUser.id,
    description: `Detalhes do usuário ${targetUser.email} atualizados.`,
    details: { old: {name: oldUserData.name, isActive: oldUserData.isActive, isSuperAdmin: oldUserData.isSuperAdmin}, new: {name: targetUser.name, isActive: targetUser.isActive, isSuperAdmin: targetUser.isSuperAdmin} }
  });

  const { passwordHash, ...userResponse } = targetUser;
  return userResponse;
};
const handleSuperAdminGetAuditLogs = (token?: string | null): AuditLogEntry[] => { if (!isUserSuperAdmin(token)) throw new ApiSimError("Acesso não autorizado.", 403); return [...mockAuditLogsStore]; };

// PRODUCT HANDLERS (USER-SPECIFIC AND PUBLIC)
const handleGetProducts = (token?: string | null): Product[] => {
  const userId = getUserIdFromToken(token);
  if (!userId && token) throw new ApiSimError("Token inválido ou expirado para buscar produtos.", 401);
  if (token && userId) return mockProductsStore.filter(p => p.platformUserId === userId);
  return mockProductsStore;
};

const handleGetProductById = (id: string, token?: string | null): Product | undefined => {
  const product = mockProductsStore.find(p => p.id === id);
  if (product && token) {
    const userId = getUserIdFromToken(token);
    if (!userId) throw new ApiSimError("Token inválido ou expirado.", 401);
    if (product.platformUserId !== userId && !isUserSuperAdmin(token)) {
      throw new ApiSimError('Produto não encontrado ou não pertence ao usuário.', 404);
    }
  }
  return product ? {...product} : undefined;
};

const handleGetProductBySlug = (slug: string): Product | undefined => {
    const product = mockProductsStore.find(p => p.slug === slug);
    return product ? { ...product } : undefined;
};

const handleCreateProduct = (productData: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'slug'>, token?: string | null): Product => {
  const userId = getUserIdFromToken(token);
  if (!userId) throw new ApiSimError("Usuário não autenticado para criar produto.", 401);
  const newSlug = getUniqueSlug();
  const newProduct: Product = {
    ...productData,
    id: `prod_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    slug: newSlug,
    platformUserId: userId,
    imageUrl: productData.imageUrl,
    totalSales: 0, clicks:  0,
    checkoutViews: 0, conversionRate: 0,
    abandonmentRate: 0, deliveryUrl: productData.deliveryUrl,
    checkoutCustomization: { ...(productData.checkoutCustomization || {primaryColor: COLOR_PALETTE_OPTIONS[0].value }), guaranteeBadges: productData.checkoutCustomization?.guaranteeBadges || [] },
    orderBump: productData.orderBump,
    upsell: productData.upsell,
    coupons: productData.coupons || [],
  };
  mockProductsStore.unshift(newProduct);
  setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
  return {...newProduct};
};

const handleUpdateProduct = (id: string, updates: Partial<Omit<Product, 'id' | 'platformUserId' | 'slug'>>, token?: string | null): Product => {
  const userId = getUserIdFromToken(token);
  if (!userId) throw new ApiSimError("Usuário não autenticado para atualizar produto.", 401);
  const index = mockProductsStore.findIndex(p => p.id === id && p.platformUserId === userId);
  if (index === -1) throw new ApiSimError('Produto não encontrado ou não pertence ao usuário.', 404);
  const existingProduct = mockProductsStore[index];
  const updatedProduct: Product = { ...existingProduct, ...updates, id: existingProduct.id, platformUserId: existingProduct.platformUserId, slug: existingProduct.slug };
  mockProductsStore[index] = updatedProduct;
  setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
  return {...updatedProduct};
};

const handleDeleteProduct = (id: string, token?: string | null): { success: boolean } => {
  const userId = getUserIdFromToken(token);
  if (!userId) throw new ApiSimError("Usuário não autenticado para deletar produto.", 401);
  const initialLength = mockProductsStore.length;
  mockProductsStore = mockProductsStore.filter(p => !(p.id === id && p.platformUserId === userId));
  setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
  if(mockProductsStore.length < initialLength) return { success: true };
  throw new ApiSimError('Produto não encontrado ou não pertence ao usuário.', 404);
};

const handleCloneProduct = (id: string, token?: string | null): Product => {
  const userId = getUserIdFromToken(token);
  if (!userId) throw new ApiSimError("Usuário não autenticado para clonar produto.", 401);
  const original = mockProductsStore.find(p => p.id === id && p.platformUserId === userId);
  if (!original) throw new ApiSimError('Produto original não encontrado ou não pertence ao usuário.', 404);
  const newSlug = getUniqueSlug();
  const clonedData: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'slug'> = {
    name: `${original.name} (Cópia)`,
    description: original.description,
    priceInCents: original.priceInCents,
    imageUrl: original.imageUrl,
    deliveryUrl: original.deliveryUrl,
    checkoutCustomization: JSON.parse(JSON.stringify(original.checkoutCustomization)),
    orderBump: original.orderBump ? JSON.parse(JSON.stringify(original.orderBump)) : undefined,
    upsell: original.upsell ? JSON.parse(JSON.stringify(original.upsell)) : undefined,
    coupons: original.coupons ? JSON.parse(JSON.stringify(original.coupons)) : [],
  };
  return handleCreateProduct(clonedData, token);
};


// APP SETTINGS HANDLERS
const handleGetAppSettings = (token?: string | null): AppSettings => {
  const userId = getUserIdFromToken(token);
  if (!userId) throw new ApiSimError("Usuário não autenticado para buscar configurações.", 401);
  const userSettings = mockAllUserSettingsStore[userId];
  if (!userSettings) { // Ensure default is created if not exists
    const defaultSettings: AppSettings = {
        checkoutIdentity: {},
        apiTokens: { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false }
    };
    mockAllUserSettingsStore[userId] = defaultSettings;
    setToStorage(LOCALSTORAGE_KEYS.APP_SETTINGS, mockAllUserSettingsStore);
    return { ...defaultSettings };
  }
  // Ensure nested required objects exist if they were somehow missed in earlier saves
  userSettings.checkoutIdentity = userSettings.checkoutIdentity || {};
  userSettings.apiTokens = userSettings.apiTokens || { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false };
  return { ...userSettings };
};

const handleSaveAppSettings = (settings: Partial<AppSettings>, token?: string | null): AppSettings => {
  const userId = getUserIdFromToken(token);
  if (!userId) throw new ApiSimError("Usuário não autenticado para salvar configurações.", 401);

  const currentUserSettings = mockAllUserSettingsStore[userId] || {
    checkoutIdentity: {},
    apiTokens: { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false }
  };

  const mergedApiTokens: AppSettings['apiTokens'] = {
    ...(currentUserSettings.apiTokens || { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false }), // Default if currentUserSettings.apiTokens is somehow null/undefined
    ...(settings.apiTokens || {}),
  };

  const updatedSettings: AppSettings = {
    customDomain: settings.customDomain !== undefined ? settings.customDomain : currentUserSettings.customDomain,
    checkoutIdentity: {
      ...(currentUserSettings.checkoutIdentity || {}), // Default if currentUserSettings.checkoutIdentity is somehow null/undefined
      ...(settings.checkoutIdentity || {}),
    },
    smtpSettings: settings.smtpSettings !== undefined ? settings.smtpSettings : currentUserSettings.smtpSettings,
    apiTokens: mergedApiTokens,
  };

  mockAllUserSettingsStore[userId] = updatedSettings;
  setToStorage(LOCALSTORAGE_KEYS.APP_SETTINGS, mockAllUserSettingsStore);
  return { ...updatedSettings };
};

// SALES, CUSTOMERS, ABANDONED CARTS HANDLERS (largely unchanged for mock logic)
const handleGetSales = (token?: string | null): Sale[] => { const userId = getUserIdFromToken(token); if (!userId) throw new ApiSimError("Usuário não autenticado.", 401); return mockSalesStore.filter(s => s.platformUserId === userId); };
const handleGetSaleById = (id: string, token?: string | null): Sale | undefined => {
    const sale = mockSalesStore.find(s => s.id === id || s.pushInPayTransactionId === id || s.upsellPushInPayTransactionId === id);
    if (sale && token) { const userId = getUserIdFromToken(token); if (userId && sale.platformUserId !== userId && !isUserSuperAdmin(token)) throw new ApiSimError("Venda não pertence ao usuário.", 404); }
    return sale ? {...sale} : undefined;
};
const handleGetCustomers = (token?: string | null): Customer[] => { const userId = getUserIdFromToken(token); if (!userId) throw new ApiSimError("Usuário não autenticado.", 401); return mockCustomersStore.filter(c => c.platformUserId === userId); };
const handleGetCustomerById = (customerId: string, token?: string | null): Customer | undefined => { const userId = getUserIdFromToken(token); if (!userId) throw new ApiSimError("Usuário não autenticado.", 401); return mockCustomersStore.find(c => c.id === customerId && c.platformUserId === userId); };
const handleCreateAbandonedCart = (data: CreateAbandonedCartPayload, tokenForProductOwnerLookup?: string | null): AbandonedCart => {
    const product = mockProductsStore.find(p => p.id === data.productId);
    if (!product || !product.platformUserId) throw new ApiSimError("Produto não encontrado ou sem proprietário.", 404);
    const platformUserId = product.platformUserId;
    const now = new Date().toISOString();
    const newCart: AbandonedCart = { id: `cart_${platformUserId}_${Date.now()}`, platformUserId, customerName: data.customerName || data.customerEmail.split('@')[0], customerEmail: data.customerEmail, customerWhatsapp: data.customerWhatsapp, productId: data.productId, productName: data.productName, potentialValueInCents: data.potentialValueInCents, date: now, lastInteractionAt: now, status: AbandonedCartStatus.NOT_CONTACTED, };
    mockAbandonedCartsStore.unshift(newCart); setToStorage(LOCALSTORAGE_KEYS.ABANDONED_CARTS, mockAbandonedCartsStore); return { ...newCart };
};
const handleGetAbandonedCarts = (token?: string | null): AbandonedCart[] => { const userId = getUserIdFromToken(token); if (!userId) throw new ApiSimError("Usuário não autenticado.", 401); return mockAbandonedCartsStore.filter(cart => cart.platformUserId === userId);};
const handleUpdateAbandonedCartStatus = (cartId: string, status: AbandonedCartStatus, token?: string | null): AbandonedCart => {
    const userId = getUserIdFromToken(token); if (!userId) throw new ApiSimError("Usuário não autenticado.", 401);
    const cartIndex = mockAbandonedCartsStore.findIndex(cart => cart.id === cartId && cart.platformUserId === userId);
    if (cartIndex === -1) throw new ApiSimError('Carrinho não encontrado.', 404);
    mockAbandonedCartsStore[cartIndex].status = status; mockAbandonedCartsStore[cartIndex].lastInteractionAt = new Date().toISOString();
    setToStorage(LOCALSTORAGE_KEYS.ABANDONED_CARTS, mockAbandonedCartsStore); return { ...mockAbandonedCartsStore[cartIndex] };
};
const handleDeleteAbandonedCart = (cartId: string, token?: string | null): { success: boolean } => {
    const userId = getUserIdFromToken(token); if (!userId) throw new ApiSimError("Usuário não autenticado.", 401);
    const initialLength = mockAbandonedCartsStore.length; mockAbandonedCartsStore = mockAbandonedCartsStore.filter(cart => !(cart.id === cartId && cart.platformUserId === userId));
    setToStorage(LOCALSTORAGE_KEYS.ABANDONED_CARTS, mockAbandonedCartsStore); if (mockAbandonedCartsStore.length < initialLength) return { success: true }; throw new ApiSimError('Carrinho não encontrado.', 404);
};
const handleMarkCartRecoveredBySale = (customerEmail: string, productId: string, platformUserId: string): void => { /* ... */ };
const getOrCreateCustomerFromSale = (sale: Sale, platformUserId: string): Customer => { /* ... */ return {} as Customer; };

// PIX RELATED INTERNAL HANDLERS
const handleInternalRecordPixTransaction = (payload: InternalPixRecordPayload): PushInPayPixResponseData => {
  const { pushInPayResponseData, originalRequestPayload } = payload;
  const firstProductId = originalRequestPayload.products[0]?.productId;
  const productOwner = mockProductsStore.find(p => p.id === firstProductId);
  if (!productOwner || !productOwner.platformUserId) {
    throw new ApiSimError("Dono do produto não encontrado para registrar transação PIX.", 404);
  }
  const platformUserId = productOwner.platformUserId;

  const newTransaction: SaleTransaction = {
    id: pushInPayResponseData.id, platformUserId: platformUserId, valueInCents: pushInPayResponseData.value,
    originalValueBeforeDiscountInCents: originalRequestPayload.originalValueBeforeDiscount,
    couponCodeUsed: originalRequestPayload.couponCodeUsed, discountAppliedToTransactionInCents: originalRequestPayload.discountAppliedInCents,
    qrCode: pushInPayResponseData.qr_code, qrCodeBase64: pushInPayResponseData.qr_code_base64,
    status: pushInPayResponseData.status, attempts: 0, createdAt: new Date().toISOString(),
    webhookUrl: originalRequestPayload.webhook_url, customerName: originalRequestPayload.customerName,
    customerEmail: originalRequestPayload.customerEmail, customerWhatsapp: originalRequestPayload.customerWhatsapp,
    products: originalRequestPayload.products.map((p: SaleProductItem) => ({...p})),
    trackingParameters: originalRequestPayload.trackingParameters,
    isUpsellTransaction: originalRequestPayload.isUpsellTransaction || false, originalSaleId: originalRequestPayload.originalSaleId,
  };
  mockPixTransactionsStore.unshift(newTransaction);
  (globalThis as any).mockPixTransactionsStore = mockPixTransactionsStore; // Update global ref
  setToStorage(LOCALSTORAGE_KEYS.PIX_TRANSACTIONS, mockPixTransactionsStore);

  if (newTransaction.products && newTransaction.products.length > 0 && !newTransaction.isUpsellTransaction) {
    const utmifyPendingPayload = buildUtmifyPayload(newTransaction, PaymentStatus.WAITING_PAYMENT);
    const userSpecificSettings = mockAllUserSettingsStore[platformUserId];
    if (userSpecificSettings?.apiTokens?.utmifyEnabled && userSpecificSettings.apiTokens.utmify) {
        utmifyService.sendOrderData(utmifyPendingPayload, userSpecificSettings.apiTokens.utmify).then().catch();
    }
  }
  return { id: newTransaction.id, qr_code: newTransaction.qrCode!, qr_code_base64: newTransaction.qrCodeBase64!, status: newTransaction.status, value: newTransaction.valueInCents };
};

const handleInternalConfirmPixPayment = (payload: InternalPixConfirmPayload): { success: boolean; saleId?: string } => {
  const currentPixTransactions = (globalThis as any).mockPixTransactionsStore as SaleTransaction[];
  const transactionIndex = currentPixTransactions.findIndex(t => t.id === payload.pixTransactionId);
  if (transactionIndex === -1) throw new ApiSimError('Transação PIX não encontrada para confirmação.', 404);
  const transaction = currentPixTransactions[transactionIndex];
  mockPixTransactionsStore = currentPixTransactions;
  setToStorage(LOCALSTORAGE_KEYS.PIX_TRANSACTIONS, mockPixTransactionsStore);
  return { success: true, saleId: transaction.isUpsellTransaction ? transaction.originalSaleId : `sale_${transaction.platformUserId}_${transaction.id}` };
};

const handleInternalGeneratePix = async (payload: PushInPayPixRequest, token?: string | null): Promise<PushInPayPixResponse> => {
  const firstProductId = payload.products[0]?.productId;
  const productOwner = mockProductsStore.find(p => p.id === firstProductId);
  if (!productOwner || !productOwner.platformUserId) {
    throw new ApiSimError("Dono do produto não encontrado para gerar PIX.", 404);
  }
  const platformUserId = productOwner.platformUserId;
  const userSettings = mockAllUserSettingsStore[platformUserId];

  if (!userSettings || !userSettings.apiTokens) {
    throw new ApiSimError("Configurações de API do usuário do produto não encontradas.", 404);
  }

  const pixServiceResponse = await pushinPayService.generatePixCharge(
    payload, userSettings.apiTokens.pushinPay || '', userSettings.apiTokens.pushinPayEnabled || false,
    mockPlatformSettingsStore.platformCommissionPercentage, mockPlatformSettingsStore.platformFixedFeeInCents,
    mockPlatformSettingsStore.platformAccountIdPushInPay
  );

  if (pixServiceResponse.success && pixServiceResponse.data) {
      handleInternalRecordPixTransaction({
          pushInPayResponseData: pixServiceResponse.data,
          originalRequestPayload: payload
      });
  }
  return pixServiceResponse;
};

const handleInternalCheckPixStatus = async (transactionId: string, token?: string | null): Promise<PushInPayPixResponse> => {
  const currentPixTransactions = (globalThis as any).mockPixTransactionsStore as SaleTransaction[];
  const pixTransaction = currentPixTransactions.find(t => t.id === transactionId);

  if (!pixTransaction || !pixTransaction.platformUserId) {
    throw new ApiSimError("Transação PIX não encontrada ou sem proprietário para verificar status.", 404);
  }
  const platformUserId = pixTransaction.platformUserId;
  const userSettings = mockAllUserSettingsStore[platformUserId];

  if (!userSettings || !userSettings.apiTokens) {
    throw new ApiSimError("Configurações de API do usuário da transação não encontradas para verificar status PIX.", 404);
  }

  const statusServiceResponse = await pushinPayService.checkPaymentStatus(
    transactionId,
    userSettings.apiTokens.pushinPay || '',
    userSettings.apiTokens.pushinPayEnabled || false
  );

  if (statusServiceResponse.success && statusServiceResponse.data) {
    return {
        success: true,
        data: {
            id: statusServiceResponse.data.id,
            status: statusServiceResponse.data.status,
            value: statusServiceResponse.data.value,
            qr_code: pixTransaction.qrCode || '',
            qr_code_base64: pixTransaction.qrCodeBase64 || ''
        }
    };
  }
  return {
    success: false,
    message: statusServiceResponse.message || "Erro ao verificar status do PIX.",
    data: {
        id: transactionId,
        status: PaymentStatus.FAILED,
        value: pixTransaction.valueInCents,
        qr_code: pixTransaction.qrCode || '',
        qr_code_base64: pixTransaction.qrCodeBase64 || ''
    }
  };
};

// MAIN API CLIENT ROUTER
export const apiClient = {
  request: async <TResponse = any, TBody = any>(
    options: ApiRequestOptions<TBody>
  ): Promise<TResponse> => {
    console.log(`Mock API Request: ${options.method} ${options.endpoint}`, options.token ? `with token for user ${getUserIdFromToken(options.token)}` : 'no token', options.body || '');

    if (options.endpoint === '/auth/register' && options.method === 'POST') return simulateRequest(() => handleRegister(options.body as Partial<UserWithPassword>) as TResponse);
    if (options.endpoint === '/auth/login' && options.method === 'POST') return simulateRequest(() => handleLogin(options.body as Pick<UserWithPassword, 'email' | 'passwordHash'>) as TResponse);

    // Product Routes
    if (options.endpoint === '/products' && options.method === 'GET') return simulateRequest(() => handleGetProducts(options.token)) as Promise<TResponse>;
    if (options.endpoint.match(/^\/products\/slug\/([^/]+)$/) && options.method === 'GET') {
        const slug = options.endpoint.split('/')[3];
        return simulateRequest(() => handleGetProductBySlug(slug)) as Promise<TResponse>;
    }
    if (options.endpoint.match(/^\/products\/([^/]+)$/) && !options.endpoint.includes('clone') && !options.endpoint.includes('slug') && options.method === 'GET') {
      const id = options.endpoint.split('/')[2];
      return simulateRequest(() => handleGetProductById(id, options.token)) as Promise<TResponse>;
    }
    if (options.endpoint === '/products' && options.method === 'POST') return simulateRequest(() => handleCreateProduct(options.body as Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'slug'>, options.token)) as Promise<TResponse>;
    if (options.endpoint.match(/^\/products\/([^/]+)$/) && !options.endpoint.includes('clone') && options.method === 'PUT') { const id = options.endpoint.split('/')[2]; return simulateRequest(() => handleUpdateProduct(id, options.body as Partial<Omit<Product, 'id' | 'platformUserId' | 'slug'>>, options.token)) as Promise<TResponse>; }
    if (options.endpoint.match(/^\/products\/([^/]+)$/) && !options.endpoint.includes('clone') && options.method === 'DELETE') { const id = options.endpoint.split('/')[2]; return simulateRequest(() => handleDeleteProduct(id, options.token)) as Promise<TResponse>; }
    if (options.endpoint.match(/^\/products\/clone\/([^/]+)$/) && options.method === 'POST') { const id = options.endpoint.split('/')[3]; return simulateRequest(() => handleCloneProduct(id, options.token)) as Promise<TResponse>; }

    // Internal PIX Routes
    if (options.endpoint === '/internal/pix/generate' && options.method === 'POST') {
      return simulateRequest(() => handleInternalGeneratePix(options.body as PushInPayPixRequest, options.token)) as Promise<TResponse>;
    }
    if (options.endpoint.startsWith('/internal/pix/status/') && options.method === 'GET') {
      const id = options.endpoint.split('/')[3];
      return simulateRequest(() => handleInternalCheckPixStatus(id, options.token)) as Promise<TResponse>;
    }

    if (options.endpoint === '/settings' && options.method === 'GET') return simulateRequest(() => handleGetAppSettings(options.token)) as Promise<TResponse>;
    if (options.endpoint === '/settings' && options.method === 'POST') return simulateRequest(() => handleSaveAppSettings(options.body as Partial<AppSettings>, options.token)) as Promise<TResponse>;
    if (options.endpoint === '/platform-settings' && options.method === 'GET') return simulateRequest(() => handleGetPlatformSettings(options.token)) as Promise<TResponse>;
    if (options.endpoint === '/platform-settings' && options.method === 'POST') return simulateRequest(() => handleSavePlatformSettings(options.body as Partial<PlatformSettings>, options.token)) as Promise<TResponse>;
    if (options.endpoint === '/superadmin/users' && options.method === 'GET') return simulateRequest(() => handleSuperAdminGetUsers(options.token)) as Promise<TResponse>;
    if (options.endpoint.match(/^\/superadmin\/users\/[^/]+$/) && options.method === 'PUT') { const userIdToUpdate = options.endpoint.split('/')[3]; return simulateRequest(() => handleSuperAdminUpdateUser(userIdToUpdate, options.body as Partial<Pick<User, 'name' | 'isSuperAdmin' | 'isActive'>>, options.token)) as Promise<TResponse>; }
    if (options.endpoint === '/superadmin/sales' && options.method === 'GET') return simulateRequest(() => handleSuperAdminGetSales(options.token)) as Promise<TResponse>;
    if (options.endpoint === '/superadmin/products' && options.method === 'GET') return simulateRequest(() => handleSuperAdminGetProducts(options.token)) as Promise<TResponse>;
    if (options.endpoint === '/superadmin/audit-logs' && options.method === 'GET') return simulateRequest(() => handleSuperAdminGetAuditLogs(options.token)) as Promise<TResponse>;
    if (options.endpoint === '/customers' && options.method === 'GET') return simulateRequest(() => handleGetCustomers(options.token)) as Promise<TResponse>;
    if (options.endpoint.startsWith('/customers/') && options.method === 'GET') { const id = options.endpoint.split('/')[2]; return simulateRequest(() => handleGetCustomerById(id, options.token)) as Promise<TResponse>; }
    if (options.endpoint === '/abandoned-carts' && options.method === 'POST') return simulateRequest(() => handleCreateAbandonedCart(options.body as CreateAbandonedCartPayload, options.token)) as Promise<TResponse>;
    if (options.endpoint === '/abandoned-carts' && options.method === 'GET') return simulateRequest(() => handleGetAbandonedCarts(options.token)) as Promise<TResponse>;
    if (options.endpoint.match(/^\/abandoned-carts\/[^/]+\/status$/) && options.method === 'PUT') { const id = options.endpoint.split('/')[2]; return simulateRequest(() => handleUpdateAbandonedCartStatus(id, options.body as AbandonedCartStatus, options.token)) as Promise<TResponse>; }
    if (options.endpoint.startsWith('/abandoned-carts/') && options.method === 'DELETE') { const id = options.endpoint.split('/')[2]; return simulateRequest(() => handleDeleteAbandonedCart(id, options.token)) as Promise<TResponse>; }
    if (options.endpoint === '/sales' && options.method === 'GET') return simulateRequest(() => handleGetSales(options.token)) as Promise<TResponse>;
    if (options.endpoint.startsWith('/sales/') && options.method === 'GET') { const id = options.endpoint.split('/')[2]; return simulateRequest(() => handleGetSaleById(id, options.token)) as Promise<TResponse>; }
    if (options.endpoint === '/internal/pix/record' && options.method === 'POST') return simulateRequest(() => handleInternalRecordPixTransaction(options.body as InternalPixRecordPayload)) as Promise<TResponse>;
    if (options.endpoint === '/internal/pix/confirm' && options.method === 'POST') return simulateRequest(() => handleInternalConfirmPixPayment(options.body as InternalPixConfirmPayload)) as Promise<TResponse>;


    return Promise.reject({ error: { message: `Mock endpoint ${options.method} ${options.endpoint} not found.`, status: 404 } });
  },
};

mockProductsStore.forEach((prod, index) => {
    if (!prod.slug) {
        mockProductsStore[index].slug = getUniqueSlug();
    }
});
setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
if (getFromStorage<Product[]>(LOCALSTORAGE_KEYS.PRODUCTS, []).length === 0) {
    const defaultSystemProducts: Product[] = [
        { id: 'prod_init_1', platformUserId: 'system_user_default', name: 'Produto Exemplo A (HTML Copy)', slug: getUniqueSlug(), description: 'Descrição A.', priceInCents: 1990, imageUrl: 'https://picsum.photos/seed/prodA/800/600', deliveryUrl: 'https://exemplo.com/acesso-a', checkoutCustomization: { primaryColor: '#4F46E5', logoUrl: 'https://picsum.photos/seed/logoA/200/50', videoUrl: 'https://www.youtube.com/embed/abcdef12345', salesCopy: '<h1>Título Incrível!</h1><p>Este é um <strong>produto fantástico</strong>.</p>', testimonials: [{author: 'Cliente A', text: 'Mudou!'}], guaranteeBadges: [{id: 'g1', imageUrl: 'https://picsum.photos/seed/selo1/80/80', altText: 'Garantia'}, {id: 'g2', imageUrl: 'https://picsum.photos/seed/selo2/80/80', altText: 'Seguro'}] }, totalSales: 50, clicks: 800, checkoutViews: 150, conversionRate: 10, abandonmentRate: 20, coupons: [{ id: 'c1', code: 'SAVE10', discountType: 'percentage', discountValue: 10, isActive: true, isAutomatic: false, uses:0 }, { id: 'c_auto', code: 'AUTO5', discountType: 'fixed', discountValue: 500, isActive: true, isAutomatic: true, uses:0, appliesToProductId: 'prod_init_1' }], orderBump: { productId: 'prod_init_2', name: 'Produto B (BUMP)', description: 'Leve B!', customPriceInCents: 1500, imageUrl: 'https://picsum.photos/seed/bumpB/100/100' } },
        { id: 'prod_init_2', platformUserId: 'system_user_default', name: 'Produto Exemplo B (Sem HTML)', slug: getUniqueSlug(), description: 'Descrição B.', priceInCents: 2990, imageUrl: 'https://picsum.photos/seed/prodB/800/600', deliveryUrl: 'https://exemplo.com/acesso-b', checkoutCustomization: { primaryColor: '#DB2777', salesCopy: 'Simples e eficaz.', guaranteeBadges: [{id: 'g3', imageUrl: 'https://picsum.photos/seed/selo3/100/60', altText: 'Qualidade'}]}, totalSales: 75, clicks: 1200, checkoutViews: 250, conversionRate: 12, abandonmentRate: 15, coupons: [], upsell: { productId: 'prod_init_1', name: 'Produto A (UPSELL)', description: 'Oferta!', customPriceInCents: 1000, imageUrl: 'https://picsum.photos/seed/upsellA/100/100' } },
    ];
    mockProductsStore = defaultSystemProducts; setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
}
if (mockUsers.length > 0 && Object.keys(mockAllUserSettingsStore).length !== mockUsers.length) {
    mockUsers.forEach(user => { if (!mockAllUserSettingsStore[user.id]) { mockAllUserSettingsStore[user.id] = { checkoutIdentity: {}, apiTokens: { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false } }; } });
    setToStorage(LOCALSTORAGE_KEYS.APP_SETTINGS, mockAllUserSettingsStore);
}
if (mockUsers.length > 0) {
     mockUsers.forEach(user => {
        if(user.email === SUPER_ADMIN_EMAIL) return;
        const userProducts = mockProductsStore.filter(p => p.platformUserId === user.id);
        if (userProducts.length === 0) {
             const defaultUserProductsToAdd: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'coupons' | 'orderBump' | 'upsell' | 'slug'>[] = [ { name: `Curso de ${user.name || 'Usuário'}`, description: 'Um curso.', priceInCents: 29700, imageUrl: 'https://picsum.photos/seed/userCourse/600/400', checkoutCustomization: { primaryColor: '#10B981'} }, ];
            defaultUserProductsToAdd.forEach(prodData => { const newProd: Product = { ...prodData, id: `prod_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, slug: getUniqueSlug(), platformUserId: user.id, totalSales:0, clicks:0, checkoutViews:0, conversionRate:0, abandonmentRate:0, coupons: [], orderBump: undefined, upsell: undefined }; mockProductsStore.push(newProd); });
        }
     });
    setToStorage(LOCALSTORAGE_KEYS.PRODUCTS, mockProductsStore);
}
if (mockCustomersStore.length === 0 && mockSalesStore.length > 0) {
    mockSalesStore.forEach(sale => { if(sale.status === PaymentStatus.PAID && sale.platformUserId) { getOrCreateCustomerFromSale(sale, sale.platformUserId); } });
     setToStorage(LOCALSTORAGE_KEYS.CUSTOMERS, mockCustomersStore);
}

if (!localStorage.getItem(LOCALSTORAGE_KEYS.PLATFORM_SETTINGS)) {
    setToStorage(LOCALSTORAGE_KEYS.PLATFORM_SETTINGS, mockPlatformSettingsStore);
} else {
    const loadedPlatformSettings = getFromStorage<PlatformSettings>(LOCALSTORAGE_KEYS.PLATFORM_SETTINGS, mockPlatformSettingsStore);
    if(loadedPlatformSettings.id !== 'global') {
        loadedPlatformSettings.id = 'global';
        setToStorage(LOCALSTORAGE_KEYS.PLATFORM_SETTINGS, loadedPlatformSettings);
    }
    mockPlatformSettingsStore = loadedPlatformSettings;
}

const superAdminExists = mockUsers.some(u => u.email === SUPER_ADMIN_EMAIL);
if (!superAdminExists) {
    const superAdminUser: UserWithPassword = { id: `user_super_${Date.now()}`, email: SUPER_ADMIN_EMAIL, name: 'Super Admin', passwordHash: 'hashed_admin123', isSuperAdmin: true, isActive: true, createdAt: new Date().toISOString() };
    mockUsers.push(superAdminUser); setToStorage(LOCALSTORAGE_KEYS.USERS, mockUsers);
    if (!mockAllUserSettingsStore[superAdminUser.id]) { mockAllUserSettingsStore[superAdminUser.id] = { checkoutIdentity: {}, apiTokens: { pushinPay: '', utmify: '', pushinPayEnabled: false, utmifyEnabled: false } }; setToStorage(LOCALSTORAGE_KEYS.APP_SETTINGS, mockAllUserSettingsStore); }
}
mockUsers.forEach((user, index) => { if (!user.createdAt) { mockUsers[index].createdAt = new Date(Date.now() - Math.random()*1000*60*60*24*30).toISOString(); } });
setToStorage(LOCALSTORAGE_KEYS.USERS, mockUsers);
if (mockAuditLogsStore.length === 0) { createAuditLogEntry({ actorUserId: 'system', actorEmail: 'system', actionType: 'SYSTEM_INIT', description: 'Sistema inicializado.' }); }