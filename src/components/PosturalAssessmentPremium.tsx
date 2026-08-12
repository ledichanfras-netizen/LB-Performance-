import React, { useState, useRef } from 'react';
import { Athlete, PosturalAssessment, PosturalDeviation, PosturalCorrectiveExercise, PosturalAiDetails, AssessmentType } from '../types';
import { Sparkles, Activity, Camera, AlertTriangle, CheckCircle2, Plus, Trash2, Eye, FileText, ChevronRight, Calendar, ArrowLeft, UploadCloud, Info, Dumbbell, Shield, Lightbulb, RefreshCw, EyeOff, Printer, Grid, Sliders, Check, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicReportEngine, ReportBlock } from './DynamicReportEngine';

interface PosturalAssessmentPremiumProps {
  athlete: Athlete;
  role: 'coach' | 'athlete';
  addAssessment: (athleteId: string, type: AssessmentType, data: any) => Promise<any>;
  removeAssessment: (athleteId: string, type: AssessmentType, assessmentId: string) => Promise<any>;
}

const COMMON_PAIN_ZONES = [
  { id: 'cervical', label: 'Pescoço / Cervical' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'dorsal', label: 'Dorsal (Meio das Costas)' },
  { id: 'lombar', label: 'Lombar (Baixo das Costas)' },
  { id: 'quadril', label: 'Quadril / Pélvis' },
  { id: 'joelhos', label: 'Joelhos' },
  { id: 'tornozelos_pes', label: 'Tornozelos / Pés' }
];

const PRESET_POSTURES = [
  { id: 'postura_ideal', label: 'Postura Ideal / Alinhamento Neutro', desc: 'Simula um alinhamento anatômico excelente para verificar referências de elite.' },
  { id: 'cabeça_protusa', label: 'Cabeça Protusa / Projeção Cervical', desc: 'Simula anteriorização cervical crônica, comum em uso excessivo de telas.' },
  { id: 'ombros_assimetricos', label: 'Assimetria e Protusão Escapular', desc: 'Simula um ombro mais alto que o outro com enrolamento anterior.' },
  { id: 'hiperlordose', label: 'Hiperlordose Lombar / Anteversão Pélvica', desc: 'Simula a Síndrome Cruzada Inferior, acentuando a curvatura lombar.' },
  { id: 'joelhos_valgos', label: 'Valgo Dinâmico / Joelhos para Dentro', desc: 'Simula rotação interna do fêmur e desabamento do arco plantar.' }
];

const LOADING_STEPS = [
  "Inicializando motor de visão computacional biomecânica...",
  "Identificando marcos anatômicos (glabela, acrômio, espinhas ilíacas)...",
  "Analisando alinhamento vertical em relação à linha de prumo sagital...",
  "Mapeando assimetrias bilaterais e ângulos de rotação segmentares...",
  "Correlacionando áreas de queixa álgica com compensações de cadeia cinética...",
  "Prescrevendo rotinas corretivas de mobilidade e ativação muscular de elite..."
];

interface PosturalVisualizerProps {
  photoUrl: string;
  view: 'anterior' | 'lateral' | 'posterior';
  assessmentId: string;
  compact?: boolean;
}

interface PosturalState {
  showGrid: boolean;
  showPlumbline: boolean;
  showAnatomyLines: boolean;
  plumblineX: number;
  shoulderY?: number;
  shoulderAngle?: number;
  pelvisY?: number;
  pelvisAngle?: number;
  headAngle?: number;
  earX?: number;
  earY?: number;
  shoulderX?: number;
}

