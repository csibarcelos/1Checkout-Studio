
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { salesService } from '../services/salesService'; 
import { productService } from '../services/productService';
import { Sale, SaleProductItem, Product, UpsellOffer, PaymentStatus, PushInPayPixRequest, PushInPayPixResponseData, PushInPayPixResponse } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircleIcon, DocumentDuplicateIcon, MOCK_WEBHOOK_URL } from '../constants.tsx'; // MODIFICADO DE @/constants.tsx
import { pushInPayService } from '../services/pushinPayService'; 
import { Input } from '../components/ui/Input'; // Added missing import


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

      // Corrected call: Pass mainSaleDetails.platformUserId as the second argument
      const response = await pushInPayService.generatePixCharge(upsellPixPayload, mainSaleDetails.platformUserId);

      if (response.success && response.data && response.data.id){
        setUpsellPixData(response.data);
        // Add logic to update the mainSaleDetails with upsellPushInPayTransactionId if needed
        // This usually happens after payment confirmation of upsell.
        // For now, we just show the PIX.
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro!</h1>
          <p className="text-neutral-700 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} variant="primary">Voltar para Home</Button>
        </Card>
      </div>
    );
  }
  
  if (!mainSaleDetails) {
     return <div className="flex justify-center items-center h-screen"><p>Pedido não encontrado.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-light to-secondary-light flex flex-col items-center justify-center p-6 text-center">
      <Card className="max-w-lg w-full shadow-2xl bg-white/95 backdrop-blur-sm">
        <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-5" />
        <h1 className="text-3xl font-extrabold text-neutral-800 mb-3">Obrigado pela sua compra!</h1>
        <p className="text-neutral-600 mb-2">
          Seu pedido <strong className="text-primary">#{mainSaleDetails.id.split('_').pop()}</strong> foi confirmado.
        </p>
        <p className="text-neutral-600 mb-6">
          Você receberá um e-mail em breve com os detalhes e acesso ao seu produto.
        </p>
        
        <div className="my-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-left">
            <h2 className="text-lg font-semibold text-neutral-700 mb-3">Resumo do Pedido:</h2>
            {mainSaleDetails.products.map(item => (
                <div key={item.productId} className="flex justify-between items-center py-1.5 border-b border-neutral-100 last:border-b-0">
                    <span className="text-sm text-neutral-600">{item.name} (x{item.quantity})</span>
                    <span className="text-sm font-medium text-neutral-700">{formatCurrency(item.priceInCents)}</span>
                </div>
            ))}
             {mainSaleDetails.discountAppliedInCents && mainSaleDetails.discountAppliedInCents > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 text-sm">
                    <span className="text-red-500">Desconto ({mainSaleDetails.couponCodeUsed}):</span>
                    <span className="text-red-500 font-medium">-{formatCurrency(mainSaleDetails.discountAppliedInCents)}</span>
                </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-1">
                <span className="text-md font-bold text-neutral-800">Total Pago:</span>
                <span className="text-md font-bold text-primary">{formatCurrency(mainSaleDetails.totalAmountInCents)}</span>
            </div>
        </div>

        <Button onClick={() => navigate('/dashboard')} variant="primary" className="w-full sm:w-auto">
          Ir para Meus Produtos
        </Button>
        <Link to="/" className="block mt-4 text-sm text-neutral-500 hover:text-primary hover:underline">
          Voltar para o início
        </Link>
      </Card>
      
      {showUpsellModal && upsellOffer && upsellProductPrice !== null && (
        <Modal isOpen={showUpsellModal} onClose={handleDeclineUpsell} title="Oferta Especial Para Você!" size="lg">
            {!upsellPixData ? (
                <>
                    <h2 className="text-2xl font-bold text-primary mb-3">{upsellOffer.name}</h2>
                    {upsellOffer.imageUrl && <img src={upsellOffer.imageUrl} alt={upsellOffer.name} className="rounded-lg mb-4 max-h-60 mx-auto shadow"/>}
                    <p className="text-neutral-600 mb-4">{upsellOffer.description}</p>
                    <p className="text-2xl font-extrabold text-neutral-800 mb-6">
                        Apenas <span className="text-green-600">{formatCurrency(upsellProductPrice)}</span> adicionais!
                    </p>
                    {upsellErrorMessage && <p className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded">{upsellErrorMessage}</p>}
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Button onClick={handleAcceptUpsell} variant="primary" size="lg" isLoading={isProcessingUpsell} className="flex-1">Sim, Eu Quero!</Button>
                        <Button onClick={handleDeclineUpsell} variant="ghost" size="lg" className="flex-1">Não, obrigado.</Button>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-neutral-700 mb-3">Pague o PIX para adicionar <span className="text-primary">{upsellOffer.name}</span>!</h2>
                    <img src={upsellPixData.qr_code_base64} alt="Upsell PIX QR Code" className="mx-auto my-3 border rounded-lg shadow-sm max-w-[200px] w-full"/>
                    <div className="my-3">
                        <Input readOnly value={upsellPixData.qr_code} className="text-xs text-center" />
                        <Button onClick={copyUpsellPixCode} className="mt-1 w-full !bg-primary !text-white" disabled={isProcessingUpsell}>
                            {copySuccessUpsell ? "Copiado!" : "Copiar Código PIX"}
                        </Button>
                    </div>
                    <p className="text-lg font-semibold text-primary">Total Upsell: {formatCurrency(upsellPixData.value)}</p>
                    <p className="text-xs text-neutral-500 mt-3">Após o pagamento, o produto será adicionado ao seu pedido.</p>
                    <Button onClick={handleDeclineUpsell} variant="ghost" className="mt-4">Fechar</Button>
                </div>
            )}
        </Modal>
      )}
      <footer className="mt-10 text-center text-xs text-white/80">
          <p>&copy; {new Date().getFullYear()} {originalProductDetails?.name || mainSaleDetails.products[0]?.name}. Todos os direitos reservados.</p>
          <p>Uma experiência de checkout por <a href="https://1checkout.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">1Checkout</a></p>
      </footer>
    </div>
  );
};
