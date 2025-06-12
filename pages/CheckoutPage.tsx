// Caminho: pages/CheckoutPage.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { Product, PaymentStatus, PushInPayPixResponse } from '../types';
import { productService } from '../services/productService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { MOCK_WEBHOOK_URL } from '../constants';

const formatCurrency = (valueInCents: number): string => {
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
};

export const CheckoutPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');

    const [pixData, setPixData] = useState<any | null>(null);

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

        if (!product || !customerName.trim() || !customerEmail.trim()) {
            setError("Por favor, preencha todos os campos.");
            setIsSubmitting(false);
            return;
        }

        const pixPayload = {
            value: product.priceInCents,
            webhook_url: MOCK_WEBHOOK_URL,
            customerName,
            customerEmail,
            products: [{ id: product.id, name: product.name, quantity: 1, priceInCents: product.priceInCents }],
        };

        try {
            console.log("Invocando a Edge Function 'gerar-pix'...");

            const { data: functionResponse, error: functionError } = await supabase.functions.invoke<PushInPayPixResponse>('gerar-pix', {
                body: JSON.stringify({
                    payload: pixPayload,
                    productOwnerUserId: product.platformUserId
                })
            });

            if (functionError) throw new Error(functionError.message);

            if (functionResponse.success && functionResponse.data) {
                setPixData(functionResponse.data);
            } else {
                throw new Error(functionResponse.message || "A resposta da função não continha os dados do PIX.");
            }

        } catch (err: any) {
            console.error("Erro no fluxo de pagamento:", err);
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    if (error && !pixData) return <div className="text-center p-8"><p className="text-red-500 mb-4">{error}</p><Button onClick={() => window.location.reload()}>Tentar Novamente</Button></div>;
    if (!product) return <div className="text-center p-8">Produto não encontrado.</div>;

    if (pixData) {
        return (
            <div className="text-center p-8 max-w-lg mx-auto">
                <h2 className="text-2xl font-bold mb-4">Pague com PIX para Finalizar</h2>
                <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="PIX QR Code" className="mx-auto border p-2 rounded-lg" />
                <p className="mt-4 font-semibold">ou copie o código:</p>
                <Input readOnly value={pixData.qr_code} className="text-center mt-2" />
                <p className="text-sm mt-4 text-gray-500">Aguardando pagamento...</p>
                {/* A lógica de polling para verificar o status e redirecionar para a página de obrigado entraria aqui */}
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl font-semibold mb-6">{formatCurrency(product.priceInCents)}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-semibold">Seus Dados</h2>
                <Input label="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                <Input label="E-mail Principal" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                <Button type="submit" isLoading={isSubmitting} className="w-full text-lg py-3">
                    Pagar com PIX
                </Button>
            </form>
        </div>
    );
};