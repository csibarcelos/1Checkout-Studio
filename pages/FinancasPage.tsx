
import React from 'react';
import { Card } from '../components/ui/Card';
import { CreditCardIcon } from '../constants';

export const FinancasPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-800">Finanças</h1>
      <Card className="text-center py-20">
        <CreditCardIcon className="h-24 w-24 text-neutral-300 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-neutral-700 mb-3">Controle Financeiro Total</h2>
        <p className="text-neutral-500 max-w-md mx-auto">
          Acompanhe seu saldo, valores pendentes, realize retiradas e visualize seu extrato detalhado.
          Sua gestão financeira completa, em breve nesta tela.
        </p>
        <div className="mt-8">
          <span className="inline-block bg-yellow-200 text-yellow-800 text-sm font-semibold px-4 py-2 rounded-full">
            EM BREVE
          </span>
        </div>
      </Card>
    </div>
  );
};
