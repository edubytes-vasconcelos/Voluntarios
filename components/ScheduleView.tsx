import React, { useState } from 'react';
import { ServiceEvent, Volunteer, Assignment, Ministry, EventType } from '../types';
import { Calendar as CalendarIcon, Users, Trash2, Plus, X, Save, BookOpen } from 'lucide-react';
import { AVAILABLE_ICONS } from '../constants';

interface ScheduleViewProps {
  services: ServiceEvent[];
  volunteers: Volunteer[];
  ministries: Ministry[];
  eventTypes: EventType[];
  onAddService: (service: ServiceEvent) => void;
  onUpdateService: (service: ServiceEvent) => void;
  onRemoveService: (id: string) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  services, 
  volunteers, 
  ministries,
  eventTypes,
  onAddService, 
  onUpdateService,
  onRemoveService 
}) => {
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceDate, setNewServiceDate] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  
  const [newServiceTitle, setNewServiceTitle] = useState('');

  // State for manual assignment (Service ID -> boolean)
  const [addingAssignmentTo, setAddingAssignmentTo] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');

  // Derived roles from ministries
  const roles = ministries.map(m => m.name);

  const getVolunteerName = (id: string) => volunteers.find(v => v.id === id)?.name || 'Desconhecido';

  const getMinistryIcon = (roleName: string) => {
    const ministry = ministries.find(m => m.name === roleName);
    const iconId = ministry?.icon || 'book-open';
    const IconComponent = AVAILABLE_ICONS.find(i => i.id === iconId)?.icon || BookOpen;
    return <IconComponent size={14} />;
  };

  // Helper to generate dynamic styles based on the event type color
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

    // Extract color name (e.g., from 'bg-blue-500' take 'blue')
    const colorMatch = type.color.match(/bg-([a-z]+)-500/);
    const colorName = colorMatch ? colorMatch[1] : 'gray';

    // Since we are using Tailwind via CDN, dynamic classes like bg-blue-50 usually work fine.
    // If using a build step, safelisting would be needed, but here it's likely runtime.
    return {
      borderColor: type.color,           // Solid color strip
      headerBg: `bg-${colorName}-50`,    // Light tint background
      iconBg: `bg-${colorName}-100`,     // Slightly darker tint for icon bg
      iconColor: `text-${colorName}-600`,// Dark text for icon
      titleColor: `text-${colorName}-900`,// Darkest text for title
      dateColor: `text-${colorName}-700` // Medium text for date
    };
  };

  // Sort services by date
  const sortedServices = [...services].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleEventTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const typeId = e.target.value;
      setSelectedEventTypeId(typeId);
      const type = eventTypes.find(t => t.id === typeId);
      if (type) {
          setNewServiceTitle(type.name);
      } else {
          setNewServiceTitle('');
      }
  };

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
    if (!selectedRole || !selectedVolunteerId) return;

    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    const newAssignment: Assignment = {
      role: selectedRole,
      volunteerId: selectedVolunteerId
    };

    const updatedService = {
      ...service,
      assignments: [...service.assignments, newAssignment]
    };

    onUpdateService(updatedService);
    setAddingAssignmentTo(null);
    setSelectedRole('');
    setSelectedVolunteerId('');
  };

  const handleRemoveAssignment = (serviceId: string, assignmentIndex: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const updatedAssignments = [...service.assignments];
    updatedAssignments.splice(assignmentIndex, 1);

    const updatedService = {
      ...service,
      assignments: updatedAssignments
    };

    onUpdateService(updatedService);
  };

  // Filter volunteers based on selected role
  const availableVolunteers = selectedRole 
    ? volunteers.filter(v => v.roles.includes(selectedRole))
    : volunteers;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-secondary">Próximos Cultos e Eventos</h2>
        <button
          onClick={() => setIsAddingService(!isAddingService)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Novo Evento</span>
        </button>
      </div>

      {isAddingService && (
        <div className="bg-white p-6 rounded-xl border border-brand-accent/50 shadow-md animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4 text-brand-primary">Criar Novo Culto/Evento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-secondary mb-1">Data</label>
              <input
                type="date"
                value={newServiceDate}
                onChange={(e) => setNewServiceDate(e.target.value)}
                className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-secondary mb-1">Tipo de Evento</label>
              <div className="relative">
                <select
                    value={selectedEventTypeId}
                    onChange={handleEventTypeChange}
                    className="w-full text-base border border-brand-muted/40 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-brand-secondary shadow-sm appearance-none"
                >
                    <option value="">Selecione um tipo...</option>
                    {eventTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                    <option value="custom">Outro (Personalizado)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-brand-muted">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
              </div>
            </div>
            {/* Fallback for custom titles if "custom" is selected or if user wants to edit */}
            {(selectedEventTypeId === 'custom' || !selectedEventTypeId) && (
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand-secondary mb-1">Nome do Evento</label>
                 <input
                    type="text"
                    value={newServiceTitle}
                    onChange={(e) => setNewServiceTitle(e.target.value)}
                    placeholder="Digite o nome do evento..."
                    className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50"
                  />
             </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button 
              onClick={() => setIsAddingService(false)}
              className="px-4 py-2 text-brand-muted hover:text-brand-secondary"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveService}
              disabled={!newServiceDate || !newServiceTitle}
              className="bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Salvar Evento
            </button>
          </div>
        </div>
      )}

      {services.length === 0 && !isAddingService && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-brand-muted/30">
          <div className="mx-auto w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center text-brand-muted mb-4">
            <CalendarIcon size={32} />
          </div>
          <h3 className="text-lg font-medium text-brand-secondary">Nenhum evento agendado</h3>
          <p className="text-brand-muted max-w-sm mx-auto mt-2">
            Use o assistente de IA para gerar uma escala ou clique em "Novo Evento" para cadastrar manualmente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {sortedServices.map((service) => {
          const styles = getEventStyles(service.eventTypeId);
          
          return (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-brand-muted/20 overflow-visible hover:border-brand-accent/50 transition-all relative overflow-hidden">
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
                        {new Date(service.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveService(service.id)}
                  className="text-brand-muted hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                  title="Remover Evento"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              <div className="p-6 ml-1.5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-semibold text-brand-muted uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} />
                    Escala de Voluntários
                  </h4>
                  {addingAssignmentTo !== service.id && (
                    <button
                      onClick={() => setAddingAssignmentTo(service.id)}
                      className="text-xs flex items-center gap-1 text-brand-primary hover:text-brand-primary-hover font-medium bg-brand-accent/20 px-2 py-1 rounded"
                    >
                      <Plus size={12} /> Adicionar Voluntário
                    </button>
                  )}
                </div>

                {/* Manual Assignment Form inside card */}
                {addingAssignmentTo === service.id && (
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-brand-muted/20 flex flex-col md:flex-row gap-3 items-end shadow-inner">
                    <div className="flex-1 w-full">
                      <label className="text-sm font-medium text-brand-secondary mb-1 block">Ministério</label>
                      <div className="relative">
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full text-base border border-brand-muted/40 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-brand-secondary shadow-sm appearance-none"
                        >
                          <option value="">Selecione o ministério...</option>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-brand-muted">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-sm font-medium text-brand-secondary mb-1 block">Voluntário</label>
                      <div className="relative">
                        <select
                          value={selectedVolunteerId}
                          onChange={(e) => setSelectedVolunteerId(e.target.value)}
                          className="w-full text-base border border-brand-muted/40 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-brand-secondary shadow-sm appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                          disabled={!selectedRole}
                        >
                          <option value="">Selecione a pessoa...</option>
                          {availableVolunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          {availableVolunteers.length === 0 && selectedRole && <option disabled>Ninguém com este ministério</option>}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-brand-muted">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pb-[1px]">
                      <button 
                        onClick={() => {
                          setAddingAssignmentTo(null);
                          setSelectedRole('');
                          setSelectedVolunteerId('');
                        }}
                        className="p-2.5 text-brand-muted hover:bg-gray-200 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={() => handleAddAssignment(service.id)}
                        disabled={!selectedRole || !selectedVolunteerId}
                        className="p-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                        title="Salvar"
                      >
                        <Save size={20} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {service.assignments.map((assignment, idx) => (
                    <div key={idx} className="group relative flex flex-col bg-brand-bg p-3 rounded-lg border border-brand-muted/10 hover:border-brand-accent/50 transition-colors">
                      <div className="flex items-center gap-1.5 mb-1 text-brand-primary">
                          {getMinistryIcon(assignment.role)}
                          <span className="text-xs font-medium">{assignment.role}</span>
                      </div>
                      <span className="text-brand-secondary font-medium">{getVolunteerName(assignment.volunteerId)}</span>
                      
                      <button 
                        onClick={() => handleRemoveAssignment(service.id, idx)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-brand-muted hover:text-red-500 p-1 rounded-full bg-white shadow-sm transition-all"
                        title="Remover da escala"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {service.assignments.length === 0 && !addingAssignmentTo && (
                     <div className="text-brand-muted text-sm italic col-span-full py-2 bg-brand-bg/30 rounded border border-dashed border-brand-muted/20 text-center">
                       Nenhum voluntário escalado. <button onClick={() => setAddingAssignmentTo(service.id)} className="text-brand-primary underline hover:text-brand-primary-hover">Adicionar agora</button>.
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