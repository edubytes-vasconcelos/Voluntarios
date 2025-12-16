

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ServiceEvent, Volunteer, Assignment, Ministry, EventType, Team, AssignmentStatus } from '@/types';
import { Calendar as CalendarIcon, Users, Trash2, Plus, X, Save, BookOpen, AlertCircle, Filter, UserCheck, Shield, Repeat, Share2, Printer, MessageCircle, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Send, ChevronDown } from 'lucide-react';
import { AVAILABLE_ICONS } from '@/constants';

interface ScheduleViewProps {
  services: ServiceEvent[];
  volunteers: Volunteer[];
  teams: Team[];
  ministries: Ministry[];
  eventTypes: EventType[];
  onAddService: (service: ServiceEvent) => void;
  onUpdateService: (service: ServiceEvent) => void;
  onRemoveService: (id: string) => void;
  onLogAction?: (action: string, resource: string, resourceId: string, details: any) => void;
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
  onLogAction,
  readOnly = false,
  currentUserId
}) => {
  // --- PERMISSION & INITIALIZATION LOGIC ---
  const currentUser = currentUserId ? volunteers.find(v => v.id === currentUserId) : null;
  const userAccessLevel = currentUser?.accessLevel || 'volunteer';
  
  const [viewFilter, setViewFilter] = useState<'all' | 'mine'>(() => {
    return userAccessLevel === 'volunteer' ? 'mine' : 'all';
  });
  
  // Local loading state for RSVP actions
  const [updatingAssignment, setUpdatingAssignment] = useState<{serviceId: string, assignmentIndex: number} | null>(null);
  
  // State for Decline Reason Input (Replaces window.prompt)
  const [decliningAssignment, setDecliningAssignment] = useState<{serviceId: string, assignmentIndex: number} | null>(null);
  const [declineReasonText, setDeclineReasonText] = useState('');

  // NEW STATES FOR MINISTRY FILTER
  const [selectedMinistriesFilter, setSelectedMinistriesFilter] = useState<string[]>([]);
  const [showMinistryFilterDropdown, setShowMinistryFilterDropdown] = useState(false);
  const ministryFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userAccessLevel === 'volunteer') {
      setViewFilter('mine');
    } else {
      setViewFilter('all');
    }
  }, [currentUserId, userAccessLevel]); 

  // Close ministry filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ministryFilterRef.current && !ministryFilterRef.current.contains(event.target as Node)) {
        setShowMinistryFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ministryFilterRef]);

  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceDate, setNewServiceDate] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [newServiceTitle, setNewServiceTitle] = useState('');

  // --- RECURRENCE STATE ---
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  
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

  // First filter by 'all' or 'mine'
  const filteredByViewFilter = sortedServices.filter(service => {
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

  // Then filter by selected ministries
  const displayedServices = filteredByViewFilter.filter(service => {
    if (selectedMinistriesFilter.length === 0) return true; // No ministry filter applied
    return service.assignments.some(assignment =>
      selectedMinistriesFilter.includes(assignment.role)
    );
  });

  const isFormValid = useMemo(() => {
      if (!newServiceDate) return false;
      let titleOk = false;
      if (selectedEventTypeId && selectedEventTypeId !== 'custom') {
          titleOk = true; 
      } else {
          titleOk = newServiceTitle.trim().length > 0;
      }
      if (!titleOk) return false;

      if (isRecurring) {
          if (!recurringEndDate) return false;
          if (recurringEndDate < newServiceDate) return false;
          if (recurringEndDate > maxRecurDateStr) return false;
      }
      return true;
  }, [newServiceDate, selectedEventTypeId, newServiceTitle, isRecurring, recurringEndDate, maxRecurDateStr]);

  const isDateRangeInvalid = useMemo(() => {
      if (isRecurring && recurringEndDate && newServiceDate) {
          return recurringEndDate < newServiceDate;
      }
      return false;
  }, [isRecurring, recurringEndDate, newServiceDate]);

  const isDateLimitExceeded = useMemo(() => {
      if (isRecurring && recurringEndDate && maxRecurDateStr) {
          return recurringEndDate > maxRecurDateStr;
      }
      return false;
  }, [isRecurring, recurringEndDate, maxRecurDateStr]);

  // NEW STATE FOR CONFLICT ALERTS
  const [conflictAlert, setConflictAlert] = useState<{ message: string; conflictingDates: string[] } | null>(null);

  // --- ACTIONS HANDLERS ---

  const generateDatesToCreate = (startDate: string, endDate: string | null, isRec: boolean): string[] => {
    const dates: string[] = [];
    if (isRec && endDate) {
      let currentDateObj = new Date(startDate + 'T12:00:00'); 
      const endDateObj = new Date(endDate + 'T12:00:00');
      
      while (currentDateObj <= endDateObj) {
          dates.push(currentDateObj.toISOString().split('T')[0]);
          currentDateObj.setDate(currentDateObj.getDate() + 7);
      }
    } else {
        dates.push(startDate);
    }
    return dates;
  }

  const handleSaveService = () => {
    setConflictAlert(null); // Clear previous conflict alerts

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
    }

    const datesToCreate = generateDatesToCreate(newServiceDate, isRecurring ? recurringEndDate : null, isRecurring);

    // Conflict detection only for non-custom event types
    if (selectedEventTypeId && selectedEventTypeId !== 'custom') {
      const conflicts = datesToCreate.filter(dateStr => {
          return services.some(s => {
              const existingDate = s.date.split('T')[0];
              return existingDate === dateStr && s.eventTypeId === selectedEventTypeId;
          });
      });

      if (conflicts.length > 0) {
        setConflictAlert({
            message: `Já existem eventos do tipo "${eventTypes.find(t => t.id === selectedEventTypeId)?.name || 'Este Tipo de Evento'}" para as seguintes datas: ${conflicts.join(', ')}.`,
            conflictingDates: conflicts
        });
        return; // Stop here, wait for user decision from the alert UI
      }
    }

    // If no conflicts or custom type, proceed to add all services
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
    
    // Reset form
    setNewServiceDate('');
    setNewServiceTitle('');
    setSelectedEventTypeId('');
    setIsRecurring(false);
    setRecurringEndDate('');
    setIsAddingService(false);
  };

  const handleConfirmConflict = () => {
    if (!conflictAlert) return;

    let titleToSave = newServiceTitle;
    if (selectedEventTypeId && selectedEventTypeId !== 'custom') {
        const type = eventTypes.find(t => t.id === selectedEventTypeId);
        if (type) titleToSave = type.name;
    }

    const allGeneratedDates = generateDatesToCreate(newServiceDate, isRecurring ? recurringEndDate : null, isRecurring);
    const nonConflictingDates = allGeneratedDates.filter(d => !conflictAlert.conflictingDates.includes(d));

    if (nonConflictingDates.length === 0) {
        alert('Após remover os conflitos, não restaram eventos para salvar.');
        setConflictAlert(null);
        return;
    }

    nonConflictingDates.forEach((dateStr, index) => {
        const newService: ServiceEvent = {
            id: `manual-${Date.now()}-${index}`,
            date: dateStr,
            title: titleToSave,
            eventTypeId: selectedEventTypeId || undefined,
            assignments: []
        };
        onAddService(newService);
    });

    // Reset form and clear alert
    setNewServiceDate('');
    setNewServiceTitle('');
    setSelectedEventTypeId('');
    setIsRecurring(false);
    setRecurringEndDate('');
    setIsAddingService(false);
    setConflictAlert(null);
  };


  const handleAddAssignment = (serviceId: string) => {
    if (!selectedRole || !selectedEntityId) return;
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    // Default status is pending
    const newAssignment: Assignment = { role: selectedRole, status: 'pending' };
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

  // --- RSVP HANDLER LOGIC ---
  const handleInitiateRSVP = (e: React.MouseEvent, serviceId: string, assignmentIndex: number, status: AssignmentStatus) => {
    e.stopPropagation(); 
    e.preventDefault();

    if (status === 'confirmed') {
        executeRSVP(serviceId, assignmentIndex, 'confirmed');
    } else if (status === 'declined') {
        // Open inline Decline UI
        setDeclineReasonText('');
        setDecliningAssignment({ serviceId, assignmentIndex });
    }
  };

  const handleConfirmDecline = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!decliningAssignment) return;
      
      const reason = declineReasonText.trim() || 'Indisponibilidade';
      executeRSVP(decliningAssignment.serviceId, decliningAssignment.assignmentIndex, 'declined', reason);
      setDecliningAssignment(null);
  };

  const handleCancelDecline = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDecliningAssignment(null);
  }

  const executeRSVP = async (serviceId: string, assignmentIndex: number, status: AssignmentStatus, reason?: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Set loading state
    setUpdatingAssignment({ serviceId, assignmentIndex });

    const updatedAssignments = [...service.assignments];
    const targetAssignment = updatedAssignments[assignmentIndex];
    
    updatedAssignments[assignmentIndex] = {
        ...targetAssignment,
        status: status,
        declineReason: reason
    };

    try {
        await onUpdateService({ ...service, assignments: updatedAssignments });
        
        // --- LOG AUDIT ---
        if (onLogAction) {
            const actionType = status === 'confirmed' ? 'RSVP_CONFIRM' : 'RSVP_DECLINE';
            onLogAction(actionType, 'services', service.id, {
                serviceDate: service.date,
                serviceTitle: service.title,
                assignmentRole: targetAssignment.role,
                reason: reason || null
            });
        }

    } finally {
        setUpdatingAssignment(null);
    }
  };


  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (displayedServices.length === 0) {
        alert("Não há eventos para compartilhar nesta visualização.");
        return;
    }

    let message = `📅 *ESCALA DE VOLUNTÁRIOS*\n\n`;

    displayedServices.forEach(service => {
        const dateStr = new Date(service.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        message += `*${dateStr}* - ${service.title}\n`;
        
        if (service.assignments.length === 0) {
            message += `_Sem voluntários escalados_\n`;
        } else {
            const grouped: Record<string, string[]> = {};
            service.assignments.forEach(a => {
                const name = a.teamId ? `[Equipe] ${getTeamName(a.teamId)}` : (a.volunteerId ? getVolunteerName(a.volunteerId) : '?');
                const statusIcon = a.status === 'confirmed' ? '✅' : a.status === 'declined' ? '❌' : '⏳';
                
                if (!grouped[a.role]) grouped[a.role] = [];
                grouped[a.role].push(`${name} ${statusIcon}`);
            });

            for (const [role, names] of Object.entries(grouped)) {
                message += `▪ ${role}: ${names.join(', ')}\n`;
            }
        }
        message += `\n`; 
    });

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Toggle ministry selection in filter
  const toggleMinistryFilter = (ministryName: string) => {
    setSelectedMinistriesFilter(prev =>
      prev.includes(ministryName)
        ? prev.filter(name => name !== ministryName)
        : [...prev, ministryName]
    );
  };

  const clearMinistryFilter = () => {
    setSelectedMinistriesFilter([]);
    setShowMinistryFilterDropdown(false);
  };

  const availableEntities = assignmentType === 'volunteer' 
    ? (selectedRole ? volunteers.filter(v => v.roles.includes(selectedRole)) : volunteers)
    : teams; 

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-brand-secondary">Escalas e Eventos</h2>
          
          <div className="flex flex-wrap gap-2 mt-3 bg-brand-bg rounded-lg p-1 border border-brand-muted/10 w-fit">
            {/* View Filter (All/Mine) */}
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

            {/* Ministry Filter Dropdown */}
            <div className="relative" ref={ministryFilterRef}>
                <button
                    onClick={() => setShowMinistryFilterDropdown(!showMinistryFilterDropdown)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-white border ${
                        selectedMinistriesFilter.length > 0
                            ? 'border-brand-primary text-brand-primary shadow-sm'
                            : 'border-brand-muted/10 text-brand-muted hover:text-brand-secondary hover:bg-gray-50'
                    }`}
                >
                    <Filter size={16} />
                    <span>Ministérios {selectedMinistriesFilter.length > 0 ? `(${selectedMinistriesFilter.length})` : ''}</span>
                    <ChevronDown size={16} className={`transition-transform ${showMinistryFilterDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showMinistryFilterDropdown && (
                    <div className="absolute left-0 mt-2 w-64 bg-white border border-brand-muted/20 rounded-lg shadow-lg z-40 max-h-60 overflow-y-auto">
                        <div className="p-3 border-b border-brand-muted/10">
                            <button
                                onClick={clearMinistryFilter}
                                className="w-full text-left text-xs text-brand-muted hover:text-brand-secondary hover:underline"
                            >
                                Limpar Filtro
                            </button>
                        </div>
                        <div className="p-2 space-y-1">
                            {ministries.map(ministry => (
                                <label key={ministry.name} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-brand-bg">
                                    <input
                                        type="checkbox"
                                        checked={selectedMinistriesFilter.includes(ministry.name)}
                                        onChange={() => toggleMinistryFilter(ministry.name)}
                                        className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                                    />
                                    <span className="text-sm">{ministry.name}</span>
                                </label>
                            ))}
                            {ministries.length === 0 && (
                              <p className="text-xs text-brand-muted px-2 py-1">Nenhum ministério cadastrado.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
             {displayedServices.length > 0 && (
                <div className="flex mr-2 bg-white rounded-lg border border-brand-muted/20 shadow-sm overflow-hidden">
                    <button 
                        onClick={handleWhatsAppShare}
                        className="p-2 text-green-600 hover:bg-green-50 border-r border-brand-muted/20"
                        title="Compartilhar no WhatsApp"
                    >
                        <MessageCircle size={20} />
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="p-2 text-gray-600 hover:bg-gray-50"
                        title="Imprimir Escala (PDF)"
                    >
                        <Printer size={20} />
                    </button>
                </div>
             )}

            {!readOnly && (
            <button
                onClick={() => {setIsAddingService(!isAddingService); setConflictAlert(null);}} // Clear conflict alert when opening/closing
                className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
                <Plus size={20} />
                <span className="hidden sm:inline">Novo Evento</span>
                <span className="sm:hidden">Novo</span>
            </button>
            )}
        </div>
      </div>

      {isAddingService && !readOnly && (
        <div className="bg-white p-6 rounded-xl border border-brand-accent/50 shadow-md animate-fade-in-down no-print">
           <h3 className="text-lg font-semibold mb-4 text-brand-primary">Criar Novo Culto/Evento</h3>
           
           {/* CONFLICT ALERT UI */}
           {conflictAlert && (
                <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg flex items-start gap-3 text-sm border border-yellow-200 animate-fade-in">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold mb-2">Conflito de Eventos Detectado!</p>
                        <p>{conflictAlert.message}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button 
                                onClick={handleConfirmConflict}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                Continuar (criar não-conflitantes)
                            </button>
                            <button 
                                onClick={() => setConflictAlert(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="block text-sm font-medium text-brand-secondary mb-1">Data Inicial</label>
                   <input type="date" value={newServiceDate} onChange={(e) => setNewServiceDate(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50"/>
                   
                   <div className="mt-3 flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         id="recurringCheck" 
                         checked={isRecurring} 
                         onChange={(e) => {setIsRecurring(e.target.checked); setConflictAlert(null);}} // Clear conflict on recurrence change
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
                       setConflictAlert(null); // Clear conflict on event type change
                   }} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50">
                       <option value="">Selecione...</option>
                       {eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       <option value="custom">Personalizado</option>
                   </select>
               </div>

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
                         onChange={(e) => {setRecurringEndDate(e.target.value); setConflictAlert(null);}} // Clear conflict on end date change
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
                       <input type="text" value={newServiceTitle} onChange={(e) => {setNewServiceTitle(e.target.value); setConflictAlert(null);}} className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50"/>
                   </div>
               )}
           </div>
           <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-brand-muted/10 relative z-10">
               <button onClick={() => {
                   setIsAddingService(false);
                   setIsRecurring(false);
                   setRecurringEndDate('');
                   setConflictAlert(null); // Clear conflict on cancel
               }} className="px-4 py-2 text-brand-muted hover:text-brand-secondary">Cancelar</button>
               <button 
                 type="button"
                 onClick={handleSaveService} 
                 disabled={!isFormValid} // Button is only disabled for basic form invalidity, not conflicts
                 className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
               >
                 <Save size={18} />
                 {isRecurring ? 'Gerar Ocorrências' : 'Salvar Evento'}
               </button>
           </div>
        </div>
      )}

      {/* PRINT HEADER ONLY */}
      <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Escala de Voluntários</h1>
          <p className="text-gray-600">IASD Bosque • Gerado em {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 print:gap-4 print:block">
        {displayedServices.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-brand-muted/20 border-dashed no-print">
            <div className="text-brand-muted/50 mb-3 flex justify-center">
              {viewFilter === 'mine' ? <UserCheck size={48} /> : <CalendarIcon size={48} />}
            </div>
            <p className="text-brand-secondary font-medium">
              {viewFilter === 'mine' && selectedMinistriesFilter.length > 0
                ? `Você não está escalado para nenhum evento futuro nos ministérios selecionados.`
                : viewFilter === 'mine' 
                ? 'Você não está escalado para nenhum evento futuro.' 
                : selectedMinistriesFilter.length > 0
                  ? `Nenhum evento encontrado para os ministérios selecionados.`
                  : 'Nenhum evento encontrado.'
              }
            </p>
            {viewFilter === 'mine' && (
              <button onClick={() => setViewFilter('all')} className="mt-2 text-brand-primary hover:underline text-sm">
                Ver todos os eventos
              </button>
            )}
            {selectedMinistriesFilter.length > 0 && (
              <button onClick={clearMinistryFilter} className="mt-2 ml-4 text-brand-primary hover:underline text-sm">
                Limpar filtro de ministérios
              </button>
            )}
          </div>
        )}

        {displayedServices.map((service) => {
          const styles = getEventStyles(service.eventTypeId);
          const isMeAssignedToService = currentUserId && service.assignments.some(a => {
              if (a.volunteerId === currentUserId) return true;
              if (a.teamId) {
                  return teams.find(t => t.id === a.teamId)?.memberIds.includes(currentUserId || '');
              }
              return false;
          });

          // GROUPING LOGIC: Group assignments by Role (Ministry)
          const groupedAssignments: Record<string, Array<{ assignment: Assignment, index: number }>> = {};
          service.assignments.forEach((assignment, index) => {
              if (!groupedAssignments[assignment.role]) {
                  groupedAssignments[assignment.role] = [];
              }
              groupedAssignments[assignment.role].push({ assignment, index });
          });
          
          return (
            <div key={service.id} className={`bg-white rounded-xl shadow-sm border overflow-visible transition-all relative break-inside-avoid print:shadow-none print:border-gray-300 print:mb-4 ${isMeAssignedToService ? 'border-brand-primary ring-1 ring-brand-primary shadow-md print:ring-0' : 'border-brand-muted/20 hover:border-brand-accent/50'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles.borderColor} print:bg-gray-400`}></div>
              <div className={`${styles.headerBg} px-6 py-4 border-b border-brand-muted/10 flex justify-between items-center ml-1.5 print:bg-gray-50 print:py-2`}>
                <div className="flex items-center gap-4">
                  <div className={`${styles.iconBg} ${styles.iconColor} p-2.5 rounded-lg no-print`}>
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${styles.titleColor} text-lg print:text-black`}>{service.title}</h3>
                    <div className={`flex items-center ${styles.dateColor} text-sm gap-3 mt-0.5 print:text-gray-600`}>
                      <span className="flex items-center gap-1">
                        {new Date(service.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {!readOnly && (
                    <button onClick={() => onRemoveService(service.id)} className="text-brand-muted hover:text-red-600 p-2 rounded-full hover:bg-red-50 no-print">
                        <Trash2 size={20} />
                    </button>
                )}
              </div>
              
              <div className="p-6 ml-1.5 print:p-4">
                <div className="flex justify-between items-center mb-4 print:mb-2">
                  <h4 className="text-xs font-semibold text-brand-muted uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    Escala de Voluntários
                  </h4>
                  {!readOnly && addingAssignmentTo !== service.id && selectableRoles.length > 0 && (
                    <button onClick={() => setAddingAssignmentTo(service.id)} className="text-xs flex items-center gap-1 text-brand-primary bg-brand-accent/20 px-2 py-1 rounded no-print">
                      <Plus size={12} /> Adicionar
                    </button>
                  )}
                </div>

                {!readOnly && addingAssignmentTo === service.id && (
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-brand-muted/20 flex flex-col gap-3 shadow-inner no-print">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
                  {Object.entries(groupedAssignments).map(([role, items]) => {
                      const isMeInGroup = items.some(({ assignment }) => 
                          (assignment.volunteerId === currentUserId) || 
                          (assignment.teamId && teams.find(t => t.id === assignment.teamId)?.memberIds.includes(currentUserId || ''))
                      );

                      // Card visual style based on whether I'm in this group
                      const cardStyle = isMeInGroup 
                          ? 'bg-brand-accent/10 border-brand-accent ring-1 ring-brand-accent/50' 
                          : 'bg-white border-brand-muted/20';

                      return (
                        <div key={role} className={`rounded-lg border p-3 flex flex-col h-full ${cardStyle} print:border-gray-200 print:bg-transparent print:p-0 print:shadow-none`}>
                            {/* Group Header */}
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/5 text-brand-primary font-medium text-sm">
                                {getMinistryIcon(role)}
                                <span>{role}</span>
                                {isMeInGroup && <div className="ml-auto w-2 h-2 rounded-full bg-brand-primary animate-pulse no-print"></div>}
                            </div>
                            
                            {/* List of Volunteers in this Role */}
                            <div className="flex flex-col flex-1">
                                {items.map(({ assignment, index }) => {
                                    const isMe = assignment.volunteerId === currentUserId;
                                    const team = assignment.teamId ? teams.find(t => t.id === assignment.teamId) : null;
                                    const isMyTeam = team?.memberIds.includes(currentUserId || '');
                                    
                                    // RSVP and Actions Logic (per individual)
                                    const showRSVP = isMe || isMyTeam;
                                    const isUpdatingThis = updatingAssignment?.serviceId === service.id && updatingAssignment?.assignmentIndex === index;
                                    const isDecliningThis = decliningAssignment?.serviceId === service.id && decliningAssignment?.assignmentIndex === index;
                                    
                                    const displayName = team ? team.name : getVolunteerName(assignment.volunteerId!);

                                    return (
                                        <div key={index} className="relative group/item py-2 border-b border-gray-100 last:border-0 border-dashed">
                                            {/* Container for content */}
                                            <div className={`flex items-start justify-between gap-2 transition-opacity ${isDecliningThis ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                                
                                                {/* Left: Info */}
                                                <div className="flex-1 min-w-0 pr-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {team && <Shield size={12} className="text-brand-secondary shrink-0" />}
                                                        <span className={`text-sm font-medium leading-tight ${isMe || isMyTeam ? 'text-brand-primary' : 'text-brand-secondary'}`}>
                                                            {displayName}
                                                        </span>
                                                        {(isMe || isMyTeam) && <span className="text-[10px] font-normal text-brand-muted no-print shrink-0">(Você)</span>}
                                                    </div>
                                                    
                                                    {/* Status Text / Decline Reason */}
                                                    {assignment.status === 'declined' && assignment.declineReason ? (
                                                        <p className="text-[10px] text-red-600 mt-1 leading-tight border-l-2 border-red-300 pl-1 break-words">
                                                            "{assignment.declineReason}"
                                                        </p>
                                                    ) : (
                                                        team && (
                                                            <p className="text-[10px] text-brand-muted mt-0.5 truncate no-print">
                                                                {team.memberIds.length} membros
                                                            </p>
                                                        )
                                                    )}
                                                </div>

                                                {/* Right: Actions / Status */}
                                                <div className="flex items-center gap-1 shrink-0 h-full pt-0.5 no-print">
                                                    {isUpdatingThis ? (
                                                        <Loader2 size={14} className="animate-spin text-brand-primary" />
                                                    ) : (
                                                        <>
                                                            {/* RSVP Actions (Beside Name) */}
                                                            {showRSVP && (!assignment.status || assignment.status === 'pending') && !isDecliningThis ? (
                                                                <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-100">
                                                                     <button 
                                                                        type="button"
                                                                        onClick={(e) => handleInitiateRSVP(e, service.id, index, 'confirmed')}
                                                                        className="p-1 rounded hover:bg-green-100 text-green-700 hover:shadow-sm transition-all"
                                                                        title="Confirmar"
                                                                    >
                                                                        <CheckCircle2 size={16}/>
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => handleInitiateRSVP(e, service.id, index, 'declined')}
                                                                        className="p-1 rounded hover:bg-red-100 text-red-700 hover:shadow-sm transition-all"
                                                                        title="Recusar"
                                                                    >
                                                                        <XCircle size={16}/>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                /* Status Icons if decided */
                                                                <>
                                                                    {assignment.status === 'confirmed' && <CheckCircle2 size={16} className="text-green-600" />}
                                                                    {assignment.status === 'declined' && <XCircle size={16} className="text-red-600" />}
                                                                    {(!assignment.status || assignment.status === 'pending') && <Clock size={16} className="text-brand-muted/50" />}
                                                                </>
                                                            )}
                                                            
                                                            {/* Change Decision Button (Small 'X' to reset, if needed in future, currently just Remove) */}
                                                            {canManageRole(role) && !isDecliningThis && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(service.id, index); }}
                                                                    className="ml-1 p-1 text-brand-muted hover:text-red-500 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                    title="Remover da escala"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* EXPANDED Decline Reason Form */}
                                            {isDecliningThis && (
                                                <div className="absolute inset-0 z-20 bg-white flex flex-col justify-center animate-fade-in">
                                                    <div className="flex gap-2 items-start h-full w-full">
                                                        <textarea 
                                                            className="flex-1 h-full min-h-[60px] text-xs border-2 border-red-100 rounded-md p-2 focus:ring-0 focus:border-red-400 resize-none bg-white text-gray-900 leading-tight"
                                                            placeholder="Motivo da recusa..."
                                                            autoFocus
                                                            value={declineReasonText}
                                                            onChange={e => setDeclineReasonText(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                        <div className="flex flex-col gap-1 h-full justify-center shrink-0">
                                                            <button 
                                                                onClick={handleConfirmDecline}
                                                                className="px-2 py-1.5 text-[10px] font-bold text-white bg-red-600 rounded hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center"
                                                            >
                                                                Confirmar
                                                            </button>
                                                            <button 
                                                                onClick={handleCancelDecline}
                                                                className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                      );
                  })}
                  
                  {service.assignments.length === 0 && !addingAssignmentTo && (
                     <div className="text-brand-muted text-sm italic col-span-full py-2 bg-brand-bg/30 rounded border border-dashed border-brand-muted/20 text-center no-print">
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