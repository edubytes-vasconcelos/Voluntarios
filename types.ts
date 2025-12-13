export type RoleType = string;

export interface Ministry {
  name: string;
  icon: string;
}

export interface EventType {
  id: string;
  name: string;
  color: string; // Tailwind color class (e.g., 'bg-blue-500')
}

export interface Volunteer {
  id: string;
  name: string;
  roles: RoleType[];
  email?: string;
  unavailableDates?: string[]; // ISO Date strings
  avatarUrl?: string;
}

export interface Assignment {
  role: RoleType;
  volunteerId: string;
}

export interface ServiceEvent {
  id: string;
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