
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { salesService } from '../services/salesService'; 
import { productService } from '../services/productService';
import { Sale, SaleProductItem, Product, UpsellOffer, PaymentStatus, PushInPayPixRequest, PushInPayPixResponseData, PushInPayPixResponse } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircleIcon, DocumentDuplicateIcon, MOCK_WEBHOOK_URL } from '../constants'; 
import { pushInPayService } from '../services/pushinPayService'; // Para placeholder


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
      // Ensure fetchedSale.products is an array before calling triggerConversionEvent
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

      const response = await pushInPayService.generatePixCharge(upsellPixPayload, "USER_PUSHINPAY_TOKEN_PLACEHOLDER", true);

      if (response.success && response.data && response.data.id) { 
        setUpsellPixData(response.data);
        setUpsellErrorMessage("Funcionalidade de pagamento de upsell requer backend. PIX não gerado.");
      } else {
        throw new Error(response.message || "Falha ao gerar PIX para a oferta adicional (placeholder).");
      }
    } catch (err: any) {
      setUpsellErrorMessage(err.message || "Erro ao processar oferta adicional (placeholder).");
    } finally {
      setIsProcessingUpsell(false);
    }
  };
  
  const handleDeclineUpsell = () => {
    setShowUpsellModal(false);
  };


  const copyUpsellPixCode = () => {
    if (upsellPixData?.qr_code) {
      navigator.clipboard.writeText(upsellPixData.qr_code).then(() => {
        setCopySuccessUpsell(true);
        setTimeout(() => setCopySuccessUpsell(false), 2000);
      }, () => alert('Falha ao copiar o código PIX. Tente manualmente.'));
    }
  };


  if (isLoading && !mainSaleDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-4">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-neutral-600">Processando seu pedido...</p>
      </div>
    );
  }
  
  if (error && !mainSaleDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-4">
        <Card className="w-full max-w-lg text-center shadow-2xl">
           <svg className="h-20 w-20 text-red-500 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           <h1 className="text-2xl font-bold text-neutral-800 mb-3">Erro ao Carregar Pedido</h1>
           <p className="text-neutral-600 mb-6">{error}</p>
           <Button to="/dashboard" variant="primary">Ir para o Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (!mainSaleDetails) {
     return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-4">
        <Card className="w-full max-w-lg text-center shadow-2xl">
           <h1 className="text-2xl font-bold text-neutral-800 mb-3">Pedido não encontrado</h1>
           <Button to="/dashboard" variant="primary">Ir para o Dashboard</Button>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-primary to-primary-dark p-6">
      <Card className="w-full max-w-lg text-center shadow-2xl">
        <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-neutral-800 mb-3">Obrigado pela sua compra!</h1>
        <p className="text-neutral-600 mb-2">
          Seu pedido <strong className="text-primary">#{mainSaleDetails.id.split('_').pop()}</strong> foi recebido.
        </p>
        <p className="text-neutral-600 mb-8">
          Enviaremos um e-mail com os detalhes da sua compra e os próximos passos para {mainSaleDetails.customer.email} assim que o pagamento for confirmado.
        </p>
        
        {upsellSuccessMessage && (
            <div className="my-4 p-3 bg-green-50 text-green-700 rounded-md shadow">
                {upsellSuccessMessage}
            </div>
        )}
        
        {Array.isArray(mainSaleDetails.products) && mainSaleDetails.products.some(p => p.deliveryUrl) && (
          <div className="my-6 p-4 border-t border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-700 mb-3">Acesse seu(s) produto(s) (após confirmação):</h2>
            <ul className="space-y-2">
              {mainSaleDetails.products.filter(p => p.deliveryUrl).map((item: SaleProductItem) => (
                <li key={item.productId + (item.isUpsell ? '_upsell':'')}>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(item.deliveryUrl, '_blank')}
                  >
                    Acessar {item.name} {item.isUpsell ? <span className="ml-1 text-xs bg-secondary/80 text-white px-1.5 py-0.5 rounded-full">ADICIONAL</span> : ''}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 space-y-3">
          <Button to="/dashboard" variant="primary" className="w-full sm:w-auto">
            Ir para o Dashboard
          </Button>
        </div>
        <p className="mt-8 text-xs text-neutral-500">
          Se tiver alguma dúvida, entre em contato com nosso suporte.
        </p>
      </Card>

      {showUpsellModal && upsellOffer && upsellProductPrice !== null && (
        <Modal isOpen={showUpsellModal} onClose={isProcessingUpsell ? () => {} : handleDeclineUpsell} title="Oferta Especial Para Você!">
          {!upsellPixData && !upsellSuccessMessage && ( 
            <>
              <div className="text-center space-y-3">
                {upsellOffer.imageUrl && <img src={upsellOffer.imageUrl} alt={upsellOffer.name} className="max-h-40 mx-auto mb-3 rounded" />}
                <h3 className="text-xl font-bold text-primary">{upsellOffer.name}</h3>
                <p className="text-neutral-600 text-sm">{upsellOffer.description}</p>
                <p className="text-2xl font-extrabold text-secondary-dark">{formatCurrency(upsellProductPrice)}</p>
              </div>
              {upsellErrorMessage && <p className="text-sm text-red-500 my-3 p-2 bg-red-50 rounded">{upsellErrorMessage}</p>}
              <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                <Button onClick={handleAcceptUpsell} isLoading={isProcessingUpsell} disabled={isProcessingUpsell} variant="primary" className="w-full sm:ml-3">
                  Sim, Quero Aproveitar!
                </Button>
                <Button onClick={handleDeclineUpsell} variant="ghost" className="w-full" disabled={isProcessingUpsell}>
                  Não, Obrigado
                </Button>
              </div>
            </>
          )}

          {upsellPixData && !upsellSuccessMessage && (
             <div className="text-center space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-700">Pagamento da Oferta Adicional</h2>
                <p className="text-sm text-neutral-600 px-2 sm:px-4">A funcionalidade de pagamento de upsell requer integração de backend.</p>
                {upsellErrorMessage && <p className="text-sm text-red-500 mt-2">{upsellErrorMessage}</p>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
