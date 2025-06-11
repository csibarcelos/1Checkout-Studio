
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AppLogoIcon } from '../constants.tsx'; // MODIFICADO DE @/constants.tsx
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const EmailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const LockClosedIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
</svg>
);


export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, isLoading: authContextLoading, requestPasswordReset } = useAuth();
  
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgotPassword' | 'emailVerification'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('register') === 'true') {
      setCurrentView('register');
    }
    // Lógica para lidar com tokens de redefinição de senha na URL (a ser implementado na página /reset-password)
    // Ex: if (location.hash.includes('type=recovery')) { navigateToResetPasswordPage_with_token(); }
  }, [location.search, location.hash]);

  useEffect(() => {
    if (!authContextLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, authContextLoading]);

  const clearFormFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleViewChange = (view: 'login' | 'register' | 'forgotPassword') => {
    setCurrentView(view);
    clearFormFields();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFormLoading(true);

    try {
      if (currentView === 'register') {
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');
        await register(email, name, password);
        // Após o registro, o Supabase (se configurado) envia um e-mail de confirmação.
        // Mostramos uma mensagem para o usuário verificar o e-mail.
        setCurrentView('emailVerification');
        setSuccessMessage(`Cadastro quase completo! Enviamos um e-mail de confirmação para ${email}. Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.`);
      } else if (currentView === 'login') {
        await login(email, password);
        // O useEffect cuidará do redirecionamento se o login for bem-sucedido
      } else if (currentView === 'forgotPassword') {
        await requestPasswordReset(email);
        setSuccessMessage(`Se uma conta com o e-mail ${email} existir, um link para redefinição de senha foi enviado.`);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setFormLoading(false);
    }
  };

  if (authContextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-xl text-neutral-300">Verificando autenticação...</p>
      </div>
    );
  }

  const getTitle = () => {
    if (currentView === 'register') return 'Crie sua conta';
    if (currentView === 'forgotPassword') return 'Redefinir Senha';
    if (currentView === 'emailVerification') return 'Verifique seu E-mail';
    return 'Acesse sua conta';
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <AppLogoIcon className="mx-auto h-20 w-auto mb-6" />
        <h2 className="text-center text-3xl font-extrabold text-neutral-100">
          {getTitle()}
        </h2>
        {currentView !== 'emailVerification' && (
          <p className="mt-2 text-center text-sm text-neutral-400">
            {currentView === 'login' && ( <>Ou <button onClick={() => handleViewChange('register')} className="font-medium text-primary hover:text-primary-dark">crie uma nova conta gratuitamente</button></>)}
            {currentView === 'register' && (<>Ou <button onClick={() => handleViewChange('login')} className="font-medium text-primary hover:text-primary-dark">faça login na sua conta existente</button></>)}
            {currentView === 'forgotPassword' && (<>Lembrou a senha? <button onClick={() => handleViewChange('login')} className="font-medium text-primary hover:text-primary-dark">Faça login</button></>)}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="bg-neutral-800 shadow-2xl border-neutral-700/50">
          {currentView === 'emailVerification' ? (
            <div className="text-center space-y-4">
              <EmailIcon className="h-16 w-16 text-primary mx-auto"/>
              <p className="text-neutral-300">{successMessage}</p>
              <Button onClick={() => handleViewChange('login')} variant="primary" className="w-full">
                Ir para Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentView === 'register' && (
                <Input label="Nome Completo" name="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} icon={<UserIcon className="h-5 w-5"/>} disabled={formLoading} />
              )}
              {(currentView === 'login' || currentView === 'register' || currentView === 'forgotPassword') && (
                <Input label="Endereço de e-mail" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<EmailIcon className="h-5 w-5"/>} disabled={formLoading} />
              )}
              {(currentView === 'login' || currentView === 'register') && (
                <Input label="Senha" name="password" type="password" autoComplete={currentView === 'register' ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} icon={<LockClosedIcon className="h-5 w-5"/>} disabled={formLoading} />
              )}
              {currentView === 'register' && (
                <Input label="Confirmar Senha" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={<LockClosedIcon className="h-5 w-5"/>} disabled={formLoading} />
              )}

              {error && <p className="text-sm text-red-400 text-center p-2 bg-red-800/20 rounded-md border border-red-600/50">{error}</p>}
              {successMessage && currentView === 'forgotPassword' && <p className="text-sm text-green-400 text-center p-2 bg-green-800/20 rounded-md border border-green-600/50">{successMessage}</p>}

              <div>
                <Button type="submit" className="w-full bg-primary text-neutral-900 hover:bg-primary-dark focus:ring-primary" isLoading={formLoading} size="lg">
                  {currentView === 'register' ? 'Criar Conta' : currentView === 'login' ? 'Entrar' : 'Enviar Link'}
                </Button>
              </div>

              {currentView === 'login' && (
                <div className="text-sm text-center">
                  <button type="button" onClick={() => handleViewChange('forgotPassword')} className="font-medium text-primary hover:text-primary-dark">
                    Esqueceu sua senha?
                  </button>
                </div>
              )}
            </form>
          )}
          
          {currentView !== 'emailVerification' && currentView !== 'forgotPassword' && (
            <div className="mt-6">
                <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-neutral-800 text-neutral-400">Ou continue com</span>
                </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                    <Button variant='outline' className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-700" disabled>
                    <span className="sr-only">Entrar com Google</span>
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.16 5.48-4.08 7.18l7.64 5.92C44.64 37.26 46.98 31.45 46.98 24.55z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.64-5.92c-2.17 1.45-4.96 2.3-8.25 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                    </Button>
                </div>
                <div>
                    <Button variant='outline' className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-700" disabled>
                    <span className="sr-only">Entrar com Facebook</span>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M22.676 0H1.324C.593 0 0 .593 0 1.324v21.352C0 23.407.593 24 1.324 24h11.494v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.324V1.324C24 .593 23.407 0 22.676 0z"></path></svg>
                    </Button>
                </div>
                </div>
            </div>
           )}
        </Card>
      </div>
    </div>
  );
};
