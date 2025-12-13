
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, LogIn, Mail, Lock, UserPlus, CheckCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // Fluxo de Cadastro (Sign Up)
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Verifica se o cadastro exige confirmação por email (configuração padrão do Supabase)
        if (data.user && !data.session) {
          setSuccessMessage("Conta criada! Verifique seu email para confirmar o cadastro antes de entrar.");
          setIsSignUp(false); // Volta para a tela de login
        } else {
           // Se o "Auto Confirm" estiver ligado no Supabase
           onLoginSuccess();
        }

      } else {
        // Fluxo de Login (Sign In)
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Por favor, confirme seu email antes de fazer login.');
      } else if (err.message.includes('User already registered')) {
        setError('Este email já possui uma conta. Tente fazer login.');
      } else {
        setError(err.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Custom Logo for Login Screen
  const IASDLogoLarge = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M50 5 L95 50 L50 95 L5 50 Z" />
      <path d="M50 5 L50 95" />
      <path d="M5 50 Q 27.5 50 50 27.5" />
      <path d="M95 50 Q 72.5 50 50 27.5" />
      <path d="M5 50 Q 27.5 50 50 72.5" />
      <path d="M95 50 Q 72.5 50 50 72.5" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-brand-muted/10">
        <div className="flex flex-col items-center mb-8">
          <div className="text-brand-primary p-3 bg-brand-bg rounded-2xl mb-4">
            <IASDLogoLarge className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-brand-secondary">
            {isSignUp ? 'Criar Conta' : 'Bem-vindo'}
          </h1>
          <p className="text-brand-muted text-sm">
            {isSignUp ? 'Preencha seus dados para começar' : 'Faça login para acessar suas escalas'}
          </p>
        </div>

        {successMessage && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0"/>
              <span>{successMessage}</span>
            </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-secondary mb-1">Email</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-secondary mb-1">Senha</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30"
                placeholder="••••••••"
              />
            </div>
            {isSignUp && <p className="text-xs text-brand-muted mt-1 ml-1">Mínimo de 6 caracteres</p>}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-2.5 rounded-lg font-medium transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isSignUp ? (
              <>
                <span>Cadastrar</span>
                <UserPlus size={18} />
              </>
            ) : (
              <>
                <span>Entrar</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center border-t border-brand-muted/10 pt-4">
            <p className="text-sm text-brand-secondary mb-2">
                {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem acesso?'}
            </p>
            <button 
                onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMessage(null);
                }}
                className="text-brand-primary font-semibold hover:underline text-sm"
            >
                {isSignUp ? 'Voltar para Login' : 'Criar Conta Agora'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
