
// User Authentication
export interface User {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean; // Adicionado para status da conta
  createdAt?: string; // Added for tracking user creation date
}

// For authService internal use, not exposed to UI directly usually
export interface UserWithPassword extends User {
  passwordHash: string; // In a real backend, this would be a hash
  isActive: boolean; // Garante que UserWithPassword sempre tenha isActive
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DecodedToken {
  userId: string;
  email: string;
  name?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean; // Adicionado para status da conta
  iat: number;
  exp: number;
}

// Product related new types
export interface Coupon {
  id: string;
  code: string;
  description?: string; // Optional description for admin
  discountType: 'percentage' | 'fixed'; // Fixed is in cents
  discountValue: number;
  isActive: boolean;
  isAutomatic: boolean; // If true, applies automatically if no other coupon is used
  minPurchaseValueInCents?: number; // Optional: Minimum purchase value to apply coupon
  uses?: number; // How many times it has been used
  maxUses?: number; // Optional: Maximum number of uses
  expiresAt?: string; // Optional: ISO date string
  appliesToProductId?: string; // For product-specific coupons, null/undefined for general
}

export interface OrderBumpOffer {
  productId: string; // ID of the product being offered as a bump
  customPriceInCents?: number; // Optional custom price for the bump
  name: string; // Denormalized for easy display
  description: string; // Denormalized
  imageUrl?: string; // Denormalized
}

export interface UpsellOffer {
  productId: string; // ID of the product being offered as an upsell
  customPriceInCents?: number; // Optional custom price for the upsell
  name: string; // Denormalized
  description: string; // Denormalized
  imageUrl?: string; // Denormalized
}


// Product
export interface ProductCheckoutCustomization {
  primaryColor?: string;
  logoUrl?: string;
  videoUrl?: string;
  salesCopy?: string; // Will store HTML
  testimonials?: { author: string; text: string }[];
  guaranteeBadges?: { id: string; imageUrl: string; altText: string }[];
  countdownTimer?: {
    enabled: boolean;
    durationMinutes?: number; // Duração em minutos
    messageBefore?: string;
    messageAfter?: string; // Message to show when timer expires
    backgroundColor?: string;
    textColor?: string;
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];


export interface Product {
  id: string;
  platformUserId: string;
  slug?: string; 
  name: string;
  description: string;
  priceInCents: number;
  imageUrl?: string; 
  checkoutCustomization: ProductCheckoutCustomization;
  deliveryUrl?: string;
  totalSales?: number;
  clicks?: number;
  checkoutViews?: number;
  conversionRate?: number;
  abandonmentRate?: number;
  orderBump?: OrderBumpOffer;
  upsell?: UpsellOffer;
  coupons?: Coupon[];
}

// Sale
export enum PaymentStatus {
  WAITING_PAYMENT = 'waiting_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  BOLETO = 'boleto',
}

export interface SaleProductItem {
  productId: string;
  name: string;
  quantity: number;
  priceInCents: number; 
  originalPriceInCents: number; 
  isOrderBump?: boolean; 
  isUpsell?: boolean; 
  deliveryUrl?: string;
  slug?: string; // Added slug
}

export interface Sale {
  id: string;
  platformUserId: string;
  pushInPayTransactionId: string; 
  upsellPushInPayTransactionId?: string; 
  orderIdUrmify?: string;
  products: SaleProductItem[]; 
  customer: {
    name: string;
    email: string;
    ip?: string;
    whatsapp: string;
  };
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  upsellStatus?: PaymentStatus; 
  totalAmountInCents: number; 
  upsellAmountInCents?: number; 
  originalAmountBeforeDiscountInCents: number; 
  discountAppliedInCents?: number;
  couponCodeUsed?: string;
  createdAt: string;
  paidAt?: string;
  trackingParameters?: Record<string, string>; 
  commission?: { 
    totalPriceInCents: number; 
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency: string;
  };
  platformCommissionInCents?: number; 
}

export interface SaleTransaction {
    id: string;
    platformUserId: string;
    valueInCents: number; 
    originalValueBeforeDiscountInCents: number; 
    couponCodeUsed?: string; 
    discountAppliedToTransactionInCents?: number;
    qrCode?: string;
    qrCodeBase64?: string;
    status: PaymentStatus;
    attempts: number;
    createdAt: string;
    paidAt?: string;
    webhookUrl: string;
    customerName: string;
    customerEmail: string;
    customerWhatsapp: string;
    products: SaleProductItem[]; 
    trackingParameters?: Record<string, string>;
    isUpsellTransaction?: boolean; 
    originalSaleId?: string; 
}


// Customer
export enum FunnelStage {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
}

export interface Customer {
  id: string; 
  platformUserId: string;
  name: string;
  email: string;
  whatsapp: string;
  productsPurchased: string[]; 
  funnelStage: FunnelStage;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  totalOrders: number;
  totalSpentInCents: number;
  saleIds: string[]; 
}

// Abandoned Cart
export enum AbandonedCartStatus {
  NOT_CONTACTED = 'not_contacted',
  EMAIL_SENT = 'email_sent',
  RECOVERED = 'recovered',
  IGNORED = 'ignored',
}

export interface AbandonedCart {
  id: string;
  platformUserId: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  productId: string;
  productName: string;
  potentialValueInCents: number;
  date: string;
  lastInteractionAt: string;
  status: AbandonedCartStatus;
  trackingParameters?: Record<string, string>; 
}

// Finances
export interface FinancialSummary {
  balance: number;
  pending: number;
  availableForWithdrawal: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number; // in cents
  type: 'credit' | 'debit';
}

// Integrations
export type PixelType = 'Facebook Pixel' | 'Google Ads' | 'GTM' | 'TikTok Pixel';
export interface PixelIntegration {
  id: string; 
  type: PixelType; 
  settings: Record<string, string>; 
  enabled: boolean;
}

export interface AppSettings {
  customDomain?: string;
  checkoutIdentity: {
    logoUrl?: string;
    faviconUrl?: string;
    brandColor?: string;
  };
  smtpSettings?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  apiTokens: {
    pushinPay: string; 
    utmify: string;
    pushinPayEnabled: boolean; 
    utmifyEnabled: boolean;
  };
  pixelIntegrations?: PixelIntegration[]; 
}

export interface PlatformSettings {
  id: 'global'; 
  platformCommissionPercentage: number; 
  platformFixedFeeInCents: number; 
  platformAccountIdPushInPay: string; 
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; 
  actorUserId: string;
  actorEmail: string;
  actionType: string; 
  targetEntityType?: string; 
  targetEntityId?: string;
  description: string; 
  details?: Record<string, any>; 
}


// For dashboard metric cards
export interface MetricData {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  bgColorClass: string;
  textColorClass: string;
}

export interface DashboardData {
  totalRevenue: number;
  numberOfSales: number;
  averageTicket: number;
  newCustomers: number;
  salesTrend: { periodLabel: string; amount: number }[];
  topSellingProducts?: { id: string; name: string; quantitySold: number; revenueGenerated: number; }[];
}


// PushInPay API Types
export interface PushInPayPixRequest {
  value: number; 
  originalValueBeforeDiscount: number; 
  webhook_url: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  products: SaleProductItem[]; 
  trackingParameters?: Record<string, string>;
  couponCodeUsed?: string;
  discountAppliedInCents?: number;
  isUpsellTransaction?: boolean; 
  originalSaleId?: string;      
}

export interface PushInPayPixResponseData {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  status: PaymentStatus;
  value: number; 
}
export interface PushInPayPixResponse {
  data?: PushInPayPixResponseData; 
  success: boolean;
  message?: string;
}

export interface PushInPayTransactionStatusData {
    id: string;
    status: PaymentStatus;
    value: number;
    paid_at?: string;
}

export interface PushInPayTransactionStatusResponse {
    data?: PushInPayTransactionStatusData; 
    success: boolean;
    message?: string;
}


// UTMify API Types
export interface UtmifyCustomer {
  name: string;
  email: string;
  whatsapp: string;
  ip?: string;
  phone?: string | null;
  document?: string | null;
  country?: string;
}

export interface UtmifyProduct {
  id: string; 
  name: string;
  quantity: number;
  priceInCents: number; 
  planId: string | null;
  planName: string | null;
  isUpsell?: boolean; 
  slug?: string; // Added slug
}

export interface UtmifyCommission {
  totalPriceInCents: number; 
  gatewayFeeInCents: number;
  userCommissionInCents: number;
  currency: string;
}

export interface UtmifyOrderPayload {
  orderId: string; 
  platform: string;
  paymentMethod: "pix" | "credit_card" | "boleto";
  status: PaymentStatus;
  createdAt: string; 
  customer: UtmifyCustomer;
  products: UtmifyProduct[]; 
  trackingParameters?: Record<string, string | null>;
  commission?: UtmifyCommission; 
  approvedDate?: string | null; 
  refundedAt?: string | null; 
  isTest?: boolean;
  couponCodeUsed?: string;
  discountAppliedInCents?: number;
  originalAmountBeforeDiscountInCents?: number; 
  isUpsellTransaction?: boolean; 
  originalSaleId?: string; 
}

export interface UtmifyResponse {
  success: boolean;
  message?: string;
  data?: any; 
}

// For navigation items
export interface NavItemConfig {
  name: string;
  href: string;
  icon: React.ElementType;
  soon?: boolean;
}

// API Client related types
export interface ApiError {
  message: string;
  status?: number;
}

export interface ApiErrorResponse {
  error: ApiError;
}
