

import React, { useState } from 'react';
import { EventType } from '@/types';
import { Plus, Trash2, Calendar, Tag, AlertCircle, Loader2 } from 'lucide-react'; // Adicionado AlertCircle e Loader2

interface EventTypeListProps {
  eventTypes: EventType[];
  onAddEventType: (eventType: EventType) => Promise<void> | void; // Alterado para Promise<void>
  onRemoveEventType: (id: string) => void;
}

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

const EventTypeList: React.FC<EventTypeListProps> = ({ eventTypes, onAddEventType, onRemoveEventType }) => {
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false); // Novo estado para loading
  const [alertMessage, setAlertMessage] = useState<string | null>(null); // Novo estado para mensagens de alerta

  const handleAdd = async () => {
    const trimmedName = newName.trim();
    if (trimmedName && !isSubmitting) {
      setIsSubmitting(true);
      setAlertMessage(null); // Limpa alertas anteriores

      try {
        // Validação client-side para evitar requisição desnecessária
        const exists = eventTypes.some(et => et.name.toLowerCase() === trimmedName.toLowerCase());
        if (exists) {
          setAlertMessage(`O tipo de evento "${trimmedName}" já existe nesta igreja (verifique a lista).`);
          setIsSubmitting(false);
          return;
        }

        await onAddEventType({
          id: `type-${Date.now()}`,
          name: trimmedName,
          color: selectedColor
        });
        setNewName('');
        setSelectedColor(COLORS[0].value);
        setAlertMessage(null); // Limpa alerta em caso de sucesso

      } catch (error: any) {
        console.error("Erro ao adicionar tipo de evento:", error);
        if (error.message === 'EVENT_TYPE_EXISTS') {
          setAlertMessage(`Erro: O tipo de evento "${trimmedName}" já existe na base de dados.`);
        } else {
          setAlertMessage('Erro ao adicionar tipo de evento. Tente novamente ou verifique se o script SQL está atualizado.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-secondary">Tipos de Evento</h2>
          <p className="text-brand-muted text-sm">Defina os tipos de culto e eventos recorrentes.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-brand-muted/20 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-brand-secondary flex items-center gap-2">
          <Plus size={20} className="text-brand-primary"/>
          Novo Tipo de Evento
        </h3>
        
        {alertMessage && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm border border-red-100 animate-fade-in">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{alertMessage}</span>
            </div>
        )}

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">1. Cor de Identificação</label>
                <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => setSelectedColor(color.value)}
                            className={`w-8 h-8 rounded-full transition-all ${color.value} ${
                                selectedColor === color.value
                                    ? 'ring-2 ring-brand-primary ring-offset-2 scale-110'
                                    : 'hover:opacity-80'
                            }`}
                            title={color.label}
                        />
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">2. Nome do Evento</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                            <Tag size={18} />
                        </div>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            disabled={isSubmitting}
                            className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50 disabled:opacity-70"
                            placeholder="Ex: Culto da Vitória, Reunião de Oração..."
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={!newName.trim() || isSubmitting}
                        className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-brand-muted/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Adicionar'}
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventTypes.map((type) => (
          <div key={type.id} className="bg-white p-5 rounded-xl shadow-sm border border-brand-muted/20 flex items-center justify-between hover:border-brand-primary/50 transition-colors group relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${type.color}`}></div>
            <div className="flex items-center gap-3 pl-3">
              <span className="font-semibold text-brand-secondary">{type.name}</span>
            </div>
            <button 
              onClick={() => onRemoveEventType(type.id)}
              className="text-brand-muted hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Remover Tipo de Evento"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {eventTypes.length === 0 && (
            <div className="col-span-full text-center py-10 text-brand-muted">
                Nenhum tipo de evento cadastrado.
            </div>
        )}
      </div>
    </div>
  );
};

export default EventTypeList;