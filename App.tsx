import React, { useState, useEffect } from 'react';
import { Volunteer, ServiceEvent, Ministry, EventType } from './types';
import { INITIAL_VOLUNTEERS, INITIAL_SERVICES, INITIAL_MINISTRIES, INITIAL_EVENT_TYPES } from './constants';
import VolunteerList from './components/VolunteerList';
import ScheduleView from './components/ScheduleView';
import MinistryList from './components/MinistryList';
import EventTypeList from './components/EventTypeList';
import { db } from './services/db';
import { Users, Calendar, BookOpen, ListFilter, Loader2, AlertCircle, Database } from 'lucide-react';

// Custom Logo Component mimicking the IASD diamond structure
const IASDLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  const [activeTab, setActiveTab] = useState<'schedule' | 'volunteers' | 'ministries' | 'eventTypes'>('schedule');
  
  // State
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [services, setServices] = useState<ServiceEvent[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Data from Supabase on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [vData, sData, mData, eData] = await Promise.all([
          db.getVolunteers(),
          db.getServices(),
          db.getMinistries(),
          db.getEventTypes()
        ]);
        
        // Success: Use DB data exactly as is (even if empty)
        setVolunteers(vData);
        setServices(sData);
        setMinistries(mData);
        setEventTypes(eData);

      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
        setError("Não foi possível carregar os dados. Verifique sua conexão.");
        // Only fallback to initial constants if there is an ERROR (offline/config issue)
        setVolunteers(INITIAL_VOLUNTEERS);
        setServices(INITIAL_SERVICES);
        setMinistries(INITIAL_MINISTRIES);
        setEventTypes(INITIAL_EVENT_TYPES);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Derived state for components that just need names
  const roleNames = ministries.map(m => m.name);

  // --- Handlers with DB persistence ---

  const handleAddVolunteer = async (newVolunteer: Volunteer) => {
    try {
      await db.addVolunteer(newVolunteer);
      setVolunteers(prev => [...prev, newVolunteer]);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar voluntário. Tente uma foto menor.');
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

  const handleAddMinistry = async (newMinistry: Ministry) => {
    if (!ministries.some(m => m.name === newMinistry.name)) {
      try {
        await db.addMinistry(newMinistry);
        setMinistries(prev => [...prev, newMinistry]);
      } catch (e) {
        console.error(e);
        alert('Erro ao adicionar ministério');
      }
    }
  };

  const handleRemoveMinistry = async (name: string) => {
    try {
      await db.removeMinistry(name);
      setMinistries(prev => prev.filter(m => m.name !== name));
    } catch (e) {
      console.error(e);
      alert('Erro ao remover ministério');
    }
  };

  const handleAddEventType = async (newEventType: EventType) => {
    try {
      await db.addEventType(newEventType);
      setEventTypes(prev => [...prev, newEventType]);
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar tipo de evento');
    }
  };

  const handleRemoveEventType = async (id: string) => {
    try {
      await db.removeEventType(id);
      setEventTypes(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      alert('Erro ao remover tipo de evento');
    }
  };

  // Function to seed initial data if DB is completely empty (User convenience)
  const seedDatabase = async () => {
    try {
      setLoading(true);
      // Seed Ministries
      for (const m of INITIAL_MINISTRIES) await db.addMinistry(m);
      // Seed Event Types
      for (const t of INITIAL_EVENT_TYPES) await db.addEventType(t);
      
      // Update State
      setMinistries(INITIAL_MINISTRIES);
      setEventTypes(INITIAL_EVENT_TYPES);
      alert("Dados básicos (Ministérios e Tipos) foram criados com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao popular banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center flex-col gap-4 text-brand-primary">
        <Loader2 size={48} className="animate-spin" />
        <p className="font-medium animate-pulse">Sincronizando com o banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row text-brand-secondary">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-brand-muted/20 flex-shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-brand-muted/10">
          <div className="text-brand-primary p-1 rounded-lg">
             <IASDLogo className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-bold text-brand-secondary text-2xl leading-none">Voluntário</h1>
            <p className="text-sm font-medium text-brand-muted mt-1">IASD Bosque</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'schedule' 
                ? 'bg-brand-accent/30 text-brand-primary' 
                : 'text-brand-muted hover:bg-brand-bg hover:text-brand-secondary'
            }`}
          >
            <Calendar size={20} />
            Escalas e Cultos
          </button>
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'volunteers' 
                ? 'bg-brand-accent/30 text-brand-primary' 
                : 'text-brand-muted hover:bg-brand-bg hover:text-brand-secondary'
            }`}
          >
            <Users size={20} />
            Voluntários
          </button>
          <button
            onClick={() => setActiveTab('ministries')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ministries' 
                ? 'bg-brand-accent/30 text-brand-primary' 
                : 'text-brand-muted hover:bg-brand-bg hover:text-brand-secondary'
            }`}
          >
            <BookOpen size={20} />
            Ministérios
          </button>
           <button
            onClick={() => setActiveTab('eventTypes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'eventTypes' 
                ? 'bg-brand-accent/30 text-brand-primary' 
                : 'text-brand-muted hover:bg-brand-bg hover:text-brand-secondary'
            }`}
          >
            <ListFilter size={20} />
            Tipos de Evento
          </button>
        </nav>
        
        <div className="p-6 mt-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-2">
               <AlertCircle size={14} className="shrink-0 mt-0.5"/>
               <span>Offline: {error}</span>
            </div>
          )}
          
          {/* Helper for empty DB */}
          {!error && ministries.length === 0 && eventTypes.length === 0 && (
             <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
               <p className="mb-2">Banco de dados vazio.</p>
               <button 
                onClick={seedDatabase}
                className="w-full bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
               >
                 <Database size={12} /> Popular Dados
               </button>
             </div>
          )}

          <div className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl p-4 text-white text-center shadow-lg shadow-brand-primary/20">
            <p className="text-xs font-medium opacity-80 mb-1">Voluntários Ativos</p>
            <p className="text-3xl font-bold">{volunteers.length}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">
          
          {/* Header Mobile Only */}
          <div className="md:hidden flex items-center gap-3 mb-6 pb-4 border-b border-brand-muted/20">
            <div className="text-brand-primary">
                <IASDLogo className="w-8 h-8" />
            </div>
            <div>
                 <h1 className="font-bold text-brand-secondary text-xl leading-none">Voluntário</h1>
                 <p className="text-xs text-brand-muted">IASD Bosque</p>
            </div>
          </div>

          {activeTab === 'schedule' && (
            <div className="animate-fade-in">
              <ScheduleView 
                services={services} 
                volunteers={volunteers}
                ministries={ministries}
                eventTypes={eventTypes}
                onAddService={handleAddService}
                onUpdateService={handleUpdateService}
                onRemoveService={handleRemoveService}
              />
            </div>
          )}

          {activeTab === 'volunteers' && (
            <div className="animate-fade-in">
              <VolunteerList 
                volunteers={volunteers} 
                roles={roleNames}
                onAddVolunteer={handleAddVolunteer}
                onRemoveVolunteer={handleRemoveVolunteer}
              />
            </div>
          )}

          {activeTab === 'ministries' && (
            <div className="animate-fade-in">
              <MinistryList 
                ministries={ministries}
                onAddMinistry={handleAddMinistry}
                onRemoveMinistry={handleRemoveMinistry}
              />
            </div>
          )}

          {activeTab === 'eventTypes' && (
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
    </div>
  );
};

export default App;