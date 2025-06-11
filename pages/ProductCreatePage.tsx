
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { Product, ProductCheckoutCustomization, OrderBumpOffer, UpsellOffer, Coupon } from '../types';
import { productService } from '../services/productService';
import { Button, ToggleSwitch } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { COLOR_PALETTE_OPTIONS, TrashIcon, PlusIcon } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { MiniEditor } from '../components/shared/MiniEditor';
import { CouponFormModal } from '../components/shared/CouponFormModal';

const defaultCheckoutCustomization: ProductCheckoutCustomization = {
  primaryColor: COLOR_PALETTE_OPTIONS[0].value,
  logoUrl: '',
  videoUrl: '',
  salesCopy: '',
  testimonials: [],
  guaranteeBadges: [],
  countdownTimer: {
    enabled: false,
    durationMinutes: 15,
    messageBefore: 'Oferta expira em:',
    messageAfter: 'Oferta expirada!',
    backgroundColor: '#EF4444', // red-500
    textColor: '#FFFFFF',
  },
};

export const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [checkoutCustomization, setCheckoutCustomization] = useState<ProductCheckoutCustomization>(defaultCheckoutCustomization);

  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [orderBump, setOrderBump] = useState<OrderBumpOffer | undefined>(undefined);
  const [upsell, setUpsell] = useState<UpsellOffer | undefined>(undefined);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);


  const fetchUserProducts = useCallback(async () => {
    if (!accessToken) return;
    setIsFetchingProducts(true);
    try {
      const products = await productService.getProducts(accessToken);
      setUserProducts(products);
    } catch (err) {
      console.error("Failed to fetch user products for bump/upsell selection", err);
      setError("Falha ao carregar lista de produtos para ofertas.");
    } finally {
      setIsFetchingProducts(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUserProducts();
  }, [fetchUserProducts]);


  const handleCustomizationChange = <K extends keyof ProductCheckoutCustomization, V extends ProductCheckoutCustomization[K]>(
    field: K,
    value: V
  ) => {
    setCheckoutCustomization(prev => ({ ...prev, [field]: value }));
  };

  const handleCountdownTimerChange = <K extends keyof NonNullable<ProductCheckoutCustomization['countdownTimer']>>(
    field: K,
    value: NonNullable<ProductCheckoutCustomization['countdownTimer']>[K]
  ) => {
    setCheckoutCustomization(prev => ({
      ...prev,
      countdownTimer: {
        ...(prev.countdownTimer || defaultCheckoutCustomization.countdownTimer!),
        [field]: value,
      }
    }));
  };


  const handleSalesCopyChange = (html: string) => handleCustomizationChange('salesCopy', html);

  const addGuaranteeBadge = () => handleCustomizationChange('guaranteeBadges', [...(checkoutCustomization.guaranteeBadges || []), { id: `badge_${Date.now()}`, imageUrl: '', altText: '' }]);
  const updateGuaranteeBadge = (id: string, field: 'imageUrl' | 'altText', value: string) => handleCustomizationChange('guaranteeBadges', (checkoutCustomization.guaranteeBadges || []).map(b => b.id === id ? { ...b, [field]: value } : b));
  const removeGuaranteeBadge = (id: string) => handleCustomizationChange('guaranteeBadges', (checkoutCustomization.guaranteeBadges || []).filter(b => b.id !== id));

  const handleOfferProductSelect = (type: 'bump' | 'upsell', productId: string) => {
    const selectedProduct = userProducts.find(p => p.id === productId);
    if (!selectedProduct) {
        if (type === 'bump') setOrderBump(undefined);
        else setUpsell(undefined);
        return;
    }

    const offerData = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description.substring(0, 100) + (selectedProduct.description.length > 100 ? '...' : ''),
      customPriceInCents: selectedProduct.priceInCents,
      imageUrl: selectedProduct.imageUrl || selectedProduct.checkoutCustomization?.logoUrl || '',
    };

    if (type === 'bump') setOrderBump(offerData);
    else setUpsell(offerData);
  };

  const handleOfferPriceChange = (type: 'bump' | 'upsell', priceStr: string) => {
    const priceNum = Math.round(parseFloat(priceStr.replace(',', '.')) * 100);
    if (type === 'bump' && orderBump) setOrderBump(prev => prev ? { ...prev, customPriceInCents: isNaN(priceNum) ? prev.customPriceInCents : priceNum } : undefined);
    else if (type === 'upsell' && upsell) setUpsell(prev => prev ? { ...prev, customPriceInCents: isNaN(priceNum) ? prev.customPriceInCents : priceNum } : undefined);
  };

  const removeOffer = (type: 'bump' | 'upsell') => {
    if (type === 'bump') setOrderBump(undefined);
    else setUpsell(undefined);
  };

  const openCouponModal = (coupon?: Coupon) => {
    setEditingCoupon(coupon || null);
    setIsCouponModalOpen(true);
  };
  const closeCouponModal = () => {
    setEditingCoupon(null);
    setIsCouponModalOpen(false);
  };
  const saveCoupon = (couponData: Coupon) => {
    if (editingCoupon) {
      setCoupons(prev => prev.map(c => c.id === couponData.id ? couponData : c));
    } else {
      setCoupons(prev => [...prev, { ...couponData, id: `coupon_${Date.now()}` }]);
    }
    closeCouponModal();
  };
  const deleteCoupon = (couponId: string) => setCoupons(prev => prev.filter(c => c.id !== couponId));


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!productName.trim() || !description.trim() || !price) {
      setError('Por favor, preencha nome, descrição e preço.');
      return;
    }
    const priceInCentsNum = Math.round(parseFloat(price.replace(',', '.')) * 100);
    if (isNaN(priceInCentsNum) || priceInCentsNum <= 0) {
      setError('Por favor, insira um preço válido.');
      return;
    }

    setIsLoading(true);
    try {
      const productData: Omit<Product, 'id' | 'platformUserId' | 'totalSales' | 'clicks' | 'checkoutViews' | 'conversionRate' | 'abandonmentRate' | 'slug'> = {
        name: productName, description, priceInCents: priceInCentsNum,
        imageUrl: imageUrl.trim(), // Envia string vazia se limpo, serviço converterá para null
        deliveryUrl: deliveryUrl.trim(), // Envia string vazia se limpo, serviço converterá para null
        checkoutCustomization,
        orderBump: orderBump?.productId ? orderBump : undefined,
        upsell: upsell?.productId ? upsell : undefined,
        coupons: coupons.length > 0 ? coupons : undefined,
      };
      await productService.createProduct(productData, accessToken);
      navigate('/produtos');
    } catch (err) {
      setError('Falha ao criar produto. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingProducts && userProducts.length === 0) {
      return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /><p className="ml-2 text-neutral-300">Carregando produtos...</p></div>;
  }

  const countdownDurations = [
    { label: 'Nenhum', value: 0 }, { label: '5 minutos', value: 5 }, { label: '10 minutos', value: 10 },
    { label: '15 minutos', value: 15 }, { label: '20 minutos', value: 20 }, { label: '30 minutos', value: 30 },
    { label: '60 minutos', value: 60 },
  ];

  const orderBumpSelectValue = orderBump ? orderBump.productId : "";
  const upsellSelectValue = upsell ? upsell.productId : "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-neutral-100">Criar Novo Produto</h1>
        <Button variant="ghost" onClick={() => navigate('/produtos')}>Voltar</Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Detalhes do Produto">
              <div className="space-y-4">
                <Input label="Nome do Produto" name="productName" value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="Ex: Curso de Marketing Digital" />
                <Textarea label="Descrição" name="description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Descreva seu produto..." rows={5}/>
                <Input label="Preço (R$)" name="price" type="text" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Ex: 97,00"/>
                <Input label="URL da Imagem Principal do Produto (Opcional)" name="imageUrl" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem-produto.jpg"/>
                <Input label="URL de Entrega (Opcional)" name="deliveryUrl" type="url" value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} placeholder="https://seusite.com/acesso"/>
              </div>
            </Card>

            <Card title="Oferta Adicional (Order Bump)">
              {orderBump ? (
                <div className="space-y-3 p-3 border border-neutral-700 rounded-md bg-neutral-700/30">
                  <p className="font-medium text-neutral-100">Produto selecionado: <span className="text-primary">{orderBump.name}</span></p>
                  <Input label="Preço Customizado do Order Bump (R$)" type="text" value={orderBump.customPriceInCents !== undefined ? (orderBump.customPriceInCents / 100).toFixed(2).replace('.', ',') : ''} onChange={(e) => handleOfferPriceChange('bump', e.target.value)} placeholder="Deixe em branco para usar preço original"/>
                  <Button type="button" variant="danger" size="sm" onClick={() => removeOffer('bump')}>Remover Order Bump</Button>
                </div>
              ) : (
                <div className="space-y-2"><label htmlFor="orderBumpProduct" className="block text-sm font-medium text-neutral-300">Selecionar Produto para Order Bump:</label>
                  <select id="orderBumpProduct" onChange={(e) => handleOfferProductSelect('bump', e.target.value)} className="block w-full p-2.5 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150 bg-neutral-800 border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400" value={orderBumpSelectValue} disabled={isFetchingProducts || userProducts.length === 0}>
                    <option value="">Nenhum (Sem Order Bump)</option>
                    {userProducts.filter(p => p.name !== productName).map(p => <option key={p.id} value={p.id}>{p.name} (R$ {(p.priceInCents/100).toFixed(2).replace('.',',')})</option>)}
                  </select>
                  {userProducts.length === 0 && !isFetchingProducts && <p className="text-xs text-neutral-400">Crie outros produtos para selecioná-los aqui.</p>}
                </div>
              )}
            </Card>

            <Card title="Oferta Pós-Compra (Upsell)">
             {upsell ? (
                <div className="space-y-3 p-3 border border-neutral-700 rounded-md bg-neutral-700/30">
                  <p className="font-medium text-neutral-100">Produto selecionado: <span className="text-primary">{upsell.name}</span></p>
                  <Input label="Preço Customizado do Upsell (R$)" type="text" value={upsell.customPriceInCents !== undefined ? (upsell.customPriceInCents / 100).toFixed(2).replace('.', ',') : ''} onChange={(e) => handleOfferPriceChange('upsell', e.target.value)} placeholder="Deixe em branco para usar preço original"/>
                  <Button type="button" variant="danger" size="sm" onClick={() => removeOffer('upsell')}>Remover Upsell</Button>
                </div>
              ) : (
                <div className="space-y-2"><label htmlFor="upsellProduct" className="block text-sm font-medium text-neutral-300">Selecionar Produto para Upsell:</label>
                  <select id="upsellProduct" onChange={(e) => handleOfferProductSelect('upsell', e.target.value)} className="block w-full p-2.5 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150 bg-neutral-800 border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400" value={upsellSelectValue} disabled={isFetchingProducts || userProducts.length === 0}>
                    <option value="">Nenhum (Sem Upsell)</option>
                    {userProducts.filter(p => p.name !== productName && p.id !== orderBump?.productId).map(p => <option key={p.id} value={p.id}>{p.name} (R$ {(p.priceInCents/100).toFixed(2).replace('.',',')})</option>)}
                  </select>
                   {userProducts.length === 0 && !isFetchingProducts && <p className="text-xs text-neutral-400">Crie outros produtos para selecioná-los aqui.</p>}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card title="Personalização do Checkout">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-neutral-300 mb-1">Cor Principal</label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PALETTE_OPTIONS.map(color => (<button key={color.value} type="button" title={color.name} onClick={() => handleCustomizationChange('primaryColor', color.value)} className={`h-8 w-full rounded border-2 ${checkoutCustomization.primaryColor === color.value ? 'ring-2 ring-offset-1 ring-neutral-900 border-neutral-900' : 'border-transparent hover:border-neutral-600'}`} style={{ backgroundColor: color.value }} /> ))}
                  </div>
                  <Input name="customColor" type="color" value={checkoutCustomization.primaryColor} onChange={(e) => handleCustomizationChange('primaryColor', e.target.value)} className="mt-2 h-10"/>
                </div>
                <Input label="URL do Logo Pequeno (Checkout)" name="logoUrl" value={checkoutCustomization.logoUrl || ''} onChange={(e) => handleCustomizationChange('logoUrl', e.target.value)} placeholder="https://exemplo.com/logo.png"/>
                <Input label="URL do Vídeo (YouTube Embed)" name="videoUrl" value={checkoutCustomization.videoUrl || ''} onChange={(e) => handleCustomizationChange('videoUrl', e.target.value)} placeholder="https://youtube.com/embed/..."/>
                <div><label className="block text-sm font-medium text-neutral-300 mb-1">Copy de Vendas</label><MiniEditor value={checkoutCustomization.salesCopy || ''} onChange={handleSalesCopyChange} placeholder="Sua copy persuasiva..."/></div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-300 mb-2">Selos de Garantia</h4>
                  {(checkoutCustomization.guaranteeBadges || []).map((badge, index) => (
                    <Card key={badge.id} className="mb-3 p-3 bg-neutral-700/50 border-neutral-600">
                        <Input label={`URL Imagem Selo ${index + 1}`} value={badge.imageUrl} onChange={(e) => updateGuaranteeBadge(badge.id, 'imageUrl', e.target.value)} placeholder="https://exemplo.com/selo.png" className="mb-2"/>
                        <Input label={`Texto Alt Selo ${index + 1}`} value={badge.altText} onChange={(e) => updateGuaranteeBadge(badge.id, 'altText', e.target.value)} placeholder="Descrição do selo" className="mb-2"/>
                        <Button type="button" variant="danger" size="sm" onClick={() => removeGuaranteeBadge(badge.id)}>Remover</Button>
                    </Card>
                  ))} 
                  <Button type="button" variant="secondary" size="sm" onClick={addGuaranteeBadge} leftIcon={<PlusIcon className="h-4 w-4" />}>Adicionar Selo</Button>
                </div>
                <div className="pt-4 border-t border-neutral-700">
                  <h4 className="text-md font-semibold text-neutral-100 mb-3">Cronômetro de Escassez</h4>
                  <ToggleSwitch label="Habilitar Cronômetro" enabled={checkoutCustomization.countdownTimer?.enabled || false} onChange={(isEnabled) => handleCountdownTimerChange('enabled', isEnabled)}/>
                  {checkoutCustomization.countdownTimer?.enabled && (
                    <div className="space-y-3 mt-3 pl-2 border-l-2 border-neutral-600">
                       <div><label htmlFor="countdownDuration" className="block text-sm font-medium text-neutral-300 mb-1">Duração do Cronômetro</label>
                        <select id="countdownDuration" value={checkoutCustomization.countdownTimer.durationMinutes || 15} onChange={(e) => handleCountdownTimerChange('durationMinutes', parseInt(e.target.value))} className="mt-1 block w-full p-2.5 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150 bg-neutral-800 border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400">
                          {countdownDurations.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                        </select>
                      </div>
                      <Textarea label="Mensagem Antes do Cronômetro (Opcional)" value={checkoutCustomization.countdownTimer.messageBefore || ''} onChange={(e) => handleCountdownTimerChange('messageBefore', e.target.value)} rows={2}/>
                      <Textarea label="Mensagem Após Expirar (Opcional)" value={checkoutCustomization.countdownTimer.messageAfter || ''} onChange={(e) => handleCountdownTimerChange('messageAfter', e.target.value)} rows={2}/>
                      <div className="flex space-x-2">
                        <Input label="Cor Fundo (Opc)" type="color" value={checkoutCustomization.countdownTimer.backgroundColor || '#EF4444'} onChange={(e) => handleCountdownTimerChange('backgroundColor', e.target.value)} className="h-10 w-1/2"/>
                        <Input label="Cor Texto (Opc)" type="color" value={checkoutCustomization.countdownTimer.textColor || '#FFFFFF'} onChange={(e) => handleCountdownTimerChange('textColor', e.target.value)} className="h-10 w-1/2"/>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Cupons de Desconto">
              <div className="space-y-3">
                {coupons.length === 0 && <p className="text-sm text-neutral-400">Nenhum cupom adicionado.</p>}
                {coupons.map(coupon => (
                  <div key={coupon.id} className="p-3 border border-neutral-700 rounded-md bg-neutral-700/50 flex justify-between items-center">
                    <div><p className="font-semibold text-primary">{coupon.code}</p>
                      <p className="text-xs text-neutral-300">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `R$ ${(coupon.discountValue/100).toFixed(2)} OFF`}
                        {coupon.isAutomatic && <span className="ml-1 text-green-400">(Automático)</span>}
                      </p>
                    </div>
                    <div className="space-x-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openCouponModal(coupon)}>Editar</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => deleteCoupon(coupon.id)} className="text-red-400"><TrashIcon className="h-4 w-4"/></Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => openCouponModal()} leftIcon={<PlusIcon className="h-5 w-5"/>} className="w-full">Adicionar Cupom</Button>
              </div>
            </Card>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-400 text-center p-3 bg-red-800/20 rounded-md border border-red-600/50">{error}</p>}

        <div className="mt-8 flex justify-end space-x-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/produtos')} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={isLoading} size="lg">Salvar Produto</Button>
        </div>
      </form>

      {isCouponModalOpen &&
        <CouponFormModal isOpen={isCouponModalOpen} onClose={closeCouponModal} onSave={saveCoupon} existingCoupon={editingCoupon}/>
      }
    </div>
  );
};
