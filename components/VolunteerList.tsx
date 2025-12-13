
import React, { useState, useRef, useEffect } from 'react';
import { Volunteer, RoleType, AccessLevel } from '../types';
import { Plus, Trash2, User, Check, Image as ImageIcon, Camera, Upload, X, Shield, Mail, Info } from 'lucide-react';

interface VolunteerListProps {
  volunteers: Volunteer[];
  roles: string[];
  onAddVolunteer: (v: Volunteer) => void;
  onRemoveVolunteer: (id: string) => void;
  currentUser: Volunteer | null;
}

const VolunteerList: React.FC<VolunteerListProps> = ({ volunteers, roles, onAddVolunteer, onRemoveVolunteer, currentUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAccessLevel, setNewAccessLevel] = useState<AccessLevel>('volunteer');
  
  // Image handling states
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [capturedImage, setCapturedImage] = useState(''); 
  
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  
  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // If current user is a leader, they can only manage volunteers within their roles
  // We determine allowed roles based on the current user's profile
  const allowedRoles = currentUser?.accessLevel === 'leader' 
    ? roles.filter(r => currentUser.roles.includes(r))
    : roles; // Admin sees all

  // Auto-select roles for leaders when opening modal
  useEffect(() => {
    if (isAdding && currentUser?.accessLevel === 'leader') {
       // Optional: Pre-select all or none? Let's leave empty but restrict options
    }
  }, [isAdding, currentUser]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraOpen, stream]);

  const startCamera = async () => {
    try {
      setCapturedImage('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const MAX_WIDTH = 400;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        const scale = MAX_WIDTH / videoWidth;
        canvasRef.current.width = MAX_WIDTH;
        canvasRef.current.height = videoHeight * scale;
        context.drawImage(videoRef.current, 0, 0, MAX_WIDTH, videoHeight * scale);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        setAvatarUrlInput('');
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setAvatarUrlInput('');
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = () => {
    if (!newName.trim() || selectedRoles.length === 0) return;
    
    const finalAvatarUrl = capturedImage || (avatarUrlInput.trim() ? avatarUrlInput.trim() : undefined);

    const newVol: Volunteer = {
      id: Date.now().toString(),
      name: newName,
      email: newEmail,
      roles: selectedRoles,
      avatarUrl: finalAvatarUrl,
      accessLevel: newAccessLevel
    };
    onAddVolunteer(newVol);
    
    // Reset form
    setNewName('');
    setNewEmail('');
    setAvatarUrlInput('');
    setCapturedImage('');
    setSelectedRoles([]);
    setNewAccessLevel('volunteer');
    setIsAdding(false);
    stopCamera();
  };

  const toggleRole = (role: RoleType) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const getPreviewSource = () => {
    if (capturedImage) return capturedImage;
    if (avatarUrlInput) return avatarUrlInput;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(newName || 'Novo')}&background=e2e8f0&color=64748b`;
  };

  // Only Admin can create other Admins or Leaders
  const canSetAccessLevel = currentUser?.accessLevel === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-secondary">Voluntários ({volunteers.length})</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Novo Voluntário</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-brand-accent/50 shadow-md animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4 text-brand-primary">Adicionar Pessoa</h3>
          
          <div className="mb-6 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 flex gap-2">
            <Info size={18} className="shrink-0 mt-0.5" />
            <p>
               Você está criando o <strong>Perfil de Acesso</strong>. Para fazer login, esta pessoa deverá acessar o aplicativo e clicar em <strong>"Criar Conta"</strong> usando o mesmo email informado abaixo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Photo Section */}
              <div className="md:col-span-4 flex flex-col items-center gap-3">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-brand-bg shadow-inner bg-gray-100 flex items-center justify-center group">
                      {isCameraOpen ? (
                         <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted></video>
                      ) : (
                         <img 
                          src={getPreviewSource()} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                         />
                      )}
                      <canvas ref={canvasRef} className="hidden"></canvas>
                      
                      {!isCameraOpen && (capturedImage || avatarUrlInput) && (
                          <button onClick={() => {setCapturedImage(''); setAvatarUrlInput('')}} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><X size={24} /></button>
                      )}
                  </div>

                  <div className="flex gap-2 w-full justify-center">
                      {isCameraOpen ? (
                          <div className="flex gap-2">
                              <button onClick={capturePhoto} className="bg-red-500 text-white p-2 rounded-full"><Camera size={20} /></button>
                              <button onClick={stopCamera} className="bg-gray-500 text-white p-2 rounded-full"><X size={20} /></button>
                          </div>
                      ) : (
                          <>
                              <button onClick={startCamera} className="flex-1 bg-brand-primary text-white p-2 rounded-lg text-sm flex items-center justify-center gap-2"><Camera size={16} /> <span className="hidden sm:inline">Câmera</span></button>
                              <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-brand-secondary text-white p-2 rounded-lg text-sm flex items-center justify-center gap-2"><Upload size={16} /> <span className="hidden sm:inline">Upload</span></button>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload}/>
                          </>
                      )}
                  </div>
              </div>

              {/* Info Section */}
              <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-brand-secondary mb-1">Nome Completo</label>
                          <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><User size={18} /></div>
                              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50" placeholder="Ex: João da Silva"/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-brand-secondary mb-1">Email (Login)</label>
                          <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><Mail size={18} /></div>
                              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50" placeholder="email@exemplo.com"/>
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-brand-secondary mb-2">
                        {currentUser?.accessLevel === 'leader' ? 'Ministérios que você lidera:' : 'Ministérios:'}
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                      {allowedRoles.length > 0 ? allowedRoles.map(role => (
                          <button
                          key={role}
                          onClick={() => toggleRole(role)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selectedRoles.includes(role)
                              ? 'bg-brand-primary border-brand-primary text-white shadow-md'
                              : 'bg-white border-brand-muted/30 text-brand-secondary hover:bg-brand-bg'
                          }`}
                          >
                          {role} {selectedRoles.includes(role) && <Check size={14} className="inline ml-1"/>}
                          </button>
                      )) : <p className="text-sm text-gray-500">Nenhum ministério disponível para gerenciar.</p>}
                      </div>
                  </div>

                  {canSetAccessLevel && (
                    <div>
                        <label className="block text-sm font-medium text-brand-secondary mb-2">Nível de Acesso</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="access" value="volunteer" checked={newAccessLevel === 'volunteer'} onChange={() => setNewAccessLevel('volunteer')} className="text-brand-primary focus:ring-brand-primary"/>
                                <span className="text-sm">Voluntário</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="access" value="leader" checked={newAccessLevel === 'leader'} onChange={() => setNewAccessLevel('leader')} className="text-brand-primary focus:ring-brand-primary"/>
                                <span className="text-sm">Líder</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="access" value="admin" checked={newAccessLevel === 'admin'} onChange={() => setNewAccessLevel('admin')} className="text-brand-primary focus:ring-brand-primary"/>
                                <span className="text-sm">Administrador</span>
                            </label>
                        </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-brand-muted/10 mt-2">
                      <button onClick={() => {setIsAdding(false); stopCamera();}} className="px-4 py-2 text-brand-muted hover:text-brand-secondary">Cancelar</button>
                      <button onClick={handleAdd} disabled={!newName || selectedRoles.length === 0} className="bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">Salvar</button>
                  </div>
              </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {volunteers.map(volunteer => (
          <div key={volunteer.id} className="bg-white p-4 rounded-xl shadow-sm border border-brand-muted/20 flex items-start gap-4 hover:shadow-md transition-shadow group relative">
            <img 
              src={volunteer.avatarUrl} 
              alt={volunteer.name} 
              className="w-14 h-14 rounded-full object-cover bg-brand-bg border border-brand-muted/10 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(volunteer.name)}&background=random`; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-brand-secondary truncate">{volunteer.name}</h3>
                  {volunteer.accessLevel !== 'volunteer' && (
                      <span className="text-[10px] uppercase font-bold text-brand-primary bg-brand-accent/30 px-1.5 py-0.5 rounded ml-2">
                          {volunteer.accessLevel === 'admin' ? 'Admin' : 'Líder'}
                      </span>
                  )}
              </div>
              <p className="text-xs text-brand-muted truncate mb-1">{volunteer.email || 'Sem email'}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {volunteer.roles.map(role => (
                  <span key={role} className="text-xs px-2 py-0.5 bg-brand-bg text-brand-secondary/80 rounded-md border border-brand-muted/20">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Remove button only visible if user has permission. Simple logic: Admins remove anyone, Leaders remove only if they share a ministry? For now, let's stick to App.tsx permission prop */}
            <button 
              onClick={() => onRemoveVolunteer(volunteer.id)}
              className="text-brand-muted hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 absolute top-2 right-2"
              title="Remover"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolunteerList;
