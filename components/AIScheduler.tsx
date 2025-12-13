import React, { useState } from 'react';
import { Volunteer, ServiceEvent } from '../types';
import { generateScheduleWithAI } from '../services/geminiService';
import { Sparkles, Calendar, Loader2, AlertCircle } from 'lucide-react';

interface AISchedulerProps {
  volunteers: Volunteer[];
  availableRoles: string[];
  onScheduleGenerated: (services: ServiceEvent[]) => void;
}

const AIScheduler: React.FC<AISchedulerProps> = ({ volunteers, availableRoles, onScheduleGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [month, setMonth] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().slice(0, 7); // YYYY-MM
  });

  const handleGenerate = async () => {
    if (availableRoles.length === 0) {
        setError("Nenhum ministério cadastrado. Adicione ministérios antes de gerar a escala.");
        return;
    }

    setLoading(true);
    setError(null);

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, m, 0).toISOString().split('T')[0];

    try {
      const generatedServices = await generateScheduleWithAI(
        volunteers,
        availableRoles,
        startDate,
        endDate,
        instructions || "Gerar uma escala padrão equilibrada."
      );
      
      onScheduleGenerated(generatedServices);
    } catch (err) {
      setError("Falha ao gerar a escala. Verifique a chave da API ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-brand-accent/50 shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 bg-brand-bg rounded-full shadow-sm text-brand-primary border border-brand-accent/30">
          <Sparkles size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-brand-primary mb-1">Assistente de Escala Inteligente</h3>
          <p className="text-brand-secondary/80 mb-6 text-sm">
            Use a IA para criar escalas automáticas baseadas na disponibilidade e habilidades dos voluntários.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-brand-secondary mb-1">Mês de Referência</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full border-brand-muted/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none bg-brand-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-secondary mb-1">Instruções Especiais (Opcional)</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Priorize a Ana no Louvor dia 15..."
                className="w-full border-brand-muted/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none bg-brand-bg"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Gerando Escala... (Isso pode levar alguns segundos)</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Gerar Escala com IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIScheduler;