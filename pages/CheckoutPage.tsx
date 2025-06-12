// Caminho: pages/CheckoutPage.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Product, PaymentStatus, Coupon, PushInPayPixResponse, AppSettings, PlatformSettings, SaleProductItem, Sale } from '../types';
import { productService } from '../services/productService';
import { abandonedCartService } from '../services/abandonedCartService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircleIcon, PHONE_COUNTRY_CODES, DocumentDuplicateIcon, TagIcon, MOCK_WEBHOOK_URL } from '../constants';
import { settingsService } from '../services/settingsService';
import { salesService } from '../services/salesService';
import { utmifyService } from '../services/utmifyService';
import { supabase } from '../supabaseClient';

// ... (componentes de ícone e funções de formatação podem ser mantidos aqui)

export const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<Product | null>(null);
  // ... (outros estados como customerName, email, etc., são mantidos)
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<any | null>(null); // para guardar a resposta do PIX

  // ... (toda a lógica de useEffect para buscar produto, calcular preço, etc., pode ser mantida)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validações de formulário (nome, email, etc.)
    if (!product || /* outras validações */) {
      setError("Por favor, preencha todos os campos.");
      setIsSubmitting(false);
      return;
    }
    
    // Monta o payload para enviar para a Edge Function
    const pixPayload = {
      value: finalPrice, // finalPrice calculado pelos seus useEffects
      webhook_url: MOCK_WEBHOOK_URL,
      // ... outros campos do payload como customerName, products, etc.
    };

    try {
      // **A CHAMADA FINAL E CORRETA**
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
          setPixData(functionResponse.data); // Seta o estado para mostrar o QR Code
      } else {
          throw new Error(functionResponse.message || "A resposta da função não continha os dados do PIX.");
      }

    } catch (err: any) {
        console.error("Erro ao chamar a Edge Function 'gerar-pix':", err);
        setError(err.message || "Ocorreu um erro desconhecido ao gerar o PIX.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // ... (o resto do seu componente JSX para renderizar o formulário ou a tela do PIX)
  
  // O JSX que mostra o QR Code vai ler de `pixData.qr_code_base64`
  // O JSX que mostra o copia e cola vai ler de `pixData.qr_code`

  return (
    // ... seu JSX aqui ...
  );
};