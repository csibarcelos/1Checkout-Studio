
import React from 'react';
import { Link } from "react-router-dom";
import { Button } from '../components/ui/Button';
import { AppLogoIcon, CheckCircleIcon } from '../constants'; 

export const HomePage: React.FC = () => {
  const testimonials = [
    { id: 1, name: "Ana Silva", role: "Empreendedora Digital", quote: "Esta plataforma revolucionou minhas vendas online! O checkout é rápido e a personalização é incrível.", avatar: "https://i.pravatar.cc/100?u=ana" },
    { id: 2, name: "Carlos Pereira", role: "Infoprodutor", quote: "Finalmente uma solução completa que entende as necessidades de quem vende na internet. O rastreamento UTM é perfeito!", avatar: "https://i.pravatar.cc/100?u=carlos" },
    { id: 3, name: "Juliana Costa", role: "Dona de E-commerce", quote: "A integração PIX é muito eficiente e as métricas do dashboard me ajudam a tomar decisões mais assertivas.", avatar: "https://i.pravatar.cc/100?u=juliana" },
  ];

  const features = [
    { name: "Checkout Otimizado", description: "Máxima conversão com PIX facilitado e personalização total.", icon: CheckCircleIcon },
    { name: "Taxas Justas: R$1 + 1%", description: "Sem mensalidades ou taxas escondidas. Pague apenas pelo que vender.", icon: CheckCircleIcon },
    { name: "Personalização Total", description: "Deixe o checkout com a cara da sua marca em minutos.", icon: CheckCircleIcon },
    { name: "Rastreamento Avançado", description: "UTMify integrado para dados precisos de suas campanhas.", icon: CheckCircleIcon },
    { name: "Gestão Simplificada", description: "Acompanhe suas vendas e clientes de forma intuitiva.", icon: CheckCircleIcon },
    { name: "Segurança e Confiança", description: "Ambiente seguro para você e seus clientes.", icon: CheckCircleIcon },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      {/* Header */}
      <header className="py-4 shadow-md bg-neutral-800 sticky top-0 z-50 border-b border-neutral-700">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center group">
            <AppLogoIcon className="h-9 w-auto group-hover:opacity-80 transition-opacity" />
            <span className="ml-3 text-2xl font-bold text-primary group-hover:text-primary-light transition-colors">1Checkout</span>
          </Link>
          <nav>
            <Link to="/auth" className="text-neutral-300 hover:text-primary mr-6 font-medium">Login</Link>
            <Button to="/auth?register=true" variant="primary" size="md">
              Criar Conta Grátis
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-neutral-900 text-neutral-100">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight text-neutral-100">
            1Checkout: Sua Venda, <span className="text-primary">Seu Lucro.</span> <span className="block md:inline">Simples Assim.</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-300 mb-10 max-w-3xl mx-auto">
            Cansado de taxas abusivas? Com 1Checkout, você paga apenas R$1 + 1% por venda. Crie checkouts de alta conversão, personalizados e com rastreamento completo. Venda mais, pague menos.
          </p>
          <Button to="/auth?register=true" variant="primary" size="lg" className="text-lg px-10 py-4">
            Comece Agora por Apenas R$1 + 1%
          </Button>
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="aspect-video bg-neutral-800 rounded-xl shadow-2xl flex items-center justify-center cursor-pointer group hover:bg-neutral-700 transition-all border border-neutral-700">
              <svg className="w-20 h-20 text-neutral-400 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-neutral-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100">Tudo o que Você Precisa, <span className="text-primary">Sem Complicação</span></h2>
            <p className="mt-4 text-lg text-neutral-300 max-w-2xl mx-auto">
              Nossa plataforma foi desenhada para simplificar sua operação e impulsionar seus resultados com taxas justas.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.name} className="bg-neutral-700/70 p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-neutral-600">
                <feature.icon className="h-10 w-10 text-primary mb-5" />
                <h3 className="text-xl font-semibold text-neutral-100 mb-3">{feature.name}</h3>
                <p className="text-neutral-300 text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-neutral-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-100">Aprovado por Quem <span className="text-primary">Vende de Verdade</span></h2>
            <p className="mt-4 text-lg text-neutral-300">Resultados reais de quem já confia na 1Checkout.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-neutral-800 p-8 rounded-xl shadow-xl hover:shadow-xl transition-shadow duration-300 flex flex-col border border-neutral-700">
                <img className="w-20 h-20 rounded-full mx-auto mb-6 border-4 border-primary-dark" src={testimonial.avatar} alt={testimonial.name} />
                <p className="text-neutral-300 italic mb-6 text-center flex-grow">"{testimonial.quote}"</p>
                <div className="text-center mt-auto">
                  <h4 className="font-semibold text-lg text-primary">{testimonial.name}</h4>
                  <p className="text-neutral-400 text-sm">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-neutral-900">Pronto para Lucrar de Verdade com Suas Vendas?</h2>
          <p className="text-lg md:text-xl text-neutral-800 mb-10 max-w-2xl mx-auto">
            Com 1Checkout, você fica com a maior parte. Taxas justas de R$1 + 1% por transação. Sem surpresas, sem pegadinhas. Crie sua conta!
          </p>
          {/* Button within yellow CTA section changed to secondary for contrast, or a custom class would be needed for yellow-on-yellow */}
          <Button to="/auth?register=true" variant="secondary" size="lg" className="text-lg px-12 py-4 bg-neutral-900 text-neutral-100 hover:bg-neutral-800">
            Criar Conta e Vender Mais
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-neutral-800 text-neutral-400 border-t border-neutral-700">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; {new Date().getFullYear()} 1Checkout. Todos os direitos reservados.</p>
          <p className="text-sm mt-2">Menos Taxas, Mais Lucro.</p>
        </div>
      </footer>
    </div>
  );
};