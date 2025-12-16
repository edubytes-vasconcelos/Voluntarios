
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ServiceEvent, Volunteer, Assignment, Ministry, EventType, Team, AssignmentStatus, Organization } from '../types';
import { Calendar as CalendarIcon, Users, Trash2, Plus, X, Save, BookOpen, AlertCircle, Filter, UserCheck, Shield, Repeat, Share2, Printer, MessageCircle, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Send, ChevronDown, MoreHorizontal } from 'lucide-react';
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
  onLogAction?: (action: string, resource: string, resourceId: string, details: any) => void;
  readOnly?: boolean;
  currentUserId?: string;
  // Added currentOrg to props
  currentOrg?: Organization | null;
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
  currentUserId,
  // Destructured currentOrg from props
  currentOrg,
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

  const getMinistryIcon = (roleName: string) => {
    const ministry = ministries.find(m => m.name === roleName);
    const iconId = ministry?.icon || 'book-open';
    const IconComponent = AVAILABLE_ICONS.find(i => i.id === iconId)?.icon || BookOpen;
    return <IconComponent size={14} />;
  };

  const getEventStyles = (eventTypeId?: string) => {
    const defaultStyles = {
      borderColor: 'border-l-brand-primary',
      bgHover: 'hover:border-brand-primary',
      textColor: 'text-brand-primary',
      badgeBg: 'bg-brand-primary',
      dateColor: 'text-brand-muted'
    };
    if (!eventTypeId) return defaultStyles;
    
    const type = eventTypes.find(t => t.id === eventTypeId);
    if (!type) return defaultStyles;
    
    // Extract base color name from Tailwind class (e.g., 'bg-blue-500' -> 'blue')
    const colorMatch = type.color.match(/bg-([a-z]+)-500/);
    const colorName = colorMatch ? colorMatch[1] : 'gray';
    
    return {
      borderColor: `border-l-${colorName}-500`,
      bgHover: `hover:border-${colorName}-500`,
      textColor: `text-${colorName}-600`,
      badgeBg: `bg-${colorName}-500`,
      dateColor: `text-${colorName}-600`
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
    <div className="space-y-4">
      
      {/* --- HEADER COMPACTO & OTIMIZADO --- */}
      <div className="flex flex-col gap-4 no-print">
        <div className="flex justify-between items-center">
             <h2 className="text-xl md:text-2xl font-bold text-brand-secondary tracking-tight">Escalas</h2>
             
             {/* Filtro Todos / Minha Escala (Segmented Control) */}
             <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
                <button
                    onClick={() => setViewFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        viewFilter === 'all'
                        ? 'bg-white text-brand-primary shadow-sm'
                        : 'text-gray-500 hover:text-brand-secondary'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setViewFilter('mine')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        viewFilter === 'mine'
                        ? 'bg-white text-brand-primary shadow-sm'
                        : 'text-gray-500 hover:text-brand-secondary'
                    }`}
                >
                    Minha
                </button>
             </div>
        </div>

        {/* Toolbar de Ações Unificada */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-muted/10 pb-4">
             {/* Filtro de Ministérios */}
             <div className="relative" ref={ministryFilterRef}>
                <button
                    onClick={() => setShowMinistryFilterDropdown(!showMinistryFilterDropdown)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        selectedMinistriesFilter.length > 0
                            ? 'bg-brand-primary/5 border-brand-primary text-brand-primary'
                            : 'bg-white border-brand-muted/20 text-brand-secondary hover:border-brand-muted/50'
                    }`}
                >
                    <Filter size={16} />
                    <span className="hidden sm:inline">Ministérios</span>
                    {selectedMinistriesFilter.length > 0 && (
                        <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {selectedMinistriesFilter.length}
                        </span>
                    )}
                    <ChevronDown size={14} className={`opacity-50 transition-transform ${showMinistryFilterDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showMinistryFilterDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-brand-muted/20 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
                        <div className="max-h-60 overflow-y-auto p-1">
                            {ministries.length === 0 ? (
                                <p className="text-xs text-brand-muted px-3 py-2">Nenhum ministério cadastrado.</p>
                            ) : (
                                ministries.map(ministry => (
                                    <label key={ministry.name} className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedMinistriesFilter.includes(ministry.name)}
                                            onChange={() => toggleMinistryFilter(ministry.name)}
                                            className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4 border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">{ministry.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        {selectedMinistriesFilter.length > 0 && (
                            <div className="p-2 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={clearMinistryFilter}
                                    className="w-full py-1 text-xs font-semibold text-brand-primary hover:underline"
                                >
                                    Limpar Filtro
                                </button>
                            </div>
                        )}
                    </div>
                )}
             </div>

             {/* Ações Direitas */}
             <div className="flex items-center gap-2">
                 {displayedServices.length > 0 && (
                     <div className="flex items-center bg-white rounded-lg border border-brand-muted/20 shadow-sm overflow-hidden h-9">
                        <button 
                            onClick={handleWhatsAppShare}
                            className="px-3 h-full text-green-600 hover:bg-green-50 border-r border-brand-muted/20 transition-colors flex items-center justify-center"
                            title="Compartilhar WhatsApp"
                        >
                            <MessageCircle size={18} />
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="px-3 h-full text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                        </button>
                     </div>
                 )}

                {!readOnly && (
                    <button
                        onClick={() => {setIsAddingService(!isAddingService); setConflictAlert(null);}}
                        className="h-9 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg flex items-center gap-2 transition-all shadow-sm font-medium text-sm"
                    >
                        <Plus size={18} />
                        <span>Novo</span>
                    </button>
                )}
             </div>
        </div>
      </div>

      {isAddingService && !readOnly && (
        <div className="bg-white p-5 rounded-xl border border-brand-accent/50 shadow-lg animate-fade-in-down no-print z-10 relative">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-brand-primary">Criar Novo Evento</h3>
              <button onClick={() => setIsAddingService(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
           </div>
           
           {/* CONFLICT ALERT UI */}
           {conflictAlert && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg flex items-start gap-3 text-sm border border-yellow-200 animate-fade-in">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Conflito Detectado</p>
                        <p className="mb-2">{conflictAlert.message}</p>
                        <div className="flex gap-2">
                            <button onClick={handleConfirmConflict} className="px-3 py-1.5 bg-yellow-600 text-white rounded text-xs font-bold">Continuar Mesmo Assim</button>
                            <button onClick={() => setConflictAlert(null)} className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-800 rounded text-xs">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="text-xs font-bold text-brand-muted uppercase mb-1 block">Data</label>
                   <input type="date" value={newServiceDate} onChange={(e) => setNewServiceDate(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg px-3 py-2 bg-brand-bg/50 focus:ring-1 focus:ring-brand-primary outline-none"/>
                   
                   <div className="mt-2 flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         id="recurringCheck" 
                         checked={isRecurring} 
                         onChange={(e) => {setIsRecurring(e.target.checked); setConflictAlert(null);}} 
                         className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                       />
                       <label htmlFor="recurringCheck" className="text-xs text-brand-secondary flex items-center gap-1 cursor-pointer select-none font-medium">
                           <Repeat size={12} /> Repetir semanalmente
                       </label>
                   </div>
               </div>

               <div>
                   <label className="text-xs font-bold text-brand-muted uppercase mb-1 block">Tipo</label>
                   <select value={selectedEventTypeId} onChange={(e) => {
                       setSelectedEventTypeId(e.target.value);
                       const t = eventTypes.find(type => type.id === e.target.value);
                       if (t) setNewServiceTitle(t.name);
                       setConflictAlert(null);
                   }} className="w-full border border-brand-muted/30 rounded-lg px-3 py-2 bg-brand-bg/50 focus:ring-1 focus:ring-brand-primary outline-none">
                       <option value="">Selecione...</option>
                       {eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       <option value="custom">Personalizado</option>
                   </select>
               </div>

               {isRecurring && (
                   <div className={`col-span-full bg-gray-50 p-3 rounded-lg border ${isDateRangeInvalid || isDateLimitExceeded ? 'border-red-300' : 'border-gray-200'}`}>
                       <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Final da Repetição</label>
                       <input 
                         type="date" 
                         value={recurringEndDate} 
                         max={maxRecurDateStr}
                         onChange={(e) => {setRecurringEndDate(e.target.value); setConflictAlert(null);}}
                         className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                       />
                       {(isDateRangeInvalid || isDateLimitExceeded) && (
                           <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                               <AlertCircle size={12} /> Data inválida.
                           </p>
                       )}
                   </div>
               )}

               {(selectedEventTypeId === 'custom' || !selectedEventTypeId) && (
                   <div className="col-span-full">
                       <label className="text-xs font-bold text-brand-muted uppercase mb-1 block">Nome do Evento</label>
                       <input type="text" value={newServiceTitle} onChange={(e) => {setNewServiceTitle(e.target.value); setConflictAlert(null);}} className="w-full border border-brand-muted/30 rounded-lg px-3 py-2 bg-brand-bg/50 focus:ring-1 focus:ring-brand-primary outline-none" placeholder="Ex: Culto Especial"/>
                   </div>
               )}
           </div>
           
           <div className="flex justify-end gap-2 mt-6">
               <button onClick={() => setIsAddingService(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
               <button 
                 onClick={handleSaveService} 
                 disabled={!isFormValid}
                 className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-300 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all"
               >
                 <Save size={16} />
                 Salvar
               </button>
           </div>
        </div>
      )}

      {/* PRINT HEADER ONLY */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-black">Escala de Voluntários</h1>
          {/* Fixed: Used currentOrg prop */}
          <p className="text-sm text-gray-600 mt-1">{currentOrg?.name || 'Sua Igreja'} • Gerado em {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col gap-4 print:gap-6 print:block">
        {displayedServices.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-brand-muted/10 border-dashed no-print">
            <div className="bg-brand-bg inline-flex p-4 rounded-full mb-3 text-brand-muted/50">
              {viewFilter === 'mine' ? <UserCheck size={32} /> : <CalendarIcon size={32} />}
            </div>
            <p className="text-brand-secondary font-medium">
              {viewFilter === 'mine' 
                ? 'Você não está escalado para nenhum evento futuro.' 
                : 'Nenhum evento encontrado.'
              }
            </p>
            {selectedMinistriesFilter.length > 0 && (
              <button onClick={clearMinistryFilter} className="mt-2 text-brand-primary hover:underline text-sm font-medium">
                Limpar filtros
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

          // GROUPING LOGIC
          const groupedAssignments: Record<string, Array<{ assignment: Assignment, index: number }>> = {};
          service.assignments.forEach((assignment, index) => {
              if (!groupedAssignments[assignment.role]) {
                  groupedAssignments[assignment.role] = [];
              }
              groupedAssignments[assignment.role].push({ assignment, index });
          });
          
          return (
            <div key={service.id} className={`bg-white rounded-lg shadow-sm border border-brand-muted/20 overflow-visible relative break-inside-avoid print:shadow-none print:border-gray-300 print:mb-4 group transition-all ${styles.borderColor} border-l-4 ${!readOnly ? styles.bgHover : ''}`}>
              
              {/* COMPACT HEADER ROW */}
              <div className="px-4 py-3 flex justify-between items-start border-b border-brand-muted/10">
                 <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${styles.dateColor} flex items-center gap-1.5`}>
                        <CalendarIcon size={12} />
                        {new Date(service.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <h3 className={`font-bold text-brand-secondary text-lg leading-tight mt-0.5`}>{service.title}</h3>
                 </div>
                 
                 {!readOnly && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                        {addingAssignmentTo !== service.id && selectableRoles.length > 0 && (
                            <button 
                                onClick={() => setAddingAssignmentTo(service.id)} 
                                className="p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded"
                                title="Adicionar Voluntário"
                            >
                                <Plus size={18} />
                            </button>
                        )}
                        <button 
                            onClick={() => onRemoveService(service.id)} 
                            className="p-1.5 text-brand-muted hover:text-red-600 hover:bg-red-50 rounded"
                            title="Excluir Evento"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                 )}
              </div>
              
              <div className="p-4 pt-3 print:p-2">
                {!readOnly && addingAssignmentTo === service.id && (
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-brand-muted/20 flex flex-col gap-2 shadow-inner no-print animate-fade-in">
                      <div className="flex gap-4 border-b border-gray-200 pb-2 mb-1">
                         <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600">
                             <input type="radio" checked={assignmentType === 'volunteer'} onChange={() => {setAssignmentType('volunteer'); setSelectedEntityId('');}} className="text-brand-primary focus:ring-brand-primary"/>
                             <span>Pessoa</span>
                         </label>
                         <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600">
                             <input type="radio" checked={assignmentType === 'team'} onChange={() => {setAssignmentType('team'); setSelectedEntityId('');}} className="text-brand-primary focus:ring-brand-primary"/>
                             <span>Equipe</span>
                         </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="flex-1 w-full">
                            <select 
                            className="w-full text-xs rounded border-gray-300 py-1.5 bg-white text-gray-900 shadow-sm focus:ring-brand-primary focus:border-brand-primary" 
                            onChange={e => setSelectedRole(e.target.value)}
                            value={selectedRole}
                            >
                            <option value="">Ministério...</option>
                            {selectableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        
                        <div className="flex-1 w-full">
                            <select 
                            className="w-full text-xs rounded border-gray-300 py-1.5 bg-white text-gray-900 shadow-sm focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400" 
                            onChange={e => setSelectedEntityId(e.target.value)} 
                            value={selectedEntityId}
                            >
                            <option value="">{assignmentType === 'volunteer' ? 'Voluntário...' : 'Equipe...'}</option>
                            {availableEntities.map((e: any) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                            </select>
                        </div>
                        
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleAddAssignment(service.id)} disabled={!selectedRole || !selectedEntityId} className="p-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded shadow-sm disabled:opacity-50">
                            <Save size={16}/>
                            </button>
                            <button onClick={() => setAddingAssignmentTo(null)} className="p-1.5 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                            <X size={16}/>
                            </button>
                        </div>
                      </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3">
                  {Object.entries(groupedAssignments).map(([role, items]) => {
                      const isMeInGroup = items.some(({ assignment }) => 
                          (assignment.volunteerId === currentUserId) || 
                          (assignment.teamId && teams.find(t => t.id === assignment.teamId)?.memberIds.includes(currentUserId || ''))
                      );

                      const cardStyle = isMeInGroup 
                          ? 'bg-brand-accent/10 border-brand-accent/40' 
                          : 'bg-white border-brand-muted/10';

                      return (
                        <div key={role} className={`rounded border p-2 flex flex-col h-full ${cardStyle} print:border-gray-200 print:bg-transparent print:p-0 print:shadow-none`}>
                            {/* Role Header */}
                            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-black/5 text-brand-primary font-bold text-xs uppercase tracking-wide">
                                {getMinistryIcon(role)}
                                <span>{role}</span>
                            </div>
                            
                            {/* List */}
                            <div className="flex flex-col gap-1">
                                {items.map(({ assignment, index }) => {
                                    const isMe = assignment.volunteerId === currentUserId;
                                    const team = assignment.teamId ? teams.find(t => t.id === assignment.teamId) : null;
                                    const isMyTeam = team?.memberIds.includes(currentUserId || '');
                                    
                                    const showRSVP = isMe || isMyTeam;
                                    const isUpdatingThis = updatingAssignment?.serviceId === service.id && updatingAssignment?.assignmentIndex === index;
                                    const isDecliningThis = decliningAssignment?.serviceId === service.id && decliningAssignment?.assignmentIndex === index;
                                    
                                    const displayName = team ? team.name : getVolunteerName(assignment.volunteerId!);

                                    return (
                                        <div key={index} className="relative group/item min-h-[24px] flex items-center justify-between">
                                            
                                            {/* Name & Status */}
                                            <div className={`flex items-center gap-1.5 min-w-0 flex-1 transition-opacity ${isDecliningThis ? 'opacity-20' : 'opacity-100'}`}>
                                                {team && <Shield size={10} className="text-gray-400 shrink-0" />}
                                                
                                                <div className="min-w-0 flex flex-col">
                                                    <span className={`text-xs font-medium truncate ${isMe || isMyTeam ? 'text-brand-primary' : 'text-gray-700'}`}>
                                                        {displayName}
                                                    </span>
                                                    {assignment.status === 'declined' && assignment.declineReason && (
                                                        <span className="text-[9px] text-red-500 leading-none truncate block max-w-[120px] italic">
                                                            "{assignment.declineReason}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions/Icons */}
                                            <div className="flex items-center gap-1 shrink-0 no-print">
                                                {isUpdatingThis ? (
                                                    <Loader2 size={12} className="animate-spin text-brand-primary" />
                                                ) : (
                                                    <>
                                                        {showRSVP && (!assignment.status || assignment.status === 'pending') && !isDecliningThis ? (
                                                            <div className="flex items-center bg-gray-50 rounded border border-gray-200 scale-90 origin-right">
                                                                 <button onClick={(e) => handleInitiateRSVP(e, service.id, index, 'confirmed')} className="p-1 hover:bg-green-100 text-green-600 border-r border-gray-200" title="Confirmar"><CheckCircle2 size={12}/></button>
                                                                 <button onClick={(e) => handleInitiateRSVP(e, service.id, index, 'declined')} className="p-1 hover:bg-red-100 text-red-600" title="Recusar"><XCircle size={12}/></button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {assignment.status === 'confirmed' && <CheckCircle2 size={12} className="text-green-600" />}
                                                                {assignment.status === 'declined' && <XCircle size={12} className="text-red-500" />}
                                                                {(!assignment.status || assignment.status === 'pending') && <Clock size={12} className="text-gray-300" />}
                                                            </>
                                                        )}
                                                        
                                                        {canManageRole(role) && !isDecliningThis && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(service.id, index); }}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Inline Decline Form */}
                                            {isDecliningThis && (
                                                <div className="absolute inset-0 z-10 bg-white flex items-center gap-1 shadow-sm border rounded px-1 animate-fade-in">
                                                    <input 
                                                        autoFocus
                                                        className="flex-1 text-[10px] border-none p-0 focus:ring-0 text-gray-700 placeholder-gray-400"
                                                        placeholder="Motivo..."
                                                        value={declineReasonText}
                                                        onChange={e => setDeclineReasonText(e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <button onClick={handleConfirmDecline} className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded">OK</button>
                                                    <button onClick={handleCancelDecline} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
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
                     <div className="col-span-full py-3 bg-brand-bg/20 rounded border border-dashed border-brand-muted/10 text-center no-print">
                       <span className="text-xs text-brand-muted/70">Ainda sem voluntários</span>
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