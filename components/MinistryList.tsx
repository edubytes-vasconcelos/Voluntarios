import React, { useState } from 'react';
import { Ministry } from '../types';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { AVAILABLE_ICONS } from '../constants';

interface MinistryListProps {
  ministries: Ministry[];
  onAddMinistry: (ministry: Ministry) => void;
  onRemoveMinistry: (name: string) => void;
}

const MinistryList: React.FC<MinistryListProps> = ({ ministries, onAddMinistry, onRemoveMinistry }) => {
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book-open');

  const handleAdd = () => {
    if (newName.trim()) {
      onAddMinistry({
        name: newName.trim(),
        icon: selectedIcon
      });
      setNewName('');
      setSelectedIcon('book-open'); // Reset to default
    }
  };

  // Helper to render icon dynamically
  const renderIcon = (iconId: string, size = 20, className = "") => {
    const IconComponent = AVAILABLE_ICONS.find(i => i.id === iconId)?.icon || BookOpen;
    return <IconComponent size={size} className={className} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-secondary">Ministérios</h2>
          <p className="text-brand-muted text-sm">Gerencie as áreas de atuação e serviços da igreja.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-brand-muted/20 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-brand-secondary flex items-center gap-2">
          <Plus size={20} className="text-brand-primary"/>
          Cadastrar Novo Ministério
        </h3>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">1. Escolha um Ícone</label>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ICONS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedIcon(item.id)}
                            className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 min-w-[60px] ${
                                selectedIcon === item.id
                                    ? 'bg-brand-primary text-white border-brand-primary ring-2 ring-brand-accent ring-offset-1'
                                    : 'bg-brand-bg/30 border-brand-muted/20 text-brand-muted hover:bg-brand-accent/20 hover:text-brand-primary'
                            }`}
                            title={item.label}
                        >
                            <item.icon size={20} />
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-brand-secondary mb-2">2. Nome do Ministério</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary">
                            {renderIcon(selectedIcon, 18)}
                        </div>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50"
                            placeholder="Ex: Cozinha, Intercessão, Som..."
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        className="bg-brand-primary hover:bg-brand-primary-hover disabled:bg-brand-muted/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ministries.map((ministry) => (
          <div key={ministry.name} className="bg-white p-5 rounded-xl shadow-sm border border-brand-muted/20 flex items-center justify-between hover:border-brand-primary/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="bg-brand-accent/20 p-2.5 rounded-lg text-brand-primary">
                {renderIcon(ministry.icon, 20)}
              </div>
              <span className="font-semibold text-brand-secondary">{ministry.name}</span>
            </div>
            <button 
              onClick={() => onRemoveMinistry(ministry.name)}
              className="text-brand-muted hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Remover Ministério"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {ministries.length === 0 && (
            <div className="col-span-full text-center py-10 text-brand-muted">
                Nenhum ministério cadastrado. Adicione um acima.
            </div>
        )}
      </div>
    </div>
  );
};

export default MinistryList;