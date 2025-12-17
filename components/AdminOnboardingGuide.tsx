
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Ministry, EventType, ServiceEvent, Volunteer, Assignment } from '../types';
import {
  Sparkles, ChevronRight, CheckCircle2, BookOpen, Tag, Calendar, User, Music, Users, AlertCircle,
  Video, Camera, Mic, Speaker, Heart, Baby, Car, Shield, Coffee, X, Loader2
} from 'lucide-react';
import { AVAILABLE_ICONS } from '../constants'; // Importe os ícones disponíveis
import useLocalStorage from '../hooks/useLocalStorage';

interface AdminOnboardingGuideProps { // RENAMED: Interface name
  organizationId: string;
  onOnboardingComplete: () => void;
  adminUserId: string;
  adminUserName: string;
  onAddMinistry: (ministry: Ministry) => Promise<void> | void;
  onAddEventType: (eventType: EventType) => Promise<void> | void;
  onAddService: (service: ServiceEvent) => Promise<void> | void;
  ministries: Ministry[]; // Para verificar se já foram adicionados
  eventTypes: EventType[]; // Para verificar se já foram adicionados
  volunteers: Volunteer[]; // Para usar no primeiro evento
  services: ServiceEvent[]; // NEW: For checking if a service was added
}

// Custom Logo Component mimicking the IASD diamond structure (duplicated for self-contained component)
const IASDLogoSmall = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M50 5 L95 50 L50 95 L5 50 Z" />
      <path d="M50 5 L50 95" />
      <path d="M5 50 Q 27.5 50 50 27.5" />
      <path d="M95 50 Q 72.5 50 50 27.5" />
      <path d="M5 50 Q 27.5 50 50 72.5" />
      <path d="M95 50 Q 72.5 50 50 72.5" />
    </svg>
);


const COLORS = [
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Verde', value: 'bg-green-500' },
  { label: 'Laranja', value: 'bg-orange-500' },
  { label: 'Roxo', value: 'bg-purple-500' },
  { label: 'Rosa', value: 'bg-pink-500' },
  { label: 'Vermelho', value: 'bg-red-500' },
  { label: 'Cinza', value: 'bg-slate-500' },
  { label: 'Dourado', value: 'bg-yellow-500' },
];

