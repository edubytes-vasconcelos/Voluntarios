
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceEvent, Volunteer, Assignment, Ministry, EventType, Team } from '../types';
import { Calendar as CalendarIcon, Users, Trash2, Plus, X, Save, BookOpen, AlertCircle, Filter, UserCheck, Shield, Repeat } from 'lucide-react';
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
  // --- PERMISSION & INITIALIZATION LOGIC ---
  const currentUser = currentUserId ? volunteers.find(v => v.id === currentUserId) : null;
  
  // Tratamento robusto: se accessLevel for undefined, assume 'volunteer'
  const userAccessLevel = currentUser?.accessLevel || 'volunteer';
  
  // Inicializa o filtro com base no nível de acesso
  const [viewFilter, setViewFilter] = useState<'all' | 'mine'>(() => {
    return userAccessLevel === 'volunteer' ? 'mine' : 'all';
  });

  // Atualiza o filtro se o usuário mudar (ex: logout/login com outro usuário)
  useEffect(() => {
    if (userAccessLevel === 'volunteer') {
      setViewFilter('mine');
    } else {
      setViewFilter('all');
    }
  }, [currentUserId]); 

  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceDate, setNewServiceDate] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [newServiceTitle, setNewServiceTitle] = useState('');

  // --- RECURRENCE STATE ---
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  
  // Calculate max date (3 months from today) for the input attribute
  const maxRecurDateStr = useMemo(() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      return d.toISOString().split('T')[0];
  }, []);

  // State for manual assignment
  const [addingAssignmentTo, setAddingAssignmentTo] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'volunteer' | 'team'>('volunteer'); 
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState(''); 

  const userRoles = currentUser?.roles || [];
  const isAdmin = userAccessLevel === 'admin';
  const isLeader = userAccessLevel === 'leader';

  const selectableRoles = useMemo(() => {
    const allRoles = ministries.map(m => m.name);
    if (readOnly) return [];
    if (isAdmin) return allRoles;
    if (isLeader) {
        return allRoles.filter(role => userRoles.includes(role));
    }
    return []; 
  }, [ministries, readOnly, isAdmin, isLeader, userRoles]);

  const canManageRole = (roleToCheck: string) => {
      if (readOnly) return false;
      if (isAdmin) return true;
      if (isLeader) return userRoles.includes(roleToCheck);
      return false;
  };

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

  const displayedServices = sortedServices.filter(service => {
    if (viewFilter === 'mine') {
      return currentUserId && service.assignments.some(a => {
          if (a.volunteerId === currentUserId) return true;
          if (a.teamId) {
              const team = teams.find(t => t.id === a.teamId);
              return team?.memberIds.includes(currentUserId);
          }
          return false;
      });
    }
    return true;
  });

  // Validação do formulário para habilitar/desabilitar botão
  const isFormValid = useMemo(() => {
      if (!newServiceDate) return false;
      
      // Valida Título
      let titleOk = false;
      if (selectedEventTypeId && selectedEventTypeId !== 'custom') {
          titleOk = true; 
      } else {
          titleOk = newServiceTitle.trim().length > 0;
      }
      if (!titleOk) return false;

      // Valida Recorrência
      if (isRecurring) {
          if (!recurringEndDate) return false;
          // Garante que data fim é maior ou igual a data inicio
          if (recurringEndDate < newServiceDate) return false;
          // Garante que não excede 3 meses
          if (recurringEndDate > maxRecurDateStr) return false;
      }

      return true;
  }, [newServiceDate, selectedEventTypeId, newServiceTitle, isRecurring, recurringEndDate, maxRecurDateStr]);

  // Verifica erro de intervalo de datas para feedback visual
  const isDateRangeInvalid = useMemo(() => {
      if (isRecurring && recurringEndDate && newServiceDate) {
          return recurringEndDate < newServiceDate;
      }
      return false;
  }, [isRecurring, recurringEndDate, newServiceDate]);

  // Verifica erro de limite máximo
  const isDateLimitExceeded = useMemo(() => {
      if (isRecurring && recurringEndDate && maxRecurDateStr) {
          return recurringEndDate > maxRecurDateStr;
      }
      return false;
  }, [isRecurring, recurringEndDate, maxRecurDateStr]);

  const handleSaveService = () => {
    // 1. Validações Básicas
    if (!newServiceDate) {
        alert('Selecione uma data inicial.');
        return;
    }

    let titleToSave = newServiceTitle;
    if (selectedEventTypeId && selectedEventTypeId !== 'custom') {
         const type = eventTypes.find(t => t.id === selectedEventTypeId);
         if (type) titleToSave = type.name;
    }

    if (!titleToSave.trim()) {
        alert('Informe o nome do evento.');
        return;
    }

    // 2. Lógica de Geração de Datas (Recorrência)
    const datesToCreate: string[] = [];
    
    if (isRecurring) {
        if (!recurringEndDate) {
            alert('Selecione a data final para a recorrência.');
            return;
        }
        if (recurringEndDate < newServiceDate) {
            alert('A data final deve ser posterior à data inicial.');
            return;
        }
        if (recurringEndDate > maxRecurDateStr) {
            alert('A data final excede o limite máximo permitido de 3 meses.');
            return;
        }

        // Gera datas a cada 7 dias
        // Usamos T12:00:00 para evitar problemas de fuso horário
        let currentDateObj = new Date(newServiceDate + 'T12:00:00'); 
        const endDateObj = new Date(recurringEndDate + 'T12:00:00');
        
        while (currentDateObj <= endDateObj) {
            datesToCreate.push(currentDateObj.toISOString().split('T')[0]);
            currentDateObj.setDate(currentDateObj.getDate() + 7);
        }
    } else {
        datesToCreate.push(newServiceDate);
    }

    // 3. Validação de Duplicidade em Lote
    if (selectedEventTypeId && selectedEventTypeId !== 'custom') {
      const conflicts = datesToCreate.filter(dateStr => {
          return services.some(s => {
              const existingDate = s.date.split('T')[0];
              return existingDate === dateStr && s.eventTypeId === selectedEventTypeId;
          });
      });

      if (conflicts.length > 0) {
        const confirm = window.confirm(
            `ATENÇÃO: Existem ${conflicts.length} conflito(s) de eventos deste tipo nas datas selecionadas (Ex: ${conflicts[0]}).\n\nDeseja continuar e criar apenas os eventos que NÃO possuem conflito?`
        );
        if (!confirm) return;
        
        // Remove as datas conflitantes da lista de criação
        const nonConflictingDates = datesToCreate.filter(d => !conflicts.includes(d));
        datesToCreate.length = 0; // Limpa array original
        datesToCreate.push(...nonConflictingDates);
      }
    }

    if (datesToCreate.length === 0) return;

    // 4. Salvar (Loop)
    datesToCreate.forEach((dateStr, index) => {
        const newService: ServiceEvent = {
          id: `manual-${Date.now()}-${index}`,
          date: dateStr,
          title: titleToSave,
          eventTypeId: selectedEventTypeId || undefined,
          assignments: []
        };
        onAddService(newService);
    });
    
    // Limpar e fechar
    setNewServiceDate('');
    setNewServiceTitle('');
    setSelectedEventTypeId('');
    setIsRecurring(false);
    setRecurringEndDate('');
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
    : teams; 

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
                   <label className="block text-sm font-medium text-brand-secondary mb-1">Data Inicial</label>
                   <input type="date" value={newServiceDate} onChange={(e) => setNewServiceDate(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50"/>
                   
                   {/* Checkbox Recorrência */}
                   <div className="mt-3 flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         id="recurringCheck" 
                         checked={isRecurring} 
                         onChange={(e) => setIsRecurring(e.target.checked)}
                         className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                       />
                       <label htmlFor="recurringCheck" className="text-sm text-brand-secondary flex items-center gap-1 cursor-pointer select-none">
                           <Repeat size={14} />
                           Repetir semanalmente
                       </label>
                   </div>
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

               {/* Campo Condicional: Data Fim da Recorrência */}
               {isRecurring && (
                   <div className={`bg-brand-accent/10 p-3 rounded-lg border animate-fade-in ${isDateRangeInvalid || isDateLimitExceeded ? 'border-red-300 bg-red-50' : 'border-brand-accent/30'}`}>
                       <label className="block text-sm font-medium text-brand-secondary mb-1">
                           Repetir até (Data Fim)
                           <span className="text-xs font-normal text-brand-muted ml-1">(Max: 3 meses)</span>
                       </label>
                       <input 
                         type="date" 
                         value={recurringEndDate} 
                         max={maxRecurDateStr}
                         onChange={(e) => setRecurringEndDate(e.target.value)} 
                         className={`w-full border rounded-lg px-4 py-2 bg-white ${isDateRangeInvalid || isDateLimitExceeded ? 'border-red-300 text-red-900 focus:ring-red-500' : 'border-brand-muted/30'}`}
                       />
                       {isDateRangeInvalid && (
                           <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                               <AlertCircle size={12} />
                               A data final não pode ser anterior à data inicial.
                           </p>
                       )}
                       {isDateLimitExceeded && (
                           <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                               <AlertCircle size={12} />
                               A data excede o limite permitido de 3 meses.
                           </p>
                       )}
                   </div>
               )}

               {(selectedEventTypeId === 'custom' || !selectedEventTypeId) && (
                   <div className={isRecurring ? "md:col-span-1" : "md:col-span-2"}>
                       <label className="block text-sm font-medium text-brand-secondary mb-1">Nome</label>
                       <input type="text" value={newServiceTitle} onChange={(e) => setNewServiceTitle(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50"/>
                   </div>
               )}
           </div>
           <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-brand-muted/10 relative z-10">
               <button onClick={() => {
                   setIsAddingService(false);
                   setIsRecurring(false);
                   setRecurringEndDate('');
               }} className="px-4 py-2 text-brand-muted hover:text-brand-secondary">Cancelar</button>
               <button 
                 type="button"
                 onClick={handleSaveService} 
                 disabled={!isFormValid}
                 className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
               >
                 <Save size={18} />
                 {isRecurring ? 'Gerar Ocorrências' : 'Salvar Evento'}
               </button>
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
                  {!readOnly && addingAssignmentTo !== service.id && selectableRoles.length > 0 && (
                    <button onClick={() => setAddingAssignmentTo(service.id)} className="text-xs flex items-center gap-1 text-brand-primary bg-brand-accent/20 px-2 py-1 rounded">
                      <Plus size={12} /> Adicionar
                    </button>
                  )}
                </div>

                {!readOnly && addingAssignmentTo === service.id && (
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-brand-muted/20 flex flex-col gap-3 shadow-inner">
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
                            {selectableRoles.map(r => <option key={r} value={r} className="text-gray-900">{r}</option>)}
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
                                {canManageRole(assignment.role) && (
                                    <button onClick={() => handleRemoveAssignment(service.id, idx)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 bg-white rounded-full p-0.5 shadow-sm">
                                        <X size={12} />
                                    </button>
                                )}
                              </div>
                          );
                      } else {
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
                                {canManageRole(assignment.role) && (
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
