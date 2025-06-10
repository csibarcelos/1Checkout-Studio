
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Product, PaymentStatus, Coupon, OrderBumpOffer, PushInPayPixResponseData, AppSettings, PlatformSettings, SaleProductItem, PaymentMethod, Sale } from '../types';
import { productService } from '../services/productService';
import { abandonedCartService, CreateAbandonedCartPayload } from '../services/abandonedCartService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircleIcon, PHONE_COUNTRY_CODES, DocumentDuplicateIcon, TagIcon, MOCK_WEBHOOK_URL, PLATFORM_NAME } from '../constants'; // Removed DEFAULT_CURRENCY as it's not used here
import { pushInPayService } from '../services/pushinPayService';
import { settingsService } from '../services/settingsService';
import { salesService } from '../services/salesService';
import { utmifyService } from '../services/utmifyService';
import { useAuth } from '../contexts/AuthContext';

const LockClosedIconSolid = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002 2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
  </svg>
);

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const formatPhoneNumberVisual = (digits: string): string => {
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const getContrastingTextColor = (hexColor?: string): string => {
    if (!hexColor) return '#111827'; 
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#111827' : '#FFFFFF'; 
    } catch (e) {
      return '#111827'; 
    }
};

const LOCALSTORAGE_CHECKOUT_KEY = 'checkoutFormData';
const POLLING_INTERVAL = 5000; // 5 seconds
const POLLING_TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken: loggedInUserToken } = useAuth(); // Token do usuário logado (pode não ser o dono do produto)

  const [product, setProduct] = useState<Product | null>(null);
  const [ownerAppSettings, setOwnerAppSettings] = useState<AppSettings | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true); // General page loading
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // For PIX generation/polling
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerNameState] = useState('');
  const [customerEmail, setCustomerEmailState] = useState('');
  const [customerWhatsappCountryCode, setCustomerWhatsappCountryCodeState] = useState(PHONE_COUNTRY_CODES[0].value);
  const [rawWhatsappNumber, setRawWhatsappNumberState] = useState('');

  const [couponCodeInput, setCouponCodeInputState] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [originalPriceBeforeDiscount, setOriginalPriceBeforeDiscount] = useState<number | null>(null);
  const [discountApplied, setDiscountApplied] = useState<number>(0);

  const [includeOrderBump, setIncludeOrderBumpState] = useState(false);

  const [pixData, setPixData] = useState<PushInPayPixResponseData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const pollingTimeoutRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number
  const pollingIntervalRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number


  const abandonedCartIdRef = useRef<string | null>(null);
  const initialCouponCheckDone = useRef(false);
  const [ctaTextColor, setCtaTextColor] = useState('#111827');

  const productForUnloadRef = useRef(product);
  const customerNameForUnloadRef = useRef(customerName);
  const customerEmailForUnloadRef = useRef(customerEmail);
  const rawWhatsappNumberForUnloadRef = useRef(rawWhatsappNumber);
  const customerWhatsappCountryCodeForUnloadRef = useRef(customerWhatsappCountryCode);
  const finalPriceForUnloadRef = useRef(finalPrice);
  const couponCodeInputForUnloadRef = useRef(couponCodeInput);
  const includeOrderBumpForUnloadRef = useRef(includeOrderBump);
  const appliedCouponForUnloadRef = useRef(appliedCoupon);

  const getTrackingParams = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const tracking: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'sck', 'src'].forEach(key => {
        if (params.has(key)) tracking[key] = params.get(key)!;
    });
    return Object.keys(tracking).length > 0 ? tracking : undefined;
  }, [location.search]);
  const getTrackingParamsForUnloadRef = useRef(getTrackingParams);

  useEffect(() => { 
    const savedData = localStorage.getItem(LOCALSTORAGE_CHECKOUT_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData.slug === slug) {
          setCustomerNameState(parsedData.customerName || '');
          setCustomerEmailState(parsedData.customerEmail || '');
          setCustomerWhatsappCountryCodeState(parsedData.customerWhatsappCountryCode || PHONE_COUNTRY_CODES[0].value);
          setRawWhatsappNumberState(parsedData.rawWhatsappNumber || '');
          setCouponCodeInputState(parsedData.couponCodeInput || '');
          setIncludeOrderBumpState(parsedData.includeOrderBump || false);
        } else {
            localStorage.removeItem(LOCALSTORAGE_CHECKOUT_KEY);
        }
      } catch (e) { console.error("Failed to parse checkout data from localStorage", e); localStorage.removeItem(LOCALSTORAGE_CHECKOUT_KEY); }
    }
  }, [slug]);
  useEffect(() => { 
    const dataToSave = { slug, customerName, customerEmail, customerWhatsappCountryCode, rawWhatsappNumber, couponCodeInput, includeOrderBump };
    localStorage.setItem(LOCALSTORAGE_CHECKOUT_KEY, JSON.stringify(dataToSave));
  }, [slug, customerName, customerEmail, customerWhatsappCountryCode, rawWhatsappNumber, couponCodeInput, includeOrderBump]);
  useEffect(() => { productForUnloadRef.current = product; }, [product]);
  useEffect(() => { finalPriceForUnloadRef.current = finalPrice; }, [finalPrice]);
  useEffect(() => { getTrackingParamsForUnloadRef.current = getTrackingParams; }, [getTrackingParams]);
  useEffect(() => { customerNameForUnloadRef.current = customerName; }, [customerName]);
  useEffect(() => { customerEmailForUnloadRef.current = customerEmail; }, [customerEmail]);
  useEffect(() => { rawWhatsappNumberForUnloadRef.current = rawWhatsappNumber; }, [rawWhatsappNumber]);
  useEffect(() => { customerWhatsappCountryCodeForUnloadRef.current = customerWhatsappCountryCode; }, [customerWhatsappCountryCode]);
  useEffect(() => { couponCodeInputForUnloadRef.current = couponCodeInput; }, [couponCodeInput]);
  useEffect(() => { includeOrderBumpForUnloadRef.current = includeOrderBump; }, [includeOrderBump]);
  useEffect(() => { appliedCouponForUnloadRef.current = appliedCoupon; }, [appliedCoupon]);

  const applyCouponLogic = useCallback((couponToApply: Coupon | null, currentProduct: Product, bumpIncluded: boolean) => { 
    if (!currentProduct) return;
    let basePrice = currentProduct.priceInCents;
    let orderBumpPrice = 0;
    if (bumpIncluded && currentProduct.orderBump && currentProduct.orderBump.productId) {
        const bumpProductDetails = currentProduct.orderBump; 
        orderBumpPrice = bumpProductDetails.customPriceInCents ?? 0; 
        basePrice += orderBumpPrice;
    }
    setOriginalPriceBeforeDiscount(basePrice);
    let calculatedDiscount = 0;
    if (couponToApply && couponToApply.isActive) {
      if (couponToApply.appliesToProductId && couponToApply.appliesToProductId !== currentProduct.id) {
        setCouponError('Este cupom não é válido para este produto.'); setAppliedCoupon(null); setFinalPrice(basePrice); setDiscountApplied(0); return;
      }
      if (couponToApply.minPurchaseValueInCents && basePrice < couponToApply.minPurchaseValueInCents) {
        setCouponError(`Este cupom requer um valor mínimo de compra de ${formatCurrency(couponToApply.minPurchaseValueInCents)}.`); setAppliedCoupon(null); setFinalPrice(basePrice); setDiscountApplied(0); return;
      }
      if (couponToApply.discountType === 'percentage') calculatedDiscount = Math.round(basePrice * (couponToApply.discountValue / 100));
      else calculatedDiscount = couponToApply.discountValue;
      calculatedDiscount = Math.min(calculatedDiscount, basePrice); setAppliedCoupon(couponToApply); setCouponError(null);
    } else { setAppliedCoupon(null); }
    setDiscountApplied(calculatedDiscount); setFinalPrice(basePrice - calculatedDiscount);
  }, []);

  useEffect(() => {
    if (slug) {
      setIsLoading(true);
      productService.getProductBySlug(slug, null)
        .then(async (data: Product | undefined) => {
          if (data) {
            setProduct(data);
            const primaryColor = data.checkoutCustomization?.primaryColor;
            if (primaryColor) {
                document.documentElement.style.setProperty('--color-checkout-primary', primaryColor);
                setCtaTextColor(getContrastingTextColor(primaryColor));
                document.documentElement.style.setProperty('--color-checkout-cta-text', getContrastingTextColor(primaryColor));
            } else { 
                document.documentElement.style.setProperty('--color-checkout-primary', '#0D9488'); // Default teal
                setCtaTextColor(getContrastingTextColor('#0D9488'));
                document.documentElement.style.setProperty('--color-checkout-cta-text', getContrastingTextColor('#0D9488'));
            }

            try {
              const [ownerSettings, platSettings] = await Promise.all([
                settingsService.getAppSettingsByUserId(data.platformUserId, loggedInUserToken), 
                settingsService.getPlatformSettings(loggedInUserToken) 
              ]);
              console.log("[CheckoutPage] Owner App Settings Loaded:", ownerSettings);
              console.log("[CheckoutPage] Platform Settings Loaded:", platSettings);
              setOwnerAppSettings(ownerSettings);
              setPlatformSettings(platSettings);
            } catch (settingsError: any) {
              console.error("[CheckoutPage] Error fetching owner/platform settings:", settingsError);
              setError("Falha ao carregar configurações necessárias para o pagamento.");
            }
            
            if (!initialCouponCheckDone.current && data.coupons && data.coupons.length > 0) { 
                const autoApplyCoupon = data.coupons.find(c => c.isAutomatic && c.isActive);
                if (autoApplyCoupon) { applyCouponLogic(autoApplyCoupon, data, includeOrderBump); } 
                else { applyCouponLogic(null, data, includeOrderBump); }
                initialCouponCheckDone.current = true;
            }
            else if (!initialCouponCheckDone.current) { applyCouponLogic(null, data, includeOrderBump); initialCouponCheckDone.current = true; }
          } else { setError(`Produto com slug "${slug}" não encontrado.`); }
        })
        .catch(() => setError(`Falha ao carregar o produto com slug "${slug}".`))
        .finally(() => setIsLoading(false));
    } else { setError('Slug do produto não fornecido.'); setIsLoading(false); }
    return () => { 
      document.documentElement.style.removeProperty('--color-checkout-primary');
      document.documentElement.style.removeProperty('--color-checkout-cta-text');
     };
  }, [slug, applyCouponLogic, includeOrderBump, loggedInUserToken]);
  useEffect(() => { if (product) { applyCouponLogic(appliedCoupon, product, includeOrderBump); } }, [includeOrderBump, appliedCoupon, product, applyCouponLogic]);
  
  const handleApplyCoupon = () => { 
    if (!product || !product.coupons) { setCouponError('Nenhum cupom disponível para este produto.'); return; }
    if (!couponCodeInput.trim()) { applyCouponLogic(null, product, includeOrderBump); setCouponError(null); setAppliedCoupon(null); return; }
    const coupon = product.coupons.find((c: Coupon) => c.code.toUpperCase() === couponCodeInput.toUpperCase());
    if (coupon && coupon.isActive) applyCouponLogic(coupon, product, includeOrderBump);
    else if (coupon && !coupon.isActive) { setCouponError('Este cupom não está mais ativo.'); setAppliedCoupon(null); applyCouponLogic(null, product, includeOrderBump); }
    else { setCouponError('Cupom inválido.'); setAppliedCoupon(null); applyCouponLogic(null, product, includeOrderBump); }
  };
  
  const saveOrUpdateAbandonedCart = useCallback(async (isFinalAttempt = false) => {
    const currentProduct = isFinalAttempt ? productForUnloadRef.current : product;
    const currentCustomerEmail = isFinalAttempt ? customerEmailForUnloadRef.current : customerEmail;

    if (!currentProduct) { console.warn('[DEBUG saveOrUpdateAbandonedCart] Aborting: currentProduct is null.'); return; }
    if (isFinalAttempt && pixData) { console.warn('[DEBUG saveOrUpdateAbandonedCart] Aborting: Final attempt but PIX data exists (payment initiated).'); return; }

    const currentCustomerName = isFinalAttempt ? customerNameForUnloadRef.current : customerName;
    const currentRawWhatsapp = isFinalAttempt ? rawWhatsappNumberForUnloadRef.current : rawWhatsappNumber;
    const currentCountryCode = isFinalAttempt ? customerWhatsappCountryCodeForUnloadRef.current : customerWhatsappCountryCode;
    const currentFinalPrice = isFinalAttempt ? finalPriceForUnloadRef.current : finalPrice;
    const currentTrackingParamsGetter = isFinalAttempt ? getTrackingParamsForUnloadRef.current : getTrackingParams;
    
    const localDigits = currentRawWhatsapp.trim();
    const fullWhatsapp = localDigits ? `${currentCountryCode}${localDigits}` : '';

    const payload: CreateAbandonedCartPayload = {
        productId: currentProduct.id, productName: currentProduct.name,
        potentialValueInCents: currentFinalPrice ?? currentProduct.priceInCents,
        customerName: currentCustomerName.trim() || currentCustomerEmail.split('@')[0] || "Cliente Anônimo",
        customerEmail: currentCustomerEmail.trim(), customerWhatsapp: fullWhatsapp,
        platformUserId: currentProduct.platformUserId, trackingParameters: currentTrackingParamsGetter()
    };

    console.log('[DEBUG saveOrUpdateAbandonedCart] Payload:', payload, 'Existing ID:', abandonedCartIdRef.current);

    try {
      if (abandonedCartIdRef.current) {
        // Update existing cart - can proceed even if email is empty if other fields are being updated
        await abandonedCartService.updateAbandonedCartAttempt(abandonedCartIdRef.current, payload);
        console.log('[DEBUG saveOrUpdateAbandonedCart] Cart updated:', abandonedCartIdRef.current);
      } else if (payload.customerEmail && payload.customerEmail.trim()) {
        // Create new cart ONLY if email is present
        const newCart = await abandonedCartService.createAbandonedCartAttempt(payload);
        abandonedCartIdRef.current = newCart.id;
        console.log('[DEBUG saveOrUpdateAbandonedCart] Cart created:', newCart.id);
      } else {
        // Do not attempt to create a new cart if email is missing
        console.warn('[DEBUG saveOrUpdateAbandonedCart] Not creating new cart: Email is required. isFinalAttempt:', isFinalAttempt);
      }
    } catch (cartError) {
      console.error("[DEBUG saveOrUpdateAbandonedCart] Failed to save/update abandoned cart:", cartError);
      if (abandonedCartIdRef.current && (cartError as any).message?.includes("not found")) {
        abandonedCartIdRef.current = null; // Reset if update failed due to not found
      }
    }
  }, [product, customerEmail, customerName, rawWhatsappNumber, customerWhatsappCountryCode, finalPrice, getTrackingParams, pixData]);
  
  useEffect(() => { const executeBeforeUnloadActions = () => { saveOrUpdateAbandonedCart(true); }; window.addEventListener('beforeunload', executeBeforeUnloadActions); return () => { executeBeforeUnloadActions(); window.removeEventListener('beforeunload', executeBeforeUnloadActions); }; }, [saveOrUpdateAbandonedCart]); 
  const handleFieldBlur = () => { if (customerEmail.trim() || customerName.trim() || rawWhatsappNumber.trim()) { if (product) { saveOrUpdateAbandonedCart(); } } };
  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setCustomerNameState(e.target.value);
  const handleCustomerEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setCustomerEmailState(e.target.value);
  const handleWhatsappInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const digits = e.target.value.replace(/\D/g, ''); setRawWhatsappNumberState(digits); };
  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setCustomerWhatsappCountryCodeState(e.target.value); if (rawWhatsappNumber.trim()) { handleFieldBlur(); } };
  const handleCouponCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setCouponCodeInputState(e.target.value.toUpperCase());
  const handleToggleOrderBump = () => { const newBumpState = !includeOrderBump; setIncludeOrderBumpState(newBumpState); setTimeout(() => saveOrUpdateAbandonedCart(), 0); };

  const clearPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    pollingIntervalRef.current = null;
    pollingTimeoutRef.current = null;
  };

  // PIX Status Polling Logic
  useEffect(() => {
    if (pixData && paymentStatus === PaymentStatus.WAITING_PAYMENT && product && ownerAppSettings?.apiTokens.pushinPayEnabled && ownerAppSettings.apiTokens.pushinPay) {
      setIsProcessingPayment(true); 
      
      clearPolling(); 

      pollingIntervalRef.current = window.setInterval(async () => { // Use window.setInterval
        try {
          const statusResponse = await pushInPayService.checkPaymentStatus(pixData.id, ownerAppSettings.apiTokens.pushinPay!, ownerAppSettings.apiTokens.pushinPayEnabled!);
          if (statusResponse.success && statusResponse.data?.status === PaymentStatus.PAID) {
            setPaymentStatus(PaymentStatus.PAID);
            clearPolling();
            
            if (!platformSettings) {
                setError("Configurações da plataforma não carregadas. Não foi possível registrar a venda.");
                setIsProcessingPayment(false);
                return;
            }

            const saleProducts: SaleProductItem[] = [{
                productId: product.id, name: product.name, quantity: 1,
                priceInCents: product.priceInCents, 
                originalPriceInCents: product.priceInCents,
                deliveryUrl: product.deliveryUrl,
                slug: product.slug
            }];
            if (includeOrderBump && product.orderBump) {
                saleProducts.push({
                    productId: product.orderBump.productId, name: product.orderBump.name, quantity: 1,
                    priceInCents: product.orderBump.customPriceInCents ?? 0, 
                    originalPriceInCents: product.orderBump.customPriceInCents ?? 0, 
                    isOrderBump: true,
                });
            }
            const saleData: Omit<Sale, 'id' | 'createdAt' | 'platformCommissionInCents' | 'commission'> = {
                platformUserId: product.platformUserId,
                pushInPayTransactionId: pixData.id,
                products: saleProducts,
                customer: { name: customerName, email: customerEmail, whatsapp: `${customerWhatsappCountryCode}${rawWhatsappNumber}` },
                paymentMethod: PaymentMethod.PIX,
                status: PaymentStatus.PAID,
                totalAmountInCents: finalPrice!,
                originalAmountBeforeDiscountInCents: originalPriceBeforeDiscount!,
                discountAppliedInCents: discountApplied,
                couponCodeUsed: appliedCoupon?.code,
                paidAt: statusResponse.data.paid_at || new Date().toISOString(),
                trackingParameters: getTrackingParams()
            };

            const createdSale = await salesService.createSale(saleData, platformSettings, loggedInUserToken); 
            
            if (ownerAppSettings.apiTokens.utmifyEnabled && ownerAppSettings.apiTokens.utmify) {
                const utmifyPayload = {
                    orderId: createdSale.id, platform: PLATFORM_NAME, paymentMethod: "pix" as "pix",
                    status: PaymentStatus.PAID, createdAt: createdSale.createdAt,
                    customer: { name: customerName, email: customerEmail, whatsapp: `${customerWhatsappCountryCode}${rawWhatsappNumber}` },
                    products: createdSale.products.map(p => ({
                        id: p.productId, name: p.name, quantity: p.quantity, priceInCents: p.priceInCents,
                        planId: null, planName: null, isUpsell: p.isUpsell, slug: p.slug
                    })),
                    trackingParameters: createdSale.trackingParameters || {},
                    commission: createdSale.commission, approvedDate: createdSale.paidAt,
                    couponCodeUsed: createdSale.couponCodeUsed, discountAppliedInCents: createdSale.discountAppliedInCents,
                    originalAmountBeforeDiscountInCents: createdSale.originalAmountBeforeDiscountInCents,
                };
                await utmifyService.sendOrderData(utmifyPayload, ownerAppSettings.apiTokens.utmify);
            }
            setIsProcessingPayment(false);
            localStorage.removeItem(LOCALSTORAGE_CHECKOUT_KEY);
            navigate(`/thank-you/${createdSale.id}?origProdId=${product.id}`);

          } else if (statusResponse.success && statusResponse.data?.status && statusResponse.data.status !== PaymentStatus.WAITING_PAYMENT) {
            setPaymentStatus(statusResponse.data.status);
            setError(`Pagamento ${statusResponse.data.status}. Tente novamente.`);
            clearPolling();
            setIsProcessingPayment(false);
            setPixData(null); 
          }
        } catch (pollError: any) {
          console.error("Error polling payment status:", pollError);
          setError(pollError.message || "Erro ao verificar status do pagamento. Tente novamente.");
          clearPolling();
          setIsProcessingPayment(false);
          setPixData(null); 
        }
      }, POLLING_INTERVAL);

      pollingTimeoutRef.current = window.setTimeout(() => { // Use window.setTimeout
        clearPolling();
        if (paymentStatus === PaymentStatus.WAITING_PAYMENT) { 
            setError("Tempo limite para pagamento PIX esgotado. Por favor, tente gerar um novo PIX.");
            setPaymentStatus(PaymentStatus.EXPIRED);
            setIsProcessingPayment(false);
            setPixData(null); 
        }
      }, POLLING_TIMEOUT_DURATION);
    }
    return () => clearPolling();
  }, [pixData, paymentStatus, product, ownerAppSettings, platformSettings, finalPrice, originalPriceBeforeDiscount, discountApplied, appliedCoupon, customerName, customerEmail, customerWhatsappCountryCode, rawWhatsappNumber, getTrackingParams, navigate, loggedInUserToken, includeOrderBump]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || finalPrice === null || originalPriceBeforeDiscount === null) { setError('Erro ao processar. Tente recarregar.'); return; }
    if (!customerName.trim() || !customerEmail.trim() || !rawWhatsappNumber.trim()) { setError('Preencha Nome, Email e WhatsApp.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) { setError('Email inválido.'); return; }
    
    console.log("[CheckoutPage] handleSubmit - Checking settings before PIX generation...");
    console.log("[CheckoutPage] handleSubmit - Owner App Settings:", ownerAppSettings);
    console.log("[CheckoutPage] handleSubmit - Platform Settings:", platformSettings);

    if (!ownerAppSettings || !platformSettings) { setError('Configurações de pagamento não carregadas. Tente recarregar.'); return;}
    
    const pushInPayToken = ownerAppSettings.apiTokens?.pushinPay;
    const pushInPayIsEnabled = ownerAppSettings.apiTokens?.pushinPayEnabled;

    console.log("[CheckoutPage] handleSubmit - PushInPay Token (length):", pushInPayToken ? pushInPayToken.length : 'N/A');
    console.log("[CheckoutPage] handleSubmit - PushInPay Enabled:", pushInPayIsEnabled);

    if (!pushInPayIsEnabled || !pushInPayToken) {
        setError('Pagamento via PIX (PushInPay) não está habilitado ou configurado para este vendedor.');
        return;
    }

    setIsProcessingPayment(true); setError(null); setPixData(null); setPaymentStatus(null);
    await saveOrUpdateAbandonedCart(true); 

    const saleProducts: SaleProductItem[] = [{
        productId: product.id, name: product.name, quantity: 1,
        priceInCents: product.priceInCents, 
        originalPriceInCents: product.priceInCents,
        deliveryUrl: product.deliveryUrl,
        slug: product.slug
    }];
    if (includeOrderBump && product.orderBump && product.orderBump.productId) {
        const bumpPrice = product.orderBump.customPriceInCents ?? product.priceInCents; 
        saleProducts.push({
            productId: product.orderBump.productId, name: product.orderBump.name, quantity: 1,
            priceInCents: bumpPrice,
            originalPriceInCents: bumpPrice, 
            isOrderBump: true,
        });
    }

    const pixPayload = {
        value: finalPrice, originalValueBeforeDiscount: originalPriceBeforeDiscount,
        webhook_url: MOCK_WEBHOOK_URL,
        customerName: customerName, customerEmail: customerEmail, customerWhatsapp: `${customerWhatsappCountryCode}${rawWhatsappNumber}`,
        products: saleProducts, trackingParameters: getTrackingParams(),
        couponCodeUsed: appliedCoupon?.code, discountAppliedInCents: discountApplied
    };
    
    try {
        const pixResponse = await pushInPayService.generatePixCharge(pixPayload, pushInPayToken, pushInPayIsEnabled);
        if (pixResponse.success && pixResponse.data) {
            setPixData(pixResponse.data);
            setPaymentStatus(pixResponse.data.status);
        } else {
            throw new Error(pixResponse.message || "Falha ao gerar PIX.");
        }
    } catch (paymentError: any) {
        console.error("Error generating PIX:", paymentError);
        setError(paymentError.message || "Ocorreu um erro ao gerar o PIX. Tente novamente.");
        setPixData(null);
        setPaymentStatus(null);
    } 
  };

  const copyPixCode = () => { if (pixData?.qr_code) navigator.clipboard.writeText(pixData.qr_code).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }); };
  const [countdown, setCountdown] = useState<string | null>(null);
  const countdownIntervalRef = useRef<number | undefined>(undefined); // Use number for browser timer ID
  useEffect(() => { 
    if (product?.checkoutCustomization?.countdownTimer?.enabled && product.checkoutCustomization.countdownTimer.durationMinutes && !pixData) {
      const timerKey = `countdownEndTime_${product.id}_${slug}`;
      let endTimeString = localStorage.getItem(timerKey);
      let endTime = endTimeString ? parseInt(endTimeString, 10) : null;

      if (!endTime || endTime < Date.now() ) {
        endTime = Date.now() + product.checkoutCustomization.countdownTimer.durationMinutes * 60 * 1000;
        localStorage.setItem(timerKey, endTime.toString());
      }
      const updateCountdown = () => {
        const timeLeft = endTime! - Date.now();
        if (timeLeft <= 0) {
          setCountdown(product?.checkoutCustomization?.countdownTimer?.messageAfter || "00:00");
          clearInterval(countdownIntervalRef.current);
          return;
        }
        const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);
        setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      updateCountdown();
      countdownIntervalRef.current = window.setInterval(updateCountdown, 1000); // Use window.setInterval
    } else if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      setCountdown(null);
    }
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [product, pixData, slug]);

  if (isLoading && !product) return <div className="flex justify-center items-center h-screen bg-neutral-100"><LoadingSpinner size="lg" /><p className="ml-3 text-neutral-600">Carregando checkout...</p></div>;
  if (error && !pixData) return <div className="flex flex-col justify-center items-center h-screen bg-neutral-100 p-6 text-center"><Card className="max-w-md shadow-xl !bg-white"><div className="text-red-600 text-lg">{error}</div><Button onClick={() => window.location.reload()} className="mt-4 !bg-[var(--color-checkout-primary)] !text-[var(--color-checkout-cta-text)] hover:opacity-90">Recarregar Página</Button></Card></div>;
  if (!product || finalPrice === null) return <div className="flex flex-col justify-center items-center h-screen bg-neutral-100 p-6 text-center"><Card className="max-w-md shadow-xl !bg-white"><p className="text-neutral-600 text-lg">Produto não disponível ou erro no cálculo de preço.</p>{slug && <p className="text-sm text-neutral-500 mt-2">Tentando carregar slug: {slug}</p>}<Button onClick={() => window.location.reload()} className="mt-4 !bg-[var(--color-checkout-primary)] !text-[var(--color-checkout-cta-text)] hover:opacity-90">Recarregar Página</Button></Card></div>;

  const { checkoutCustomization, name: productNameFromProduct, description: productDescriptionFromProduct, orderBump: productOrderBump, imageUrl: productMainImageUrl } = product;
  const primaryColorStyle = checkoutCustomization?.primaryColor || '#0D9488';
  const countdownBgColor = checkoutCustomization?.countdownTimer?.backgroundColor || '#EF4444';
  const countdownTextColor = checkoutCustomization?.countdownTimer?.textColor || '#FFFFFF';
  const getGuaranteeBadgeWidthClass = () => { 
    const count = checkoutCustomization?.guaranteeBadges?.length || 0;
    if (count === 1) return 'w-full'; if (count === 2) return 'w-1/2'; if (count === 3) return 'w-1/3'; if (count >= 4) return 'w-1/4'; return 'w-full';
  };
  const displayWhatsappNumber = formatPhoneNumberVisual(rawWhatsappNumber);

  if (pixData && paymentStatus === PaymentStatus.WAITING_PAYMENT) {
    return (  
      <div className="checkout-light-theme min-h-screen flex flex-col items-center justify-center py-8 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
         <main className="w-full max-w-md bg-white shadow-2xl rounded-xl overflow-hidden border border-neutral-300/50">
            <div className="p-6 sm:p-8 text-center">
                <h1 className="text-2xl font-bold text-neutral-800 mb-3">Quase lá! Pague com PIX</h1>
                <p className="text-neutral-600 mb-5">Use o QR Code abaixo ou copie o código para pagar.</p>
                <img src={pixData.qr_code_base64} alt="PIX QR Code" className="mx-auto my-4 border rounded-lg shadow-sm max-w-xs w-full"/>
                <div className="my-5">
                    <Input readOnly value={pixData.qr_code} className="text-xs text-center inputLightStyle" label="Código PIX Copia e Cola:" labelClassName="labelLightStyle" />
                    <Button onClick={copyPixCode} className="mt-2 w-full !bg-[var(--color-checkout-primary)] !text-[var(--color-checkout-cta-text)] hover:opacity-90" disabled={isProcessingPayment}>
                        {copySuccess ? <><CheckCircleIcon className="h-5 w-5 mr-2"/> Copiado!</> : <><DocumentDuplicateIcon className="h-5 w-5 mr-2"/>Copiar Código</>}
                    </Button>
                </div>
                <p className="text-lg font-semibold" style={{color: primaryColorStyle}}>Total: {formatCurrency(pixData.value)}</p>
                {isProcessingPayment ? 
                    <div className="mt-4"><LoadingSpinner size="md" /><p className="text-sm text-neutral-500 mt-2">Aguardando confirmação do pagamento...</p></div>
                     :
                     <p className="text-sm text-red-500 mt-4">{error || "Falha ao confirmar pagamento. Tente novamente ou contate o suporte."}</p>
                }
            </div>
         </main>
         <footer className="mt-8 text-center text-xs text-neutral-500">
            <p>&copy; {new Date().getFullYear()} {productNameFromProduct}. Todos os direitos reservados.</p>
            <p>Powered by <a href="https://1checkout.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{color: primaryColorStyle}}>1Checkout</a></p>
         </footer>
      </div>
    );
  }

  return (  
    <div className="checkout-light-theme min-h-screen flex flex-col items-center py-8 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {checkoutCustomization?.countdownTimer?.enabled && countdown && !pixData && (
        <div className="fixed top-0 left-0 right-0 p-2 text-center z-50 shadow-md" style={{ backgroundColor: countdownBgColor, color: countdownTextColor }}>
          <span className="font-medium">{checkoutCustomization.countdownTimer.messageBefore}</span> {countdown}
        </div>
       )}
      <main className={`w-full max-w-xl bg-white shadow-2xl rounded-xl overflow-hidden border border-neutral-300/50 ${checkoutCustomization?.countdownTimer?.enabled && !pixData ? 'mt-16' : ''}`}>
        <div className="p-6 sm:p-8">
            
             {checkoutCustomization?.logoUrl && <img src={checkoutCustomization.logoUrl} alt={`${productNameFromProduct} Logo`} className="max-h-12 mx-auto mb-6"/>}
            {productMainImageUrl && !pixData && <img src={productMainImageUrl} alt={productNameFromProduct} className="w-full max-h-80 object-cover rounded-lg mb-5 shadow"/>}
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 text-center mb-1">{productNameFromProduct}</h1>
            {!pixData && <p className="text-neutral-600 text-center text-sm mb-5 leading-relaxed whitespace-pre-wrap">{productDescriptionFromProduct}</p>}

            {checkoutCustomization?.videoUrl && !pixData && (
                <div className="aspect-video my-5 rounded-lg overflow-hidden shadow">
                    <iframe width="100%" height="100%" src={checkoutCustomization.videoUrl.replace("watch?v=", "embed/")} title="Vídeo do Produto" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
            )}

            {checkoutCustomization?.salesCopy && !pixData && (
              <div className="prose prose-sm sm:prose max-w-none my-5" dangerouslySetInnerHTML={{ __html: checkoutCustomization.salesCopy }} />
            )}
            <form onSubmit={handleSubmit} className="space-y-5 pt-6 border-t border-neutral-200/80">
                
                <h2 className="text-xl font-semibold text-neutral-700 mb-1">Informações do Cliente</h2>
                <p className="text-xs text-neutral-500 -mt-4 mb-3">Preencha seus dados para prosseguir com o pagamento.</p>
                <Input label="Nome Completo" name="customerName" value={customerName} onChange={handleCustomerNameChange} onBlur={handleFieldBlur} required className="inputLightStyle" labelClassName="labelLightStyle" disabled={isProcessingPayment}/>
                <Input label="E-mail Principal" name="customerEmail" type="email" value={customerEmail} onChange={handleCustomerEmailChange} onBlur={handleFieldBlur} required className="inputLightStyle" labelClassName="labelLightStyle" disabled={isProcessingPayment}/>
                <div>
                    <label htmlFor="customerWhatsapp" className="block text-sm font-medium mb-1 labelLightStyle">WhatsApp</label>
                    <div className="flex">
                        <select value={customerWhatsappCountryCode} onChange={handleCountryCodeChange} className="rounded-l-md border-r-0 inputLightStyle w-1/3 sm:w-1/4" disabled={isProcessingPayment}>
                            {PHONE_COUNTRY_CODES.map(cc => <option key={cc.value} value={cc.value}>{cc.emoji} {cc.value}</option>)}
                        </select>
                        <Input name="customerWhatsapp" type="tel" value={displayWhatsappNumber} onChange={handleWhatsappInputChange} onBlur={handleFieldBlur} required placeholder="(DDD) 99999-9999" className="inputLightStyle rounded-l-none flex-1" disabled={isProcessingPayment}/>
                    </div>
                </div>
                {productOrderBump && productOrderBump.productId && ( 
                    <Card className="mt-5 bg-yellow-50/70 border-yellow-300 p-4 shadow-none">
                        <h3 className="text-base font-semibold text-yellow-800 mb-2">{productOrderBump.name}</h3>
                        {productOrderBump.imageUrl && <img src={productOrderBump.imageUrl} alt={productOrderBump.name} className="w-20 h-20 object-cover rounded-md float-right ml-3 mb-1"/>}
                        <p className="text-xs text-yellow-700 mb-2">{productOrderBump.description}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-yellow-900">
                                + {formatCurrency(productOrderBump.customPriceInCents ?? product.priceInCents)}
                            </span>
                            <label htmlFor="orderBump" className="flex items-center text-sm font-medium text-yellow-800 cursor-pointer">
                                <input type="checkbox" id="orderBump" checked={includeOrderBump} onChange={handleToggleOrderBump} className="h-4 w-4 text-yellow-600 border-yellow-400 rounded focus:ring-yellow-500 mr-2" disabled={isProcessingPayment}/>
                                Sim, quero adicionar!
                            </label>
                        </div>
                    </Card>
                )}
                <div className="pt-4 border-t border-neutral-200/60"> 
                    <div className="flex items-end gap-2">
                        <Input label="Cupom de Desconto (Opcional)" name="coupon" value={couponCodeInput} onChange={handleCouponCodeInputChange} className="inputLightStyle" labelClassName="labelLightStyle" icon={<TagIcon className="h-5 w-5"/>} disabled={isProcessingPayment}/>
                        <Button type="button" variant="outline" onClick={handleApplyCoupon} className="mb-px" disabled={isProcessingPayment || !couponCodeInput.trim()}>Aplicar</Button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                    {appliedCoupon && <p className="text-xs text-green-600 mt-1">Cupom "{appliedCoupon.code}" aplicado! ({formatCurrency(discountApplied)} de desconto)</p>}
                </div>
                <div className="text-right space-y-1 pt-2"> 
                    <p className="text-sm text-neutral-600">Subtotal: {formatCurrency(originalPriceBeforeDiscount ?? 0)}</p>
                    {discountApplied > 0 && <p className="text-sm text-red-500">Desconto: -{formatCurrency(discountApplied)}</p>}
                    <p className="text-xl font-bold" style={{color: primaryColorStyle}}>Total: {formatCurrency(finalPrice ?? 0)}</p>
                </div>
                <Button type="submit" isLoading={isProcessingPayment} disabled={isProcessingPayment} className="w-full text-lg py-3.5 transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColorStyle, color: ctaTextColor }}>
                    Pagar {formatCurrency(finalPrice!)} com PIX
                </Button>
                <p className="text-xs text-neutral-500 text-center flex items-center justify-center"><LockClosedIconSolid className="h-3 w-3 mr-1"/> Ambiente de pagamento seguro.</p>
            </form>
            {checkoutCustomization?.guaranteeBadges && checkoutCustomization.guaranteeBadges.length > 0 && !pixData && (
                <div className="mt-8 pt-6 border-t border-neutral-200/80">
                    <div className="flex flex-wrap justify-center items-center gap-4">
                        {checkoutCustomization.guaranteeBadges.map(badge => (
                            <img key={badge.id} src={badge.imageUrl} alt={badge.altText} className={`${getGuaranteeBadgeWidthClass()} max-h-20 object-contain`}/>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </main>
      <footer className="mt-8 text-center text-xs text-neutral-500">
        <p>&copy; {new Date().getFullYear()} {productNameFromProduct}. Todos os direitos reservados.</p>
        <p>Powered by <a href="https://1checkout.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{color: primaryColorStyle}}>1Checkout</a></p>
      </footer>
    </div>
  );
};
