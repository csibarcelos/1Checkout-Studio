
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { salesService } from '../services/salesService'; 
import { productService } from '../services/productService';
import { Sale, SaleProductItem, Product, UpsellOffer, PaymentStatus, PushInPayPixRequest, PushInPayPixResponseData, PushInPayPixResponse } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircleIcon, DocumentDuplicateIcon, MOCK_WEBHOOK_URL } from '@/constants.tsx'; 
import { pushinPayService } from '../services/pushinPayService'; 
import { Input } from '../components/ui/Input'; 


const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const triggerConversionEvent = (orderId: string, orderValue: number, currency: string, products: SaleProductItem[]) => {
  console.log(`CONVERSION EVENT: Order ${orderId}, Value ${orderValue} ${currency}, Products:`, products.map(p => p.name));
};

export const ThankYouPage: React.FC = () => {
  const { orderId: mainSaleTransactionId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const originalProductIdFromUrl = queryParams.get('origProdId');

  const [mainSaleDetails, setMainSaleDetails] = useState<Sale | null>(null);
  const [originalProductDetails, setOriginalProductDetails] = useState<Product | null>(null);
  const [upsellOffer, setUpsellOffer] = useState<UpsellOffer | null>(null);
  const [upsellProductPrice, setUpsellProductPrice] = useState<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [isProcessingUpsell, setIsProcessingUpsell] = useState(false);
  const [upsellPixData, setUpsellPixData] = useState<PushInPayPixResponseData | null>(null); 
  const [upsellErrorMessage, setUpsellErrorMessage] = useState<string | null>(null);
  const [upsellSuccessMessage, setUpsellSuccessMessage] = useState<string | null>(null);
  const [copySuccessUpsell, setCopySuccessUpsell] = useState(false);


  const fetchInitialData = useCallback(async () => {
    if (!mainSaleTransactionId) {
      setError("ID do pedido principal não encontrado.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSale = await salesService.getSaleById(mainSaleTransactionId, null);
      if (!fetchedSale) {
        setError("Detalhes do pedido principal não encontrados.");
        setIsLoading(false);
        return;
      }
      setMainSaleDetails(fetchedSale);
      const saleProducts = Array.isArray(fetchedSale.products) ? fetchedSale.products : [];
      const saleCurrency = fetchedSale.commission?.currency || 'BRL';
      triggerConversionEvent(fetchedSale.id, fetchedSale.totalAmountInCents, saleCurrency, saleProducts);

      if (originalProductIdFromUrl) {
        const fetchedOrigProduct = await productService.getProductById(originalProductIdFromUrl, null);
        setOriginalProductDetails(fetchedOrigProduct || null);
        if (fetchedOrigProduct?.upsell && !fetchedSale.upsellPushInPayTransactionId) {
          setUpsellOffer(fetchedOrigProduct.upsell);
          if (fetchedOrigProduct.upsell.customPriceInCents !== undefined) {
            setUpsellProductPrice(fetchedOrigProduct.upsell.customPriceInCents);
          } else {
            const fullUpsellProduct = await productService.getProductById(fetchedOrigProduct.upsell.productId, null);
            setUpsellProductPrice(fullUpsellProduct?.priceInCents || 0);
          }
          setShowUpsellModal(true);
        }
      }
    } catch (err) {
      setError("Falha ao buscar detalhes do pedido ou produto original.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [mainSaleTransactionId, originalProductIdFromUrl]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);


  const handleAcceptUpsell = async () => {
    if (!mainSaleDetails || !upsellOffer || upsellProductPrice === null || upsellProductPrice <= 0) {
      setUpsellErrorMessage("Não foi possível processar a oferta adicional. Detalhes ausentes.");
      return;
    }
    setIsProcessingUpsell(true);
    setUpsellErrorMessage(null);
    setUpsellSuccessMessage(null);

    try {
      const upsellPixPayload: PushInPayPixRequest = {
        value: upsellProductPrice,
        originalValueBeforeDiscount: upsellProductPrice, 
        webhook_url: MOCK_WEBHOOK_URL, 
        customerName: mainSaleDetails.customer.name,
        customerEmail: mainSaleDetails.customer.email,
        customerWhatsapp: mainSaleDetails.customer.whatsapp,
        products: [{
          productId: upsellOffer.productId,
          name: upsellOffer.name,
          quantity: 1,
          priceInCents: upsellProductPrice,
          originalPriceInCents: upsellProductPrice, 
          isUpsell: true,
        }],
        isUpsellTransaction: true,
        originalSaleId: mainSaleDetails.id,
      };

      const response = await pushinPayService.generatePixCharge(upsellPixPayload, mainSaleDetails.platformUserId);

      if (response.success && response.data && response.data.id){
        setUpsellPixData(response.data);
        // Logic to update mainSaleDetails with upsellPushInPayTransactionId typically after payment confirmation.
        // For now, just showing PIX. A webhook or polling on this page would handle actual confirmation.
        // This ThankYouPage currently doesn't poll for upsell payment status.
      } else {
        setUpsellErrorMessage(response.message || "Falha ao gerar PIX para oferta adicional.");
      }
    } catch (paymentError: any) {
        setUpsellErrorMessage(paymentError.message || "Erro desconhecido ao processar oferta adicional.");
    } finally {
        setIsProcessingUpsell(false);
    }
  };
  
  const handleDeclineUpsell = () => {
    setShowUpsellModal(false);
    // Potentially track declined upsell
  };

  const copyUpsellPixCode = () => {
    if (upsellPixData?.qr_code) {
        navigator.clipboard.writeText(upsellPixData.qr_code).then(() => {
            setCopySuccessUpsell(true);
            setTimeout(() => setCopySuccessUpsell(false), 2000);
        });
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 p-6 text-center">
        <Card className="max-w-md w-full shadow-xl">
          <h1 className="text-2xl font-bold text-red-600 mb-3">Erro no Pedido</h1>
          <p className="text-neutral-700 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} variant="primary">Voltar para Home</Button>
        </Card>
      </div>
    );
  }

  if (!mainSaleDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 p-6 text-center">
        <Card className="max-w-md w-full shadow-xl">
          <h1 className="text-2xl font-bold text-neutral-700 mb-3">Pedido Não Encontrado</h1>
          <p className="text-neutral-600 mb-6">Não conseguimos encontrar os detalhes do seu pedido. Verifique o link ou tente novamente.</p>
          <Button onClick={() => navigate('/')} variant="primary">Voltar para Home</Button>
        </Card>
      </div>
    );
  }
  
  const mainProductItem = mainSaleDetails.products.find(p => !p.isOrderBump && !p.isUpsell);
  const deliveryUrl = mainProductItem?.deliveryUrl;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 md:p-6">
      <Card className="max-w-lg w-full shadow-2xl border border-green-300">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-neutral-800 mb-3">Obrigado pela sua compra!</h1>
          <p className="text-neutral-700 mb-2">
            Seu pedido <span className="font-semibold text-primary">#{mainSaleTransactionId.substring(0, 12)}...</span> foi confirmado.
          </p>
          <p className="text-neutral-600 mb-6">
            Enviamos um e-mail para <span className="font-semibold text-neutral-700">{mainSaleDetails.customer.email}</span> com os detalhes do seu pedido e instruções de acesso.
          </p>

          <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 mb-6">
            <h3 className="font-semibold text-neutral-700 mb-2">Resumo da Compra:</h3>
            <ul className="text-sm text-neutral-600 space-y-1">
              {mainSaleDetails.products.map((item, index) => (
                <li key={index} className="flex justify-between">
                  <span>{item.name} (x{item.quantity}) {item.isOrderBump ? <span className="text-xs text-green-600">(Oferta Adicional)</span> : ""}</span>
                  <span>{formatCurrency(item.priceInCents)}</span>
                </li>
              ))}
               {mainSaleDetails.discountAppliedInCents && mainSaleDetails.discountAppliedInCents > 0 && (
                <li className="flex justify-between text-red-600 border-t border-dashed border-red-200 pt-1 mt-1">
                  <span>Desconto ({mainSaleDetails.couponCodeUsed})</span>
                  <span>-{formatCurrency(mainSaleDetails.discountAppliedInCents)}</span>
                </li>
              )}
              <li className="flex justify-between font-bold text-neutral-700 border-t border-neutral-200 pt-1 mt-1">
                <span>Total:</span>
                <span>{formatCurrency(mainSaleDetails.totalAmountInCents)}</span>
              </li>
            </ul>
          </div>

          {deliveryUrl && (
             <a href={deliveryUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" className="w-full text-lg py-3">
                Acessar Produto
                </Button>
            </a>
          )}
        </div>
      </Card>
      
      {/* Upsell Modal */}
      {upsellOffer && upsellProductPrice !== null && (
        <Modal isOpen={showUpsellModal} onClose={handleDeclineUpsell} title="Uma Oferta Especial Para Você!" size="lg">
            {upsellPixData ? (
                <div className="space-y-3 text-center">
                     <h3 className="text-xl font-semibold text-green-600">Pague com PIX para adicionar!</h3>
                     <img src={`data:image/png;base64,${upsellPixData.qr_code_base64}`} alt="PIX QR Code para Upsell" className="mx-auto w-48 h-48 rounded-md border-2 p-1 bg-white border-primary"/>
                      <div className="relative">
                        <Input name="upsellPixCode" readOnly value={upsellPixData.qr_code} className="pr-10 text-xs text-center"/>
                        <Button type="button" onClick={copyUpsellPixCode} variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-primary">
                          {copySuccessUpsell ? <CheckCircleIcon className="h-5 w-5 text-green-400"/> : <DocumentDuplicateIcon className="h-5 w-5"/>}
                        </Button>
                      </div>
                      {copySuccessUpsell && <p className="text-xs text-green-500">Código PIX copiado!</p>}
                     <p className="text-sm text-neutral-400">Escaneie ou copie o código. Após o pagamento, você receberá acesso à esta oferta adicional.</p>
                     <Button variant="outline" onClick={handleDeclineUpsell} className="w-full mt-2">Não, obrigado (Fechar)</Button>
                </div>
            ) : (
                <>
                    <div className="text-center">
                        {upsellOffer.imageUrl && <img src={upsellOffer.imageUrl} alt={upsellOffer.name} className="max-h-48 mx-auto mb-3 rounded-md shadow-md" />}
                        <h3 className="text-xl font-semibold text-neutral-100 mb-1">{upsellOffer.name}</h3>
                        <p className="text-neutral-300 mb-3">{upsellOffer.description}</p>
                        <p className="text-2xl font-bold text-primary mb-4">Por apenas: {formatCurrency(upsellProductPrice)}</p>
                    </div>
                    {upsellErrorMessage && <p className="text-sm text-red-400 p-2 bg-red-800/20 rounded-md my-2">{upsellErrorMessage}</p>}
                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                        <Button variant="primary" onClick={handleAcceptUpsell} isLoading={isProcessingUpsell} className="flex-1 py-3 text-md">Sim, quero esta oferta!</Button>
                        <Button variant="ghost" onClick={handleDeclineUpsell} disabled={isProcessingUpsell} className="flex-1 py-3 text-md">Não, obrigado</Button>
                    </div>
                </>
            )}
        </Modal>
      )}
    </div>
  );
};
