import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Product, PaymentStatus, Coupon, AppSettings, PlatformSettings, SaleProductItem, PushInPayPixResponse, PushInPayPixResponseData } from '../types';
import { productService } from '../services/productService';
import { abandonedCartService, CreateAbandonedCartPayload } from '../services/abandonedCartService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircleIcon, PHONE_COUNTRY_CODES, DocumentDuplicateIcon, TagIcon, MOCK_WEBHOOK_URL, PLATFORM_NAME } from '../constants';
import { settingsService } from '../services/settingsService';
import { salesService } from '../services/salesService';
import { utmifyService } from '../services/utmifyService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

// Ícone e Funções Utilitárias
const LockClosedIconSolid: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
  </svg>
);

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

const formatPhoneNumberVisual = (digits: string): string => {
  if (!digits) return '';
  const cleaned = digits.replace(/\D/g, '');
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
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

export const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();

  // Estados do Componente
  const [product, setProduct] = useState<Product | null>(null);
  const [ownerAppSettings, setOwnerAppSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerWhatsappCountryCode, setCustomerWhatsappCountryCode] = useState(PHONE_COUNTRY_CODES[0].value);
  const [rawWhatsappNumber, setRawWhatsappNumber] = useState('');
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [pixData, setPixData] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  // Lógica para carregar o produto e as configurações
  useEffect(() => {
    const fetchProductData = async () => {
      if (!slug) {
        setError("Produto não encontrado.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const fetchedProduct = await productService.getProductBySlug(slug, accessToken);
        if (fetchedProduct) {
          setProduct(fetchedProduct);
          setFinalPrice(fetchedProduct.priceInCents); // Preço inicial

          // Busca as configurações do vendedor via RPC seguro
          const { data: settings, error: rpcError } = await supabase.rpc('get_public_app_settings', {
            user_id_param: fetchedProduct.platformUserId,
          });

          if (rpcError) throw rpcError;

          setOwnerAppSettings(settings);
          
        } else {
          setError("Produto não encontrado.");
        }
      } catch (err: any) {
        setError(err.message || "Falha ao carregar dados do produto.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductData();
  }, [slug, accessToken]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!product || !customerName.trim() || !customerEmail.trim() ) {
      setError("Por favor, preencha todos os campos.");
      setIsSubmitting(false);
      return;
    }
    
    // O payload que será enviado para a Edge Function
    const pixPayload = {
      value: finalPrice,
      customerName,
      customerEmail,
      // ... outros campos necessários do payload
    };

    try {
      console.log("Iniciando chamada para a Edge Function 'gerar-pix'...");

      const { data: functionResponse, error: functionError } = await supabase.functions.invoke<PushInPayPixResponse>('gerar-pix', {
          body: {
              payload: pixPayload,
              productOwnerUserId: product.platformUserId
          }
      });

      if (functionError) {
          throw functionError;
      }

      if (functionResponse.success && functionResponse.data) {
          console.log("Edge Function retornou com sucesso:", functionResponse.data);
          setPixData(functionResponse.data);
          setPaymentStatus(functionResponse.data.status);
      } else {
          throw new Error(functionResponse.message || "Falha ao gerar PIX.");
      }

    } catch (err: any) {
        console.error("Erro no fluxo de pagamento PIX:", err);
        setError(err.message || "Ocorreu um erro desconhecido ao gerar o PIX.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Lógica de renderização (JSX)
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
  }

  if (error && !pixData) {
      return (
          <div className="text-center p-8">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">Tentar Novamente</Button>
          </div>
      );
  }

  if (!product) {
    return <div className="text-center p-8">Produto não encontrado.</div>;
  }
  
  // Se pixData existir, mostra a tela do QR Code
  if (pixData) {
      return (
          <div className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">Pague com PIX</h2>
              <img src={pixData.qr_code_base64} alt="PIX QR Code" className="mx-auto" />
              <p className="mt-4">ou copie o código:</p>
              <Input readOnly value={pixData.qr_code} />
              {/* Adicionar lógica de polling e Thank You Page aqui */}
          </div>
      );
  }
  
  // Senão, mostra o formulário de checkout
  return (
    <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">{product.name}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Resumo do Pedido</h2>
            <p>Total: {formatCurrency(finalPrice ?? 0)}</p>
            <h2 className="text-xl font-semibold mt-6">Seus Dados</h2>
            <Input label="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            <Input label="E-mail Principal" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
            {/* Outros campos do formulário */}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
                Pagar com PIX {formatCurrency(finalPrice ?? 0)}
            </Button>
        </form>
    </div>
  );
};