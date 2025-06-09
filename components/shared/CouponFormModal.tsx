
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { Coupon } from '../../types';

export interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (coupon: Coupon) => void;
  existingCoupon: Coupon | null;
}

export const CouponFormModal: React.FC<CouponFormModalProps> = ({ isOpen, onClose, onSave, existingCoupon }) => {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (isOpen) { 
      if (existingCoupon) {
        setCode(existingCoupon.code);
        setDescription(existingCoupon.description || '');
        setDiscountType(existingCoupon.discountType);
        setDiscountValue(existingCoupon.discountType === 'fixed' ? (existingCoupon.discountValue/100).toFixed(2) : existingCoupon.discountValue.toString());
        setIsActive(existingCoupon.isActive);
        setIsAutomatic(existingCoupon.isAutomatic);
        setMaxUses(existingCoupon.maxUses?.toString() || '');
        setExpiresAt(existingCoupon.expiresAt ? existingCoupon.expiresAt.split('T')[0] : '');
      } else {
        setCode(''); setDescription(''); setDiscountType('percentage'); setDiscountValue('');
        setIsActive(true); setIsAutomatic(false); setMaxUses(''); setExpiresAt('');
      }
      setModalError('');
    }
  }, [existingCoupon, isOpen]);

  const handleSaveCoupon = () => {
    setModalError('');
    if (!code.trim()) { setModalError("Código do cupom é obrigatório."); return; }
    if (!discountValue.trim()) { setModalError("Valor do desconto é obrigatório."); return; }

    const parsedDiscountValue = parseFloat(discountValue.replace(',', '.'));
    if (isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
      setModalError("Valor do desconto inválido."); return;
    }
    
    const finalDiscountValue = discountType === 'fixed' ? Math.round(parsedDiscountValue * 100) : parsedDiscountValue;
    if (discountType === 'percentage' && (finalDiscountValue <=0 || finalDiscountValue > 100)) {
      setModalError("Percentual de desconto deve ser entre 1 e 100."); return;
    }

    const couponData: Coupon = {
      id: existingCoupon?.id || `coupon_${Date.now()}`,
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      discountType,
      discountValue: finalDiscountValue,
      isActive,
      isAutomatic,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      uses: existingCoupon?.uses || 0,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };
    onSave(couponData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingCoupon ? "Editar Cupom" : "Adicionar Novo Cupom"}>
      <div className="space-y-4 text-neutral-300">
        <Input label="Código do Cupom (Ex: PROMO10)" value={code} onChange={e => setCode(e.target.value)} required />
        <Textarea label="Descrição (Interna, opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Ex: Cupom de lançamento para primeiros clientes"/>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="discountType" className="block text-sm font-medium text-neutral-300 mb-1">Tipo de Desconto</label>
            <select 
              id="discountType" 
              value={discountType} 
              onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')} 
              className="mt-1 block w-full p-2.5 border rounded-md shadow-sm focus:outline-none sm:text-sm transition-colors duration-150 bg-neutral-800 border-neutral-600 focus:border-primary focus:ring-2 focus:ring-primary/70 text-neutral-100 placeholder-neutral-400"
            >
              <option value="percentage">Porcentagem (%)</option>
              <option value="fixed">Valor Fixo (R$)</option>
            </select>
          </div>
          <Input label={`Valor ${discountType === 'percentage' ? '(%)' : '(R$)'}`} type="number" step="any" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required className="flex-1" />
        </div>
        <Input label="Máximo de Usos (Opcional)" type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Deixe em branco para ilimitado"/>
        <Input label="Data de Expiração (Opcional)" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} 
               className="bg-neutral-800 border-neutral-600 text-neutral-100 focus:border-primary focus:ring-primary/70 [&::-webkit-calendar-picker-indicator]:bg-neutral-500 [&::-webkit-calendar-picker-indicator]:rounded-sm"
        />

        <div className="flex items-center justify-between">
            <label htmlFor="isAutomatic" className="text-sm font-medium text-neutral-300 flex items-center">
                Aplicar automaticamente?
                <input type="checkbox" id="isAutomatic" checked={isAutomatic} onChange={e => setIsAutomatic(e.target.checked)} className="ml-2 h-4 w-4 text-primary border-neutral-500 rounded focus:ring-primary bg-neutral-700 focus:ring-offset-neutral-800"/>
            </label>
             <label htmlFor="isActive" className="text-sm font-medium text-neutral-300 flex items-center">
                Ativo?
                <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="ml-2 h-4 w-4 text-primary border-neutral-500 rounded focus:ring-primary bg-neutral-700 focus:ring-offset-neutral-800"/>
            </label>
        </div>
        {modalError && <p className="text-sm text-red-400 p-2 bg-red-800/20 rounded-md border border-red-600/50">{modalError}</p>}
        <div className="flex justify-end space-x-3 pt-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveCoupon}>Salvar Cupom</Button>
        </div>
      </div>
    </Modal>
  );
};