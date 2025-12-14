
import { supabase } from './supabaseClient';
import { Volunteer, Ministry, ServiceEvent, EventType, Team, AuditLogEntry } from '../types';

// Convert DB snake_case to CamelCase if necessary, 
// but here we align DB columns to types or map them manually.

export const db = {
  // --- Volunteers ---
  async getVolunteers(): Promise<Volunteer[]> {
    const { data, error } = await supabase.from('volunteers').select('*');
    if (error) throw error;
    
    return data.map((v: any) => ({
      id: v.id,
      name: v.name,
      roles: v.roles || [], // Ensure array
      avatarUrl: v.avatar_url,
      email: v.email,
      accessLevel: v.access_level || 'volunteer' // Default to volunteer if null
    }));
  },

  async addVolunteer(volunteer: Volunteer) {
    const { error } = await supabase.from('volunteers').insert({
      id: volunteer.id,
      name: volunteer.name,
      roles: volunteer.roles,
      avatar_url: volunteer.avatarUrl,
      email: volunteer.email,
      access_level: volunteer.accessLevel
    });
    if (error) throw error;
  },

  async removeVolunteer(id: string) {
    const { error } = await supabase.from('volunteers').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Teams ---
  async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) throw error;
    
    return data.map((t: any) => ({
      id: t.id,
      name: t.name,
      memberIds: t.member_ids || [] // Fixed: map snake_case DB column to camelCase Type property
    }));
  },

  async addTeam(team: Team) {
    const { error } = await supabase.from('teams').insert({
      id: team.id,
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
    const { data, error } = await supabase.from('ministries').select('*');
    if (error) throw error;
    return data || [];
  },

  async addMinistry(ministry: Ministry) {
    const { error } = await supabase.from('ministries').insert({
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
    const { data, error } = await supabase.from('event_types').select('*');
    if (error) throw error;
    return data || [];
  },

  async addEventType(eventType: EventType) {
    const { error } = await supabase.from('event_types').insert(eventType);
    if (error) throw error;
  },

  async removeEventType(id: string) {
    const { error } = await supabase.from('event_types').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Services / Schedule ---
  async getServices(): Promise<ServiceEvent[]> {
    const { data, error } = await supabase.from('services').select('*');
    if (error) throw error;
    
    return data.map((s: any) => ({
      id: s.id,
      date: s.date,
      title: s.title,
      eventTypeId: s.event_type_id,
      assignments: s.assignments || []
    }));
  },

  async addService(service: ServiceEvent) {
    const { error } = await supabase.from('services').insert({
      id: service.id,
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
    // We don't throw error here to avoid blocking the main action if logging fails
    const { error } = await supabase.from('audit_logs').insert(entry);
    if (error) console.error("Failed to write audit log:", error);
  }
};
