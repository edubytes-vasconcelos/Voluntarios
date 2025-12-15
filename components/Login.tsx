
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { db } from '../services/db';
import { Loader2, LogIn, Mail, Lock, UserPlus, CheckCircle, Building2, User } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [viewState, setViewState] = useState<'login' | 'register_user' | 'register_church'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // User Name
  const [churchName, setChurchName] = useState(''); // Church Name
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Limpa estado temporário ao mudar de tela
  useEffect(() => {
    localStorage.removeItem('church_registration_name');
  }, []);

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setName('');
    setChurchName('');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Não chamamos onLoginSuccess() aqui manualmente. 
      // O App.tsx detectará a mudança de sessão via onAuthStateChange e carregará os dados automaticamente.
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user && !data.session) {
            setSuccessMessage("Conta criada! Verifique seu email.");
        } else {
            const exists = await db.getVolunteers();
            if (exists) {
                // Sessão atualizada automaticamente
            } else {
                setSuccessMessage("Conta criada! Peça ao seu líder para te adicionar na equipe.");
            }
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleRegisterChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        // 1. Sign Up (ou Sign In se já existir) Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { data: { full_name: name } }
        });
        
        // Se o erro for "User already registered", tentamos fazer login para prosseguir com a criação da igreja
        if (authError && authError.message.includes('already registered')) {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError) throw new Error("Usuário já existe, mas a senha está incorreta.");
            authData.user = loginData.user;
            authData.session = loginData.session;
        } else if (authError) {
            throw authError;
        }

        if (!authData.user) throw new Error("Falha ao identificar usuário.");

        // 2. Create Organization & Link Profile via RPC
        if (authData.session) {
             console.log("Usuário autenticado, criando igreja no banco...");
             
             try {
               await db.createOrganization(churchName, {
                   id: authData.user.id,
                   email: email,
                   name: name
               });
               
               // SUCESSO CRÍTICO:
               // Forçamos um reload completo da página.
               // Isso garante que o App reinicie do zero, pegue a sessão existente
               // e carregue os dados da nova organização sem cache antigo atrapalhando.
               window.location.reload();

             } catch (dbError: any) {
                // Se der erro de "duplicate key" em volunteers, significa que o usuário já tem uma igreja/perfil
                if (dbError.message?.includes('duplicate key')) {
                    throw new Error("Este usuário já possui um perfil ou igreja cadastrada.");
                }
                throw dbError;
             }
        } else {
             setSuccessMessage("Conta criada! Verifique seu email para ativar e depois faça login.");
        }

    } catch (err: any) {
        console.error("Registration Error:", err);
        setError(err.message || "Erro desconhecido ao registrar.");
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
        <div className="flex flex-col items-center mb-6">
          <div className="text-brand-primary p-3 bg-brand-bg rounded-2xl mb-4">
            <IASDLogoLarge className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-brand-secondary">
            {viewState === 'register_church' ? 'Nova Igreja' : viewState === 'register_user' ? 'Criar Conta' : 'Bem-vindo'}
          </h1>
          <p className="text-brand-muted text-sm text-center">
            {viewState === 'register_church' ? 'Cadastre sua congregação e comece a gerenciar escalas.' : 
             viewState === 'register_user' ? 'Crie seu perfil de voluntário.' : 
             'Faça login para acessar o sistema.'}
          </p>
        </div>

        {successMessage && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0"/>
              <span>{successMessage}</span>
            </div>
        )}

        <form onSubmit={viewState === 'login' ? handleLogin : viewState === 'register_church' ? handleRegisterChurch : handleRegisterUser} className="space-y-4">
          
          {viewState === 'register_church' && (
             <div>
                <label className="block text-sm font-medium text-brand-secondary mb-1">Nome da Igreja</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Building2 size={18} /></div>
                  <input type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)} required className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="Ex: IASD Central"/>
                </div>
             </div>
          )}

          {(viewState === 'register_church' || viewState === 'register_user') && (
             <div>
                <label className="block text-sm font-medium text-brand-secondary mb-1">Seu Nome Completo</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><User size={18} /></div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required={viewState === 'register_church'} className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="Ex: João Silva"/>
                </div>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-brand-secondary mb-1">Email</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Mail size={18} /></div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="email@exemplo.com"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-secondary mb-1">Senha</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Lock size={18} /></div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="••••••••"/>
            </div>
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
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                viewState === 'login' ? <span>Entrar</span> : <span>Confirmar Cadastro</span>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center border-t border-brand-muted/10 pt-4 flex flex-col gap-2">
            {viewState === 'login' ? (
                <>
                    <button onClick={() => {setViewState('register_user'); resetForm();}} className="text-brand-secondary text-sm hover:underline">
                        Criar conta de Voluntário
                    </button>
                    <div className="text-xs text-brand-muted">ou</div>
                    <button onClick={() => {setViewState('register_church'); resetForm();}} className="text-brand-primary font-semibold text-sm hover:underline">
                        Cadastrar Nova Igreja (Admin)
                    </button>
                </>
            ) : (
                <button onClick={() => {setViewState('login'); resetForm();}} className="text-brand-primary font-semibold text-sm hover:underline">
                    Voltar para Login
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;
