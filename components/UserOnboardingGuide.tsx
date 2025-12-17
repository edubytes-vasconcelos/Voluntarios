
import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2, Bell, Calendar, UserCheck, X, Loader2, XCircle } from 'lucide-react';
import { ServiceEvent } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface UserOnboardingGuideProps {
  onOnboardingComplete: () => void;
  userName: string;
  userId: string;
  services: ServiceEvent[]; // To check if they have assignments
}

// Custom Logo Component mimicking the IASD diamond structure (duplicated for self-contained component)
const IASDLogoSmall = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" stroke="#004a5e" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M50 5 L95 50 L50 95 L5 50 Z" />
      <path d="M50 5 L50 95" />
      <path d="M5 50 Q 27.5 50 50 27.5" />
      <path d="M95 50 Q 72.5 50 50 27.5" />
      <path d="M5 50 Q 27.5 50 50 72.5" />
      <path d="M95 50 Q 72.5 50 50 72.5" />
    </svg>
);

const UserOnboardingGuide: React.FC<UserOnboardingGuideProps> = ({
  onOnboardingComplete,
  userName,
  userId,
  services,
}) => {
  const [currentStep, setCurrentStep] = useLocalStorage<number>(`user_onboarding_step_${userId}`, 0);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // If onboarding is already completed, just call the prop and exit.
    if (currentStep === 4) { // Assuming 4 is the final step index
      onOnboardingComplete();
    }
  }, [currentStep, onOnboardingComplete]);

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleSkipOnboarding = () => {
    // Removed window.confirm() for immediate skip
    onOnboardingComplete(); // Mark as completed in App.tsx and trigger unmount
    // Removed: setCurrentStep(4); // No need to update internal state if component will unmount
  };

  const hasUpcomingAssignments = services.some(s => 
    new Date(s.date) >= new Date() && 
    s.assignments.some(a => a.volunteerId === userId)
  );

  const stepContent = [
    // Step 0: Welcome
    <div key="step-0" className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <IASDLogoSmall className="w-20 h-20 text-brand-primary mb-4" />
      <h3 className="text-2xl font-bold text-brand-secondary mb-2">Olá, {userName}!</h3>
      <p className="text-brand-muted mb-6 max-w-md">
        Bem-vindo ao seu aplicativo de escalas. Vamos te mostrar como é fácil ver suas escalas e interagir com elas.
      </p>
      <button
        onClick={handleNextStep}
        className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
      >
        Começar <ChevronRight size={18} />
      </button>
      <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm">Pular Guia</button>
    </div>,

    // Step 1: My Schedule
    <div key="step-1" className="p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-secondary mb-2 flex items-center gap-2">
        <span className="bg-brand-primary text-white p-2 rounded-full"><Calendar size={20}/></span>
        1. Sua Escala Pessoal
      </h3>
      <p className="text-brand-muted mb-4">
        Na aba "Escalas", você verá a visualização "Minha Escala", que mostra todos os eventos para os quais você foi escalado(a).
      </p>
      <div className="flex items-center gap-2 px-4 py-3 bg-brand-bg rounded-lg border border-brand-muted/20 text-brand-secondary mb-6">
        <UserCheck size={20} className="text-brand-primary"/>
        <span className="font-medium">Aqui você verá seus próximos compromissos!</span>
      </div>
      {hasUpcomingAssignments ? (
        <p className="text-green-600 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> Ótimo! Você já tem escalas futuras.
        </p>
      ) : (
        <p className="text-brand-muted text-sm flex items-center gap-2">
            <X size={16} /> Você ainda não tem escalas futuras, mas o espaço está pronto!
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleNextStep}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          Próximo <ChevronRight size={18} />
        </button>
      </div>
      <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm w-full">Pular Guia</button>
    </div>,

    // Step 2: Confirm / Decline
    <div key="step-2" className="p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-secondary mb-2 flex items-center gap-2">
        <span className="bg-brand-primary text-white p-2 rounded-full"><UserCheck size={20}/></span>
        2. Confirmar ou Recusar Escala (RSVP)
      </h3>
      <p className="text-brand-muted mb-4">
        Quando você for escalado(a), verá botões para confirmar (✅) ou recusar (❌) sua participação em cada atribuição.
        Se recusar, por favor, informe o motivo.
      </p>
      <div className="flex justify-center gap-4 py-4 bg-brand-bg rounded-lg border border-brand-muted/20 mb-6">
        <button className="p-2 bg-green-100 text-green-600 rounded flex items-center gap-1 font-medium text-sm">
          <CheckCircle2 size={16}/> Confirmar
        </button>
        <button className="p-2 bg-red-100 text-red-600 rounded flex items-center gap-1 font-medium text-sm">
          <XCircle size={16}/> Recusar
        </button>
      </div>
      <p className="text-brand-muted text-sm">
        Sua resposta ajuda os líderes a organizar melhor a escala!
      </p>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleNextStep}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          Próximo <ChevronRight size={18} />
        </button>
      </div>
      <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm w-full">Pular Guia</button>
    </div>,

    // Step 3: Notifications
    <div key="step-3" className="p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-secondary mb-2 flex items-center gap-2">
        <span className="bg-brand-primary text-white p-2 rounded-full"><Bell size={20}/></span>
        3. Ativar Notificações
      </h3>
      <p className="text-brand-muted mb-4">
        Para não perder nenhuma atualização ou nova escala, recomendamos ativar as notificações do navegador. Você verá um ícone como este:
      </p>
      <div className="flex justify-center py-4 bg-brand-bg rounded-lg border border-brand-muted/20 mb-6">
          <button className="p-2 text-brand-primary rounded-full bg-brand-accent/20">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
          </button>
      </div>
      <p className="text-brand-muted text-sm">
        Clique nele para ativar e receber alertas diretamente no seu dispositivo.
      </p>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleNextStep}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          Finalizar <ChevronRight size={18} />
        </button>
      </div>
      <button onClick={handleSkipOnboarding} className="mt-4 text-brand-muted hover:underline text-sm w-full">Pular Guia</button>
    </div>,

    // Step 4: Completion
    <div key="step-4" className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl shadow-md border border-brand-accent/50 animate-fade-in">
      <CheckCircle2 size={48} className="text-green-500 mb-4" />
      <h3 className="text-2xl font-bold text-brand-secondary mb-2">Tudo Pronto!</h3>
      <p className="text-brand-muted mb-6 max-w-md">
        Agora você sabe como usar o aplicativo. Agradecemos seu serviço e dedicação!
      </p>
      <button
        onClick={onOnboardingComplete} // Triggers App.tsx to mark onboarding as complete
        className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
      >
        Ir para o Painel <ChevronRight size={18} />
      </button>
    </div>,
  ];

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {stepContent[currentStep]}
      </div>
    </div>
  );
};

export default UserOnboardingGuide;
