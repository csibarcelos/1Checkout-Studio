
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Product, PaymentStatus, PushInPayPixRequest, PushInPayPixResponse, SaleProductItem, Coupon, OrderBumpOffer, PushInPayPixResponseData } from '../types';
import { productService } from '../services/productService';
import { abandonedCartService, CreateAbandonedCartPayload } from '../services/abandonedCartService';
import { apiClient } from '../apiClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { MOCK_WEBHOOK_URL, CheckCircleIcon, PHONE_COUNTRY_CODES, DocumentDuplicateIcon } from '../constants';

const LockClosedIconSolid = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002 2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
  </svg>
);

const TagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
);

const POLLING_INTERVAL = 5000;
const PIX_EXPIRATION_MINUTES = 30;

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const formatPhoneNumberVisual = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`; // Handle longer inputs gracefully
};

interface InternalGeneratePixPayload {
  productId: string;
  productSlug?: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  products: SaleProductItem[];
  trackingParameters?: Record<string, string>;
  couponCodeUsed?: string;
  discountAppliedInCents?: number;
  originalValueBeforeDiscount: number;
  value: number;
}

const getContrastingTextColor = (hexColor?: string): string => {
    if (!hexColor) return '#111827'; 
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#111827' : '#FFFFFF'; 
    } catch (e) {
      return '#111827'; // Default to dark if parsing fails
    }
};


export const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerWhatsappCountryCode, setCustomerWhatsappCountryCode] = useState(PHONE_COUNTRY_CODES[0].value);
  const [customerWhatsappNumber, setCustomerWhatsappNumber] = useState('');

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [originalPriceBeforeDiscount, setOriginalPriceBeforeDiscount] = useState<number | null>(null);
  const [discountApplied, setDiscountApplied] = useState<number>(0);

  const [includeOrderBump, setIncludeOrderBump] = useState(false);

  const [pixData, setPixData] = useState<PushInPayPixResponseData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pixCreationTime, setPixCreationTime] = useState<number | null>(null);
  const [pixTransactionId, setPixTransactionId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const abandonedCartRecorded = useRef(false);
  const initialCouponCheckDone = useRef(false);
  const [ctaTextColor, setCtaTextColor] = useState('#111827');


  const getTrackingParams = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const tracking: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'sck', 'src'].forEach(key => {
        if (params.has(key)) tracking[key] = params.get(key)!;
    });
    return Object.keys(tracking).length > 0 ? tracking : undefined;
  }, [location.search]);


  const applyCouponLogic = useCallback((couponToApply: Coupon | null, currentProduct: Product, bumpIncluded: boolean) => {
    if (!currentProduct) return;
    let basePrice = currentProduct.priceInCents;
    let orderBumpPrice = 0;
    if (bumpIncluded && currentProduct.orderBump && currentProduct.orderBump.productId) {
        orderBumpPrice = currentProduct.orderBump.customPriceInCents ?? 0; 
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
        .then((data: Product | undefined) => {
          if (data) {
            setProduct(data);
            const primaryColor = data.checkoutCustomization?.primaryColor;
            if (primaryColor) {
                document.documentElement.style.setProperty('--color-checkout-primary', primaryColor);
                setCtaTextColor(getContrastingTextColor(primaryColor));
                document.documentElement.style.setProperty('--color-checkout-cta-text', getContrastingTextColor(primaryColor));
            } else { // Reset to defaults if no primary color is set on the product
                document.documentElement.style.setProperty('--color-checkout-primary', '#FDE047'); // Default yellow
                setCtaTextColor(getContrastingTextColor('#FDE047'));
                document.documentElement.style.setProperty('--color-checkout-cta-text', getContrastingTextColor('#FDE047'));
            }


            if (!initialCouponCheckDone.current && data.coupons && data.coupons.length > 0) {
                const automaticCoupon = data.coupons.find((c: Coupon) => c.isAutomatic && c.isActive);
                if (automaticCoupon) {
                    applyCouponLogic(automaticCoupon, data, includeOrderBump);
                    setCouponCodeInput(automaticCoupon.code);
                } else { applyCouponLogic(null, data, includeOrderBump); }
                initialCouponCheckDone.current = true;
            } else { applyCouponLogic(null, data, includeOrderBump); }
          } else { setError(`Produto com slug "${slug}" não encontrado.`); }
        })
        .catch(() => setError(`Falha ao carregar o produto com slug "${slug}".`))
        .finally(() => setIsLoading(false));
    } else { setError('Slug do produto não fornecido.'); setIsLoading(false); }
    return () => { 
        document.documentElement.style.removeProperty('--color-checkout-primary'); 
        document.documentElement.style.removeProperty('--color-checkout-cta-text');
    };
  }, [slug, applyCouponLogic, includeOrderBump]); 

  useEffect(() => {
    if (product) {
        if (appliedCoupon) applyCouponLogic(appliedCoupon, product, includeOrderBump);
        else if (couponCodeInput && product.coupons) {
            const couponFromInput = product.coupons.find((c: Coupon) => c.code.toUpperCase() === couponCodeInput.toUpperCase() && c.isActive);
            applyCouponLogic(couponFromInput || null, product, includeOrderBump);
        } else {
            const automaticCoupon = product.coupons?.find((c: Coupon) => c.isAutomatic && c.isActive);
            applyCouponLogic(automaticCoupon || null, product, includeOrderBump);
        }
    }
  }, [includeOrderBump, product, appliedCoupon, couponCodeInput, applyCouponLogic]);


  const handleApplyCoupon = () => {
    if (!product || !product.coupons) { setCouponError('Nenhum cupom disponível para este produto.'); return; }
    if (!couponCodeInput.trim()) { applyCouponLogic(null, product, includeOrderBump); setCouponError(null); setAppliedCoupon(null); return; }
    const coupon = product.coupons.find((c: Coupon) => c.code.toUpperCase() === couponCodeInput.toUpperCase());
    if (coupon && coupon.isActive) applyCouponLogic(coupon, product, includeOrderBump);
    else if (coupon && !coupon.isActive) { setCouponError('Este cupom não está mais ativo.'); setAppliedCoupon(null); applyCouponLogic(null, product, includeOrderBump); }
    else { setCouponError('Cupom inválido.'); setAppliedCoupon(null); applyCouponLogic(null, product, includeOrderBump); }
  };

  const recordAbandonedCart = useCallback(async () => {
    if (product && customerEmail && !pixData && !abandonedCartRecorded.current) {
      abandonedCartRecorded.current = true;
      try {
        const payload: CreateAbandonedCartPayload = { productId: product.id, productName: product.name, potentialValueInCents: finalPrice ?? product.priceInCents, customerName: customerName, customerEmail: customerEmail, customerWhatsapp: `${customerWhatsappCountryCode}${customerWhatsappNumber.replace(/\D/g, '')}` };
        await abandonedCartService.createAbandonedCartAttempt(payload);
      } catch (cartError) { console.error("Failed to record abandoned cart:", cartError); abandonedCartRecorded.current = false; }
    }
  }, [product, customerEmail, customerName, customerWhatsappCountryCode, customerWhatsappNumber, finalPrice, pixData]);

  useEffect(() => {
    const executeBeforeUnloadActions = (): void => { if (product && customerEmail && !pixData && !abandonedCartRecorded.current) recordAbandonedCart().catch(console.error); };
    window.addEventListener('beforeunload', executeBeforeUnloadActions);
    return () => { executeBeforeUnloadActions(); window.removeEventListener('beforeunload', executeBeforeUnloadActions); };
  }, [recordAbandonedCart, product, customerEmail, pixData]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || finalPrice === null || originalPriceBeforeDiscount === null) { setError('Erro ao processar. Tente recarregar.'); return; }
    if (!customerName.trim() || !customerEmail.trim() || !customerWhatsappNumber.trim()) { setError('Preencha Nome, Email e WhatsApp.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) { setError('Email inválido.'); return; }

    const fullWhatsapp = `${customerWhatsappCountryCode}${customerWhatsappNumber.replace(/\D/g, '')}`;
    setIsLoading(true); setError(null); setPixData(null); setPaymentStatus(null); if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    const productsInCart: SaleProductItem[] = [{ productId: product.id, name: product.name, quantity: 1, priceInCents: product.priceInCents, originalPriceInCents: product.priceInCents, deliveryUrl: product.deliveryUrl }];
    if (includeOrderBump && product.orderBump && product.orderBump.productId) {
        const bumpProductOriginalPrice = product.orderBump.customPriceInCents ?? 0; 
        productsInCart.push({
            productId: product.orderBump.productId,
            name: product.orderBump.name,
            quantity: 1,
            priceInCents: product.orderBump.customPriceInCents ?? 0, 
            originalPriceInCents: bumpProductOriginalPrice, 
            isOrderBump: true,
        });
    }

    try {
      const pixPayload: InternalGeneratePixPayload = {
        productId: product.id, productSlug: product.slug, customerName, customerEmail, customerWhatsapp: fullWhatsapp, products: productsInCart,
        trackingParameters: getTrackingParams(), couponCodeUsed: appliedCoupon?.code,
        discountAppliedInCents: discountApplied > 0 ? discountApplied : undefined,
        originalValueBeforeDiscount: originalPriceBeforeDiscount, value: finalPrice,
      };

      const pixResponse = await apiClient.request<PushInPayPixResponse, InternalGeneratePixPayload>({
        method: 'POST', endpoint: '/internal/pix/generate', body: pixPayload, token: null
      });

      if (pixResponse.success && pixResponse.data) {
        setPixData(pixResponse.data);
        setPaymentStatus(pixResponse.data.status);
        setPixCreationTime(Date.now()); setIsPolling(true); setError(null);
        setPixTransactionId(pixResponse.data.id);
        if (!abandonedCartRecorded.current) recordAbandonedCart().catch(console.error);
      } else {
        setError(pixResponse.message || 'Falha ao gerar cobrança PIX. Tente novamente.');
      }
    } catch (err: any) {
      setError(err.error?.message || err.message || 'Ocorreu um erro desconhecido ao gerar o PIX.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPolling && pixTransactionId && paymentStatus !== PaymentStatus.PAID && pixCreationTime) {
        const checkStatus = async () => {
            if (Date.now() - pixCreationTime > PIX_EXPIRATION_MINUTES * 60 * 1000) {
                setError(`Pagamento PIX expirou. ID: ${pixTransactionId}. Por favor, gere um novo PIX.`);
                setIsPolling(false); if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                return;
            }
            try {
                const statusResponse = await apiClient.request<PushInPayPixResponse>({
                    method: 'GET', endpoint: `/internal/pix/status/${pixTransactionId}`, token: null
                });

                if (statusResponse.success && statusResponse.data) {
                    setPaymentStatus(statusResponse.data.status);
                    if (statusResponse.data.status === PaymentStatus.PAID) {
                        setIsPolling(false); if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        await apiClient.request<{ success: boolean, saleId?: string }>({ 
                            method: 'POST', 
                            endpoint: '/internal/pix/confirm', 
                            body: { pixTransactionId: pixTransactionId, paidAt: new Date().toISOString() }, 
                            token: null 
                        });
                        navigate(`/thank-you/${pixTransactionId}?origProdId=${product?.id}`);
                    } else if (statusResponse.data.status === PaymentStatus.EXPIRED || statusResponse.data.status === PaymentStatus.CANCELLED || statusResponse.data.status === PaymentStatus.FAILED) {
                        setError(`Pagamento PIX ${statusResponse.data.status}. ID: ${pixTransactionId}.`);
                        setIsPolling(false); if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    } else { pollingIntervalRef.current = setTimeout(checkStatus, POLLING_INTERVAL); }
                } else {
                    console.warn("Polling: Failed to get valid status or data", statusResponse.message);
                    pollingIntervalRef.current = setTimeout(checkStatus, POLLING_INTERVAL);
                }
            } catch (err: any) {
                console.error("Polling Error:", err);
                pollingIntervalRef.current = setTimeout(checkStatus, POLLING_INTERVAL);
            }
        };
        pollingIntervalRef.current = setTimeout(checkStatus, POLLING_INTERVAL);
    }
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, [isPolling, pixTransactionId, paymentStatus, pixCreationTime, navigate, product?.id]);

  const copyPixCode = () => { if (pixData?.qr_code) navigator.clipboard.writeText(pixData.qr_code).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }); };
  const [countdown, setCountdown] = useState<string | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

   useEffect(() => {
    if (product?.checkoutCustomization?.countdownTimer?.enabled && product.checkoutCustomization.countdownTimer.durationMinutes && !pixData) {
      const timerKey = `countdownEndTime_${product.id}_${slug}`;
      let endTime = localStorage.getItem(timerKey);
      if (!endTime || parseInt(endTime) < Date.now() ) { 
        endTime = (Date.now() + product.checkoutCustomization.countdownTimer.durationMinutes * 60 * 1000).toString();
        localStorage.setItem(timerKey, endTime);
      }
      const updateCountdown = () => {
        const timeLeft = parseInt(endTime!) - Date.now();
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
      countdownIntervalRef.current = setInterval(updateCountdown, 1000);
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
  
  // These classes are now applied through .checkout-light-theme in global.css
  // const inputLightStyle = "bg-white border-neutral-300 text-neutral-800 placeholder-neutral-500 focus:border-[var(--color-checkout-primary)] focus:ring-1 focus:ring-[var(--color-checkout-primary)]";
  // const labelLightStyle = "text-neutral-700";

  return (
    <div className="checkout-light-theme min-h-screen flex flex-col items-center py-8 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {checkoutCustomization?.countdownTimer?.enabled && countdown && !pixData && (
        <div className="fixed top-0 left-0 right-0 p-3 text-center text-lg font-semibold z-50 shadow-lg" style={{ backgroundColor: countdownBgColor, color: countdownTextColor }}>
          {checkoutCustomization.countdownTimer.messageBefore} {countdown}
        </div>
      )}
      {checkoutCustomization?.countdownTimer?.enabled && countdown === checkoutCustomization?.countdownTimer?.messageAfter && !pixData && ( 
         <div className="fixed top-0 left-0 right-0 p-3 text-center text-lg font-semibold z-50 shadow-lg" style={{ backgroundColor: countdownBgColor, color: countdownTextColor }}>
            {checkoutCustomization.countdownTimer.messageAfter}
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

          {pixData && paymentStatus !== PaymentStatus.PAID ? (
            <div className="text-center space-y-4 py-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-neutral-800">Pague com PIX para Finalizar</h2>
                <p className="text-sm text-neutral-600 px-2 sm:px-4">Para pagar, abra o aplicativo do seu banco, acesse a área PIX e escolha 'Ler QR Code' ou 'PIX Copia e Cola'.</p>
                {pixData.qr_code_base64 && <img src={pixData.qr_code_base64} alt="PIX QR Code" className="mx-auto border border-neutral-300 p-2 rounded-md shadow w-56 h-56 sm:w-64 sm:h-64"/>}

                {pixData.qr_code && (
                <div className="space-y-2">
                    <Input label="PIX Copia e Cola" name="pixCode" value={pixData.qr_code} readOnly onClick={(e: React.MouseEvent<HTMLInputElement>) => (e.target as HTMLInputElement).select() } className="text-center text-xs sm:text-sm inputLightStyle" labelClassName="labelLightStyle" />
                    <Button onClick={copyPixCode} variant="outline" className="w-full border-[var(--color-checkout-primary)] text-[var(--color-checkout-primary)] hover:bg-[var(--color-checkout-primary)] hover:!text-[var(--color-checkout-cta-text)]" leftIcon={<DocumentDuplicateIcon className="h-5 w-5"/>}>
                    {copySuccess ? 'Copiado!' : 'Copiar Código PIX'}
                    </Button>
                </div>
                )}
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                {isPolling && <div className="flex items-center justify-center text-neutral-500 text-sm mt-4"><LoadingSpinner size="sm" color="text-neutral-500" className="mr-2" />Aguardando pagamento...</div>}
                 <Button variant="ghost" onClick={() => { setPixData(null); setPaymentStatus(null); setError(null); if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); setIsPolling(false);}} className="text-sm text-neutral-500 hover:text-neutral-700 mt-3">
                    Gerar outro PIX ou alterar dados
                </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 pt-6 border-t border-neutral-200/80">
                <h2 className="text-xl font-semibold text-neutral-700 mb-1">Informações do Cliente</h2>
                <p className="text-xs text-neutral-500 -mt-4 mb-3">Preencha seus dados para prosseguir com o pagamento.</p>

                <Input label="Nome Completo" name="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="inputLightStyle" labelClassName="labelLightStyle" />
                <Input label="E-mail Principal" name="customerEmail" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required className="inputLightStyle" labelClassName="labelLightStyle"/>
                <div>
                    <label htmlFor="customerWhatsapp" className="block text-sm font-medium mb-1 labelLightStyle">WhatsApp</label>
                    <div className="flex">
                        <select value={customerWhatsappCountryCode} onChange={e => setCustomerWhatsappCountryCode(e.target.value)} className="rounded-l-md border-r-0 inputLightStyle w-1/3 sm:w-1/4">
                            {PHONE_COUNTRY_CODES.map(cc => <option key={cc.value} value={cc.value}>{cc.emoji} {cc.value}</option>)}
                        </select>
                        <Input name="customerWhatsapp" type="tel" value={customerWhatsappNumber} onChange={e => setCustomerWhatsappNumber(formatPhoneNumberVisual(e.target.value))} required placeholder="(DDD) 99999-9999" className="inputLightStyle rounded-l-none flex-1" />
                    </div>
                </div>

                {productOrderBump && productOrderBump.productId && (
                    <Card className={`p-4 border-2 ${includeOrderBump ? 'border-[var(--color-checkout-primary)] bg-[var(--color-checkout-primary)]/5' : 'border-neutral-200 hover:border-neutral-300'} transition-all duration-200 cursor-pointer !bg-white hover:!bg-neutral-50`} onClick={() => setIncludeOrderBump(!includeOrderBump)}>
                        <div className="flex items-start space-x-3">
                            <input type="checkbox" checked={includeOrderBump} onChange={() => {}} className="mt-1 h-5 w-5 text-[var(--color-checkout-primary)] border-neutral-400 rounded focus:ring-[var(--color-checkout-primary)] focus:ring-offset-0" />
                            <div>
                                <h3 className="text-md font-semibold text-neutral-800">SIM, QUERO {productOrderBump.name.toUpperCase()} POR APENAS {formatCurrency(productOrderBump.customPriceInCents ?? 0)}!</h3>
                                <p className="text-xs text-neutral-600">{productOrderBump.description}</p>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="pt-4 border-t border-neutral-200/60">
                    <label htmlFor="couponCode" className="block text-sm font-medium labelLightStyle">Cupom de Desconto</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <div className="relative flex items-stretch flex-grow focus-within:z-10">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><TagIcon className="h-5 w-5 text-neutral-400" aria-hidden="true"/></div>
                            <Input type="text" name="couponCode" id="couponCode" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} placeholder="INSIRA SEU CUPOM" className="inputLightStyle rounded-r-none pl-10 uppercase" />
                        </div>
                        <Button type="button" onClick={handleApplyCoupon} className="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-[var(--color-checkout-primary)] text-sm font-medium rounded-r-md text-neutral-700 bg-white hover:bg-[var(--color-checkout-primary)]/10 focus:outline-none focus:ring-1 focus:ring-[var(--color-checkout-primary)] focus:border-[var(--color-checkout-primary)]">
                            Aplicar
                        </Button>
                    </div>
                    {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                    {appliedCoupon && <p className="mt-1 text-xs text-green-600">Cupom "{appliedCoupon.code}" aplicado! ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : formatCurrency(appliedCoupon.discountValue)} de desconto)</p>}
                </div>

                <div className="text-right space-y-1 pt-2">
                    {discountApplied > 0 && <p className="text-sm text-neutral-500">Subtotal: <span className="line-through">{formatCurrency(originalPriceBeforeDiscount!)}</span></p>}
                    {discountApplied > 0 && <p className="text-sm text-green-600">Desconto Cupom: -{formatCurrency(discountApplied)}</p>}
                    <p className="text-2xl font-bold" style={{color: primaryColorStyle}}>TOTAL: {formatCurrency(finalPrice)}</p>
                </div>

                <Button type="submit" isLoading={isLoading} className="w-full text-lg py-3.5 transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColorStyle, color: ctaTextColor }}>
                    Pagar {formatCurrency(finalPrice)} com PIX
                </Button>
                <p className="text-xs text-neutral-500 text-center flex items-center justify-center"><LockClosedIconSolid className="h-3 w-3 mr-1"/> Ambiente de pagamento seguro.</p>
            </form>
          )}

          {checkoutCustomization?.guaranteeBadges && checkoutCustomization.guaranteeBadges.length > 0 && !pixData && (
            <div className="mt-8 pt-6 border-t border-neutral-200/80">
              <div className="flex flex-wrap justify-around items-center gap-2">
                {(checkoutCustomization.guaranteeBadges).map(badge => (
                  <div key={badge.id} className={`p-1 ${getGuaranteeBadgeWidthClass()}`}>
                    <img src={badge.imageUrl} alt={badge.altText} className="max-h-24 w-auto object-contain mx-auto"/>
                  </div>
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
