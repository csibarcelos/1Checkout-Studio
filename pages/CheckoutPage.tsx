// Caminho: pages/CheckoutPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { Product, PushInPayPixResponse } from '../types';
import { productService } from '../services/productService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase } from '../lib/supabase'; // IMPORTANTE: Garantindo a importação correta

export const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<any | null>(null);

  // Estados do formulário
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) {
        setError("Produto não especificado.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const fetchedProduct = await productService.getProductBySlug(slug, null);
        if (fetchedProduct) {
          setProduct(fetchedProduct);
        } else {
          setError("Produto não encontrado.");
        }
      } catch (err: any) {
        setError(err.message || "Falha ao carregar o produto.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!product || !customerName || !customerEmail) {
      setError("Por favor, preencha todos os campos.");
      setIsSubmitting(false);
      return;
    }

    const pixPayload = {
      value: product.priceInCents,
      customerName,
      customerEmail,
      products: [{ productId: product.id, name: product.name, quantity: 1, priceInCents: product.priceInCents }],
      // Adicione outros campos do payload conforme necessário
    };

    try {
      console.log("Invocando a Edge Function 'gerar-pix'...");

      const { data: functionResponse, error: functionError } = await supabase.functions.invoke<PushInPayPixResponse>('gerar-pix', {
        body: {
          payload: pixPayload,
          productOwnerUserId: product.platformUserId
        }
      });

      if (functionError) throw functionError;

      if (functionResponse.success && functionResponse.data) {
        setPixData(functionResponse.data);
      } else {
        throw new Error(functionResponse.message || "Resposta da função não continha os dados do PIX.");
      }

    } catch (err: any) {
      console.error("Erro ao invocar a função 'gerar-pix':", err);
      setError(err.message || "Ocorreu um erro desconhecido ao gerar o PIX.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;

  if (error && !pixData) return (
    <div className="text-center p-8">
      <p className="text-red-500 mb-4">{error}</p>
      <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
    </div>
  );
  
  if (!product) return <div className="text-center p-8">Produto não encontrado.</div>;
  
  if (pixData) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Pague com PIX para Finalizar</h2>
        <img src={pixData.qr_code_base64} alt="PIX QR Code" className="mx-auto border p-2" />
        <p className="mt-4">Ou copie o código:</p>
        <Input readOnly value={pixData.qr_code} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">{product.name}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <Input label="E-mail Principal" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Pagar com PIX (R$ {(product.priceInCents / 100).toFixed(2)})
        </Button>
      </form>
    </div>
  );
};