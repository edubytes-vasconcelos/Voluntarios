
import { supabase } from './supabaseClient';
import { Volunteer, Ministry, ServiceEvent, EventType, Team, AuditLogEntry, Organization } from '../types';

let currentOrganizationId: string | null = null;

export const setDbOrganizationId = (id: string) => {
  currentOrganizationId = id;
};

// Limpa o contexto ao fazer logout
export const clearDbOrganizationId = () => {
  currentOrganizationId = null;
};

export const db = {
  // --- Profile Claiming (New) ---
  async claimProfileByEmail(email: string, authId: string): Promise<boolean> {
      // Chama a função RPC para unificar o perfil criado pelo líder com o login atual
      const { data, error } = await supabase.rpc('claim_profile_by_email', {
          user_email: email,
          new_user_id: authId
      });

      if (error) {
          // Se a função não existir, lançamos erro específico para a UI pedir atualização do SQL
          if (error.code === '42883') throw new Error("MISSING_DB_FUNCTION");
          console.error("Erro no auto-claim:", error);
          throw error; // Relança o erro para ser tratado no App.tsx
      }

      return data as boolean;
  },

  // --- Organizations (SaaS) ---
  
  async createOrganization(orgName: string, adminUser: { id: string, email: string, name: string }) {
    console.log("Tentando criar organização via RPC...", { orgName, adminUser });

    // TENTATIVA ÚNICA: Via RPC (Remote Procedure Call)
    // Usamos 'security definer' no banco para ignorar as regras de RLS durante a criação inicial
    const { data, error } = await supabase.rpc('create_church_and_admin', {
      church_name: orgName,
      admin_name: adminUser.name,
      admin_email: adminUser.email,
      admin_id: adminUser.id,
      admin_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminUser.name)}&background=004a5e&color=fff`
    });

    // CRÍTICO: Verifique o objeto de erro EXPLICITAMENTE após a chamada RPC
    if (error) {
        console.error("Erro RPC:", error);
        
        // Se o erro for de função inexistente, permissão, ou VIOLAÇÃO DE CHAVE ÚNICA (23505),
        // lançamos o erro específico para que a UI mostre o Script SQL de correção.
        if (error.code === '42883' || error.code === '23505' || error.message?.includes('violates unique constraint')) {
             throw new Error("MISSING_DB_FUNCTION"); 
        }
        
        throw error; // Relança qualquer outro erro retornado pela RPC
    }

    return data;
  },

  async getMyOrganization(): Promise<Organization | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return null;

      // Busca dados do voluntário para saber a ID da organização
      const { data: profile, error: profileError } = await supabase
        .from('volunteers')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profileError) throw profileError; // Joga o erro para o catch centralizado

      if (!profile || !profile.organization_id) {
        return null;
      }

      // Com a ID, busca o nome da organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (orgError) throw orgError; // Joga o erro para o catch centralizado

      if (!org) return null;

      setDbOrganizationId(org.id);
      return { id: org.id, name: org.name };

    } catch (error: any) {
      // Bloco CATCH centralizado para toda a função
      console.error("Erro em getMyOrganization:", error);

      if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error("NETWORK_ERROR"); // Padroniza o erro de rede
      }
      if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
        throw new Error("DB_POLICY_ERROR"); // Padroniza erro de RLS
      }
      
      // Se não for um erro conhecido, relança o original
      throw error;
    }
  },

  // --- Volunteers ---
  async getVolunteers(): Promise<Volunteer[]> {
    if (!currentOrganizationId) return [];

    const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('organization_id', currentOrganizationId) // Filtro Explícito
        .order('name');
        
    if (error) throw error;
    
    return data.map((v: any) => ({
      id: v.id,
      organizationId: v.organization_id,
      name: v.name,
      roles: v.roles || [],
      avatarUrl: v.avatar_url,
      email: v.email,
      accessLevel: v.access_level || 'volunteer',
      whatsappNumber: v.whatsapp_number, // NOVO: Mapeia o campo do banco
      receiveWhatsappNotifications: v.receive_whatsapp_notifications // NOVO: Mapeia o campo do banco
    }));
  },

  async addVolunteer(volunteer: Volunteer) {
    const orgId = currentOrganizationId || volunteer.organizationId;
    if (!orgId) throw new Error("Organização não identificada.");

    const { error } = await supabase.from('volunteers').insert({
      id: volunteer.id,
      organization_id: orgId,
      name: volunteer.name,
      roles: volunteer.roles,
      avatar_url: volunteer.avatarUrl,
      email: volunteer.email,
      access_level: volunteer.accessLevel,
      whatsapp_number: volunteer.whatsappNumber, // NOVO: Insere o campo
      receive_whatsapp_notifications: volunteer.receiveWhatsappNotifications // NOVO: Insere o campo
    });
    if (error) throw error;
  },

  async removeVolunteer(id: string) {
    const { error } = await supabase.from('volunteers').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Teams ---
  async getTeams(): Promise<Team[]> {
    if (!currentOrganizationId) return [];

    const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('organization_id', currentOrganizationId); // Filtro Explícito

    if (error) throw error;
    
    return data.map((t: any) => ({
      id: t.id,
      organizationId: t.organization_id,
      name: t.name,
      memberIds: t.member_ids || []
    }));
  },

  async addTeam(team: Team) {
    if (!currentOrganizationId) throw new Error("No Organization Context");
    const { error } = await supabase.from('teams').insert({
      id: team.id,
      organization_id: currentOrganizationId,
      name: team.name,
      member_ids: team.memberIds
    });
    if (error) throw error;
  },

  async updateTeam(team: Team) {
    const { error } = await supabase.from('teams').update({
      name: team.name,
      member_ids: team.memberIds
    }).eq('id', team.id);
    if (error) throw error;
  },

  async removeTeam(id: string) {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Ministries ---
  async getMinistries(): Promise<Ministry[]> {
    if (!currentOrganizationId) return [];

    const { data, error } = await supabase
        .from('ministries')
        .select('*')
        .eq('organization_id', currentOrganizationId); // Filtro Explícito

    if (error) throw error;
    return data.map((m: any) => ({
        id: m.id,
        organizationId: m.organization_id,
        name: m.name,
        icon: m.icon
    }));
  },

  async addMinistry(ministry: Ministry) {
    if (!currentOrganizationId) throw new Error("No Organization Context");
    const { error } = await supabase.from('ministries').insert({
      organization_id: currentOrganizationId,
      name: ministry.name,
      icon: ministry.icon
    });
    if (error) throw error;
  },

  async removeMinistry(name: string) {
    const { error } = await supabase.from('ministries').delete().eq('name', name);
    if (error) throw error;
  },

  // --- Event Types ---
  async getEventTypes(): Promise<EventType[]> {
    if (!currentOrganizationId) return [];

    const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('organization_id', currentOrganizationId); // Filtro Explícito
        
    if (error) throw error;
    return data || [];
  },

  async addEventType(eventType: EventType) {
    if (!currentOrganizationId) throw new Error("No Organization Context");
    const { error } = await supabase.from('event_types').insert({
        id: eventType.id,
        organization_id: currentOrganizationId,
        name: eventType.name,
        color: eventType.color
    });
    if (error) throw error;
  },

  async removeEventType(id: string) {
    const { error } = await supabase.from('event_types').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Services / Schedule ---
  async getServices(): Promise<ServiceEvent[]> {
    if (!currentOrganizationId) return [];
    
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', currentOrganizationId); // Filtro Explícito

    if (error) throw error;
    
    return data.map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      date: s.date,
      title: s.title,
      eventTypeId: s.event_type_id,
      assignments: s.assignments || []
    }));
  },

  async addService(service: ServiceEvent) {
    if (!currentOrganizationId) throw new Error("No Organization Context");
    const { error } = await supabase.from('services').insert({
      id: service.id,
      organization_id: currentOrganizationId,
      date: service.date,
      title: service.title,
      event_type_id: service.eventTypeId,
      assignments: service.assignments
    });
    if (error) throw error;
  },

  async updateService(service: ServiceEvent) {
    const { error } = await supabase.from('services').update({
      date: service.date,
      title: service.title,
      event_type_id: service.eventTypeId,
      assignments: service.assignments
    }).eq('id', service.id);
    if (error) throw error;
  },

  async removeService(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Audit Logs ---
  async addAuditLog(entry: AuditLogEntry) {
    if (!currentOrganizationId) return; 
    const { error } = await supabase.from('audit_logs').insert({
        organization_id: currentOrganizationId,
        user_email: entry.user_email,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resource_id,
        details: entry.details
    });
    if (error) console.error("Failed to write audit log:", error);
  },

  // --- Push Notifications ---
  async savePushSubscription(userId: string, subscription: PushSubscription) {
    // Upsert subscription for user. 
    // Requires table 'push_subscriptions' with columns: id, user_id, subscription (jsonb)
    try {
        const { error } = await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            subscription: JSON.parse(JSON.stringify(subscription)) // Ensure plain JSON
        }, { onConflict: 'user_id, subscription' }); // Avoid duplicates for same device

        if (error) {
            // Se tabela não existe, apenas loga e ignora para não quebrar o app
            if (error.code === '42P01') { 
                console.warn("Tabela push_subscriptions não existe. Execute o script SQL de atualização.");
                return;
            }
            throw error;
        }
    } catch (e) {
        console.error("Erro ao salvar assinatura push:", e);
    }
  }
};