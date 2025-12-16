
import { Volunteer, ServiceEvent, RoleType, Ministry, EventType } from '@/types';
import { 
  BookOpen, Music, Video, Users, 
  Baby, Car, Coffee, Mic, Shield, Heart, Camera, Speaker
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  { id: 'book-open', icon: BookOpen, label: 'Ensino' },
  { id: 'music', icon: Music, label: 'Música' },
  { id: 'video', icon: Video, label: 'Vídeo' },
  { id: 'camera', icon: Camera, label: 'Foto' },
  { id: 'mic', icon: Mic, label: 'Voz' },
  { id: 'speaker', icon: Speaker, label: 'Som' },
  { id: 'users', icon: Users, label: 'Pessoas' },
  { id: 'heart', icon: Heart, label: 'Cuidado' },
  { id: 'baby', icon: Baby, label: 'Infantil' },
  { id: 'car', icon: Car, label: 'Carros' },
  { id: 'shield', icon: Shield, label: 'Segurança' },
  { id: 'coffee', icon: Coffee, label: 'Comunhão' },
];

export const INITIAL_MINISTRIES: Ministry[] = [
  { name: 'Mídia', icon: 'video' },
  { name: 'Louvor', icon: 'music' },
  { name: 'Recepção', icon: 'users' },
  { name: 'Infantil', icon: 'baby' },
  { name: 'Estacionamento', icon: 'car' }
];

export const INITIAL_EVENT_TYPES: EventType[] = [
  { id: 'type-1', name: 'Culto de Domingo', color: 'bg-blue-500' },
  { id: 'type-2', name: 'Culto de Jovens', color: 'bg-orange-500' },
  { id: 'type-3', name: 'Escola Bíblica', color: 'bg-green-500' },
  { id: 'type-4', name: 'Oração', color: 'bg-purple-500' },
];

// Helper to keep compatibility with parts of the app that just want names initially
export const INITIAL_ROLES: RoleType[] = INITIAL_MINISTRIES.map(m => m.name);

export const INITIAL_VOLUNTEERS: Volunteer[] = [
  { id: '1', name: 'Ana Silva', roles: ['Louvor', 'Recepção'], avatarUrl: 'https://picsum.photos/100/100?random=1' },
  { id: '2', name: 'Carlos Souza', roles: ['Mídia', 'Estacionamento'], avatarUrl: 'https://picsum.photos/100/100?random=2' },
  { id: '3', name: 'Beatriz Costa', roles: ['Infantil', 'Recepção'], avatarUrl: 'https://picsum.photos/100/100?random=3' },
  { id: '4', name: 'Daniel Oliveira', roles: ['Louvor'], avatarUrl: 'https://picsum.photos/100/100?random=4' },
  { id: '5', name: 'Eduardo Lima', roles: ['Estacionamento', 'Mídia'], avatarUrl: 'https://picsum.photos/100/100?random=5' },
  { id: '6', name: 'Fernanda Rocha', roles: ['Infantil'], avatarUrl: 'https://picsum.photos/100/100?random=6' },
  { id: '7', name: 'Gabriel Santos', roles: ['Mídia', 'Louvor'], avatarUrl: 'https://picsum.photos/100/100?random=7' },
  { id: '8', name: 'Helena Martins', roles: ['Recepção'], avatarUrl: 'https://picsum.photos/100/100?random=8' },
];

export const INITIAL_SERVICES: ServiceEvent[] = [
  {
    id: 'evt-1',
    date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    title: 'Culto de Domingo',
    eventTypeId: 'type-1',
    assignments: [
      { role: 'Louvor', volunteerId: '1' },
      { role: 'Mídia', volunteerId: '2' },
    ]
  }
];