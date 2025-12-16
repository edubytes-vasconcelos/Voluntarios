


import React, { useState, useMemo } from 'react';
import { Team, Volunteer } from '@/types';
import { Users, Plus, Trash2, Check, X, Shield, Pencil, AlertCircle, Loader2 } from 'lucide-react'; // Adicionado AlertCircle e Loader2

interface TeamListProps {
  teams: Team[];
  volunteers: Volunteer[];
  onAddTeam: (team: Team) => Promise<void> | void; // Alterado para Promise<void>
  onRemoveTeam: (id: string) => void;
  onUpdateTeam: (team: Team) => Promise<void> | void; // Alterado para Promise<void>
  currentUser: Volunteer | null;
}

const TeamList: React.FC<TeamListProps> = ({ teams, volunteers, onAddTeam, onRemoveTeam, onUpdateTeam, currentUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  // State for editing existing team
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Novo estado para loading
  const [alertMessage, setAlertMessage] = useState<string | null>(null); // Novo estado para mensagens de alerta


  // Filter volunteers based on permissions
  const availableVolunteers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.accessLevel === 'admin') return volunteers;
    
    // If leader, show volunteers that share at least one role with the leader
    // OR volunteers that are already in the team being edited (to prevent data loss)
    return volunteers.filter(vol => {
      const sharesRole = vol.roles.some(r => currentUser.roles.includes(r));
      const isInCurrentSelection = selectedMemberIds.includes(vol.id);
      return sharesRole || isInCurrentSelection;
    });
  }, [volunteers, currentUser, selectedMemberIds]);

  const handleCreate = async () => {
    const trimmedName = newTeamName.trim();
    if (!trimmedName || selectedMemberIds.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setAlertMessage(null);

    try {
      // Validação client-side para evitar requisição desnecessária
      const exists = teams.some(t => t.name.toLowerCase() === trimmedName.toLowerCase());
      if (exists) {
        setAlertMessage(`A equipe "${trimmedName}" já existe nesta igreja.`);
        setIsSubmitting(false);
        return;
      }

      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: trimmedName,
        memberIds: selectedMemberIds
      };
      await onAddTeam(newTeam);
      resetForm();
    } catch (error: any) {
        console.error("Erro ao adicionar equipe:", error);
        if (error.message === 'TEAM_EXISTS') {
            setAlertMessage(`Erro: A equipe "${trimmedName}" já existe na base de dados.`);
        } else {
            setAlertMessage('Erro ao adicionar equipe. Tente novamente ou verifique se o script SQL está atualizado.');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    const trimmedName = newTeamName.trim();
    if (!editingTeamId || !trimmedName || selectedMemberIds.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setAlertMessage(null);

    try {
      // Validação client-side: checa duplicidade com outras equipes (exceto a que está sendo editada)
      const exists = teams.some(t => t.id !== editingTeamId && t.name.toLowerCase() === trimmedName.toLowerCase());
      if (exists) {
        setAlertMessage(`A equipe "${trimmedName}" já existe nesta igreja.`);
        setIsSubmitting(false);
        return;
      }

      const updatedTeam: Team = {
        id: editingTeamId,
        name: trimmedName,
        memberIds: selectedMemberIds
      };
      await onUpdateTeam(updatedTeam);
      resetForm();
    } catch (error: any) {
        console.error("Erro ao atualizar equipe:", error);
        if (error.message === 'TEAM_EXISTS') {
            setAlertMessage(`Erro: A equipe "${trimmedName}" já existe na base de dados.`);
        } else {
            setAlertMessage('Erro ao atualizar equipe. Tente novamente ou verifique se o script SQL está atualizado.');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const startEdit = (team: Team) => {
    setAlertMessage(null); // Limpa alerta ao iniciar edição
    setEditingTeamId(team.id);
    setNewTeamName(team.name);
    setSelectedMemberIds(team.memberIds);
    setIsCreating(true);
  };

  const resetForm = () => {
    setIsCreating(false);
    setNewTeamName('');
    setSelectedMemberIds([]);
    setEditingTeamId(null);
    setAlertMessage(null); // Limpa alerta ao resetar formulário
  };

  const toggleMember = (volunteerId: string) => {
    if (selectedMemberIds.includes(volunteerId)) {
      setSelectedMemberIds(prev => prev.filter(id => id !== volunteerId));
    } else {
      setSelectedMemberIds(prev => [...prev, volunteerId]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-secondary">Equipes</h2>
          <p className="text-brand-muted text-sm">Crie grupos de voluntários para escalar em conjunto.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>Nova Equipe</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-brand-accent/50 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-brand-primary">
            {editingTeamId ? 'Editar Equipe' : 'Criar Nova Equipe'}
          </h3>
          
          {alertMessage && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm border border-red-100 animate-fade-in">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{alertMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-secondary mb-1">Nome da Equipe</label>
              <input 
                type="text" 
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Louvor Banda A, Recepção Manhã..."
                disabled={isSubmitting}
                className="w-full border border-brand-muted/30 rounded-lg px-4 py-2 bg-brand-bg/50 focus:ring-2 focus:ring-brand-primary outline-none disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-secondary mb-2">
                Selecionar Membros
                {currentUser?.accessLevel === 'leader' && <span className="text-xs font-normal text-brand-muted ml-2">(Filtrado por seus ministérios)</span>}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 bg-brand-bg/30 rounded-lg border border-brand-muted/10">
                {availableVolunteers.map(vol => (
                  <div 
                    key={vol.id}
                    onClick={() => toggleMember(vol.id)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border ${
                      selectedMemberIds.includes(vol.id) 
                        ? 'bg-white border-brand-primary shadow-sm' 
                        : 'border-transparent hover:bg-white/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedMemberIds.includes(vol.id) ? 'bg-brand-primary border-brand-primary' : 'border-brand-muted'
                    }`}>
                      {selectedMemberIds.includes(vol.id) && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm truncate">{vol.name}</span>
                  </div>
                ))}
                {availableVolunteers.length === 0 && (
                  <div className="col-span-full text-center py-4 text-sm text-brand-muted">
                    Nenhum voluntário encontrado para seus ministérios.
                  </div>
                )}
              </div>
              <p className="text-xs text-brand-muted mt-2 text-right">{selectedMemberIds.length} selecionados</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetForm} disabled={isSubmitting} className="px-4 py-2 text-brand-muted hover:text-brand-secondary disabled:opacity-50">Cancelar</button>
              <button 
                onClick={editingTeamId ? handleUpdate : handleCreate}
                disabled={!newTeamName.trim() || selectedMemberIds.length === 0 || isSubmitting}
                className="bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Salvar Equipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-brand-muted/20 overflow-hidden hover:border-brand-primary/30 transition-all group">
            <div className="p-4 bg-brand-bg/30 border-b border-brand-muted/10 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary/10 text-brand-primary p-2 rounded-lg">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-secondary">{team.name}</h4>
                  <p className="text-xs text-brand-muted">{team.memberIds.length} membros</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => startEdit(team)} className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-white rounded" title="Editar Equipe">
                    <Pencil size={16} />
                 </button>
                 <button onClick={() => onRemoveTeam(team.id)} className="p-1.5 text-brand-muted hover:text-red-500 hover:bg-white rounded" title="Remover Equipe">
                    <Trash2 size={16} />
                 </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {team.memberIds.map(memberId => {
                  const vol = volunteers.find(v => v.id === memberId);
                  return vol ? (
                    <span key={memberId} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                      {vol.name}
                    </span>
                  ) : null;
                })}
              </div>
              {team.memberIds.length === 0 && <span className="text-xs text-brand-muted italic">Sem membros</span>}
            </div>
          </div>
        ))}
        
        {teams.length === 0 && !isCreating && (
           <div className="col-span-full py-12 text-center bg-brand-bg/50 rounded-xl border border-dashed border-brand-muted/30">
              <Users size={48} className="mx-auto text-brand-muted/30 mb-3" />
              <p className="text-brand-secondary font-medium">Nenhuma equipe criada</p>
              <button onClick={() => setIsCreating(true)} className="mt-2 text-brand-primary text-sm hover:underline">Criar primeira equipe</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default TeamList;