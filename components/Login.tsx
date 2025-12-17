
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { db } from '../services/db';
import { Loader2, LogIn, Mail, Lock, UserPlus, CheckCircle, Building2, User, Sparkles, Eye, EyeOff, KeyRound, Info } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterStart?: () => void;
  onRegisterEnd?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterStart, onRegisterEnd }) => {
  const [viewState, setViewState] = useState<'login' | 'register_user' | 'register_church' | 'forgot_password'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // NEW: Confirm Password
  const [name, setName] = useState(''); // User Name
  const [churchName, setChurchName] = useState(''); // Church Name
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // NEW: Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Removido: New states for setup repair within Login.tsx - handled by App.tsx
  // const [needsSetupRepair, setNeedsSetupRepair] = useState(false);
  // const [setupRepairMsg, setSetupRepairMsg] = useState<string | null>(null);


  // Limpa estado temporário ao mudar de tela
  useEffect(() => {
    localStorage.removeItem('church_registration_name');
  }, []);

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword(''); // Reset confirm password
    setName('');
    setChurchName('');
    // Removido: Reset repair state
    // setNeedsSetupRepair(false); 
    // setSetupRepairMsg(null); 
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Removido: Reset repair state
    // setNeedsSetupRepair(false); 
    // setSetupRepairMsg(null); 

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
    // Removido: Reset repair state
    // setNeedsSetupRepair(false); 
    // setSetupRepairMsg(null); 

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user && !data.session) {
            setSuccessMessage("Conta criada! Verifique seu email.");
        } else {
            // Sessão atualizada automaticamente, App.tsx vai carregar
            // setSuccessMessage("Conta criada! Peça ao seu líder para te adicionar na equipe."); // This path is now handled by App.tsx
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
    // Removido: Reset repair state
    // setNeedsSetupRepair(false); 
    // setSetupRepairMsg(null); 
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    // Trava o App na tela de Login/Loading durante o processo
    if (onRegisterStart) onRegisterStart();

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
            authData.session = loginData.session; // Fix: Corrected reference for session data after sign-in
        } else if (authError) {
            throw authError;
        }

        if (!authData.user) throw new Error("Falha ao identificar usuário.");

        // 2. Create Organization & Link Profile via RPC
        if (authData.session) {
             console.log("Usuário autenticado, criando igreja no banco...", {churchName, email, name, userId: authData.user.id});
             
             try {
               await db.createOrganization(churchName, {
                   id: authData.user.id,
                   email: email,
                   name: name
               });
               
               // SUCESSO CRÍTICO:
               // Chama a função de sucesso para o App.tsx carregar os dados.
               // Isso previne a condição de corrida que causa o 'Failed to fetch'.
               onLoginSuccess();

             } catch (dbError: any) {
                // Se falhar a criação do banco, FAZEMOS LOGOUT para limpar o estado
                // e permitir que o usuário tente novamente ou veja o erro na tela de login.
                await supabase.auth.signOut();
                if (onRegisterEnd) onRegisterEnd(); // Notify App.tsx to unblock
                
                // NEW: Handle specific errors during createOrganization by rethrowing them.
                // App.tsx will catch and display the global repair screen if needed.
                if (dbError.message && typeof dbError.message === 'string' && dbError.message.includes('Failed to fetch')) {
                    throw new Error("NETWORK_ERROR_DURING_ORG_CREATION");
                }
                if (dbError.message === 'MISSING_DB_FUNCTION' || dbError.code === '42883') { // 42883 is "undefined_function"
                    throw new Error("MISSING_DB_FUNCTION_DURING_ORG_CREATION");
                }
                throw dbError; 
             }
        } else {
             if (onRegisterEnd) onRegisterEnd();
             setSuccessMessage("Conta criada! Verifique seu email para ativar e depois faça login.");
        }

    } catch (err: any) {
        console.error("Registration Error:", err);
        if (onRegisterEnd) onRegisterEnd(); // Ensure onRegisterEnd is called even on top-level errors
        setError(err.message || "Erro desconhecido ao registrar.");
        setLoading(false);
    }
  };

  // NEW: Handle Social Login
  const handleSocialLogin = async (provider: 'google') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin, // Redirects back to the app after login
        },
      });
      if (error) throw error;
      // onLoginSuccess will be called by App.tsx's onAuthStateChange
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Google.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // Optional: a page to update password
      });
      if (error) throw error;
      setSuccessMessage("Verifique seu email para redefinir a senha.");
      setEmail('');
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar redefinição de senha.");
    } finally {
      setLoading(false);
    }
  };

  // Custom Logo for Login Screen
  const IASDLogoLarge = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" stroke="#004a5e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
          <h1 className="text-2xl font-bold text-brand-secondary flex items-center gap-2">
            {viewState === 'register_church' ? 'Nova Igreja' : viewState === 'register_user' ? 'Criar Conta' : viewState === 'forgot_password' ? 'Redefinir Senha' : (
              <>
                <Sparkles size={24} className="text-brand-accent animate-pulse" />
                Seja Bem-vindo(a)!
              </>
            )}
          </h1>
          <p className="text-brand-muted text-sm text-center">
            {viewState === 'register_church' ? 'Cadastre sua congregação e comece a gerenciar escalas.' : 
             viewState === 'register_user' ? 'Crie seu perfil de voluntário.' : 
             viewState === 'forgot_password' ? 'Informe seu email para receber um link de redefinição.' :
             'Por favor, faça login para acessar o sistema.'}
          </p>
        </div>

        {successMessage && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0"/>
              <span>{successMessage}</span>
            </div>
        )}

        {/* --- LOGIN FORM --- */}
        {viewState === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
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
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required minLength={6} 
                    className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" 
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-secondary">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button type="button" onClick={() => {setViewState('forgot_password'); resetForm();}} className="block mt-2 text-xs text-brand-primary hover:underline font-medium">Esqueceu a senha?</button>
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
                {loading ? <Loader2 size={20} className="animate-spin" /> : <span>Entrar</span>}
              </button>

              <div className="relative flex items-center py-5">
                  <div className="flex-grow border-t border-brand-muted/20"></div>
                  <span className="flex-shrink mx-4 text-brand-muted text-sm">OU</span>
                  <div className="flex-grow border-t border-brand-muted/20"></div>
              </div>

              <button 
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                  <span>Entrar com Google</span>
              </button>
            </form>
        )}

        {/* --- REGISTER USER / CHURCH FORM --- */}
        {(viewState === 'register_user' || viewState === 'register_church') && (
            <form onSubmit={viewState === 'register_church' ? handleRegisterChurch : handleRegisterUser} className="space-y-4">
            
            {viewState === 'register_church' && (
                <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">Nome da Igreja</label>
                    <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Building2 size={18} /></div>
                    <input type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)} required className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="Ex: IASD Central"/>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-1">Seu Nome Completo</label>
                <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><User size={18} /></div>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required={viewState === 'register_church'} className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="Ex: João Silva"/>
                </div>
            </div>

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
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required minLength={6} 
                  className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-secondary">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-1">Confirmar Senha</label>
                <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Lock size={18} /></div>
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required minLength={6} 
                  className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-secondary">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                </div>
                {password !== confirmPassword && confirmPassword.length > 0 && (
                    <p className="text-red-500 text-xs mt-1">As senhas não coincidem.</p>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || (password !== confirmPassword && confirmPassword.length > 0)}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-2.5 rounded-lg font-medium transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <span>Confirmar Cadastro</span>}
            </button>
            </form>
        )}

        {/* --- FORGOT PASSWORD FORM --- */}
        {viewState === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 flex items-start gap-2">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>
                    Insira seu email e enviaremos um link para você redefinir sua senha.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-secondary mb-1">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Mail size={18} /></div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="email@exemplo.com"/>
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
                {loading ? <Loader2 size={20} className="animate-spin" /> : <span>Enviar Link</span>}
              </button>
            </form>
        )}
        
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
