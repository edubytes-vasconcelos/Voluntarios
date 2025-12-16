
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { db } from '../services/db';
import { Loader2, LogIn, Mail, Lock, UserPlus, CheckCircle, Building2, User, AlertCircle, Database, RefreshCw, Copy } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterStart?: () => void;
  onRegisterEnd?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterStart, onRegisterEnd }) => {
  const [viewState, setViewState] = useState<'login' | 'register_user' | 'register_church'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // User Name
  const [churchName, setChurchName] = useState(''); // Church Name
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New states for setup repair within Login.tsx
  const [needsSetupRepair, setNeedsSetupRepair] = useState(false);
  const [setupRepairMsg, setSetupRepairMsg] = useState<string | null>(null);


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
    setNeedsSetupRepair(false); // Reset repair state
    setSetupRepairMsg(null); // Reset repair message
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsSetupRepair(false); // Reset repair state
    setSetupRepairMsg(null); // Reset repair message

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
    setNeedsSetupRepair(false); // Reset repair state
    setSetupRepairMsg(null); // Reset repair message

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
    setNeedsSetupRepair(false); // Reset repair state
    setSetupRepairMsg(null); // Reset repair message
    
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
               // Remove o reload e chama a função de sucesso para o App.tsx carregar os dados.
               // Isso previne a condição de corrida que causa o 'Failed to fetch'.
               onLoginSuccess();

             } catch (dbError: any) {
                // Se falhar a criação do banco, FAZEMOS LOGOUT para limpar o estado
                // e permitir que o usuário tente novamente ou veja o erro na tela de login.
                await supabase.auth.signOut();
                if (onRegisterEnd) onRegisterEnd();

                // NEW: Handle specific errors during createOrganization
                if (dbError.message && typeof dbError.message === 'string' && dbError.message.includes('Failed to fetch')) {
                    setNeedsSetupRepair(true);
                    setSetupRepairMsg('Erro de rede ao criar a igreja. Verifique sua conexão e se a função RPC `create_church_and_admin` está corretamente implantada no Supabase.');
                    return; // Prevent further execution
                }
                if (dbError.message === 'MISSING_DB_FUNCTION') {
                    setNeedsSetupRepair(true);
                    setSetupRepairMsg('Falha na configuração do banco de dados ao criar a igreja. Por favor, execute o script SQL de atualização.');
                    return; // Prevent further execution
                }
                // Se der erro de "duplicate key" em volunteers, significa que o usuário já tem uma igreja/perfil
                if (dbError.message?.includes('duplicate key') || dbError.code === '23505') {
                    throw new Error("Este usuário já possui um perfil ou igreja cadastrada. Tente fazer login ou use um email diferente.");
                }
                throw dbError;
             }
        } else {
             if (onRegisterEnd) onRegisterEnd();
             setSuccessMessage("Conta criada! Verifique seu email para ativar e depois faça login.");
        }

    } catch (err: any) {
        console.error("Registration Error:", err);
        if (onRegisterEnd) onRegisterEnd();
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

    // SQL Script (Duplicated from App.tsx for critical initial setup failures)
  const SQL_SCRIPT = `-- SOLUÇÃO V10: CORREÇÃO DE EMAIL (MINÚSCULAS) E VINCULAÇÃO

-- 1. Limpeza de Funções Antigas
DROP FUNCTION IF EXISTS get_my_org_id() CASCADE;
DROP FUNCTION IF EXISTS claim_profile_by_email(text, text);

-- 2. Recriar Função de Segurança Principal
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM volunteers WHERE id = auth.uid()::text LIMIT 1;
$$;

-- 3. Habilitar RLS (Segurança)
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Função de Auto-Claim (VINCULAR CONTA NOVA AO PERFIL EXISTENTE)
-- CORREÇÃO V10: Usa LOWER() para comparar emails, evitando erro de maiúsculas/minúsculas
CREATE OR REPLACE FUNCTION claim_profile_by_email(user_email text, new_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_user_id text;
BEGIN
  -- Acha o perfil antigo pelo email (case insensitive), que tenha um ID diferente do novo
  SELECT id INTO old_user_id 
  FROM volunteers 
  WHERE LOWER(email) = LOWER(user_email) AND id != new_user_id 
  LIMIT 1;
  
  IF old_user_id IS NULL THEN
    RETURN FALSE; -- Nada para reivindicar
  END IF;

  -- 1. Atualiza ID do Voluntário
  UPDATE volunteers SET id = new_user_id WHERE id = old_user_id;
  
  -- 2. Atualiza Equipes (Substitui ID antigo pelo novo na lista de membros)
  UPDATE teams 
  SET member_ids = (
    SELECT array_agg(CASE WHEN elem = old_user_id THEN new_user_id ELSE elem END)
    FROM unnest(member_ids) elem
  )
  WHERE member_ids @> ARRAY[old_user_id];

  -- 3. Atualiza Serviços (Substitui ID antigo no JSON das designações)
  UPDATE services 
  SET assignments = REPLACE(assignments::text, '"' || old_user_id || '"', '"' || new_user_id || '"')::jsonb
  WHERE assignments::text LIKE '%"' || old_user_id || '"%';

  RETURN TRUE;
END;
$$;

-- 5. Função RPC de Cadastro Inicial (Admin)
CREATE OR REPLACE FUNCTION create_church_and_admin(
  church_name text,
  admin_name text,
  admin_email text,
  admin_id uuid,
  admin_avatar text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO organizations (name) VALUES (church_name) RETURNING id INTO new_org_id;
  
  INSERT INTO volunteers (id, organization_id, name, email, roles, access_level, avatar_url)
  VALUES (admin_id::text, new_org_id, admin_name, admin_email, '["Líder", "Admin"]'::jsonb, 'admin', admin_avatar)
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    access_level = 'admin',
    roles = '["Líder", "Admin"]'::jsonb;
    
  RETURN new_org_id;
END;
$$;

-- 6. Tabela Push (Caso não exista)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subscription)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Acesso (Recria para garantir)
DROP POLICY IF EXISTS "vol_select" ON volunteers;
CREATE POLICY "vol_select" ON volunteers FOR SELECT USING (auth.uid()::text = id OR organization_id = get_my_org_id());
CREATE POLICY "vol_insert" ON volunteers FOR INSERT WITH CHECK (auth.uid()::text = id OR organization_id = get_my_org_id());
CREATE POLICY "vol_update" ON volunteers FOR UPDATE USING (auth.uid()::text = id OR organization_id = get_my_org_id());
CREATE POLICY "vol_delete" ON volunteers FOR DELETE USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "svc_all" ON services;
CREATE POLICY "svc_all" ON services FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "team_all" ON teams;
CREATE POLICY "team_all" ON teams FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "min_all" ON ministries;
CREATE POLICY "min_all" ON ministries FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "evt_all" ON event_types;
CREATE POLICY "evt_all" ON event_types FOR ALL USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_view" ON organizations;
CREATE POLICY "org_view" ON organizations FOR SELECT USING (id = get_my_org_id());

DROP POLICY IF EXISTS "log_all" ON audit_logs;
CREATE POLICY "log_insert" ON audit_logs FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "log_view" ON audit_logs FOR SELECT USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid()::text = user_id);

-- 8. Grants
GRANT EXECUTE ON FUNCTION get_my_org_id TO authenticated;
GRANT EXECUTE ON FUNCTION create_church_and_admin TO authenticated;
GRANT EXECUTE ON FUNCTION claim_profile_by_email TO authenticated;
GRANT ALL ON TABLE organizations TO authenticated;
GRANT ALL ON TABLE volunteers TO authenticated;
GRANT ALL ON TABLE services TO authenticated;
GRANT ALL ON TABLE teams TO authenticated;
GRANT ALL ON TABLE ministries TO authenticated;
GRANT ALL ON TABLE event_types TO authenticated;
GRANT ALL ON TABLE audit_logs TO authenticated;
GRANT ALL ON TABLE push_subscriptions TO authenticated;`;


  if (needsSetupRepair) {
      return (
          <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl w-full text-center border border-red-300 max-w-3xl">
                  
                  {/* REPAIR MODE HEADER */}
                  <div className="mb-6">
                        <div className="bg-red-50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Database size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-red-700 mb-2">Configuração de Banco Necessária</h2>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left text-sm text-red-800 mb-4">
                            <p className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={16}/> {setupRepairMsg || 'Correção de Vínculo de Contas'}</p>
                            <p>O script V10 abaixo corrige problemas onde o email cadastrado tem letras maiúsculas/minúsculas diferentes do login, e garante as funções de criação de igreja e auto-claim.</p>
                        </div>
                  </div>

                  {/* SQL REPAIR BOX */}
                  <div className="text-left mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <Database size={18} />
                          Script de Atualização (V10)
                      </h3>
                      <ol className="list-decimal list-inside text-xs text-slate-500 mb-3 space-y-1">
                          <li>Copie o código SQL abaixo.</li>
                          <li>Vá ao <strong>Supabase Dashboard</strong> {'>'} <strong>SQL Editor</strong>.</li>
                          <li>Cole o código e clique em <strong>RUN</strong>.</li>
                          <li>Após rodar, clique em "Tentar Novamente".</li>
                      </ol>
                      <div className="relative">
                          <pre className="bg-slate-800 text-slate-200 p-3 rounded text-[10px] overflow-x-auto whitespace-pre-wrap font-mono h-48">
                              {SQL_SCRIPT}
                          </pre>
                          <button 
                            onClick={() => navigator.clipboard.writeText(SQL_SCRIPT)}
                            className="absolute top-2 right-2 p-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 flex items-center gap-1 text-xs"
                            title="Copiar"
                          >
                              <Copy size={12} /> Copiar
                          </button>
                      </div>
                  </div>
                  
                  {/* ACTIONS */}
                  <div className="flex flex-col gap-3">
                     <button 
                        onClick={() => window.location.reload()} 
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                     >
                        <RefreshCw size={18} />
                        Já executei o SQL, Tentar Novamente
                     </button>
                     
                     <div className="border-t border-gray-100 pt-3 mt-1">
                        <button onClick={resetForm} className="text-brand-secondary hover:underline font-medium text-sm">Voltar para Login</button>
                     </div>
                  </div>
              </div>
          </div>
      )
  }


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
