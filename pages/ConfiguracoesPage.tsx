
import React from 'react';
import { Card } from '../components/ui/Card';
import { CogIcon } from '../constants';

export const ConfiguracoesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-800">Configurações</h1>
      <Card className="text-center py-20">
        <CogIcon className="h-24 w-24 text-neutral-300 mx-auto mb-6 animate-spin-slow" />
        <h2 className="text-2xl font-semibold text-neutral-700 mb-3">Personalize Sua Plataforma</h2>
        <p className="text-neutral-500 max-w-md mx-auto">
          Configure seu domínio personalizado, identidade visual do checkout, SMTP para e-mails transacionais, tokens de API e muito mais.
          Todas as configurações da sua conta estarão aqui. Disponível em breve.
        </p>
        <style>{`
          .animate-spin-slow {
            animation: spin 3s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
         <div className="mt-8">
          <span className="inline-block bg-yellow-200 text-yellow-800 text-sm font-semibold px-4 py-2 rounded-full">
            EM BREVE
          </span>
        </div>
      </Card>
    </div>
  );
};
