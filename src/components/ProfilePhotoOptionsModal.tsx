import React, { useState, useRef, useEffect } from "react";
import { Athlete } from "../types";
import { Camera, Trash2, User, X, Pencil, Check, RefreshCw, FlipHorizontal, Sparkles, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface ProfilePhotoOptionsModalProps {
  isOpen: boolean;
  athlete: Athlete | null;
  onClose: () => void;
  onUploadPhoto: (base64: string) => void;
  onRemovePhoto: () => void;
  onEditProfileData: () => void;
}

export const processProfileImageFile = (file: File, callback: (base64: string) => void) => {
  if (!file.type.startsWith("image/")) {
    toast.error("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_SIZE = 600;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      callback(dataUrl);
    };
    img.onerror = () => {
      toast.error("Erro ao processar imagem.");
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export const ProfilePhotoOptionsModal: React.FC<ProfilePhotoOptionsModalProps> = ({
  isOpen,
  athlete,
  onClose,
  onUploadPhoto,
  onRemovePhoto,
  onEditProfileData,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Ensure video stream is bound whenever videoRef is mounted in DOM
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn("Erro ao iniciar reprodução do vídeo da câmera:", err);
      });
    }
  }, [isCameraActive, capturedImage]);

  const handleClose = () => {
    stopCameraStream();
    setIsCameraActive(false);
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen || !athlete) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processProfileImageFile(file, (base64) => {
        onUploadPhoto(base64);
        toast.success("Foto de perfil atualizada com sucesso! 📷");
        handleClose();
      });
    }
  };

  const startCameraStream = async (mode: "user" | "environment" = facingMode) => {
    stopCameraStream();
    setCapturedImage(null);

    // Fallback if mediaDevices is not supported in current environment/iframe
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Abrindo câmera nativa do dispositivo...");
      cameraInputRef.current?.click();
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Erro ao acessar câmera em tempo real:", err);
      toast("Iniciando câmera nativa do aparelho...");
      setIsCameraActive(false);
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 200);
    }
  };

  const toggleCameraFacingMode = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCameraStream(newMode);
  };

  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
  };

  const confirmCapturedPhoto = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `profile-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        processProfileImageFile(file, (base64) => {
          onUploadPhoto(base64);
          toast.success("Foto de perfil tirada e salva com sucesso! 📸");
          handleClose();
        });
      })
      .catch(() => {
        toast.error("Erro ao processar foto capturada.");
      });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left"
        >
          {/* Header & Close */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gerenciamento de Perfil
              </span>
              <h2 className="text-xl font-black italic uppercase text-white tracking-tight">
                {isCameraActive ? "Tirar Foto com a Câmera" : "Foto de Perfil & Dados"}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:bg-slate-700 cursor-pointer"
              title="Fechar sem alterar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hidden Gallery File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Hidden Native Device Camera Shutter Input */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Camera Stream View */}
          {isCameraActive ? (
            <div className="space-y-4 my-2">
              <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-full overflow-hidden border-4 border-brand-primary/80 bg-slate-950 shadow-2xl flex items-center justify-center">
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Foto Capturada"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                  />
                )}

                {/* Live Indicator overlay */}
                {!capturedImage && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-brand-primary/40 text-[9px] font-black uppercase text-brand-primary tracking-widest flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                    <span>Ao Vivo</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              {capturedImage ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Tirar Outra</span>
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Usar Foto</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 pt-2">
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={toggleCameraFacingMode}
                      className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 transition-all cursor-pointer"
                      title="Inverter Câmera"
                    >
                      <FlipHorizontal className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={capturePhotoFromStream}
                    className="py-3 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 transition-all cursor-pointer scale-105 active:scale-95"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capturar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      setIsCameraActive(false);
                    }}
                    className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center border border-slate-700 transition-all cursor-pointer"
                    title="Voltar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Current Avatar Circle & Preview */}
              <div className="flex flex-col items-center justify-center my-3">
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-800 border-4 border-slate-700/80 p-1 shadow-2xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
                    {athlete.photoUrl ? (
                      <img
                        src={athlete.photoUrl}
                        alt={athlete.name}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-16 h-16 text-slate-500" />
                    )}
                  </div>
                  <button
                    onClick={() => startCameraStream()}
                    className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-brand-primary text-slate-950 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-2 border-slate-900"
                    title="Tirar foto com a câmera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-base font-black uppercase text-white mt-3 italic tracking-tight">
                  {athlete.name}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {athlete.modality || "Preparação Física"}
                </p>
              </div>

              {/* Action Options List */}
              <div className="space-y-2.5 mt-5">
                {/* Option 1: Live Camera Photo Capture */}
                <button
                  type="button"
                  onClick={() => startCameraStream()}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-white transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-slate-950 flex items-center justify-center font-black shadow-md">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                        <span>Tirar Foto com a Câmera</span>
                        <span className="text-[8px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase font-black">Ao Vivo</span>
                      </div>
                      <div className="text-[10px] text-slate-300 font-medium">
                        Ativar câmera do dispositivo para fotografar agora
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-brand-primary font-bold">→</span>
                </button>

                {/* Option 2: Choose Photo from Gallery */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-white transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black uppercase tracking-wider text-white">
                        Escolher Foto da Galeria
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Selecione uma imagem já existente no seu dispositivo
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-blue-400 font-bold">→</span>
                </button>

                {/* Option 3: Edit Profile Info */}
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onEditProfileData();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 text-white transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                      <Pencil className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black uppercase tracking-wider text-white">
                        Editar Dados do Perfil
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Alterar nome, data de nascimento e modalidade
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">→</span>
                </button>

                {/* Option 4: Remove Photo (if exists) */}
                {athlete.photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemovePhoto();
                      toast.success("Foto de perfil removida com sucesso.");
                      handleClose();
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-500/50 text-red-400 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black uppercase tracking-wider text-red-400">
                          Remover Foto Atual
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Voltar a utilizar a ilustração padrão
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-red-400 font-bold">×</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Close / Cancel Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Fechar Edição (Sem Alterar)</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


