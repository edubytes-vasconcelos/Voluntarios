
import React, { useState, useEffect } from 'react';
import { Volunteer, ServiceEvent, Ministry, EventType, AccessLevel, Team } from './types';
import { INITIAL_VOLUNTEERS, INITIAL_SERVICES, INITIAL_MINISTRIES, INITIAL_EVENT_TYPES } from './constants';
import VolunteerList from './components/VolunteerList';
import ScheduleView from './components/ScheduleView';
import MinistryList from './components/MinistryList';
import EventTypeList from './components/EventTypeList';
import TeamList from './components/TeamList';
import Login from './components/Login';
import { db } from './services/db';
import { supabase } from './services/supabaseClient';
import { Users, Calendar, BookOpen, ListFilter, Loader2, AlertCircle, Database, LogOut, Bell, CheckCircle2, Shield } from 'lucide-react';

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
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Volunteer | null>(null);
  const [appReady, setAppReady] = useState(false);

  const [activeTab, setActiveTab] = useState<'schedule' | 'volunteers' | 'teams' | 'ministries' | 'eventTypes'>('schedule');
  
  // State
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // New state for teams
  const [services, setServices] = useState<ServiceEvent[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  
  const [loading, setLoading] = useState(false); // Loading data
  const [error, setError] = useState<string | null>(null);

  // Check Auth on Mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAppReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Data when session exists
  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vData, tData, sData, mData, eData] = await Promise.all([
        db.getVolunteers(),
        db.getTeams(), // Load teams
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
      if (session?.user?.email) {
        const currentUser = vData.find(v => v.email === session.user.email);
        setUserProfile(currentUser || {
             id: 'temp', 
             name: 'Visitante', 
             roles: [], 
             email: session.user.email,
             accessLevel: 'volunteer' 
        });
      }

    } catch (err) {
      console.error("Failed to load data from Supabase:", err);
      setError("Não foi possível carregar os dados.");
      // Fallback
      setVolunteers(INITIAL_VOLUNTEERS);
      setServices(INITIAL_SERVICES);
      setMinistries(INITIAL_MINISTRIES);
      setEventTypes(INITIAL_EVENT_TYPES);
      setUserProfile({ id: 'demo', name: 'Demo Admin', roles: [], accessLevel: 'admin' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  // --- Handlers ---
  const handleAddVolunteer = async (newVolunteer: Volunteer) => {
    try {
      await db.addVolunteer(newVolunteer);
      setVolunteers(prev => [...prev, newVolunteer]);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar voluntário.');
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
      setTeams(prev => [...prev, newTeam]);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar equipe.');
    }
  };

  const handleUpdateTeam = async (updatedTeam: Team) => {
    try {
      await db.updateTeam(updatedTeam);
      setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar equipe.');
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

  const handleAddMinistry = async (newMinistry: Ministry) => {
    try {
      await db.addMinistry(newMinistry);
      setMinistries(prev => [...prev, newMinistry]);
    } catch (e) { alert('Erro ao adicionar ministério'); }
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
    } catch (e) { alert('Erro ao adicionar tipo de evento'); }
  };

  const handleRemoveEventType = async (id: string) => {
    try {
      await db.removeEventType(id);
      setEventTypes(prev => prev.filter(t => t.id !== id));
    } catch (e) { alert('Erro ao remover tipo de evento'); }
  };

  const seedDatabase = async () => {
    setLoading(true);
    for (const m of INITIAL_MINISTRIES) await db.addMinistry(m);
    for (const t of INITIAL_EVENT_TYPES) await db.addEventType(t);
    loadData();
  };

  // --- Derived State & Checks ---
  
  if (!appReady) return <div className="h-screen flex items-center justify-center bg-brand-bg"><Loader2 className="animate-spin text-brand-primary"/></div>;

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (loading && !userProfile) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center flex-col gap-4 text-brand-primary">
        <Loader2 size={48} className="animate-spin" />
        <p className="font-medium animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  const accessLevel = userProfile?.accessLevel || 'volunteer';
  const roleNames = ministries.map(m => m.name);

  // Permission Logic
  const canManageSchedule = accessLevel === 'admin' || accessLevel === 'leader';
  const canManageVolunteers = accessLevel === 'admin' || accessLevel === 'leader';
  const canManageSettings = accessLevel === 'admin';

  // Notification Logic (Updated for Teams)
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

  // Stats Logic (Updated for Teams)
  const myTotalAssignments = userProfile 
    ? services.filter(s => s.assignments.some(a => {
        if (a.volunteerId === userProfile.id) return true;
        if (a.teamId) {
            const t = teams.find(team => team.id === a.teamId);
            return t?.memberIds.includes(userProfile.id);
        }
        return false;
    })).length 
    : 0;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row text-brand-secondary">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-brand-muted/20 flex-shrink-0 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-brand-muted/10">
          <div className="text-brand-primary p-1 rounded-lg">
             <IASDLogo className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-bold text-brand-secondary text-2xl leading-none">Voluntário</h1>
            <p className="text-sm font-medium text-brand-muted mt-1">IASD Bosque</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1">
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
          
          {canManageVolunteers && (
            <>
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
                onClick={() => setActiveTab('teams')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'teams' 
                    ? 'bg-brand-accent/30 text-brand-primary' 
                    : 'text-brand-muted hover:bg-brand-bg hover:text-brand-secondary'
                }`}
              >
                <Shield size={20} />
                Equipes
              </button>
            </>
          )}

          {canManageSettings && (
            <>
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
            </>
          )}
        </nav>
        
        <div className="p-6">
          {userProfile && (
            <>
             <div className="mb-4 flex items-center gap-3 px-3 py-2 bg-brand-bg/50 rounded-lg shadow-sm border border-brand-muted/10">
                <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {userProfile.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={userProfile.name}>{userProfile.name}</p>
                    <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">
                      {accessLevel === 'leader' ? 'Líder' : accessLevel === 'admin' ? 'Admin' : 'Voluntário'}
                    </p>
                    {accessLevel === 'leader' && userProfile.roles.length > 0 && (
                       <p className="text-[10px] text-brand-muted/80 mt-0.5 leading-tight truncate" title={userProfile.roles.join(', ')}>
                         {userProfile.roles.join(', ')}
                       </p>
                    )}
                </div>
                <button onClick={handleLogout} className="text-brand-muted hover:text-red-500 transition-colors" title="Sair">
                    <LogOut size={16} />
                </button>
             </div>
             
             <div className="mb-4 bg-white border border-brand-accent rounded-xl p-4 text-center shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
                 <p className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} /> Minhas Escalas
                 </p>
                 <p className="text-3xl font-bold text-brand-secondary">{myTotalAssignments}</p>
                 <p className="text-[10px] text-brand-muted mt-1 opacity-70">Eventos em que fui escalado</p>
             </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-2">
               <AlertCircle size={14} className="shrink-0 mt-0.5"/>
               <span>Offline: {error}</span>
            </div>
          )}
          
          {canManageSettings && !error && ministries.length === 0 && (
             <button onClick={seedDatabase} className="w-full mb-4 bg-blue-50 text-blue-800 py-2 rounded text-xs flex items-center justify-center gap-2 hover:bg-blue-100">
               <Database size={12} /> Popular Dados
             </button>
          )}

          {canManageVolunteers && (
            <div className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl p-4 text-white text-center shadow-lg shadow-brand-primary/20">
              <p className="text-xs font-medium opacity-80 mb-1">Total Voluntários</p>
              <p className="text-3xl font-bold">{volunteers.length}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">
          
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-brand-muted/20">
            <div className="flex items-center gap-3">
                <div className="text-brand-primary"><IASDLogo className="w-8 h-8" /></div>
                <div>
                    <h1 className="font-bold text-brand-secondary text-xl leading-none">Voluntário</h1>
                    <p className="text-xs text-brand-muted">IASD Bosque</p>
                </div>
            </div>
            <button onClick={handleLogout} className="text-brand-muted"><LogOut size={20}/></button>
          </div>

          {/* Volunteer Notification Banner */}
          {myNextAssignment && (
              <div className="mb-6 bg-brand-accent/20 border border-brand-accent rounded-xl p-4 flex items-center gap-4 animate-fade-in">
                  <div className="bg-brand-primary text-white p-3 rounded-full">
                      <Bell size={20} />
                  </div>
                  <div>
                      <h3 className="font-bold text-brand-primary">Você está escalado em breve!</h3>
                      <p className="text-sm text-brand-secondary">
                          {myNextAssignment.title} • {new Date(myNextAssignment.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                  </div>
              </div>
          )}

          {activeTab === 'schedule' && (
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
                readOnly={!canManageSchedule}
                currentUserId={userProfile?.id}
              />
            </div>
          )}

          {activeTab === 'volunteers' && canManageVolunteers && (
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

          {activeTab === 'teams' && canManageVolunteers && (
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

          {activeTab === 'ministries' && canManageSettings && (
            <div className="animate-fade-in">
              <MinistryList 
                ministries={ministries}
                onAddMinistry={handleAddMinistry}
                onRemoveMinistry={handleRemoveMinistry}
              />
            </div>
          )}

          {activeTab === 'eventTypes' && canManageSettings && (
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
