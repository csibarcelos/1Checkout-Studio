

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

export interface Product {
  id: string;
  platformUserId: string;
  name: string;
  description: string;
  priceInCents: number;
  checkoutCustomization: ProductCheckoutCustomization;
  deliveryUrl?: string;
  totalSales?: number;
  clicks?: number;
  checkoutViews?: number;
  conversionRate?: number;
  abandonmentRate?: number;

  // New fields for order bump, upsell, and coupons
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
  priceInCents: number; // Price *after* any item-specific discount (e.g. order bump custom price), before order-level coupon
  originalPriceInCents: number; // Price before any item-specific discount or bump custom price
  isOrderBump?: boolean; // Flag if this item was an order bump
  isUpsell?: boolean; // Flag if this item was an upsell
  deliveryUrl?: string;
}

export interface Sale {
  id: string;
  platformUserId: string;
  pushInPayTransactionId: string; // For PIX, this is the primary transaction ID
  upsellPushInPayTransactionId?: string; // If an upsell was accepted and paid
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
  upsellStatus?: PaymentStatus; // Status of the upsell payment
  totalAmountInCents: number; // Final amount paid for the main order (after coupon, includes bump)
  upsellAmountInCents?: number; // Amount paid for the upsell, if any
  originalAmountBeforeDiscountInCents: number; // Amount before main coupon (includes main product + bump)
  discountAppliedInCents?: number;
  couponCodeUsed?: string;
  createdAt: string;
  paidAt?: string;
  trackingParameters?: Record<string, string>;
  commission?: {
    totalPriceInCents: number; // Base for commission (usually after discount)
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency: string;
  };
  platformCommissionInCents?: number; // Added for super admin
}

// For storing PIX transaction attempts and details
export interface SaleTransaction {
    id: string;
    platformUserId: string;
    valueInCents: number; // Actual value of this specific transaction (after discount)
    originalValueBeforeDiscountInCents: number; // Value before any discounts for this transaction
    couponCodeUsed?: string; // If a coupon was applied to this specific transaction
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
    products: SaleProductItem[]; // Products included in this specific transaction
    trackingParameters?: Record<string, string>;
    isUpsellTransaction?: boolean; // True if this transaction is for an upsell
    originalSaleId?: string; // Link back to the main sale if this is an upsell
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
  productsPurchased: string[]; // IDs of products
  funnelStage: FunnelStage;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  totalOrders: number;
  totalSpentInCents: number;
  saleIds: string[]; // IDs of Sale records
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
export interface PixelIntegration {
  id: string;
  name: 'Facebook Pixel' | 'Google Ads' | 'GTM' | 'TikTok Pixel';
  settings: Record<string, string>;
  enabled: boolean;
}

// Settings - This entire object will be user-specific
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
    pushinPay: string; // User's PushInPay token for receiving payments
    utmify: string;
    pushinPayEnabled: boolean; // If user wants to use PushInPay for their sales
    utmifyEnabled: boolean;
  };
}

// New: Platform wide settings, managed by Super Admin
export interface PlatformSettings {
  id: 'global'; // Singleton ID
  platformCommissionPercentage: number; // e.g., 0.01 for 1%
  platformFixedFeeInCents: number; // e.g., 100 for R$1.00
  platformAccountIdPushInPay: string; // PushInPay Account ID for platform commissions
}

// New: Audit Log Entry
export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO date string
  actorUserId: string;
  actorEmail: string;
  actionType: string; // e.g., 'PLATFORM_SETTINGS_UPDATE', 'USER_STATUS_CHANGE'
  targetEntityType?: string; // e.g., 'USER', 'PLATFORM_SETTINGS'
  targetEntityId?: string;
  description: string; // Human-readable description of the action
  details?: Record<string, any>; // For storing before/after states or other context
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

// PushInPay API Types
export interface PushInPayPixRequest {
  value: number; // This is the final value AFTER considering item prices and discounts
  originalValueBeforeDiscount: number; // Value BEFORE discount (main product + bump)
  webhook_url: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  products: SaleProductItem[]; // List of items in this specific PIX charge (can include bump)
  trackingParameters?: Record<string, string>;
  couponCodeUsed?: string;
  discountAppliedInCents?: number;
  isUpsellTransaction?: boolean; // Added for upsell flow
  originalSaleId?: string;      // Added for upsell flow
}

export interface PushInPayPixResponseData {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  status: PaymentStatus;
  value: number; // Value of the PIX (after discount)
}
export interface PushInPayPixResponse {
  data: PushInPayPixResponseData;
  success?: boolean;
  message?: string;
}

export interface PushInPayTransactionStatusData {
    id: string;
    status: PaymentStatus;
    value: number;
    paid_at?: string;
}

export interface PushInPayTransactionStatusResponse {
    data: PushInPayTransactionStatusData;
    success?: boolean;
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
  id: string; // product_id
  name: string;
  quantity: number;
  priceInCents: number; // Price per unit in cents
  planId: string | null;
  planName: string | null;
  isUpsell?: boolean; // Added to align with SaleProductItem
}

export interface UtmifyCommission {
  totalPriceInCents: number; // Total price after discounts
  gatewayFeeInCents: number;
  userCommissionInCents: number;
  currency: string;
}

export interface UtmifyOrderPayload {
  orderId: string; // Our internal Sale.id or SaleTransaction.id
  platform: string;
  paymentMethod: "pix" | "credit_card" | "boleto";
  status: PaymentStatus;
  createdAt: string; // ISO8601 UTC-3
  customer: UtmifyCustomer;
  products: UtmifyProduct[]; // Should reflect actual items sold (including bump/upsell)
  trackingParameters?: Record<string, string | null>;
  commission?: UtmifyCommission; // Based on final price after discount
  approvedDate?: string | null; // ISO8601 UTC-3
  refundedAt?: string | null; // ISO8601 UTC-3
  isTest?: boolean;
  couponCodeUsed?: string;
  discountAppliedInCents?: number;
  originalAmountBeforeDiscountInCents?: number; // Added
  isUpsellTransaction?: boolean; // To indicate if this UTMify payload is for an upsell part of an order
  originalSaleId?: string; // If it's an upsell, what was the original sale ID
}

export interface UtmifyResponse {
  success: boolean;
  message?: string;
  data?: any; // Can include utmifyTrackingId or other response data
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