const AdminOnboardingGuide: React.FC<AdminOnboardingGuideProps> = ({ // RENAMED: Component name
  organizationId,
  onOnboardingComplete,
  adminUserId,
  adminUserName,
  onAddMinistry,
  onAddEventType,
  onAddService,
  ministries,
  eventTypes,
  volunteers,
  services, // Destructure the new prop
}) => {
  // Use localStorage to persist the current step for the specific organization
  const [currentStep, setCurrentStep] = useLocalStorage<number>(`admin_onboarding_step_${organizationId}`, 0); // UPDATED: Key name for admin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Ministry Form States (Step 1) ---
  const [newMinistryName, setNewMinistryName] = useState('');
  const [selectedMinistryIcon, setSelectedMinistryIcon] = useState('music');
  const renderMinistryIcon = (iconId: string, size = 18, className = "") => {
    const IconComponent = AVAILABLE_ICONS.find(i => i.id === iconId)?.icon || BookOpen;
    return <IconComponent size={size} className={className} />;
  };

  // --- Event Type Form States (Step 2) ---
  const [newEventTypeName, setNewEventTypeName] = useState('');
  const [selectedEventTypeColor, setSelectedEventTypeColor] = useState(COLORS[0].value);

  // --- First Service Form States (Step 3) ---
  const [newServiceDate, setNewServiceDate] = useState('');
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState('');
  const [newServiceTitle, setNewServiceTitle] = useState('');

  // Auto-fill initial name for admin volunteer (needed for step 3)
  const adminVolunteer = useMemo(() => volunteers.find(v => v.id === adminUserId), [volunteers, adminUserId]);

  useEffect(() => {
    // If onboarding is already completed, just call the prop and exit.
    if (currentStep === 4) {
      onOnboardingComplete();
    }
  }, [currentStep, onOnboardingComplete]);


  const handleNextStep = () => {
    setError(null); // Clear error on next step attempt
    setCurrentStep(prev => prev + 1);
  };

  const handleSkipOnboarding = () => {
      // Removed window.confirm() for immediate skip
      onOnboardingComplete(); // Mark as completed in App.tsx and trigger unmount
      // Removed: setCurrentStep(4); // No need to update internal state if component will unmount
  };


  // --- STEP 1: ADD MINISTRY ---
  const handleAddFirstMinistry = async () => {
    const trimmedName = newMinistryName.trim();
    if (!trimmedName) {
      setError("Por favor, digite o nome do ministério.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onAddMinistry({ name: trimmedName, icon: selectedMinistryIcon });
      // Ensure the admin volunteer has this role
      if (adminVolunteer && !adminVolunteer.roles.includes(trimmedName)) {
        // This should be handled at a higher level (App.tsx -> db.updateVolunteer)
        // For onboarding simplicity, we assume the admin's profile is updated with this role,
        // or they will add it later in the volunteer list.
      }
      handleNextStep();
    } catch (e: any) {
      setError(e.message === 'MINISTRY_EXISTS' ? `O ministério "${trimmedName}" já existe.` : "Erro ao adicionar ministério. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: ADD EVENT TYPE ---
  const handleAddFirstEventType = async () => {
    const trimmedName = newEventTypeName.trim();
    if (!trimmedName) {
      setError("Por favor, digite o nome do tipo de evento.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onAddEventType({
        id: `onb-evt-${Date.now()}-${organizationId}`, // Generate unique ID
        name: trimmedName,
        color: selectedEventTypeColor,
      });
      handleNextStep();
    } catch (e: any) {
      setError(e.message === 'EVENT_TYPE_EXISTS' ? `O tipo de evento "${trimmedName}" já existe.` : "Erro ao adicionar tipo de evento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 3: CREATE FIRST SERVICE ---
  const handleCreateFirstService = async () => {
    if (!newServiceDate || !selectedServiceTypeId) {
      setError("Por favor, selecione uma data e um tipo de evento.");
      return;
    }
    const serviceTitle = newServiceTitle.trim() || eventTypes.find(et => et.id === selectedServiceTypeId)?.name || 'Novo Evento';
    
    setLoading(true);
    setError(null);

    try {
      // Find the first ministry created during onboarding (e.g., "Louvor")
      const firstMinistry = ministries.length > 0 ? ministries[0].name : 'Louvor';
      
      const newService: ServiceEvent = {
        id: `onb-svc-${Date.now()}-${organizationId}`,
        date: newServiceDate,
        title: serviceTitle,
        eventTypeId: selectedServiceTypeId,
        assignments: adminVolunteer ? [{ role: firstMinistry, volunteerId: adminVolunteer.id, status: 'pending' }] : [],
      };
      await onAddService(newService);
      handleNextStep();
    } catch (e: any) {
      setError("Erro ao criar o primeiro evento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Ensure initial admin user has at least one role to be assigned in step 3
  useEffect(() => {
    if (currentStep === 3 && adminVolunteer && ministries.length > 0) {
      const firstMinistryName = ministries[0].name;
      if (!adminVolunteer.roles.includes(firstMinistryName)) {
        // Ideally, this should be handled when the ministry is added, but as a fallback:
        // You might need a way to update the volunteer's roles directly from here.
        // For simplicity, we'll assume the admin's profile implicitly gets roles they create,
        // or a manual update from App.tsx/db.ts ensures they have at least one.
        // For now, if no role, the assignment will be empty, which is acceptable.
      }
      
      // Pre-select first event type if available
      if (eventTypes.length > 0 && !selectedServiceTypeId) {
          setSelectedServiceTypeId(eventTypes[0].id);
          setNewServiceTitle(eventTypes[0].name);
      }
      
      // Pre-select next Sunday for the service date
      if (!newServiceDate) {
          const today = new Date();
          const nextSunday = new Date(today);
          const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
          const daysToAdd = (0 - dayOfWeek + 7) % 7; 
          nextSunday.setDate(today.getDate() + daysToAdd);
          
          const year = nextSunday.getFullYear();
          const month = String(nextSunday.getMonth() + 1).padStart(2, '0');
          const day = String(nextSunday.getDate()).padStart(2, '0');
          setNewServiceDate(`${year}-${month}-${day}`);
      }

    }
  }, [currentStep, adminVolunteer, ministries, eventTypes, newServiceDate, selectedServiceTypeId]);


  const stepContent = [
    // Step 0: Welcome
    <div key="step-0" className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <IASDLogoSmall className="w-20 h-20 text-brand-primary mb-4" />
      <h3 className="text-2xl font-bold text-brand-secondary mb-2">Bem-vindo(a), {adminUserName}!</h3>
      <p className="text-brand-muted mb-6 max-w-md">
        Parabéns por cadastrar sua igreja! Vamos configurar seu aplicativo de escalas em poucos passos para que você possa começar a organizar seus voluntários.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <button
        onClick={handleNextStep}
        className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
      >
        Começar <ChevronRight size={18} />
      </button>
      <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm">Pular Onboarding</button>
    </div>,

    // Step 1: Add Ministries
    <div key="step-1" className="p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-secondary mb-2 flex items-center gap-2">
        <span className="bg-brand-primary text-white p-2 rounded-full"><BookOpen size={20}/></span>
        1. Cadastre seu Primeiro Ministério
      </h3>
      <p className="text-brand-muted mb-4">
        Comece adicionando uma área de serviço da sua igreja (ex: "Louvor", "Recepção", "Mídia").
        Você pode adicionar mais depois.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">Escolha um Ícone</label>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ICONS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedMinistryIcon(item.id)}
                            className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 min-w-[50px] ${
                                selectedMinistryIcon === item.id
                                    ? 'bg-brand-primary text-white border-brand-primary ring-2 ring-brand-accent ring-offset-1'
                                    : 'bg-brand-bg/30 border-brand-muted/20 text-brand-muted hover:bg-brand-accent/20 hover:text-brand-primary'
                            }`}
                            title={item.label}
                        >
                            {renderMinistryIcon(item.id, 18)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">Nome do Ministério</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary">
                            {renderMinistryIcon(selectedMinistryIcon, 18)}
                        </div>
                        <input
                            type="text"
                            value={newMinistryName}
                            onChange={(e) => setNewMinistryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFirstMinistry()}
                            disabled={loading}
                            className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50 disabled:opacity-70"
                            placeholder="Ex: Louvor"
                        />
                    </div>
                    <button
                        onClick={handleAddFirstMinistry}
                        disabled={!newMinistryName.trim() || loading || ministries.some(m => m.name.toLowerCase() === newMinistryName.trim().toLowerCase())}
                        className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-brand-muted/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin"/> : 'Adicionar'}
                    </button>
                </div>
            </div>
      </div>
       {ministries.length > 0 && (
           <div className="mt-4 p-2 bg-brand-bg rounded-lg text-sm flex items-center justify-between">
               <span className="text-brand-secondary font-medium flex items-center gap-2"><CheckCircle2 size={16}/> Ministério "{ministries[0].name}" adicionado!</span>
               <button onClick={handleNextStep} className="text-brand-primary hover:underline flex items-center gap-1">Próximo <ChevronRight size={14}/></button>
           </div>
       )}
       <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm w-full">Pular Onboarding</button>
    </div>,

    // Step 2: Add Event Type
    <div key="step-2" className="p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-secondary mb-2 flex items-center gap-2">
        <span className="bg-brand-primary text-white p-2 rounded-full"><Tag size={20}/></span>
        2. Crie seu Primeiro Tipo de Evento
      </h3>
      <p className="text-brand-muted mb-4">
        Defina um tipo de evento para organizar sua escala (ex: "Culto de Domingo", "Estudo Bíblico").
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">Cor de Identificação</label>
                <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => setSelectedEventTypeColor(color.value)}
                            className={`w-8 h-8 rounded-full transition-all ${color.value} ${
                                selectedEventTypeColor === color.value
                                    ? 'ring-2 ring-brand-primary ring-offset-2 scale-110'
                                    : 'hover:opacity-80'
                            }`}
                            title={color.label}
                        />
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">Nome do Tipo de Evento</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                            <Tag size={18} />
                        </div>
                        <input
                            type="text"
                            value={newEventTypeName}
                            onChange={(e) => setNewEventTypeName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFirstEventType()}
                            disabled={loading}
                            className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50 disabled:opacity-70"
                            placeholder="Ex: Culto de Domingo"
                        />
                    </div>
                    <button
                        onClick={handleAddFirstEventType}
                        disabled={!newEventTypeName.trim() || loading || eventTypes.some(et => et.name.toLowerCase() === newEventTypeName.trim().toLowerCase())}
                        className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-brand-muted/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin"/> : 'Adicionar'}
                    </button>
                </div>
            </div>
      </div>
      {eventTypes.length > 0 && (
           <div className="mt-4 p-2 bg-brand-bg rounded-lg text-sm flex items-center justify-between">
               <span className="text-brand-secondary font-medium flex items-center gap-2"><CheckCircle2 size={16}/> Tipo "{eventTypes[0].name}" adicionado!</span>
               <button onClick={handleNextStep} className="text-brand-primary hover:underline flex items-center gap-1">Próximo <ChevronRight size={14}/></button>
           </div>
       )}
       <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm w-full">Pular Onboarding</button>
    </div>,

    // Step 3: Create First Service
    <div key="step-3" className="p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-secondary mb-2 flex items-center gap-2">
        <span className="bg-brand-primary text-white p-2 rounded-full"><Calendar size={20}/></span>
        3. Crie seu Primeiro Evento (Culto)
      </h3>
      <p className="text-brand-muted mb-4">
        Vamos agendar seu primeiro evento. O assistente irá preencher automaticamente você ({adminUserName}) para o primeiro ministério que você criou.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-brand-secondary mb-1">Data do Evento</label>
            <input type="date" value={newServiceDate} onChange={(e) => setNewServiceDate(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-3 py-2 bg-brand-bg/50 focus:ring-1 focus:ring-brand-primary outline-none"/>
        </div>
        <div>
            <label className="block text-sm font-medium text-brand-secondary mb-1">Tipo de Evento</label>
            <select value={selectedServiceTypeId} onChange={(e) => {setSelectedServiceTypeId(e.target.value); setNewServiceTitle(eventTypes.find(et => et.id === e.target.value)?.name || '');}} className="w-full border border-brand-muted/30 rounded-lg px-3 py-2 bg-brand-bg/50 focus:ring-1 focus:ring-brand-primary outline-none">
                <option value="">Selecione...</option>
                {eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-brand-secondary mb-1">Nome do Evento (Opcional)</label>
            <input type="text" value={newServiceTitle} onChange={(e) => setNewServiceTitle(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-3 py-2 bg-brand-bg/50 focus:ring-1 focus:ring-brand-primary outline-none" placeholder="Ex: Culto de Lançamento"/>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
            onClick={handleCreateFirstService}
            disabled={loading || !newServiceDate || !selectedServiceTypeId}
            className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-brand-muted/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
            {loading ? <Loader2 size={18} className="animate-spin"/> : 'Criar Evento'}
        </button>
      </div>
       {volunteers.length > 0 && ministries.length > 0 && eventTypes.length > 0 && services.length > 0 && currentStep === 3 && ( // Simple check that something was added
           <div className="mt-4 p-2 bg-brand-bg rounded-lg text-sm flex items-center justify-between">
               <span className="text-brand-secondary font-medium flex items-center gap-2"><CheckCircle2 size={16}/> Primeiro evento criado!</span>
               <button onClick={handleNextStep} className="text-brand-primary hover:underline flex items-center gap-1">Próximo <ChevronRight size={14}/></button>
           </div>
       )}
       <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm w-full">Pular Onboarding</button>
    </div>,

    // Step 4: Completion
    <div key="step-4" className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <CheckCircle2 size={48} className="text-green-500 mb-4" />
      <h3 className="text-2xl font-bold text-brand-secondary mb-2">Configuração Concluída!</h3>
      <p className="text-brand-muted mb-6 max-w-md">
        Seu aplicativo de escalas está pronto para uso. Você pode gerenciar voluntários, equipes, ministérios e eventos a partir do painel.
      </p>
      <button
        onClick={onOnboardingComplete} // Triggers App.tsx to mark onboarding as complete
        className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
      >
        Ir para o Painel <ChevronRight size={18} />
      </button>
    </div>,
  ];

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {stepContent[currentStep]}
      </div>
    </div>
  );
};

export default AdminOnboardingGuide; // RENAMED: Exported component name