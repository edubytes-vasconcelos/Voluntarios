
export type RoleType = string;

export type AccessLevel = 'admin' | 'leader' | 'volunteer';

export interface Ministry {
  id?: string; // DB ID (uuid)
  organizationId?: string;
  name: string;
  icon: string;
}

export interface EventType {
  id: string;
  organizationId?: string;
  name: string;
  color: string; // Tailwind color class (e.g., 'bg-blue-500')
}

export interface Volunteer {
  id: string;
  organizationId?: string;
  name: string;
  roles: RoleType[];
  email?: string;
  unavailableDates?: string[]; // ISO Date strings
  avatarUrl?: string;
  accessLevel?: AccessLevel; // Novo campo para controle de permissão
  whatsappNumber?: string; // NOVO: Número de WhatsApp
  receiveWhatsappNotifications?: boolean; // NOVO: Preferência de notificações via WhatsApp
}

export interface Team {
  id: string;
  organizationId?: string;
  name: string;
  memberIds: string[]; // IDs dos voluntários que compõem a equipe
}

export type AssignmentStatus = 'pending' | 'confirmed' | 'declined';

export interface Assignment {
  role: RoleType;
  volunteerId?: string; // Agora opcional
  teamId?: string;      // Novo campo opcional para equipe
  status?: AssignmentStatus; // Novo campo para RSVP
  declineReason?: string; // Novo campo para motivo da recusa
}

export interface ServiceEvent {
  id: string;
  organizationId?: string;
  date: string; // ISO Date string
  title: string;
  eventTypeId?: string; // Optional link to the type definition
  assignments: Assignment[];
}

export interface GenerateScheduleRequest {
  startDate: string;
  endDate: string;
  volunteers: Volunteer[];
  existingServices: ServiceEvent[];
  requirements: string; // User prompt for specific needs
}

export interface GeneratedScheduleResponse {
  services: {
    date: string;
    title: string;
    assignments: {
      role: RoleType;
      volunteerName: string; // AI returns names for ease, we map back to IDs
    }[];
  }[];
}

export interface AuditLogEntry {
  user_email?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resource_id: string;
  details?: any;
}

export interface Organization {
  id: string;
  name: string;
}