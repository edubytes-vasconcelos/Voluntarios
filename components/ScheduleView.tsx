
import React, { useState } from 'react';
import { ServiceEvent, Volunteer, Assignment, Ministry, EventType, Team } from '../types';
import { Calendar as CalendarIcon, Users, Trash2, Plus, X, Save, BookOpen, AlertCircle, Filter, UserCheck, Shield } from 'lucide-react';
import { AVAILABLE_ICONS } from '../constants';

interface ScheduleViewProps {
  services: ServiceEvent[];
  volunteers: Volunteer[];
  teams: Team[];
  ministries: Ministry[];
  eventTypes: EventType[];
  onAddService: (service: ServiceEvent) => void;
  onUpdateService: (service: ServiceEvent) => void;
  onRemoveService: (id: string) => void;
  readOnly?: boolean;
  currentUserId?: string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  services, 
  volunteers, 
  teams = [],
  ministries,
  eventTypes,
  onAddService, 
  onUpdateService,
  onRemoveService,
  readOnly = false,
  currentUserId
}) => {
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceDate, setNewServiceDate] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [newServiceTitle, setNewServiceTitle] = useState('');
  
  // Filter State: 'all' or 'mine'
  const [viewFilter, setViewFilter] = useState<'all' | 'mine'>('all');

  // State for manual assignment
  const [addingAssignmentTo, setAddingAssignmentTo] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'volunteer' | 'team'>('volunteer'); // New: Switch between volunteer and team
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState(''); // ID of Volunteer OR Team

  const roles = ministries.map(m => m.name);

  const getVolunteerName = (id: string) => volunteers.find(v => v.id === id)?.name || 'Desconhecido';
  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Equipe Desconhecida';
  const getTeamMembers = (teamId: string) => {
      const team = teams.find(t => t.id === teamId);
      if(!team) return [];
      return team.memberIds.map(id => volunteers.find(v => v.id === id)).filter(Boolean) as Volunteer[];
  }

  const getMinistryIcon = (roleName: string) => {
    const ministry = ministries.find(m => m.name === roleName);
    const iconId = ministry?.icon || 'book-open';
    const IconComponent = AVAILABLE_ICONS.find(i => i.id === iconId)?.icon || BookOpen;
    return <IconComponent size={14} />;
  };

  const getEventStyles = (eventTypeId?: string) => {
    const defaultStyles = {
      borderColor: 'bg-brand-primary',
      headerBg: 'bg-brand-bg/50',
      iconBg: 'bg-brand-accent/30',
      iconColor: 'text-brand-primary',
      titleColor: 'text-brand-secondary',
      dateColor: 'text-brand-muted'
    };
    if (!eventTypeId) return defaultStyles;
    const type = eventTypes.find(t => t.id === eventTypeId);
    if (!type) return defaultStyles;
    const colorMatch = type.color.match(/bg-([a-z]+)-500/);
    const colorName = colorMatch ? colorMatch[1] : 'gray';
    return {
      borderColor: type.color,
      headerBg: `bg-${colorName}-50`,
      iconBg: `bg-${colorName}-100`,
      iconColor: `text-${colorName}-600`,
      titleColor: `text-${colorName}-900`,
      dateColor: `text-${colorName}-700`
    };
  };

  const sortedServices = [...services].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter Logic Updated for Teams
  const displayedServices = sortedServices.filter(service => {
    if (viewFilter === 'mine') {
      return currentUserId && service.assignments.some(a => {
          // Check if user is directly assigned
          if (a.volunteerId === currentUserId) return true;
          // Check if user is in an assigned team
          if (a.teamId) {
              const team = teams.find(t => t.id === a.teamId);
              return team?.memberIds.includes(currentUserId);
          }
          return false;
      });
    }
    return true;
  });

  const handleSaveService = () => {
    if (!newServiceDate || !newServiceTitle.trim()) return;
    const newService: ServiceEvent = {
      id: `manual-${Date.now()}`,
      date: newServiceDate,
      title: newServiceTitle,
      eventTypeId: selectedEventTypeId || undefined,
      assignments: []
    };
    onAddService(newService);
    setNewServiceDate('');
    setNewServiceTitle('');
    setSelectedEventTypeId('');
    setIsAddingService(false);
  };

  const handleAddAssignment = (serviceId: string) => {
    if (!selectedRole || !selectedEntityId) return;
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    const newAssignment: Assignment = { role: selectedRole };
    if (assignmentType === 'volunteer') {
        newAssignment.volunteerId = selectedEntityId;
    } else {
        newAssignment.teamId = selectedEntityId;
    }

    const updatedService = {
      ...service,
      assignments: [...service.assignments, newAssignment]
    };
    onUpdateService(updatedService);
    setAddingAssignmentTo(null);
    setSelectedRole('');
    setSelectedEntityId('');
  };

  const handleRemoveAssignment = (serviceId: string, assignmentIndex: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    const updatedAssignments = [...service.assignments];
    updatedAssignments.splice(assignmentIndex, 1);
    onUpdateService({ ...service, assignments: updatedAssignments });
  };

  const availableEntities = assignmentType === 'volunteer' 
    ? (selectedRole ? volunteers.filter(v => v.roles.includes(selectedRole)) : volunteers)
    : teams; // Show all teams for now, could filter by role if teams had roles

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-secondary">Escalas e Eventos</h2>
          
          <div className="flex mt-3 bg-brand-bg rounded-lg p-1 border border-brand-muted/10 w-fit">
            <button
              onClick={() => setViewFilter('all')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewFilter === 'all'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-brand-muted hover:text-brand-secondary'
              }`}
            >
              <CalendarIcon size={16} />
              Todos
            </button>
            <button
              onClick={() => setViewFilter('mine')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewFilter === 'mine'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-brand-muted hover:text-brand-secondary'
              }`}
            >
              <UserCheck size={16} />
              Minha Escala
            </button>
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={() => setIsAddingService(!isAddingService)}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm self-end md:self-auto"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Novo Evento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {isAddingService && !readOnly && (
        <div className="bg-white p-6 rounded-xl border border-brand-accent/50 shadow-md animate-fade-in-down">
           <h3 className="text-lg font-semibold mb-4 text-brand-primary">Criar Novo Culto/Evento</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="block text-sm font-medium text-brand-secondary mb-1">Data</label>
                   <input type="date" value={newServiceDate} onChange={(e) => setNewServiceDate(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50"/>
               </div>
               <div>
                   <label className="block text-sm font-medium text-brand-secondary mb-1">Tipo de Evento</label>
                   <select value={selectedEventTypeId} onChange={(e) => {
                       setSelectedEventTypeId(e.target.value);
                       const t = eventTypes.find(type => type.id === e.target.value);
                       if (t) setNewServiceTitle(t.name);
                   }} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50">
                       <option value="">Selecione...</option>
                       {eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       <option value="custom">Personalizado</option>
                   </select>
               </div>
               {(selectedEventTypeId === 'custom' || !selectedEventTypeId) && (
                   <div className="md:col-span-2">
                       <label className="block text-sm font-medium text-brand-secondary mb-1">Nome</label>
                       <input type="text" value={newServiceTitle} onChange={(e) => setNewServiceTitle(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50"/>
                   </div>
               )}
           </div>
           <div className="flex justify-end gap-3 mt-4">
               <button onClick={() => setIsAddingService(false)} className="px-4 py-2 text-brand-muted">Cancelar</button>
               <button onClick={handleSaveService} disabled={!newServiceDate || !newServiceTitle} className="bg-brand-primary text-white px-6 py-2 rounded-lg">Salvar</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {displayedServices.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-brand-muted/20 border-dashed">
            <div className="text-brand-muted/50 mb-3 flex justify-center">
              {viewFilter === 'mine' ? <UserCheck size={48} /> : <CalendarIcon size={48} />}
            </div>
            <p className="text-brand-secondary font-medium">
              {viewFilter === 'mine' 
                ? 'Você não está escalado para nenhum evento futuro.' 
                : 'Nenhum evento encontrado.'}
            </p>
            {viewFilter === 'mine' && (
              <button onClick={() => setViewFilter('all')} className="mt-2 text-brand-primary hover:underline text-sm">
                Ver todos os eventos
              </button>
            )}
          </div>
        )}

        {displayedServices.map((service) => {
          const styles = getEventStyles(service.eventTypeId);
          const isMeAssigned = currentUserId && service.assignments.some(a => {
              if (a.volunteerId === currentUserId) return true;
              if (a.teamId) {
                  return teams.find(t => t.id === a.teamId)?.memberIds.includes(currentUserId || '');
              }
              return false;
          });
          
          return (
            <div key={service.id} className={`bg-white rounded-xl shadow-sm border overflow-visible transition-all relative overflow-hidden ${isMeAssigned ? 'border-brand-primary ring-1 ring-brand-primary shadow-md' : 'border-brand-muted/20 hover:border-brand-accent/50'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles.borderColor}`}></div>
              <div className={`${styles.headerBg} px-6 py-4 border-b border-brand-muted/10 flex justify-between items-center ml-1.5`}>
                <div className="flex items-center gap-4">
                  <div className={`${styles.iconBg} ${styles.iconColor} p-2.5 rounded-lg`}>
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${styles.titleColor} text-lg`}>{service.title}</h3>
                    <div className={`flex items-center ${styles.dateColor} text-sm gap-3 mt-0.5`}>
                      <span className="flex items-center gap-1">
                        {new Date(service.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {!readOnly && (
                    <button onClick={() => onRemoveService(service.id)} className="text-brand-muted hover:text-red-600 p-2 rounded-full hover:bg-red-50">
                        <Trash2 size={20} />
                    </button>
                )}
              </div>
              
              <div className="p-6 ml-1.5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-semibold text-brand-muted uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    Escala de Voluntários
                  </h4>
                  {!readOnly && addingAssignmentTo !== service.id && (
                    <button onClick={() => setAddingAssignmentTo(service.id)} className="text-xs flex items-center gap-1 text-brand-primary bg-brand-accent/20 px-2 py-1 rounded">
                      <Plus size={12} /> Adicionar
                    </button>
                  )}
                </div>

                {!readOnly && addingAssignmentTo === service.id && (
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-brand-muted/20 flex flex-col gap-3 shadow-inner">
                      {/* Controls Row */}
                      <div className="flex gap-4 border-b border-gray-200 pb-2 mb-1">
                         <label className="flex items-center gap-2 cursor-pointer text-sm">
                             <input type="radio" checked={assignmentType === 'volunteer'} onChange={() => {setAssignmentType('volunteer'); setSelectedEntityId('');}} className="text-brand-primary focus:ring-brand-primary"/>
                             <span>Individual</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer text-sm">
                             <input type="radio" checked={assignmentType === 'team'} onChange={() => {setAssignmentType('team'); setSelectedEntityId('');}} className="text-brand-primary focus:ring-brand-primary"/>
                             <span>Equipe</span>
                         </label>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-semibold text-brand-secondary mb-1 block">Ministério</label>
                            <select 
                            className="w-full text-sm rounded-lg border-gray-300 py-2 bg-white text-gray-900 shadow-sm focus:ring-brand-primary focus:border-brand-primary" 
                            onChange={e => setSelectedRole(e.target.value)}
                            value={selectedRole}
                            >
                            <option value="" className="text-gray-500">Selecione...</option>
                            {roles.map(r => <option key={r} value={r} className="text-gray-900">{r}</option>)}
                            </select>
                        </div>
                        
                        <div className="flex-1 w-full">
                            <label className="text-xs font-semibold text-brand-secondary mb-1 block">
                                {assignmentType === 'volunteer' ? 'Voluntário' : 'Equipe'}
                            </label>
                            <select 
                            className="w-full text-sm rounded-lg border-gray-300 py-2 bg-white text-gray-900 shadow-sm focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400" 
                            onChange={e => setSelectedEntityId(e.target.value)} 
                            value={selectedEntityId}
                            >
                            <option value="" className="text-gray-500">Selecione...</option>
                            {availableEntities.map((e: any) => (
                                <option key={e.id} value={e.id} className="text-gray-900">{e.name}</option>
                            ))}
                            </select>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => setAddingAssignmentTo(null)} className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            <X size={18}/>
                            </button>
                            <button onClick={() => handleAddAssignment(service.id)} disabled={!selectedRole || !selectedEntityId} className="p-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow-sm disabled:opacity-50">
                            <Save size={18}/>
                            </button>
                        </div>
                      </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {service.assignments.map((assignment, idx) => {
                      if (assignment.teamId) {
                          // TEAM CARD
                          const team = teams.find(t => t.id === assignment.teamId);
                          const members = getTeamMembers(assignment.teamId);
                          const userIsInTeam = currentUserId && team?.memberIds.includes(currentUserId);
                          
                          return (
                              <div key={idx} className={`group relative flex flex-col p-3 rounded-lg border transition-colors ${userIsInTeam ? 'bg-brand-primary/10 border-brand-primary shadow-lg ring-1 ring-brand-primary' : 'bg-brand-bg border-brand-muted/10'}`}>
                                <div className="flex items-center gap-1.5 mb-2 text-brand-primary border-b border-brand-primary/10 pb-2">
                                    <Shield size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wide">Equipe</span>
                                    {getMinistryIcon(assignment.role)}
                                    <span className="text-xs font-medium ml-auto">{assignment.role}</span>
                                </div>
                                <div className="mb-2">
                                     <span className={`font-bold block ${userIsInTeam ? 'text-brand-primary' : 'text-brand-secondary'}`}>
                                        {getTeamName(assignment.teamId)}
                                     </span>
                                </div>
                                <div className="space-y-1">
                                    {members.map(m => (
                                        <div key={m.id} className="text-xs flex items-center gap-1 text-brand-secondary/80">
                                            <div className={`w-1 h-1 rounded-full ${m.id === currentUserId ? 'bg-brand-primary' : 'bg-brand-muted'}`}></div>
                                            <span className={m.id === currentUserId ? 'font-bold' : ''}>
                                                {m.name} {m.id === currentUserId && '(Você)'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {!readOnly && (
                                    <button onClick={() => handleRemoveAssignment(service.id, idx)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 bg-white rounded-full p-0.5 shadow-sm">
                                        <X size={12} />
                                    </button>
                                )}
                              </div>
                          );
                      } else {
                          // VOLUNTEER CARD (Existing logic)
                          const isMe = assignment.volunteerId === currentUserId;
                          return (
                            <div key={idx} className={`group relative flex flex-col p-3 rounded-lg border transition-colors ${isMe ? 'bg-brand-primary text-white border-brand-primary shadow-lg scale-105' : 'bg-brand-bg border-brand-muted/10'}`}>
                                <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'text-brand-accent' : 'text-brand-primary'}`}>
                                    {getMinistryIcon(assignment.role)}
                                    <span className="text-xs font-medium">{assignment.role}</span>
                                </div>
                                <span className={`font-medium ${isMe ? 'text-white' : 'text-brand-secondary'}`}>
                                    {getVolunteerName(assignment.volunteerId!)} {isMe && "(Você)"}
                                </span>
                                {!readOnly && (
                                    <button onClick={() => handleRemoveAssignment(service.id, idx)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 bg-white rounded-full p-0.5">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                          )
                      }
                  })}
                  {service.assignments.length === 0 && !addingAssignmentTo && (
                     <div className="text-brand-muted text-sm italic col-span-full py-2 bg-brand-bg/30 rounded border border-dashed border-brand-muted/20 text-center">
                       Nenhum voluntário escalado.
                     </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleView;
