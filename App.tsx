
import React, { useState, useEffect } from 'react';
import { Volunteer, ServiceEvent, Ministry, EventType, AccessLevel, Team, AuditLogEntry } from './types';
import { INITIAL_VOLUNTEERS, INITIAL_SERVICES, INITIAL_MINISTRIES, INITIAL_EVENT_TYPES } from './constants';
import VolunteerList from './components/VolunteerList';
import ScheduleView from './components/ScheduleView';
import MinistryList from './components/MinistryList';
import EventTypeList from './components/EventTypeList';
import TeamList from './components/TeamList';
import Login from './components/Login';
import { db } from './services/db';
import { supabase } from './services/supabaseClient';
import { Users, Calendar, BookOpen, ListFilter, Loader2, AlertCircle, Database, LogOut, Bell, CheckCircle2, Shield, Menu, X, Settings } from 'lucide-react';

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
  const [teams, setTeams] = useState<Team[]>([]); 
  const [services, setServices] = useState<ServiceEvent[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  
  const [loading, setLoading] = useState(false); 
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

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
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
            <div>
              <h1 className="font-bold text-brand-secondary text-xl leading-none">Voluntário</h1>
              <p className="text-sm font-medium text-brand-muted mt-0.5">IASD Bosque</p>
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
            {userProfile && (
            <div className="mb-4 flex items-center gap-3 px-3 py-2 bg-white rounded-lg shadow-sm border border-brand-muted/10">
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
            )}
        </div>
      </aside>


      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative print:h-auto print:overflow-visible">
      
          {/* Mobile Header (Simplified) */}
          <header className="md:hidden bg-white border-b border-brand-muted/20 h-16 shrink-0 flex items-center justify-between px-4 shadow-sm z-20 print:hidden">
             <div className="flex items-center gap-3">
                  <div className="text-brand-primary"><IASDLogo className="w-8 h-8" /></div>
                  <div>
                      <h1 className="font-bold text-brand-secondary text-lg leading-none">Voluntário</h1>
                      <p className="text-xs text-brand-muted">IASD Bosque</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="text-brand-muted hover:text-red-500">
                  <LogOut size={20} />
              </button>
          </header>

          {/* Main Scrollable Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 print:p-0 print:overflow-visible"> 
            <div className="max-w-5xl mx-auto print:max-w-none">
                
                {/* Volunteer Notification Banner */}
                {myNextAssignment && (
                    <div className="mb-6 bg-brand-accent/20 border border-brand-accent rounded-xl p-4 flex items-center gap-4 animate-fade-in print:hidden">
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
                      onLogAction={handleLogAction}
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

          {/* --- MOBILE BOTTOM NAVIGATION --- */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-muted/20 h-16 flex items-center justify-around px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
              <NavItem isMobile={true} id="schedule" icon={Calendar} label="Escalas" onClick={() => handleNavClick('schedule')} />
              
              {canManageVolunteers && (
                <>
                  <NavItem isMobile={true} id="volunteers" icon={Users} label="Pessoas" onClick={() => handleNavClick('volunteers')} />
                  <NavItem isMobile={true} id="teams" icon={Shield} label="Equipes" onClick={() => handleNavClick('teams')} />
                </>
              )}

              {canManageSettings && (
                 <button
                    onClick={() => handleNavClick('ministries')}
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
      </div>
    </div>
  );
};

export default App;
