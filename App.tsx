
import React, { useState, useEffect, useRef } from 'react';
import { Volunteer, ServiceEvent, Ministry, EventType, AccessLevel, Team, AuditLogEntry, Organization } from './types';
// Removed unused INITIAL_* imports to prevent accidental inheritance of sample data
import VolunteerList from './components/VolunteerList';
import ScheduleView from './components/ScheduleView';
import MinistryList from './components/MinistryList';
import EventTypeList from './components/EventTypeList';
import TeamList from './components/TeamList';
import Login from './components/Login';
import NotificationToggle from './components/NotificationToggle';
import AdminOnboardingGuide from './components/AdminOnboardingGuide'; // RENAMED: Import AdminOnboardingGuide
import UserOnboardingGuide from './components/UserOnboardingGuide'; // NEW: Import UserOnboardingGuide
import useLocalStorage from './hooks/useLocalStorage'; // NEW: Import useLocalStorage
import { db, clearDbOrganizationId } from './services/db';
import { supabase } from './services/supabaseClient';
import { Users, Calendar, BookOpen, ListFilter, Loader2, AlertCircle, Database, LogOut, Bell, CheckCircle2, Shield, Menu, X, Settings, Building, RefreshCw, ArrowRight, Copy, Search } from 'lucide-react';