export const PosturalVisualizer: React.FC<PosturalVisualizerProps> = ({ photoUrl, view, assessmentId, compact = false }) => {
  // Unique storage key
  const storageKey = `LB_POSTURAL_VISUALIZER_v2_${assessmentId}_${view}`;

  // Initial state helper
  const getInitialState = (): PosturalState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn(e);
    }

    // Smart defaults based on typical anatomical proportions
    if (view === 'lateral') {
      return {
        showGrid: true,
        showPlumbline: true,
        showAnatomyLines: true,
        plumblineX: 48,
        headAngle: 12.4,
        earX: 52,
        earY: 14,
        shoulderX: 48,
        shoulderY: 22,
      };
    } else {
      // anterior or posterior
      return {
        showGrid: true,
        showPlumbline: true,
        showAnatomyLines: true,
        plumblineX: 50,
        shoulderY: 21,
        shoulderAngle: view === 'anterior' ? -1.8 : 2.2,
        pelvisY: 42,
        pelvisAngle: view === 'anterior' ? 1.4 : -1.6,
      };
    }
  };

  const [state, setState] = React.useState<PosturalState>(getInitialState);

  // Update helper
  const updateState = (updates: Partial<PosturalState>) => {
    setState((prev: PosturalState) => {
      const newState = { ...prev, ...updates };
      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (e) {
        console.warn(e);
      }
      return newState;
    });
  };

  const { showGrid, showPlumbline, showAnatomyLines, plumblineX } = state;

  return (
    <div className={`relative bg-slate-900 rounded-2xl overflow-hidden flex flex-col border border-slate-200/40 shadow-sm mx-auto ${compact ? 'shadow-xs max-w-[210px] w-fit' : 'w-full'}`}>
      {/* PHOTO & OVERLAY CONTAINER */}
      <div className={`relative overflow-hidden flex items-center justify-center bg-black select-none ${compact ? 'w-fit h-fit mx-auto' : 'w-full'}`}>
        <img
          src={photoUrl}
          alt={`Postural View ${view}`}
          className={`select-none pointer-events-none object-contain ${compact ? 'max-h-[310px] max-w-[190px] w-auto h-auto' : 'w-full h-auto'}`}
          referrerPolicy="no-referrer"
        />

        {/* 1. POSTURAL GRID (TELA QUADRICULADA) */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <svg className="w-full h-full">
              <defs>
                <pattern id={`postural-grid-${view}-${assessmentId}`} width="18" height="18" patternUnits="userSpaceOnUse">
                  <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#postural-grid-${view}-${assessmentId})`} />
            </svg>
          </div>
        )}

        {/* 2. PLUMBLINE (FIO DE PRUMO) */}
        {showPlumbline && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `${plumblineX ?? 50}%` }}
          >
            {/* Dashed vertical line */}
            <div className="h-full w-[1.5px] border-l-2 border-dashed border-emerald-400 opacity-80" />
            {/* Center label */}
            <span className="absolute top-2 left-1.5 bg-emerald-600/90 text-white text-[7px] font-bold font-mono px-1 py-0.2 rounded leading-none whitespace-nowrap">
              EIXO DE PRUMO
            </span>
          </div>
        )}

        {/* 3. BIOMECHANICAL ALIGNMENT LINES */}
        {showAnatomyLines && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 533" preserveAspectRatio="none">
            {view !== 'lateral' ? (
              <>
                {/* SHOULDER LINE */}
                {(() => {
                  const y = (state.shoulderY ?? 21) * 5.33;
                  const angle = state.shoulderAngle ?? 0;
                  const isAligned = Math.abs(angle) < 0.2;
                  const strokeColor = isAligned ? '#10b981' : '#f43f5e';
                  
                  return (
                    <g>
                      {/* We rotate using SVG transform around the center of the line */}
                      <g transform={`rotate(${angle}, 150, ${y})`}>
                        <line
                          x1="15"
                          y1={y}
                          x2="285"
                          y2={y}
                          stroke={strokeColor}
                          strokeWidth="2"
                          strokeDasharray={isAligned ? "none" : "2 2"}
                        />
                        {/* Anatomy Landmark Nodes */}
                        <circle cx="60" cy={y} r="4" fill={strokeColor} />
                        <circle cx="240" cy={y} r="4" fill={strokeColor} />
                      </g>
                      {/* Label displaying degrees */}
                      <foreignObject
                        x="30"
                        y={y - 25}
                        width="240"
                        height="30"
                        className="overflow-visible"
                      >
                        <div className="flex justify-center">
                          <span
                            className={`text-[8px] font-black font-sans px-1.5 py-0.5 rounded leading-none shadow-md border whitespace-nowrap ${
                              isAligned
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-rose-600 text-white border-rose-500'
                            }`}
                          >
                            ALINHAMENTO DE OMBROS: {angle > 0 ? '+' : ''}
                            {angle.toFixed(1)}°
                          </span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })()}

                {/* PELVIS / HIP LINE */}
                {(() => {
                  const y = (state.pelvisY ?? 42) * 5.33;
                  const angle = state.pelvisAngle ?? 0;
                  const isAligned = Math.abs(angle) < 0.2;
                  const strokeColor = isAligned ? '#10b981' : '#f59e0b';
                  
                  return (
                    <g>
                      <g transform={`rotate(${angle}, 150, ${y})`}>
                        <line
                          x1="15"
                          y1={y}
                          x2="285"
                          y2={y}
                          stroke={strokeColor}
                          strokeWidth="2"
                          strokeDasharray={isAligned ? "none" : "2 2"}
                        />
                        <circle cx="75" cy={y} r="4" fill={strokeColor} />
                        <circle cx="225" cy={y} r="4" fill={strokeColor} />
                      </g>
                      <foreignObject
                        x="30"
                        y={y - 25}
                        width="240"
                        height="30"
                        className="overflow-visible"
                      >
                        <div className="flex justify-center">
                          <span
                            className={`text-[8px] font-black font-sans px-1.5 py-0.5 rounded leading-none shadow-md border whitespace-nowrap ${
                              isAligned
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-amber-600 text-white border-amber-500'
                            }`}
                          >
                            NIVELAMENTO PÉLVICO: {angle > 0 ? '+' : ''}
                            {angle.toFixed(1)}°
                          </span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })()}
              </>
            ) : (
              <>
                {/* LATERAL VIEW: FORWARD HEAD CARRIAGE LINE */}
                {(() => {
                  const earX = (state.earX ?? 52) * 3;
                  const earY = (state.earY ?? 14) * 5.33;
                  const shoulderX = (state.shoulderX ?? 48) * 3;
                  const shoulderY = (state.shoulderY ?? 22) * 5.33;
                  const angle = state.headAngle ?? 0;
                  const isNormal = angle < 10;
                  const color = isNormal ? '#10b981' : '#f59e0b';

                  return (
                    <g>
                      {/* Draw anatomical markers */}
                      {/* Ear (Meato Acústico Externo) */}
                      <circle cx={earX} cy={earY} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      {/* Acromion (Ombro) */}
                      <circle cx={shoulderX} cy={shoulderY} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />

                      {/* Connect ear to acromion */}
                      <line
                        x1={earX}
                        y1={earY}
                        x2={shoulderX}
                        y2={shoulderY}
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="3 3"
                      />

                      {/* Projection Line (Vertical from Shoulder to compare Head Position) */}
                      <line
                        x1={shoulderX}
                        y1={earY - 10}
                        x2={shoulderX}
                        y2={shoulderY + 50}
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeWidth="1"
                        strokeDasharray="1 1"
                      />

                      {/* Text Label */}
                      <foreignObject
                        x="30"
                        y={(earY + shoulderY) / 2 - 15}
                        width="240"
                        height="30"
                        className="overflow-visible"
                      >
                        <div className="flex justify-center">
                          <span
                            className={`text-[8px] font-black font-sans px-1.5 py-0.5 rounded leading-none shadow-md border whitespace-nowrap ${
                              isNormal
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-amber-600 text-white border-amber-500'
                            }`}
                          >
                            PROJEÇÃO CERVICAL: {angle.toFixed(1)}° {isNormal ? '(NEUTRA)' : '(PROTUSA)'}
                          </span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })()}
              </>
            )}
          </svg>
        )}

        {/* View text overlay (Prismatic badge) */}
        <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-md text-white text-[8px] font-bold font-mono px-2 py-0.5 rounded border border-slate-800 uppercase tracking-wider font-sans select-none pointer-events-none">
          Vista {view}
        </div>
      </div>

      {/* CONTROLS OVERLAY (HIDDEN ON PRINT & JPEG EXPORT) */}
      {!compact && (
        <div className="print:hidden no-print bg-slate-950/95 border-t border-slate-800 p-3 flex flex-col gap-2 shrink-0 select-none">
        {/* Toggle Controls bar */}
        <div className="flex items-center justify-between gap-1 border-b border-slate-850 pb-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-emerald-500" /> Ajuste Métrico
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateState({ showGrid: !showGrid })}
              className={`p-1.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors border cursor-pointer ${
                showGrid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
              }`}
              title="Alternar Grade de Postura"
            >
              <Grid className="w-3 h-3" /> Grade
            </button>
            <button
              onClick={() => updateState({ showPlumbline: !showPlumbline })}
              className={`p-1.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors border cursor-pointer ${
                showPlumbline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
              }`}
              title="Alternar Linha Vertical de Prumo"
            >
              <Activity className="w-3 h-3" /> Prumo
            </button>
            <button
              onClick={() => updateState({ showAnatomyLines: !showAnatomyLines })}
              className={`p-1.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors border cursor-pointer ${
                showAnatomyLines
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
              }`}
              title="Alternar Linhas Biomecânicas"
            >
              <Check className="w-3 h-3" /> Linhas
            </button>
          </div>
        </div>

        {/* Adjustments sliders */}
        {showAnatomyLines && (
          <div className="space-y-2 pt-0.5">
            {view !== 'lateral' ? (
              <>
                {/* Shoulder Y Adjustment */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Altura Ombros</span>
                    <span className="font-mono font-bold text-slate-300">{state.shoulderY ?? 21}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="1"
                    value={state.shoulderY ?? 21}
                    onChange={e => updateState({ shoulderY: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Shoulder Angle Adjustment */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Rotação Ombros (Grau)</span>
                    <span className="font-mono font-bold text-slate-300">{state.shoulderAngle?.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={state.shoulderAngle ?? 0}
                    onChange={e => updateState({ shoulderAngle: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Pelvis Y Adjustment */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Altura Pélvis</span>
                    <span className="font-mono font-bold text-slate-300">{state.pelvisY ?? 42}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="1"
                    value={state.pelvisY ?? 42}
                    onChange={e => updateState({ pelvisY: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Pelvis Angle Adjustment */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Rotação Pélvis (Grau)</span>
                    <span className="font-mono font-bold text-slate-300">{state.pelvisAngle?.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={state.pelvisAngle ?? 0}
                    onChange={e => updateState({ pelvisAngle: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Lateral: Head Angle Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Ângulo Cervical (Graus)</span>
                    <span className="font-mono font-bold text-slate-300">{state.headAngle?.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.1"
                    value={state.headAngle ?? 12.4}
                    onChange={e => updateState({ headAngle: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Lateral: Head Y Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Posição do Ouvido (Y)</span>
                    <span className="font-mono font-bold text-slate-300">{state.earY}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={state.earY ?? 14}
                    onChange={e => updateState({ earY: parseInt(e.target.value), headAngle: Math.max(0, ((state.shoulderY ?? 22) - parseInt(e.target.value)) * 0.9) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>

                {/* Lateral: Shoulder Y Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                    <span className="uppercase">Posição do Ombro (Y)</span>
                    <span className="font-mono font-bold text-slate-300">{state.shoulderY}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="1"
                    value={state.shoulderY ?? 22}
                    onChange={e => updateState({ shoulderY: parseInt(e.target.value), headAngle: Math.max(0, (parseInt(e.target.value) - (state.earY ?? 14)) * 0.9) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
              </>
            )}

            {/* Plumbline X slider */}
            {showPlumbline && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400">
                  <span className="uppercase">Eixo Horizontal do Prumo</span>
                  <span className="font-mono font-bold text-slate-300">{state.plumblineX ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="1"
                  value={state.plumblineX ?? 50}
                  onChange={e => updateState({ plumblineX: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export const PosturalAssessmentPremium: React.FC<PosturalAssessmentPremiumProps> = ({
  athlete,
  role,
  addAssessment,
  removeAssessment
}) => {
  const [selectedAssessment, setSelectedAssessment] = useState<PosturalAssessment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCaptureGuide, setShowCaptureGuide] = useState(true);
  
  // Wizard State
  const [painZones, setPainZones] = useState<string[]>([]);
  const [presetType, setPresetType] = useState<string>('postural_custom');
  const [captureMethod, setCaptureMethod] = useState<'simulation' | 'upload'>('simulation');
  const [notes, setNotes] = useState('');
  
  // Base64 photos
  const [photoAnterior, setPhotoAnterior] = useState<string | null>(null);
  const [photoLateral, setPhotoLateral] = useState<string | null>(null);
  const [photoPosterior, setPhotoPosterior] = useState<string | null>(null);
  
  // Camera Capture Modal State
  const [activeCameraView, setActiveCameraView] = useState<'anterior' | 'lateral' | 'posterior' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // AI loading and progress
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const history = (athlete.assessments?.postural || []) as PosturalAssessment[];

  // Start Camera Helper
  const startCamera = async (view: 'anterior' | 'lateral' | 'posterior') => {
    setActiveCameraView(view);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      toast.error("Não foi possível acessar a câmera do dispositivo. Usando modo de arquivo.");
      setActiveCameraView(null);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setActiveCameraView(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg');
        if (activeCameraView === 'anterior') setPhotoAnterior(base64);
        if (activeCameraView === 'lateral') setPhotoLateral(base64);
        if (activeCameraView === 'posterior') setPhotoPosterior(base64);
        toast.success(`Foto vista ${activeCameraView} capturada!`);
      }
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, view: 'anterior' | 'lateral' | 'posterior') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (view === 'anterior') setPhotoAnterior(base64);
        if (view === 'lateral') setPhotoLateral(base64);
        if (view === 'posterior') setPhotoPosterior(base64);
        toast.success(`Imagem vista ${view} carregada com sucesso!`);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePainZone = (zone: string) => {
    setPainZones(prev => 
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const triggerPosturalAnalysis = async () => {
    setAiLoading(true);
    setLoadingStepIndex(0);

    // Stagger loading phrases
    const interval = setInterval(() => {
      setLoadingStepIndex(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);

    try {
      const payload = {
        painZones,
        presetType: captureMethod === 'simulation' ? presetType : 'custom_upload',
        notes,
        photoAnterior,
        photoLateral,
        photoPosterior
      };

      let token = '';
      try {
        const storedUser = localStorage.getItem('lb_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          token = parsedUser.token || '';
        }
      } catch (e) {
        console.warn("Erro ao obter token do lb_user:", e);
      }

      const res = await fetch('/api/generate-postural-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Falha na análise postural.");
      }

      const resData = await res.json();
      if (!resData || !resData.result) {
        throw new Error("Resposta inválida do analisador de postura por IA.");
      }

      // Converted to local assessment schema
      const newAssessment: Omit<PosturalAssessment, 'id'> = {
        date: new Date().toISOString().split('T')[0],
        painZones,
        presetType: captureMethod === 'simulation' ? presetType : 'custom_upload',
        notes,
        photoAnterior: photoAnterior || undefined,
        photoLateral: photoLateral || undefined,
        photoPosterior: photoPosterior || undefined,
        aiDetails: resData.result,
        observations: notes || `Avaliação de desvios posturais por Inteligência Artificial.`
      };

      // Save directly into backend history
      await addAssessment(athlete.id, 'postural', newAssessment);
      setIsCreating(false);
      
      // Reset form fields
      setPainZones([]);
      setPresetType('postura_ideal');
      setNotes('');
      setPhotoAnterior(null);
      setPhotoLateral(null);
      setPhotoPosterior(null);
      
    } catch (err: any) {
      console.error("[Postural Assessment Error] ", err);
      toast.error(`Falha ao gerar laudo da IA: ${err.message || err}`);
    } finally {
      clearInterval(interval);
      setAiLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Deseja realmente remover esta avaliação postural do histórico?")) {
      try {
        await removeAssessment(athlete.id, 'postural', id);
        if (selectedAssessment?.id === id) {
          setSelectedAssessment(null);
        }
      } catch (err) {
        toast.error("Falha ao remover avaliação.");
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6" id="postural-premium-container">
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: LOADING STATE */}
        {aiLoading && (
          <motion.div
            key="ai-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 min-h-[500px] text-center bg-radial from-slate-900 to-black rounded-2xl border border-slate-800 text-white"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center animate-bounce">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold tracking-tight mb-2 font-sans bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
              Processando IA Biomecânica de Elite
            </h3>
            
            <div className="max-w-md space-y-2">
              <p className="text-slate-400 text-sm font-mono h-12 flex items-center justify-center px-4">
                {LOADING_STEPS[loadingStepIndex]}
              </p>
              
              <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 18, ease: "linear" }}
                />
              </div>
              <span className="text-slate-500 text-xs">Aguarde alguns instantes, o laudo é extremamente completo.</span>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: LAUDO / SINGLE REPORT VIEW */}
        {!aiLoading && selectedAssessment && (() => {
          const reportBlocks: ReportBlock[] = [
            {
              id: 'resumo-postural',
              section: 'Laudo Clínico',
              content: (
                <div className="space-y-6 text-left">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-emerald-600 rounded-full"></div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Diagnóstico Clínico da Postura</h3>
                    </div>
                    <div className="bg-slate-950 text-white rounded-[2rem] p-6 border border-slate-900 shadow-xl relative overflow-hidden print:p-4 print:rounded-2xl">
                      <div className="absolute right-4 bottom-4 opacity-[0.03] pointer-events-none">
                        <Sparkles className="w-32 h-32 text-white" />
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line break-words overflow-hidden print:text-[10px] print:leading-normal">
                        {selectedAssessment.aiDetails?.conclusao || selectedAssessment.observations}
                      </p>
                    </div>
                  </div>

                  {selectedAssessment.painZones && selectedAssessment.painZones.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zonas de Queixa Álgica</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAssessment.painZones.map(zone => {
                          const label = COMMON_PAIN_ZONES.find(z => z.id === zone)?.label || zone;
                          return (
                            <span key={zone} className="text-[10px] bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-full inline-flex items-center gap-1.5 font-bold break-words whitespace-normal print:px-2 print:py-0.5 print:text-[9px]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <span className="break-all">{label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-[10px] text-slate-400 italic text-center leading-normal">
                      * As fotos com as linhas de avaliação anatômica estão posicionadas lado a lado a seguir para análise integrada.
                    </p>
                  </div>
                </div>
              )
            },
            {
              id: 'fotos-postura-tridimensional',
              section: 'Alinhamento Postural',
              forcePageBreak: true,
              content: (
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Avaliação Postural Tridimensional</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal -mt-2">
                    Registro fotográfico do alinhamento biomecânico corporal em planos Anterior, Lateral e Posterior com sobreposição de eixos anatômicos e linha de prumo.
                  </p>

                  {/* 3 Photos Side by Side */}
                  <div className="grid grid-cols-3 gap-3 justify-items-center items-stretch py-1">
                    {/* Anterior View */}
                    <div className="flex flex-col items-center w-full min-w-0">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Vista Anterior</div>
                      {selectedAssessment.photoAnterior ? (
                        <PosturalVisualizer
                          photoUrl={selectedAssessment.photoAnterior}
                          view="anterior"
                          assessmentId={selectedAssessment.id}
                          compact={true}
                        />
                      ) : (
                        <div className="aspect-[9/16] rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center justify-center p-3 relative w-[140px] h-[230px] shrink-0">
                          <EyeOff className="w-5 h-5 text-slate-300 mb-1" />
                          <span className="text-[8px] text-slate-400 font-bold font-mono uppercase text-center leading-tight">Não Disponível</span>
                        </div>
                      )}
                    </div>

                    {/* Lateral View */}
                    <div className="flex flex-col items-center w-full min-w-0">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Vista Lateral</div>
                      {selectedAssessment.photoLateral ? (
                        <PosturalVisualizer
                          photoUrl={selectedAssessment.photoLateral}
                          view="lateral"
                          assessmentId={selectedAssessment.id}
                          compact={true}
                        />
                      ) : (
                        <div className="aspect-[9/16] rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center justify-center p-3 relative w-[140px] h-[230px] shrink-0">
                          <EyeOff className="w-5 h-5 text-slate-300 mb-1" />
                          <span className="text-[8px] text-slate-400 font-bold font-mono uppercase text-center leading-tight">Não Disponível</span>
                        </div>
                      )}
                    </div>

                    {/* Posterior View */}
                    <div className="flex flex-col items-center w-full min-w-0">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Vista Posterior</div>
                      {selectedAssessment.photoPosterior ? (
                        <PosturalVisualizer
                          photoUrl={selectedAssessment.photoPosterior}
                          view="posterior"
                          assessmentId={selectedAssessment.id}
                          compact={true}
                        />
                      ) : (
                        <div className="aspect-[9/16] rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center justify-center p-3 relative w-[140px] h-[230px] shrink-0">
                          <EyeOff className="w-5 h-5 text-slate-300 mb-1" />
                          <span className="text-[8px] text-slate-400 font-bold font-mono uppercase text-center leading-tight">Não Disponível</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descriptions Grid Below */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                      <h4 className="text-[8px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Vista Anterior</h4>
                      <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
                        Nivelamento pélvico e dos ombros. Identifica inclinações laterais e assimetrias de linha média.
                      </p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                      <h4 className="text-[8px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Vista Lateral</h4>
                      <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
                        Fio de prumo ideal. Identifica hiperlordose, cifose dorsal ou anteriorização da cabeça.
                      </p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                      <h4 className="text-[8px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Vista Posterior</h4>
                      <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
                        Espinhas escapulares e triângulo de escarpa. Diagnostica escoliose ou rotações de quadril.
                      </p>
                    </div>
                  </div>
                </div>
              )
            },
            {
              id: 'desvios-posturais',
              section: 'Desvios & Compensações',
              forcePageBreak: true,
              content: (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Desvios Anatômicos e Compensações Identificadas</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed -mt-2">
                    Abaixo estão detalhados os desalinhamentos posturais estruturais detectados pela análise de imagem inteligente.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAssessment.aiDetails?.desvios?.map((d, idx) => {
                      const severityColors = d.gravidade === 'Severo' ? 'bg-red-50 text-red-700 border-red-150' :
                                             d.gravidade === 'Moderado' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                                             'bg-emerald-50 text-emerald-700 border-emerald-150';
                      
                      return (
                        <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 flex flex-col justify-between text-left overflow-hidden break-words">
                          <div className="min-w-0 w-full">
                            <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                              <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest truncate flex-shrink-0">{d.regiao}</span>
                              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${severityColors}`}>
                                {d.gravidade}
                              </span>
                            </div>
                            <h4 className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tight break-words">{d.desvio}</h4>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-semibold break-words">{d.compensacao}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            },
            {
              id: 'protocolos-corretivos',
              section: 'Protocolos de Correção',
              forcePageBreak: true,
              content: (
                <div className="space-y-6 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-slate-900 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Protocolo Corretivo e Prescrições</h3>
                  </div>

                  <div className="space-y-8 font-sans">
                    {/* Mobility Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                        <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Mobilidade e Liberação</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                        {selectedAssessment.aiDetails?.exerciciosMobilidade?.map((ex, idx) => (
                          <div key={idx} className="p-4 bg-emerald-50/5 rounded-2xl border border-emerald-100/30 text-left overflow-hidden break-words flex flex-col gap-2">
                            <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-2 min-w-0">
                              <h5 className="text-[11px] font-black text-emerald-950 uppercase italic leading-tight flex-1 min-w-0 break-words">{ex.nome}</h5>
                              <span className="text-[9px] font-mono bg-emerald-100/40 text-emerald-800 px-2.5 py-0.5 rounded font-black whitespace-nowrap flex-shrink-0">{ex.series} • {ex.tempo}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-semibold break-words whitespace-pre-line">{ex.instrucoes}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengthening Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                        <Dumbbell className="w-4 h-4 text-sky-600" />
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-bold">Fortalecimento e Ativação</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                        {selectedAssessment.aiDetails?.exerciciosFortalecimento?.map((ex, idx) => (
                          <div key={idx} className="p-4 bg-sky-50/5 rounded-2xl border border-sky-100/30 text-left overflow-hidden break-words flex flex-col gap-2">
                            <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-2 min-w-0">
                              <h5 className="text-[11px] font-black text-sky-950 uppercase italic leading-tight flex-1 min-w-0 break-words">{ex.nome}</h5>
                              <span className="text-[9px] font-mono bg-sky-100/40 text-sky-800 px-2.5 py-0.5 rounded font-black whitespace-nowrap flex-shrink-0">{ex.series} • {ex.reps}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-semibold break-words whitespace-pre-line">{ex.instrucoes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            },
            {
              id: 'ergonomia-postura',
              section: 'Prescrições Ergonômicas',
              forcePageBreak: true,
              content: (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recomendações de Ergonomia & Estilo de Vida</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed -mt-2">
                    Hábitos posturais diários recomendados para evitar recidivas e consolidar os ganhos corretivos neuromusculares.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedAssessment.aiDetails?.ergonomia?.map((tip, idx) => (
                      <div key={idx} className="bg-emerald-50/10 p-4 rounded-2xl border border-emerald-100/20 relative overflow-hidden text-left break-words">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
                          <Info className="w-16 h-16 text-emerald-600" />
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <p className="text-[10px] text-slate-600 font-semibold leading-relaxed break-words flex-1 min-w-0">{tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          ];

          return (
            <DynamicReportEngine
              athlete={athlete}
              reportTitle="AVALIAÇÃO POSTURAL INTELIGENTE"
              reportSubTitle="LAUDO TÉCNICO DE ALINHAMENTO BIOMECÂNICO"
              extraStats={[
                { label: 'Nível', value: athlete.competitiveLevel ? athlete.competitiveLevel.toUpperCase() : 'ELITE' }
              ]}
              blocks={reportBlocks}
              onClose={() => setSelectedAssessment(null)}
              hideTOC={true}
            />
          );
        })()}

        {/* VIEW 3: WIZARD / CREATE NEW ASSESSMENT */}
        {!aiLoading && !selectedAssessment && isCreating && (
          <motion.div
            key="assessment-create"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Histórico
                </button>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" /> Nova Avaliação Postural Inteligente
                </h3>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              
              {/* Step 1: Pain Zones */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">1</span>
                  Indique as Zonas de Desconforto ou Dor do Atleta
                </h4>
                <p className="text-slate-500 text-xs pl-8">Quais áreas anatômicas apresentam rigidez, queixas álgicas ou sobrecarga no dia a dia ou nos treinos?</p>
                <div className="pl-8 flex flex-wrap gap-2 pt-2">
                  {COMMON_PAIN_ZONES.map(zone => {
                    const isSelected = painZones.includes(zone.id);
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => togglePainZone(zone.id)}
                        className={`text-xs px-3.5 py-2 rounded-xl border transition-all font-medium flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`} />
                        {zone.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Capture Method */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">2</span>
                  Origem dos Dados Clínicos
                </h4>
                <p className="text-slate-500 text-xs pl-8">Deseja simular um padrão de desvio postural ou carregar fotos reais do atleta para análise biomecânica com IA?</p>
                
                <div className="pl-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCaptureMethod('simulation');
                      setPresetType('postura_ideal');
                    }}
                    className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                      captureMethod === 'simulation'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-bold text-sm text-slate-800 mb-1">Simulador de Padrões Posturais (IA)</span>
                    <span className="block text-[11px] text-slate-500">Selecione desvios biomecânicos catalogados para treinamento corretivo instantâneo.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCaptureMethod('upload');
                      setPresetType('custom_upload');
                    }}
                    className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                      captureMethod === 'upload'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-bold text-sm text-slate-800 mb-1">Fotos Reais do Atleta (IA Visão)</span>
                    <span className="block text-[11px] text-slate-500">Capture ou carregue fotos do atleta para analisar o alinhamento corporal de forma personalizada.</span>
                  </button>
                </div>

                {/* Sub-options for Simulation */}
                {captureMethod === 'simulation' && (
                  <div className="pl-8 pt-2 space-y-3">
                    <label className="text-xs font-semibold text-slate-700 block">Padrão de Desvio Clínico a Analisar:</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {PRESET_POSTURES.map(posture => (
                        <button
                          key={posture.id}
                          type="button"
                          onClick={() => setPresetType(posture.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            presetType === posture.id
                              ? 'border-emerald-500 bg-emerald-50/15'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="block font-semibold text-xs text-slate-800 mb-1">{posture.label}</span>
                          <span className="block text-[10px] text-slate-500 leading-normal">{posture.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-options for Upload & Capture */}
                {captureMethod === 'upload' && (
                  <div className="pl-8 pt-2 space-y-4">
                    {/* Guia de Captura de Fotos Clínicas */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all">
                      <button
                        type="button"
                        onClick={() => setShowCaptureGuide(!showCaptureGuide)}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/60 hover:bg-slate-100 transition-colors font-semibold text-xs text-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-emerald-500" />
                          Manual de Captação Fotográfica (Evitar Erros de Leitura)
                        </span>
                        <span className="text-emerald-600 font-bold hover:underline">
                          {showCaptureGuide ? 'Ocultar Instruções' : 'Ver Instruções Avançadas'}
                        </span>
                      </button>

                      {showCaptureGuide && (
                        <div className="p-4 space-y-4 border-t border-slate-200 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 1. Vestimenta & Preparação do Atleta
                              </h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-sans leading-relaxed">
                                <li><strong>Roupas Justas:</strong> Prefira shorts curtos e top de treino (para mulheres) ou sem camisa (para homens). Roupas largas ocultam referências anatômicas cruciais.</li>
                                <li><strong>Cabelo Preso:</strong> Cabelos longos devem ser amarrados em coque alto para deixar a região cervical, pescoço e orelhas totalmente visíveis.</li>
                                <li><strong>Descalço:</strong> O atleta deve estar sem calçados ou meias para análise de joelhos, arco plantar e eversão do calcâneo.</li>
                              </ul>
                            </div>

                            <div className="space-y-3">
                              <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 2. Alinhamento da Câmera & Ambiente
                              </h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-sans leading-relaxed">
                                <li><strong>Altura do Peito:</strong> Posicione a lente na altura do processo xifóide (meio do peito). Se a câmera estiver muito alta ou baixa, a distorção macular impedirá uma leitura simétrica real.</li>
                                <li><strong>Distanciamento:</strong> Posicione o tripé ou câmera a 2–3 metros do atleta, garantindo enquadramento do corpo inteiro (dos pés à cabeça).</li>
                                <li><strong>Fundo & Contraste:</strong> Utilize um fundo neutro (parede lisa e clara) e evite fontes de luz atrás do atleta (contraluz).</li>
                              </ul>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100">
                            <h5 className="font-bold text-xs text-slate-800 mb-3 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> 3. Posições para Cada uma das 3 Vistas Requeridas
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">Vista Anterior (Frente)</span>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                  Corpo de frente para a câmera. Pés descalços apontados para frente, paralelos na largura do quadril, braços soltos ao lado do tronco.
                                </p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">Vista Lateral (Perfil/Lado)</span>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                  Corpo de perfil para a câmera. Olhar fixo na linha do horizonte. Braços cruzados suavemente no peito se necessário para não obstruir a visão da coluna/quadril.
                                </p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">Vista Posterior (Costas)</span>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                  Corpo de costas para a câmera, mesma abertura e afastamento de pés. Fundamental para mapear escoliose, assimetria de escápulas e valgo de calcanhar.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 leading-relaxed font-sans flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>💡 Regra de Ouro da Biomecânica:</strong> O atleta deve adotar sua <strong>postura natural e habitual</strong> (confortável). Solicitar que o atleta force a "postura reta" mascara os encurtamentos e disfunções reais que o motor de visão precisa identificar.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <label className="text-xs font-semibold text-slate-700 block">Envie ou Capture as Vistas Posturais (Mínimo de 1 vista necessária):</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* VISTA ANTERIOR */}
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center relative group min-h-[180px]">
                        {photoAnterior ? (
                          <div className="w-full h-full relative">
                            <img src={photoAnterior} alt="Anterior" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setPhotoAnterior(null)}
                              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="my-auto space-y-2">
                            <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
                            <div>
                              <span className="block text-xs font-bold text-slate-700">Vista Anterior</span>
                              <span className="block text-[10px] text-slate-400">Frente</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 w-full">
                          <button
                            type="button"
                            onClick={() => startCamera('anterior')}
                            className="flex-1 text-[10px] bg-slate-100 text-slate-700 py-1.5 rounded hover:bg-slate-200 font-medium flex items-center justify-center gap-1"
                          >
                            <Camera className="w-3 h-3" /> Câmera
                          </button>
                          <label className="flex-1 text-[10px] bg-slate-100 text-slate-700 py-1.5 rounded hover:bg-slate-200 font-medium flex items-center justify-center gap-1 cursor-pointer">
                            <UploadCloud className="w-3 h-3" /> Upload
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'anterior')} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {/* VISTA LATERAL */}
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center relative group min-h-[180px]">
                        {photoLateral ? (
                          <div className="w-full h-full relative">
                            <img src={photoLateral} alt="Lateral" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setPhotoLateral(null)}
                              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="my-auto space-y-2">
                            <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
                            <div>
                              <span className="block text-xs font-bold text-slate-700">Vista Lateral</span>
                              <span className="block text-[10px] text-slate-400">Perfil</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 w-full">
                          <button
                            type="button"
                            onClick={() => startCamera('lateral')}
                            className="flex-1 text-[10px] bg-slate-100 text-slate-700 py-1.5 rounded hover:bg-slate-200 font-medium flex items-center justify-center gap-1"
                          >
                            <Camera className="w-3 h-3" /> Câmera
                          </button>
                          <label className="flex-1 text-[10px] bg-slate-100 text-slate-700 py-1.5 rounded hover:bg-slate-200 font-medium flex items-center justify-center gap-1 cursor-pointer">
                            <UploadCloud className="w-3 h-3" /> Upload
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'lateral')} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {/* VISTA POSTERIOR */}
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center relative group min-h-[180px]">
                        {photoPosterior ? (
                          <div className="w-full h-full relative">
                            <img src={photoPosterior} alt="Posterior" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setPhotoPosterior(null)}
                              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="my-auto space-y-2">
                            <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
                            <div>
                              <span className="block text-xs font-bold text-slate-700">Vista Posterior</span>
                              <span className="block text-[10px] text-slate-400">Costas</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 w-full">
                          <button
                            type="button"
                            onClick={() => startCamera('posterior')}
                            className="flex-1 text-[10px] bg-slate-100 text-slate-700 py-1.5 rounded hover:bg-slate-200 font-medium flex items-center justify-center gap-1"
                          >
                            <Camera className="w-3 h-3" /> Câmera
                          </button>
                          <label className="flex-1 text-[10px] bg-slate-100 text-slate-700 py-1.5 rounded hover:bg-slate-200 font-medium flex items-center justify-center gap-1 cursor-pointer">
                            <UploadCloud className="w-3 h-3" /> Upload
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'posterior')} className="hidden" />
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Notes */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">3</span>
                  Observações & Sintomas Adicionais (Opcional)
                </h4>
                <p className="text-slate-500 text-xs pl-8">Insira queixas, descrições de dor, cirurgias ou considerações ergonômicas adicionais do atleta.</p>
                <div className="pl-8">
                  <textarea
                    rows={3}
                    placeholder="Ex: Sentindo formigamento no trapézio direito ao fazer agachamento acima de 70% 1RM. Trabalha 8h por dia sentado."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all font-sans"
                  />
                </div>
              </div>

              {/* Footer Controls */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={triggerPosturalAnalysis}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" /> Gerar Avaliação Avançada por IA
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* VIEW 4: HISTORIC TIMELINE & HOME */}
        {!aiLoading && !selectedAssessment && !isCreating && (
          <motion.div
            key="assessment-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Main Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Premium AI Module
                </span>
                <h3 className="font-bold text-slate-900 text-lg">Avaliação Postural Inteligente</h3>
                <p className="text-xs text-slate-500 max-w-2xl font-sans">
                  Detecte desvios biomecânicos e desequilíbrios cinéticos integrando queixas álgicas com visão computacional multimodal do Google Gemini.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" /> Nova Avaliação Postural
              </button>
            </div>

            {/* History List */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" /> Histórico de Avaliações Clínicas ({history.length})
              </h4>

              {history.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-100 mx-auto">
                    <Camera className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="text-sm font-bold text-slate-700">Nenhuma Avaliação Postural Registrada</p>
                    <p className="text-xs text-slate-500 font-sans">
                      Registre a primeira avaliação postural para obter laudos automatizados, mapeamento de desequilíbrios articulares e protocolos de correlação neuromuscular.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all"
                  >
                    Iniciar Avaliação Agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {history.map(assessment => {
                    const presetLabel = PRESET_POSTURES.find(p => p.id === assessment.presetType)?.label || 'Avaliação Customizada';
                    
                    return (
                      <div
                        key={assessment.id}
                        onClick={() => setSelectedAssessment(assessment)}
                        className="bg-white hover:border-slate-300 rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-800">{presetLabel}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-50 border px-2 py-0.5 rounded font-mono flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> {assessment.date}
                              </span>
                            </div>
                            
                            {/* Zonas de dor taglist */}
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {assessment.painZones && assessment.painZones.length > 0 ? (
                                assessment.painZones.map(zone => {
                                  const label = COMMON_PAIN_ZONES.find(z => z.id === zone)?.label || zone;
                                  return (
                                    <span key={zone} className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium border border-red-100">
                                      {label}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[9px] text-slate-400 font-sans">Nenhuma queixa de dor registrada</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Badges and Actions */}
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex flex-wrap gap-1">
                            {assessment.aiDetails?.desvios?.slice(0, 2).map((d, idx) => (
                              <span key={idx} className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                {d.desvio}
                              </span>
                            ))}
                            {(assessment.aiDetails?.desvios?.length || 0) > 2 && (
                              <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                                +{(assessment.aiDetails?.desvios?.length || 0) - 2}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAssessment(assessment);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {role === 'coach' && (
                              <button
                                type="button"
                                onClick={(e) => handleDelete(assessment.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* HTML5 Camera Overlay Capture Modal */}
      {activeCameraView && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 max-w-lg w-full flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-sm font-bold flex items-center gap-2 capitalize">
                <Camera className="w-4 h-4 text-emerald-400" /> Capturando Vista {activeCameraView}
              </span>
              <button onClick={stopCamera} className="text-slate-400 hover:text-white text-sm font-medium">Cancelar</button>
            </div>
            
            {/* Viewport */}
            <div className="aspect-video bg-black relative flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Guides */}
              <div className="absolute inset-x-8 inset-y-4 border border-dashed border-emerald-500/40 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded">Alinhe o atleta aqui</span>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-950 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-slate-700 flex items-center justify-center hover:bg-slate-100 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
