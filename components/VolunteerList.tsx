import React, { useState, useRef, useEffect } from 'react';
import { Volunteer, RoleType } from '../types';
import { Plus, Trash2, User, Check, Image as ImageIcon, Camera, Upload, X, RefreshCw } from 'lucide-react';

interface VolunteerListProps {
  volunteers: Volunteer[];
  roles: string[];
  onAddVolunteer: (v: Volunteer) => void;
  onRemoveVolunteer: (id: string) => void;
}

const VolunteerList: React.FC<VolunteerListProps> = ({ volunteers, roles, onAddVolunteer, onRemoveVolunteer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Image handling states
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [capturedImage, setCapturedImage] = useState(''); // Base64 from camera or upload
  
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  
  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Attach stream to video element when camera is open
  useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraOpen, stream]);

  const startCamera = async () => {
    try {
      setCapturedImage(''); // Reset previous image
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Não foi possível acessar a câmera. Verifique se você concedeu permissão.");
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
        // Resize logic to prevent huge base64 strings
        const MAX_WIDTH = 400;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        const scale = MAX_WIDTH / videoWidth;
        const finalWidth = MAX_WIDTH;
        const finalHeight = videoHeight * scale;

        canvasRef.current.width = finalWidth;
        canvasRef.current.height = finalHeight;
        
        context.drawImage(videoRef.current, 0, 0, finalWidth, finalHeight);
        
        // Use lower quality (0.7) to further reduce size
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        setAvatarUrlInput(''); // Clear URL input if exists
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // We generally can't easily resize file upload on client without rendering to canvas, 
        // but for now we assume uploaded files might be larger or user knows what they are doing.
        // A simple optimization is to warn if > 500kb.
        const res = reader.result as string;
        if (res.length > 500000) {
            alert("Aviso: Imagem muito grande. Se possível, use uma imagem menor para garantir o salvamento.");
        }
        setCapturedImage(res);
        setAvatarUrlInput('');
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setCapturedImage('');
    setAvatarUrlInput('');
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAdd = () => {
    if (!newName.trim() || selectedRoles.length === 0) return;
    
    // Priority: Captured/Uploaded Image -> Typed URL -> Random Fallback
    const finalAvatarUrl = capturedImage || (avatarUrlInput.trim() ? avatarUrlInput.trim() : `https://picsum.photos/100/100?random=${Date.now()}`);

    const newVol: Volunteer = {
      id: Date.now().toString(),
      name: newName,
      roles: selectedRoles,
      avatarUrl: finalAvatarUrl
    };
    onAddVolunteer(newVol);
    
    // Reset form
    setNewName('');
    setAvatarUrlInput('');
    setCapturedImage('');
    setSelectedRoles([]);
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

  // Helper to determine preview source
  const getPreviewSource = () => {
    if (capturedImage) return capturedImage;
    if (avatarUrlInput) return avatarUrlInput;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(newName || 'Novo')}&background=e2e8f0&color=64748b`;
  };

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
          <div className="space-y-4">
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
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName || 'N')}&background=random`;
                            }}
                           />
                        )}
                        
                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} className="hidden"></canvas>
                        
                        {/* Overlay Controls */}
                        {!isCameraOpen && (capturedImage || avatarUrlInput) && (
                            <button 
                                onClick={clearImage}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                title="Remover foto"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full justify-center">
                        {isCameraOpen ? (
                            <div className="flex gap-2">
                                <button 
                                    onClick={capturePhoto} 
                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                                    title="Tirar Foto"
                                >
                                    <Camera size={20} />
                                </button>
                                <button 
                                    onClick={stopCamera} 
                                    className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full shadow-lg"
                                    title="Cancelar Câmera"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={startCamera}
                                    className="flex-1 bg-brand-primary text-white p-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-colors"
                                    title="Usar Câmera"
                                >
                                    <Camera size={16} /> <span className="hidden sm:inline">Câmera</span>
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 bg-brand-secondary text-white p-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-brand-secondary/90 transition-colors"
                                    title="Upload Arquivo"
                                >
                                    <Upload size={16} /> <span className="hidden sm:inline">Upload</span>
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </>
                        )}
                    </div>
                    
                    {!isCameraOpen && !capturedImage && (
                        <div className="w-full relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                                <ImageIcon size={14} />
                            </div>
                            <input
                                type="text"
                                value={avatarUrlInput}
                                onChange={(e) => setAvatarUrlInput(e.target.value)}
                                className="w-full text-xs border border-brand-muted/30 rounded-md pl-8 pr-2 py-1.5 focus:ring-1 focus:ring-brand-primary focus:outline-none bg-brand-bg/50"
                                placeholder="Ou cole URL da imagem..."
                            />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="md:col-span-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-secondary mb-1">Nome Completo</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full border border-brand-muted/30 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/50"
                                placeholder="Ex: João da Silva"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-secondary mb-2">Habilidades / Ministérios</label>
                        {roles.length > 0 ? (
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                            {roles.map(role => (
                                <button
                                key={role}
                                onClick={() => toggleRole(role)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                    selectedRoles.includes(role)
                                    ? 'bg-brand-primary border-brand-primary text-white shadow-md'
                                    : 'bg-white border-brand-muted/30 text-brand-secondary hover:bg-brand-bg hover:border-brand-muted'
                                }`}
                                >
                                {role} {selectedRoles.includes(role) && <Check size={14} className="inline ml-1"/>}
                                </button>
                            ))}
                            </div>
                        ) : (
                            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            Nenhum ministério cadastrado. Vá até a aba "Ministérios" para adicionar.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-brand-muted/10 mt-2">
                        <button 
                            onClick={() => {
                                setIsAdding(false);
                                stopCamera();
                            }}
                            className="px-4 py-2 text-brand-muted hover:text-brand-secondary"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleAdd}
                            disabled={!newName || selectedRoles.length === 0}
                            className="bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {volunteers.map(volunteer => (
          <div key={volunteer.id} className="bg-white p-4 rounded-xl shadow-sm border border-brand-muted/20 flex items-start gap-4 hover:shadow-md transition-shadow group">
            <img 
              src={volunteer.avatarUrl} 
              alt={volunteer.name} 
              className="w-14 h-14 rounded-full object-cover bg-brand-bg border border-brand-muted/10 shrink-0"
              onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(volunteer.name)}&background=random`;
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-secondary truncate">{volunteer.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {volunteer.roles.map(role => (
                  <span key={role} className="text-xs px-2 py-0.5 bg-brand-bg text-brand-secondary/80 rounded-md border border-brand-muted/20">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <button 
              onClick={() => onRemoveVolunteer(volunteer.id)}
              className="text-brand-muted hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
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