// Custom Logo Component mimicking the IASD diamond structure
const IASDLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="#004a5e" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Diamond Shape */}
    <path d="M50 5 L95 50 L50 95 L5 50 Z" />
    {/* Vertical Line */}
    <path d="M50 5 L50 95" />
    {/* Curved Lines (Leaves/Pages) */}
    <path d="M5 50 Q 27.5 50 50 27.5" />
    <path d="M95 50 Q 72.5 50 50 27.5" />
    <path d="M5 50 Q 27.5 50 50 72.5" />
    <path d="M95 50 Q 72.5 50 50 72.5" />
  </svg>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Volunteer | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); // Prevents Login unmount during church creation

  const [activeTab, setActiveTab] = useState<'schedule' | 'volunteers' | 'teams' | 'ministries' | 'eventTypes'>('schedule');
  
  // State initialization - Start Empty
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); 
  const [services, setServices] = useState<ServiceEvent[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]); 
  
  // CORREÇÃO: Inicia loading como true para evitar flash da tela de cadastro
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [needsDbRepair, setNeedsDbRepair] = useState(false); // New critical state
  const [repairErrorMsg, setRepairErrorMsg] = useState<string | null>(null); // Custom msg for repair screen
  
  // Ref para evitar race conditions no loadData
  const isLoadingRef = useRef(false);

  // New state for mobile config menu
  const [showConfigMenu, setShowConfigMenu] = useState(false);

  // NEW: State for notification banner visibility
  const [showVolunteerNotification, setShowVolunteerNotification] = useState(true);

  // NEW: Onboarding States (two separate for clarity)
  const [adminOnboardingCompleted, setAdminOnboardingCompleted] = useLocalStorage<Record<string, boolean>>('admin_onboarding_completed', {});
  const [userOnboardingCompleted, setUserOnboardingCompleted] = useLocalStorage<Record<string, boolean>>('user_onboarding_completed', {});


  // Check Auth on Mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Se NÃO tiver sessão, paramos o loading para mostrar o Login.
      // Se TIVER sessão, mantemos o loading true pois o loadData() vai rodar em seguida.
      if (!session) {
          setLoading(false);
      }
      setAppReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Mesma lógica: se fez logout, para loading. Se fez login, o useEffect[session] vai disparar o loadData
      if (!session) {
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Data when session exists - CORREÇÃO: Depende do ID do usuário, não do objeto session inteiro
  useEffect(() => {
    if (session?.user?.id && !isRegistering) {
      loadData();
    }
  }, [session?.user?.id, isRegistering]);

  const loadData = async () => {
    if (isLoadingRef.current) return; // Evita chamadas simultâneas
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      setError(null);
      setNeedsDbRepair(false); // Reset repair state
      setRepairErrorMsg(null);
      
      // 1. Establish Organization Context
      let org = null;
      
      try {
          org = await db.getMyOrganization();
          
          // RETRY LOGIC for Race Conditions (New Church Registration)
          if (!org) {
              console.log("Organização não encontrada. Tentando novamente em breve...");
              await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay
              org = await db.getMyOrganization();
          }

      } catch (innerErr: any) {
          // NOVO: Captura erros padronizados de db.ts
          if (innerErr.message === 'DB_POLICY_ERROR' || innerErr.message === 'NETWORK_ERROR') {
              setNeedsDbRepair(true);
              setRepairErrorMsg(
                  innerErr.message === 'NETWORK_ERROR'
                  ? 'Erro de rede ao buscar dados. Verifique sua conexão e se o script SQL está atualizado no Supabase.'
                  : 'Erro de políticas de segurança. Execute o script SQL de atualização para corrigir.'
              );
              setLoading(false);
              isLoadingRef.current = false;
              return; // Para a execução
          }
          // Catch specific errors from Login.tsx's handleRegisterChurch
          if (innerErr.message === 'NETWORK_ERROR_DURING_ORG_CREATION') {
            setNeedsDbRepair(true);
            setRepairErrorMsg('Erro de rede ao criar a igreja. Verifique sua conexão e se a função RPC `create_church_and_admin` está corretamente implantada no Supabase.');
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }
          if (innerErr.message === 'MISSING_DB_FUNCTION_DURING_ORG_CREATION') {
            setNeedsDbRepair(true);
            setRepairErrorMsg('Falha na configuração do banco de dados ao criar a igreja. Por favor, execute o script SQL de atualização.');
            setLoading(false);
            isLoadingRef.current = false;
            return;
          }

          console.error("Erro inesperado ao buscar organização:", innerErr);
      }

      // Se não encontrou organização, TENTA REIVINDICAR PERFIL por email
      if (!org && session?.user?.email) {
          console.log("Usuário sem organização. Verificando convites...");
          try {
              const claimed = await db.claimProfileByEmail(session.user.email, session.user.id);
              if (claimed) {
                  console.log("Perfil unificado com sucesso! Recarregando...");
                  // Tenta buscar de novo agora que o ID foi corrigido
                  org = await db.getMyOrganization();
              }
          } catch (claimErr: any) {
               if (claimErr.message === 'MISSING_DB_FUNCTION') {
                   setNeedsDbRepair(true);
                   setRepairErrorMsg('Atualização necessária para vincular contas existentes.');
                   setLoading(false);
                   isLoadingRef.current = false;
                   return;
               }
               // Check for network errors during profile claim (already implemented)
               if (claimErr.message && typeof claimErr.message === 'string' && claimErr.message.includes('Failed to fetch')) {
                   setNeedsDbRepair(true); 
                   setRepairErrorMsg('Erro de rede ao vincular perfil. Verifique sua conexão e se o script SQL está atualizado no Supabase.');
                   setLoading(false);
                   isLoadingRef.current = false;
                   return;
               }
               console.warn("Falha ao tentar auto-claim:", claimErr);
          }
      }

      setCurrentOrg(org);

      if (!org) {
          // GARANTIA DE LIMPEZA: Se não tem organização, não pode ter dados na tela.
          setVolunteers([]);
          setTeams([]);
          setServices([]);
          setMinistries([]);
          setEventTypes([]);
          // Não retornamos aqui para permitir que o finally execute e pare o loading corretamente
      } else {
          // *** FIX: Add a small delay here to mitigate RLS consistency issues ***
          await new Promise(resolve => setTimeout(resolve, 500)); 

          // 2. Load Entity Data apenas se tiver organização
          const [vData, tData, sData, mData, eData] = await Promise.all([
            db.getVolunteers(),
            db.getTeams(), 
            db.getServices(),
            db.getMinistries(),
            db.getEventTypes()
          ]);
          
          setVolunteers(vData);
          setTeams(tData);
          setServices(sData);
          setMinistries(mData);
          setEventTypes(eData);

          // Identify Current User Profile
          if (session?.user?.id) { // Use session.user.id directly
            let currentUser = vData.find(v => v.id === session.user.id);
            if (currentUser) {
                setUserProfile(currentUser);
            }
          }
      }

    } catch (err: any) {
      console.error("Failed to load data from Supabase:", err);
      // Fallback if DB_POLICY_ERROR wasn't caught in the inner loop
      if (err.message === 'DB_POLICY_ERROR' || err.message === 'RECURSION_ERROR') {
          setNeedsDbRepair(true);
      } else {
          setError("Não foi possível carregar os dados.");
      }
      // Safety Clear
      setVolunteers([]);
      setTeams([]);
      setServices([]);
      setMinistries([]);
      setEventTypes([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleLogout = async () => {
    setLoading(true); // Evita flash da tela de 'Sem Organização' ao limpar estados antes do logout terminar
    
    try {
        localStorage.removeItem('church_registration_name'); // Clear temp data
        
        // EXPLICIT STATE CLEARING: Prevents data leakage between sessions
        setVolunteers([]);
        setTeams([]);
        setServices([]);
        setMinistries([]);
        setEventTypes([]);
        setUserProfile(null);
        setCurrentOrg(null);
        setNeedsDbRepair(false);
        clearDbOrganizationId(); // Clear DB service static state

        await supabase.auth.signOut();
        setSession(null);
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  // --- Handlers ---
  const handleAddVolunteer = async (newVolunteer: Volunteer) => {
    try {
      await db.addVolunteer(newVolunteer);
      const v = await db.getVolunteers();
      setVolunteers(v);
    } catch (e: any) {
      console.error(e);
      // Catch RLS Error 42501 (Insufficient Privilege)
      if (e.code === '42501' || e.message?.includes('violates row-level security')) {
          setRepairErrorMsg("Erro de Permissão: O banco de dados bloqueou o cadastro.");
          setNeedsDbRepair(true);
      } else {
          alert('Erro ao salvar voluntário: ' + (e.message || 'Desconhecido'));
      }
    }
  };

  const handleRemoveVolunteer = async (id: string) => {
    try {
      await db.removeVolunteer(id);
      setVolunteers(prev => prev.filter(v => v.id !== id));
    } catch (e) {
      console.error(e);
      alert('Erro ao remover voluntário');
    }
  };

  const handleAddTeam = async (newTeam: Team) => {
    try {
      await db.addTeam(newTeam);
      const t = await db.getTeams();
      setTeams(t);
    } catch (e: any) {
        console.error(e);
        // Tratamento de erro específico para duplicidade
        if (e.message?.includes('duplicate key') || e.code === '23505') {
            throw new Error("TEAM_EXISTS");
        } else {
            throw new Error('Erro ao adicionar equipe: ' + (e.message || 'Desconhecido'));
        }
    }
  };

  const handleUpdateTeam = async (updatedTeam: Team) => {
    try {
      await db.updateTeam(updatedTeam);
      setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    } catch (e: any) {
        console.error(e);
        // Tratamento de erro específico para duplicidade
        if (e.message?.includes('duplicate key') || e.code === '23505') {
            throw new Error("TEAM_EXISTS");
        } else {
            throw new Error('Erro ao atualizar equipe: ' + (e.message || 'Desconhecido'));
        }
    }
  };

  const handleRemoveTeam = async (id: string) => {
    try {
      await db.removeTeam(id);
      setTeams(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      alert('Erro ao remover equipe.');
    }
  };

  const handleAddService = async (newService: ServiceEvent) => {
    try {
      await db.addService(newService);
      setServices(prev => [...prev, newService]);
    } catch (e) {
      console.error(e);
      alert('Erro ao criar evento');
    }
  };

  const handleUpdateService = async (updatedService: ServiceEvent) => {
    try {
      await db.updateService(updatedService);
      setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar evento');
    }
  };

  const handleRemoveService = async (id: string) => {
    try {
      await db.removeService(id);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
      alert('Erro ao remover evento');
    }
  };

  const handleLogAction = async (action: string, resource: string, resourceId: string, details: any) => {
     try {
         await db.addAuditLog({
             user_email: session?.user?.email,
             action,
             resource,
             resource_id: resourceId,
             details
         });
     } catch (e) {
         console.error("Erro ao registrar log", e);
     }
  };

  const handleAddMinistry = async (newMinistry: Ministry) => {
    try {
      await db.addMinistry(newMinistry);
      const m = await db.getMinistries();
      setMinistries(m);
    } catch (e: any) { 
        // Tratamento de erro específico para duplicidade
        if (e.message?.includes('duplicate key') || e.code === '23505') {
            // Em vez de alert, lançamos um erro específico para o componente MinistryList tratar
            throw new Error("MINISTRY_EXISTS");
        } else {
            console.error(e);
            // Re-throw outros erros para tratamento genérico no componente
            throw new Error('Erro ao adicionar ministério: ' + (e.message || 'Desconhecido')); 
        }
    }
  };

  const handleRemoveMinistry = async (name: string) => {
    try {
      await db.removeMinistry(name);
      setMinistries(prev => prev.filter(m => m.name !== name));
    } catch (e) { alert('Erro ao remover ministério'); }
  };

  const handleAddEventType = async (newEventType: EventType) => {
    try {
      await db.addEventType(newEventType);
      setEventTypes(prev => [...prev, newEventType]);
    } catch (e: any) { 
        console.error(e);
        // Tratamento de erro específico para duplicidade
        if (e.message?.includes('duplicate key') || e.code === '23505') {
            throw new Error("EVENT_TYPE_EXISTS");
        } else {
            throw new Error('Erro ao adicionar tipo de evento: ' + (e.message || 'Desconhecido'));
        }
    }
  };

  const handleRemoveEventType = async (id: string) => {
    try {
      await db.removeEventType(id);
      setEventTypes(prev => prev.filter(t => t.id !== id));
    } catch (e) { alert('Erro ao remover tipo de evento'); }
  };

  // --- Derived State & Checks ---
  
  if (!appReady) return <div className="h-screen flex items-center justify-center bg-brand-bg"><Loader2 className="animate-spin text-brand-primary"/></div>;

  // IMPORTANT: Keep Login mounted if registering, even if session exists
  // Fixed: Condition now correctly includes currentOrg check for the "no organization" fallback
  if (!session || isRegistering) {
    return <Login 
        onLoginSuccess={() => { 
            setIsRegistering(false); 
            // loadData will be triggered by useEffect when isRegistering becomes false
        }} 
        onRegisterStart={() => setIsRegistering(true)}
        onRegisterEnd={() => setIsRegistering(false)}
    />;
  }

  // Handle case where user logged in but data is fetching or user has no org
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center flex-col gap-4 text-brand-primary">
        <Loader2 size={48} className="animate-spin" />
        <p className="font-medium animate-pulse">Carregando...</p>
      </div>
    );
  }

  // --- RECOVERY / REPAIR SCREEN (Exclusively for DB Repair now) ---
  if (needsDbRepair) {
      
      // SCRIPT SQL 'COMPLETE RESET' (V22 - Frontend improvements version, SQL content still V21)
      const SQL_SCRIPT = `-- SOLUÇÃO V22: ADIÇÃO DE COLUNAS DE WHATSAPP E CORREÇÃO GERAL DE CONSTRAINTS/RLS (FRONTEND V22)

-- 0. Adição das novas colunas de WhatsApp na tabela volunteers
--    CRÍTICO: Isso deve ser feito ANTES de recriar as políticas RLS para que elas considerem as novas colunas.
ALTER TABLE public.volunteers
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS receive_whatsapp_notifications boolean DEFAULT FALSE;

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

-- 4. Função de Auto-Claim
CREATE OR REPLACE FUNCTION claim_profile_by_email(user_email text, new_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_user_id text;
BEGIN
  -- Acha o perfil antigo pelo email (case insensitive)
  SELECT id INTO old_user_id 
  FROM volunteers 
  WHERE LOWER(email) = LOWER(user_email) AND id != new_user_id 
  LIMIT 1;
  
  IF old_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE volunteers SET id = new_user_id WHERE id = old_user_id;
  
  UPDATE teams 
  SET member_ids = (
    SELECT array_agg(CASE WHEN elem = old_user_id THEN new_user_id ELSE elem END)
    FROM unnest(member_ids) elem
  )
  WHERE member_ids @> ARRAY[old_user_id];

  UPDATE services 
  SET assignments = REPLACE(assignments::text, '"' || old_user_id || '"', '"' || new_user_id || '"')::jsonb
  WHERE assignments::text LIKE '%"' || old_user_id || '"%';

  RETURN TRUE;
END;
$$;

-- 5. Função RPC de Cadastro de Igreja
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

-- 6. Tabela Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subscription)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Acesso (RLS)
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

-- 8. Permissões (Grants)
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
GRANT ALL ON TABLE push_subscriptions TO authenticated;

-- 9. CORREÇÃO CRÍTICA DE CONSTRAINTS E ÍNDICES
-- Este bloco visa ser EXAUSTIVO na remoção de qualquer constraint ou índice de unicidade conflitante
-- e, em seguida, recria a correta.

-- PASSO 1: Remover todos os índices de unicidade antigos nas tabelas 'ministries', 'event_types', 'teams'
DROP INDEX IF EXISTS public.ministries_name_key;
DROP INDEX IF EXISTS public.ministries_org_name_key;
DROP INDEX IF EXISTS public.ministries_org_name_idx;
DROP INDEX IF EXISTS public.event_types_name_key; -- Pode existir
DROP INDEX IF EXISTS public.event_types_org_name_key; -- Pode existir
DROP INDEX IF EXISTS public.event_types_org_name_idx; -- Pode existir
DROP INDEX IF EXISTS public.teams_name_key; -- Pode existir
DROP INDEX IF EXISTS public.teams_org_name_key; -- Pode existir
DROP INDEX IF EXISTS public.teams_org_name_idx; -- Pode existir


-- PASSO 2: Remover quaisquer CONSTRAINTS de unicidade (UNIQUE ou PRIMARY KEY)
-- que possam estar causando conflitos nas colunas 'name' ou na combinação 'organization_id, name'.
-- Isso é feito dinamicamente para pegar nomes de constraints autogeradas.
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT DISTINCT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu 
            ON tc.constraint_name = ccu.constraint_name 
            AND tc.table_schema = ccu.table_schema
            AND tc.table_name = ccu.table_name
        WHERE 
            tc.table_schema = 'public' AND 
            tc.table_name IN ('ministries', 'event_types', 'teams') AND 
            (tc.constraint_type = 'UNIQUE' OR tc.constraint_type = 'PRIMARY KEY') AND
            (ccu.column_name = 'name' OR ccu.column_name = 'organization_id')
    ) LOOP
        RAISE NOTICE 'Dropping constraint: % from table %', r.constraint_name, r.table_name;
        EXECUTE 'ALTER TABLE public.' || r.table_name || ' DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '" CASCADE';
    END LOOP;
END $$;

-- PASSO 3: Limpeza de Duplicados (Mantém o mais antigo usando CTID - funciona sem coluna ID)
-- É CRÍTICO fazer isso DEPOIS de remover as constraints de unicidade, para que a exclusão funcione.
DELETE FROM public.ministries
WHERE ctid NOT IN (
    SELECT min(ctid)
    FROM public.ministries
    GROUP BY organization_id, LOWER(name)
);

DELETE FROM public.event_types
WHERE ctid NOT IN (
    SELECT min(ctid)
    FROM public.event_types
    GROUP BY organization_id, LOWER(name)
);

DELETE FROM public.teams
WHERE ctid NOT IN (
    SELECT min(ctid)
    FROM public.teams
    GROUP BY organization_id, LOWER(name)
);

-- PASSO 4: Criar os ÍNDICES ÚNICOS CORRETOS e caso-insensitivos
-- Garante que o nome seja único APENAS dentro da mesma organização (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ministries_org_name_idx ON public.ministries (organization_id, LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS event_types_org_name_idx ON public.event_types (organization_id, LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS teams_org_name_idx ON public.teams (organization_id, LOWER(name));
`;

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
                            {/* Corrected to use local state variable setupRepairMsg */}
                            <p className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={16}/> {repairErrorMsg || 'Correção de Vínculo de Contas'}</p>
                            <p>O script <strong className="text-red-900">V22</strong> abaixo corrige um problema persistente onde o banco de dados impedia que igrejas diferentes usassem o mesmo nome de ministério (ex: "Louvor"), e agora também para <strong className="text-red-900">Tipos de Evento e Equipes</strong>. **Esta versão também adiciona os novos campos de WhatsApp.**</p>
                        </div>
                  </div>

                  {/* SQL REPAIR BOX */}
                  <div className="text-left mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <Database size={18} />
                          Script de Atualização (V22)
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
                        {/* Use the App.tsx's handleLogout function */}
                        <button onClick={handleLogout} className="text-brand-secondary hover:underline font-medium text-sm">Sair e tentar outra conta</button>
                     </div>
                  </div>
              </div>
          </div>
      )
  }

  const accessLevel = userProfile?.accessLevel || 'volunteer';
  const roleNames = ministries.map(m => m.name);

  // Permission Logic
  const canManageSchedule = accessLevel === 'admin' || accessLevel === 'leader';
  const canManageVolunteers = accessLevel === 'admin' || accessLevel === 'leader';
  const canManageSettings = accessLevel === 'admin';

  // Notification Logic
  const myNextAssignment = userProfile && accessLevel === 'volunteer' 
    ? services
        .filter(s => new Date(s.date) >= new Date() && s.assignments.some(a => {
            if (a.volunteerId === userProfile.id) return true;
            if (a.teamId) {
                const t = teams.find(team => team.id === a.teamId);
                return t?.memberIds.includes(userProfile.id);
            }
            return false;
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;

  // Helper component for Navigation Items
  const NavItem = ({ id, icon: Icon, label, onClick, isMobile = false }: any) => {
      const isActive = activeTab === id;
      
      if (isMobile) {
          return (
            <button
                onClick={onClick}
                className={`flex flex-col items-center justify-center w-full py-1 transition-colors ${
                    isActive ? 'text-brand-primary' : 'text-brand-muted hover:text-brand-secondary'
                }`}
            >
                <div className={`p-1 rounded-full ${isActive ? 'bg-brand-accent/20' : ''}`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </button>
          );
      }

      return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive
                ? 'bg-brand-accent/30 text-brand-primary' 
                : 'text-brand-muted hover:bg-brand-bg hover:text-brand-secondary'
            }`}
        >
            <Icon size={20} />
            {label}
        </button>
      );
  };

  // --- Onboarding Check Logic ---
  // Admin Onboarding: for new churches / admin users
  const showAdminOnboarding = currentOrg && userProfile && userProfile.accessLevel === 'admin' && !adminOnboardingCompleted[currentOrg.id];

  const handleAdminOnboardingComplete = () => {
    if (currentOrg) {
        setAdminOnboardingCompleted(prev => ({ ...prev, [currentOrg.id]: true }));
        // After admin onboarding, check for user onboarding or go to schedule
        // The useEffect for user onboarding will then trigger if needed.
        if (userProfile && userProfile.accessLevel === 'volunteer' && !userOnboardingCompleted[userProfile.id]) {
            // No explicit action needed here, the conditional rendering will pick it up
        } else {
            setActiveTab('schedule');
        }
    }
  };

  // User Onboarding: for any volunteer user in any church
  const showUserOnboarding = currentOrg && userProfile && userProfile.accessLevel === 'volunteer' && !userOnboardingCompleted[userProfile.id];

  const handleUserOnboardingComplete = () => {
    if (userProfile) {
        setUserOnboardingCompleted(prev => ({ ...prev, [userProfile.id]: true }));
        setActiveTab('schedule'); // Redirect to schedule after user onboarding
    }
  };
  
  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden flex-col md:flex-row">
      
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className={`
        hidden md:flex flex-col w-64 bg-white border-r border-brand-muted/20 relative z-30 transition-all duration-300 ease-in-out print:hidden
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-brand-muted/10 h-20">
            <div className="text-brand-primary p-1 rounded-lg shrink-0">
               <IASDLogo className="w-10 h-10" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-brand-secondary text-lg leading-none truncate" title={currentOrg?.name}>
                  {currentOrg?.name || 'Bem-vindo'}
              </h1>
              <p className="text-xs font-medium text-brand-muted mt-0.5">{currentOrg ? 'Gestão de Escalas' : 'Sem Organização'}</p>
            </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            <NavItem id="schedule" icon={Calendar} label="Escalas e Cultos" onClick={() => handleNavClick('schedule')} />
            
            {canManageVolunteers && (
            <>
                <NavItem id="volunteers" icon={Users} label="Voluntários" onClick={() => handleNavClick('volunteers')} />
                <NavItem id="teams" icon={Shield} label="Equipes" onClick={() => handleNavClick('teams')} />
            </>
            )}

            {canManageSettings && (
            <>
                <NavItem id="ministries" icon={BookOpen} label="Ministérios" onClick={() => handleNavClick('ministries')} />
                <NavItem id="eventTypes" icon={ListFilter} label="Tipos de Evento" onClick={() => handleNavClick('eventTypes')} />
            </>
            )}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-6 border-t border-brand-muted/10 bg-brand-bg/30">
            {userProfile ? (
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg shadow-sm border border-brand-muted/10">
                  <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {userProfile.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={userProfile.name}>{userProfile.name}</p>
                      <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">
                      {accessLevel === 'leader' ? 'Líder' : accessLevel === 'admin' ? 'Admin' : 'Voluntário'}
                      </p>
                  </div>
                  <button onClick={handleLogout} className="text-brand-muted hover:text-red-500 transition-colors" title="Sair">
                      <LogOut size={16} />
                  </button>
              </div>
              
              {/* Notificação Toggle Desktop */}
              <div className="flex justify-center">
                  <NotificationToggle userId={userProfile.id} />
              </div>
            </div>
            ) : (
                <div className="mb-4 text-center">
                    <button onClick={handleLogout} className="text-brand-muted hover:text-red-500 transition-colors flex items-center justify-center gap-2 w-full p-2 hover:bg-white rounded">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            )}
        </div>
      </aside>


      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative print:h-auto print:overflow-visible">
      
          {/* Mobile Header (Simplified) */}
          <header className="md:hidden bg-white border-b border-brand-muted/20 h-16 shrink-0 flex items-center justify-between px-4 shadow-sm z-20 print:hidden">
             <div className="flex items-center gap-3 min-w-0">
                  <div className="text-brand-primary shrink-0"><IASDLogo className="w-8 h-8" /></div>
                  <div className="min-w-0">
                      <h1 className="font-bold text-brand-secondary text-base leading-none truncate">{currentOrg?.name || 'Bem-vindo'}</h1>
                      <p className="text-[10px] text-brand-muted">{currentOrg ? 'Gestão de Escalas' : 'Sem Organização'}</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                 {/* Notificação Toggle Mobile */}
                 <NotificationToggle userId={userProfile?.id} />
                 <button onClick={handleLogout} className="text-brand-muted hover:text-red-500 shrink-0">
                     <LogOut size={20} />
                 </button>
              </div>
          </header>

          {/* Main Scrollable Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 print:p-0 print:overflow-visible"> 
            <div className="max-w-5xl mx-auto print:max-w-none">
                
                {/* Fallback View for No Organization */}
                {!currentOrg && !loading && !needsDbRepair && !showAdminOnboarding && !showUserOnboarding && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                        <div className="bg-brand-bg p-6 rounded-full mb-4">
                            <Building size={48} className="text-brand-muted" />
                        </div>
                        <h2 className="text-xl font-bold text-brand-secondary mb-2">Nenhuma Igreja Vinculada</h2>
                        <p className="text-brand-muted max-w-md mb-6">
                            Você está logado, mas sua conta ainda não faz parte de nenhuma organização. 
                            Peça para o líder do seu ministério te adicionar na equipe.
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                             <button 
                                onClick={() => loadData()} 
                                className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                             >
                                <Search size={18} />
                                Verificar se fui adicionado
                             </button>

                             <button 
                                onClick={() => {
                                    setRepairErrorMsg("Correção de Maiúsculas/Minúsculas no Email");
                                    setNeedsDbRepair(true);
                                }} 
                                className="text-brand-muted hover:text-brand-secondary hover:bg-white border border-transparent hover:border-brand-muted/20 px-6 py-2 rounded-lg text-sm transition-colors"
                             >
                                Sou Admin: Reparar Banco
                             </button>
                        </div>
                    </div>
                )}

                {/* Admin Onboarding Guide - Render only if conditions met */}
                {showAdminOnboarding && currentOrg && userProfile && (
                    <AdminOnboardingGuide
                        organizationId={currentOrg.id}
                        onOnboardingComplete={handleAdminOnboardingComplete}
                        adminUserId={userProfile.id}
                        adminUserName={userProfile.name}
                        onAddMinistry={handleAddMinistry}
                        onAddEventType={handleAddEventType}
                        onAddService={handleAddService}
                        ministries={ministries}
                        eventTypes={eventTypes}
                        volunteers={volunteers}
                        services={services}
                    />
                )}

                {/* User Onboarding Guide - Render only if conditions met AND Admin Onboarding is NOT active */}
                {!showAdminOnboarding && showUserOnboarding && currentOrg && userProfile && (
                    <UserOnboardingGuide
                        onOnboardingComplete={handleUserOnboardingComplete}
                        userName={userProfile.name}
                        userId={userProfile.id}
                        services={services}
                    />
                )}

                {/* Volunteer Notification Banner */}
                {/* Only show if NO onboarding is active */}
                {myNextAssignment && currentOrg && !showAdminOnboarding && !showUserOnboarding && showVolunteerNotification && (
                    <div className="mb-6 bg-brand-accent/20 border border-brand-accent rounded-xl p-4 flex items-start gap-4 animate-fade-in print:hidden relative">
                        <div className="bg-brand-primary text-white p-3 rounded-full">
                            <Bell size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-brand-primary">Você está escalado em breve!</h3>
                            <p className="text-sm text-brand-secondary">
                                {myNextAssignment.title} • {new Date(myNextAssignment.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowVolunteerNotification(false)}
                            className="absolute top-2 right-2 p-1.5 text-brand-muted hover:text-brand-secondary hover:bg-brand-accent/30 rounded-full transition-colors"
                            title="Fechar notificação"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Main Tabs - Only show if ALL onboarding is complete or not applicable */}
                {!showAdminOnboarding && !showUserOnboarding && activeTab === 'schedule' && currentOrg && (
                  <div className="animate-fade-in">
                    <ScheduleView 
                      services={services} 
                      volunteers={volunteers}
                      teams={teams}
                      ministries={ministries}
                      eventTypes={eventTypes}
                      onAddService={handleAddService}
                      onUpdateService={handleUpdateService}
                      onRemoveService={handleRemoveService}
                      onLogAction={handleLogAction}
                      readOnly={!canManageSchedule}
                      currentUserId={userProfile?.id}
                      // Pass currentOrg prop
                      currentOrg={currentOrg}
                    />
                  </div>
                )}

                {!showAdminOnboarding && !showUserOnboarding && activeTab === 'volunteers' && canManageVolunteers && currentOrg && (
                  <div className="animate-fade-in">
                    <VolunteerList 
                      volunteers={volunteers} 
                      roles={roleNames}
                      onAddVolunteer={handleAddVolunteer}
                      onRemoveVolunteer={handleRemoveVolunteer}
                      currentUser={userProfile}
                    />
                  </div>
                )}

                {!showAdminOnboarding && !showUserOnboarding && activeTab === 'teams' && canManageVolunteers && currentOrg && (
                  <div className="animate-fade-in">
                    <TeamList 
                      teams={teams}
                      volunteers={volunteers}
                      onAddTeam={handleAddTeam}
                      onRemoveTeam={handleRemoveTeam}
                      onUpdateTeam={handleUpdateTeam}
                      currentUser={userProfile}
                    />
                  </div>
                )}

                {!showAdminOnboarding && !showUserOnboarding && activeTab === 'ministries' && canManageSettings && currentOrg && (
                  <div className="animate-fade-in">
                    <MinistryList 
                      ministries={ministries}
                      onAddMinistry={handleAddMinistry}
                      onRemoveMinistry={handleRemoveMinistry}
                    />
                  </div>
                )}

                {!showAdminOnboarding && !showUserOnboarding && activeTab === 'eventTypes' && canManageSettings && currentOrg && (
                  <div className="animate-fade-in">
                    <EventTypeList 
                      eventTypes={eventTypes}
                      onAddEventType={handleAddEventType}
                      onRemoveEventType={handleRemoveEventType}
                    />
                  </div>
                )}

            </div>
          </main>

          {/* --- MOBILE BOTTOM NAVIGATION --- */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-muted/20 h-16 flex items-center justify-around px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
              <NavItem isMobile={true} id="schedule" icon={Calendar} label="Escalas" onClick={() => handleNavClick('schedule')} />
              
              {canManageVolunteers && currentOrg && (
                <>
                  <NavItem isMobile={true} id="volunteers" icon={Users} label="Pessoas" onClick={() => handleNavClick('volunteers')} />
                  <NavItem isMobile={true} id="teams" icon={Shield} label="Equipes" onClick={() => handleNavClick('teams')} />
                </>
              )}

              {canManageSettings && currentOrg && (
                 <button
                    onClick={() => setShowConfigMenu(true)} // Open config menu overlay
                    className={`flex flex-col items-center justify-center w-full py-1 transition-colors ${
                        activeTab === 'ministries' || activeTab === 'eventTypes' ? 'text-brand-primary' : 'text-brand-muted hover:text-brand-secondary'
                    }`}
                >
                    <div className={`p-1 rounded-full ${activeTab === 'ministries' || activeTab === 'eventTypes' ? 'bg-brand-accent/20' : ''}`}>
                        <Settings size={24} strokeWidth={activeTab === 'ministries' || activeTab === 'eventTypes' ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-medium mt-0.5">Config</span>
                </button>
              )}
          </nav>

          {/* --- MOBILE CONFIG MENU OVERLAY --- */}
          {showConfigMenu && (
            <div 
                className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center animate-fade-in print:hidden"
                onClick={() => setShowConfigMenu(false)} // Close on background click
            >
                <div 
                    className="bg-white p-6 rounded-t-2xl shadow-lg w-full max-w-sm"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <h3 className="text-xl font-bold text-brand-secondary mb-4">Configurações</h3>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { handleNavClick('ministries'); setShowConfigMenu(false); }}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-brand-bg hover:bg-brand-accent/20 text-brand-secondary"
                        >
                            <BookOpen size={20} /> Ministérios
                        </button>
                        <button
                            onClick={() => { handleNavClick('eventTypes'); setShowConfigMenu(false); }}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-brand-bg hover:bg-brand-accent/20 text-brand-secondary"
                        >
                            <ListFilter size={20} /> Tipos de Evento
                        </button>
                        <button 
                            onClick={() => setShowConfigMenu(false)}
                            className="mt-4 px-4 py-2.5 rounded-lg text-sm font-medium border border-brand-muted/20 text-brand-muted hover:bg-brand-bg"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default App;