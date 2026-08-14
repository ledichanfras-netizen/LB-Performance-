
import { useState, useEffect, useRef } from 'react';
import { Athlete, AssessmentType, WellnessEntry, Workout, PrescribedExercise, ExerciseSet, ExternalSession } from './types';
import { calculateReadiness, calculateWorkoutLoad, calculateAdvancedMetrics, calculateAge, getSafeDateTime, getLocalDateString, mergeAthletesWithLocalCache, recordDeletedItemId } from './utils';
import { ENRICHED_LIBRARY } from './data/exercises';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";
import { supabaseService, logError, isNetworkError } from './services/supabaseService';
import { generateModelAthlete, generateFeaturedAthletes } from './seedData';
import { isSupabaseConfigured } from './lib/supabase';

// Safely wrapped localStorage to prevent crashes on restricted engines/mobile frames/iframes
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
};

// Resilient fetch helper that automatically retries when network errors occur (such as during backend restarts)
async function resilientFetch(url: string, options: RequestInit = {}, retries = 3, delayMs = 1200): Promise<Response> {
  let attempt = 1;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, { cache: 'no-store', ...options });
      return response;
    } catch (error: any) {
      const isNetErr = error && (
        error.name === 'TypeError' ||
        (error.message && (
          error.message.toLowerCase().includes('failed to fetch') ||
          error.message.toLowerCase().includes('network error') ||
          error.message.toLowerCase().includes('load failed') ||
          error.message.toLowerCase().includes('aborted')
        ))
      );
      if (!isNetErr || attempt === retries) {
        throw error;
      }
      console.warn(`[resilientFetch] Tentativa ${attempt}/${retries} falhou para ${url} (${error.message || error}). Re-tentando em ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
      attempt++;
    }
  }
  throw new Error("Falha ao conectar com o servidor. Por favor, verifique sua conexão.");
}

const ensureImtpAndMigrate = (a: any): Athlete => {
  const currentAssessments = a.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [], postural: [] };
  const imtp = currentAssessments.imtp || [];
  const postural = currentAssessments.postural || [];
  
  const migratedImtp = [...imtp];
  // If there's no imtp entry at all, let's look up isometricStrength to see if there's any halfSquatKgf
  if (migratedImtp.length === 0 && currentAssessments.isometricStrength && currentAssessments.isometricStrength.length > 0) {
    currentAssessments.isometricStrength.forEach((s: any) => {
      if (s.halfSquatKgf && s.halfSquatKgf > 0) {
        const bioWeight = (currentAssessments.bioimpedance && currentAssessments.bioimpedance.length > 0) 
            ? currentAssessments.bioimpedance[0].weight 
            : 70;
        
        const peakForce = s.halfSquatKgf;
        const relativePeakForce = parseFloat((peakForce / bioWeight).toFixed(2));
        const timeToPeakForce = s.timeToPeakForce || 4028; // Standard elite value from attached report
        const meanForce = s.meanForce || parseFloat((peakForce * 0.795).toFixed(2));
        
        migratedImtp.push({
          id: `imtp-mig-${s.id}-${Math.floor(Math.random() * 10000)}`,
          date: s.date,
          observations: s.observations || 'Migrado de Força Isométrica (Meio Agachamento)',
          peakForce,
          relativePeakForce,
          timeToPeakForce,
          meanForce,
          rfdPeak: s.rfdPeak || 148,
          rfd100: s.rfd100 || 631,
          rfd200: s.rfd200 || 329,
          rfd300: s.rfd300 || 247,
          impulsePeak: s.impulsePeak || 1812.53,
          impulse100: s.impulse100 || 6.39,
          impulse200: s.impulse200 || 12.94,
          impulse300: s.impulse300 || 19.97
        });
      }
    });

    // Sort by date descending
    migratedImtp.sort((b1: any, b2: any) => getSafeDateTime(b2.date) - getSafeDateTime(b1.date));
  }
  
  return {
    ...a,
    assessments: {
      bioimpedance: currentAssessments.bioimpedance || [],
      isometricStrength: (currentAssessments.isometricStrength || []).map((s: any) => {
        const copy = { ...s };
        // Delete halfSquatKgf to remove Meio Agachamento from Generic Isometric Strength assessment
        delete copy.halfSquatKgf;
        return copy;
      }),
      cmj: currentAssessments.cmj || [],
      dropJump: currentAssessments.dropJump || [],
      vo2max: currentAssessments.vo2max || [],
      speed: currentAssessments.speed || [],
      imtp: migratedImtp,
      postural: postural
    }
  };
};

export const useAthletes = (token?: string | null) => {
  const [rawAthletes, setRawAthletes] = useState<Athlete[]>(() => {
    // Lazy initialization from cache for instant load
    const cached = safeLocalStorage.getItem('lb_athletes_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const list = Array.isArray(parsed) ? parsed.filter(a => !a.id.startsWith('model-') && a.id !== 'meta-custom-library-exercises') : [];
        return list.length > 0 ? list : generateFeaturedAthletes();
      } catch (e) {
        return generateFeaturedAthletes();
      }
    }
    return generateFeaturedAthletes();
  });

  const sortWorkoutExercises = (a: Athlete): Athlete => {
    return {
      ...a,
      workouts: (a.workouts || []).map(w => {
        const exs = (w.exercises || []).slice();
        const sortedExs = exs.sort((x: any, y: any) => {
          const xVal = typeof x.order_index === 'number' ? x.order_index : 9999;
          const yVal = typeof y.order_index === 'number' ? y.order_index : 9999;
          return xVal - yVal;
        });

        return {
          ...w,
          exercises: sortedExs.map((ex, idx) => ({
            ...ex,
            order_index: typeof ex.order_index === 'number' ? ex.order_index : idx
          }))
        };
      })
    };
  };

  const sortWellnessEntries = (wellness: WellnessEntry[] | undefined): WellnessEntry[] => {
    if (!Array.isArray(wellness)) return [];
    return [...wellness].sort((x, y) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
  };

  const normalizeAthlete = (a: Athlete): Athlete => {
    const normalized = sortWorkoutExercises(ensureImtpAndMigrate(a));
    return {
      ...normalized,
      wellness: sortWellnessEntries(normalized.wellness)
    };
  };

  const athletes = rawAthletes.map(a => normalizeAthlete(ensureImtpAndMigrate(a)));

  const setAthletes = (v: Athlete[] | ((prev: Athlete[]) => Athlete[])) => {
    if (typeof v === 'function') {
      setRawAthletes(prev => {
        const mappedPrev = prev.map(a => normalizeAthlete(a));
        return v(mappedPrev).map(normalizeAthlete);
      });
    } else {
      setRawAthletes(v.map(normalizeAthlete));
    }
  };
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [iframeCookieWarning, setIframeCookieWarning] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Refs for tracking synchronization state and avoiding stale closures / timer resets
  const syncDataRef = useRef<(isSilent?: boolean) => Promise<void>>(async () => {});
  const syncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const athletesRef = useRef<Athlete[]>(athletes);

  // Keep references updated on every render
  useEffect(() => {
    syncingRef.current = syncing;
    syncDataRef.current = syncData;
    athletesRef.current = athletes;
  });

  // Update cache whenever athletes change
  useEffect(() => {
    if (athletes.length > 0) {
      safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(athletes));
    }
  }, [athletes]);

  const api = {
    async loadAthletes(isSilent = false): Promise<Athlete[]> {
      const timeoutPromise = new Promise<Athlete[]>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_GLOBAL')), 60000)
      );

      const fetchPromise = (async (): Promise<Athlete[]> => {
        try {
          if (token) {
            console.log('Tentando carregar dados da API local (/api/ler)...');
            const res = await resilientFetch(`/api/ler?_t=${Date.now()}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const resText = await res.text();
            if (resText.trim().startsWith('<') || resText.trim().startsWith('<!doctype')) {
              setIframeCookieWarning(true);
              throw new Error("O navegador bloqueou os cookies de segurança da visualização (iframe). Por favor, clique em 'Open in a new tab' (Abrir em nova aba) no canto superior direito do AI Studio para acessar o sistema normalmente.");
            }
            if (!res.ok) {
              throw new Error(`Erro do servidor (/api/ler): ${res.status} ${resText}`);
            }
            return JSON.parse(resText);
          }
          console.log('Tentando carregar dados do Supabase...');
          return await supabaseService.loadAthletes();
        } catch (error: any) {
          const isIframeErr = error.message && (error.message.includes('bloqueou') || error.message.includes('Unexpected token') || error.message.includes('cookie'));
          if (isIframeErr) {
            setIframeCookieWarning(true);
            console.warn('Erro detectado no carregamento (Cookies bloqueados no iframe):', error.message);
          } else if (isNetworkError(error)) {
            console.warn('Erro de rede no carregamento:', error.message || error);
          } else {
            console.error('Erro crítico no carregamento:', error);
          }
          throw error;
        }
      })();

      return Promise.race([fetchPromise, timeoutPromise]).catch(err => {
        const isIframeErr = err.message && (err.message.includes('bloqueou') || err.message.includes('Unexpected token') || err.message.includes('cookie'));
        if (isIframeErr) {
          setIframeCookieWarning(true);
          console.warn('Carregamento interrompido (Cookies bloqueados no iframe):', err.message);
        } else if (isNetworkError(err)) {
          console.warn('Carregamento interrompido devido a erro de rede:', err.message || err);
        } else {
          console.warn('Carregamento interrompido:', err.message);
        }
        if (err.message === 'TIMEOUT_GLOBAL' && !isSilent && athletesRef.current.length === 0) {
          toast.error("O servidor demorou para responder. Operando em modo offline seguro.", { id: 'timeout-global-toast' });
        }
        throw err;
      });
    },
    async saveAthletes(athletes: Athlete[]): Promise<void> {
      try {
        if (token) {
          console.log('Sincronizando via API local (/api/salvar)...');
          const res = await resilientFetch('/api/salvar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(athletes)
          });
          if (!res.ok) {
            const errText = await res.text();
            let errorMsg = errText;
            try {
              const parsed = JSON.parse(errText);
              errorMsg = parsed.error || parsed.detail || parsed.message || errText;
            } catch (e) {}
            throw new Error(`Erro do servidor (/api/salvar): ${errorMsg}`);
          }
          return;
        }
        await supabaseService.saveAthletes(athletes);
      } catch (error: any) {
        logError('Database/Supabase Save Error:', error);
        throw new Error(error.message || "Erro ao salvar dados no Banco de Dados. Verifique sua conexão.");
      }
    },
    async saveAthlete(athlete: Athlete): Promise<void> {
      try {
        if (token) {
          console.log(`[Hooks] Sincronizando atleta via API local (/api/salvar)...`);
          const res = await resilientFetch('/api/salvar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify([athlete])
          });
          if (!res.ok) {
            const errText = await res.text();
            let errorMsg = errText;
            try {
              const parsed = JSON.parse(errText);
              errorMsg = parsed.error || parsed.detail || parsed.message || errText;
            } catch (e) {}
            throw new Error(`Erro do servidor (/api/salvar): ${errorMsg}`);
          }
          return;
        }
        console.log(`[Hooks] Salvando atleta ${athlete.id} no Supabase...`);
        await supabaseService.saveAthlete(athlete);
      } catch (error: any) {
        logError('Database/Supabase Save Athlete Error:', error);
        throw new Error(error.message || "Erro ao salvar atleta no Banco de Dados. Verifique sua conexão.");
      }
    }
  };

  const syncData = async (isSilent = false) => {
    if (syncingRef.current) {
      console.log('[Sync] Sincronização já em andamento. Ignorando requisição concorrente.');
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    if (!isSilent) setLoading(true);
    try {
      if (!isSupabaseConfigured && !token) {
        console.log('[Sync] Banco/Supabase não configurado e sem token. Utilizando apenas cache local/armazenamento offline.');
        const cached = safeLocalStorage.getItem('lb_athletes_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && athletes.length === 0) {
              setAthletes(parsed.filter(a => !a.id.startsWith('model-')));
            }
          } catch (e) {}
        }
        return;
      }

      console.log('Buscando atletas do banco de forma resiliente...');
      const data = await api.loadAthletes(isSilent);
      if (data) {
        // Extract meta custom library if present
        const metaRow = data.find(a => a.id === 'meta-custom-library-exercises');
        if (metaRow && metaRow.injuryHistory) {
          try {
            const parsed = JSON.parse(metaRow.injuryHistory);
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.customLibraryExercises)) {
                localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(parsed.customLibraryExercises));
              }
              if (Array.isArray(parsed.deletedExerciseIds)) {
                localStorage.setItem("LB_DELETED_LIBRARY_EXERCISES", JSON.stringify(parsed.deletedExerciseIds));
              }
              window.dispatchEvent(new Event('custom-library-synced'));
              console.log("[Sync] Biblioteca de exercícios sincronizada com sucesso do banco.");
            }
          } catch (e) {
            console.warn("[Sync] Erro ao carregar biblioteca customizada do metaRow:", e);
          }
        }

        let filtered = data.filter(a => !a.id.startsWith('model-') && a.id !== 'meta-custom-library-exercises');
        
        // Prevent accidental data deletion on temporary connection/empty-response quirks
        if (filtered.length === 0 && athletes.length > 0) {
          console.warn('[Sync] Supabase/API retornou lista vazia de atletas, mas já temos dados na memória. Tentando nova leitura antes de abortar...');
          const retryData = await api.loadAthletes(isSilent);
          filtered = (retryData || []).filter(a => !a.id.startsWith('model-') && a.id !== 'meta-custom-library-exercises');

          if (filtered.length === 0) {
            console.warn('[Sync] A segunda tentativa também retornou lista vazia. Mantendo dados locais.');
            if (!isSilent) {
              toast.error('Sincronização falhou: os dados remotos retornaram vazios. Tente novamente.');
            }
            throw new Error('Sincronização falhou: os dados remotos retornaram vazios. Tente novamente.');
          }

          console.log('[Sync] Segunda tentativa retornou dados válidos. Atualizando estado.');
        }

        // Retrieve local athletes from cache and memory to prevent losing offline/unsynced entries
        const localCachedAthletes = (() => {
          try {
            const cached = safeLocalStorage.getItem('lb_athletes_cache');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
          } catch (e) {}
          return athletesRef.current;
        })();

        // Merge remote response safely with local cache/state
        const mergedAthletes = mergeAthletesWithLocalCache(localCachedAthletes, filtered);

        // Detect if new workouts or wellness items arrived from another device during silent background sync
        if (isSilent && athletesRef.current.length > 0) {
          const currentTotalWorkouts = athletesRef.current.reduce((acc, a) => acc + (a.workouts?.length || 0), 0);
          const newTotalWorkouts = mergedAthletes.reduce((acc, a) => acc + (a.workouts?.length || 0), 0);
          const currentTotalWellness = athletesRef.current.reduce((acc, a) => acc + (a.wellness?.length || 0), 0);
          const newTotalWellness = mergedAthletes.reduce((acc, a) => acc + (a.wellness?.length || 0), 0);

          if (newTotalWorkouts > currentTotalWorkouts || newTotalWellness > currentTotalWellness) {
            toast.success("📱 Treino ou Prontidão atualizado por outro dispositivo!", { id: "live-sync-update-toast" });
          }
        }

        setAthletes(mergedAthletes);
        safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(mergedAthletes));
        setLastSyncedAt(new Date());
        console.log('Dados dos atletas atualizados, mesclados e cacheados.');
        lastSyncTimeRef.current = Date.now();
      }
    } catch (err: any) {
      const isIframeErr = err.message && (err.message.includes('bloqueou') || err.message.includes('Unexpected token') || err.message.includes('cookie'));
      if (isIframeErr) {
        setIframeCookieWarning(true);
        console.warn('Falha ao sincronizar com Banco de Dados (Cookies bloqueados no iframe):', err.message);
      } else if (isNetworkError(err)) {
        console.warn('Falha ao sincronizar com Banco de Dados devido a erro de rede:', err.message || err);
      } else {
        console.error('Falha ao sincronizar com Banco de Dados:', err);
      }
      
      // Fallback cache recovery if state is fully empty but local storage has cache
      let hasLocalCache = false;
      if (athletes.length === 0) {
        const cached = safeLocalStorage.getItem('lb_athletes_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached).filter((a: any) => !a.id.startsWith('model-'));
            if (parsed.length > 0) {
              setAthletes(parsed);
              hasLocalCache = true;
            }
          } catch (e) {}
        }
      } else {
        hasLocalCache = true;
      }
      
      if (!isSilent) {
        if (!hasLocalCache) {
          toast.error('Banco de dados inacessível. Usando modo de segurança offline.', { id: 'supabase-offline-toast' });
        } else {
          console.warn('Conexão instável com o banco de dados. Utilizando dados locais/offline de forma transparente.');
        }
        throw err;
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    // If local athletes exist in cache, perform silent background sync on startup to avoid cold-start error toasts
    const hasInitialData = athletesRef.current.length > 0;
    syncData(hasInitialData);

    // Auto-sync when page recovers focus, online connection, visibility change, or page show (mobile return)
    const handleRefocusOrOnline = () => {
      if (navigator.onLine && document.visibilityState === 'visible' && !syncingRef.current) {
        console.log('[Auto-Sync] Janela ativa e online. Sincronizando dados em background...');
        lastSyncTimeRef.current = Date.now();
        syncDataRef.current(true); // Silent sync
      }
    };

    // Intelligent sync on user activity (ideal for tablets/mobiles waking up from sleep/stand-by)
    const handleUserActivity = () => {
      const now = Date.now();
      // If the last sync was more than 60 seconds ago, trigger a background sync on interaction
      if (now - lastSyncTimeRef.current > 60000 && navigator.onLine && !syncingRef.current) {
        console.log('[Activity-Sync] Interação do usuário detectada após inatividade. Sincronizando dados...');
        lastSyncTimeRef.current = now; // Update timestamp immediately to prevent concurrent triggers
        syncDataRef.current(true); // Silent sync
      }
    };

    window.addEventListener('focus', handleRefocusOrOnline);
    window.addEventListener('online', handleRefocusOrOnline);
    window.addEventListener('pageshow', handleRefocusOrOnline);
    document.addEventListener('visibilitychange', handleRefocusOrOnline);

    // BroadcastChannel for cross-tab/multi-window synchronization on the same device
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('lb_sports_data_sync');
        bc.onmessage = (event) => {
          if (event.data === 'sync_requested' || event.data === 'data_saved') {
            console.log('[Broadcast-Sync] Notificação de sincronização recebida de outra aba.');
            syncDataRef.current(true);
          }
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel não suportado neste navegador.");
    }

    // Add user interaction listeners to instantly trigger background sync on tablets/mobiles waking up from stand-by
    window.addEventListener('mousedown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    // Configura um intervalo periódico suave de atualização (polling) em background a cada 30 segundos
    const intervalId = setInterval(() => {
      if (navigator.onLine && document.visibilityState === 'visible' && !syncingRef.current) {
        console.log('[Interval-Sync] Sincronizando dados de outros dispositivos/IPs em background...');
        lastSyncTimeRef.current = Date.now();
        syncDataRef.current(true); // Silent sync
      }
    }, 30000); // Executa a cada 30 segundos para manter sincronizado sem sobrecarregar a rede/servidor

    return () => {
      window.removeEventListener('focus', handleRefocusOrOnline);
      window.removeEventListener('online', handleRefocusOrOnline);
      window.removeEventListener('pageshow', handleRefocusOrOnline);
      document.removeEventListener('visibilitychange', handleRefocusOrOnline);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (bc) bc.close();
      clearInterval(intervalId);
    };
  }, [token]);

  // Intercept localStorage.setItem to auto-sync custom library exercises to database
  useEffect(() => {
    try {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        try {
          originalSetItem.apply(this, [key, value]);
        } catch (e) {
          originalSetItem(key, value);
        }
        
        if (key === "LB_CUSTOM_LIBRARY_EXERCISES" || key === "LB_DELETED_LIBRARY_EXERCISES") {
          // Trigger background sync
          setTimeout(() => {
            try {
              const custom = JSON.parse(localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES") || "[]");
              const deleted = JSON.parse(localStorage.getItem("LB_DELETED_LIBRARY_EXERCISES") || "[]");
              
              const metaAthlete: Athlete = {
                id: 'meta-custom-library-exercises',
                name: 'Meta Custom Library Exercises',
                dob: '2000-01-01',
                gender: 'M',
                modality: 'Meta',
                injuryHistory: JSON.stringify({
                  customLibraryExercises: custom,
                  deletedExerciseIds: deleted
                }),
                workouts: [],
                wellness: [],
                externalSessions: [],
                assessments: {} as any
              };

              console.log("[Auto-Sync] Salvando biblioteca de exercícios alterada no banco...", custom.length);
              if (token) {
                resilientFetch('/api/salvar', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify([metaAthlete])
                }).catch(e => console.warn("[Auto-Sync] Falha ao salvar biblioteca customizada via API:", e));
              } else {
                supabaseService.saveAthlete(metaAthlete).catch(e => console.warn("[Auto-Sync] Falha ao salvar biblioteca customizada via Supabase:", e));
              }
            } catch (err) {
              console.warn("[Auto-Sync] Erro ao processar salvamento automático da biblioteca:", err);
            }
          }, 200);
        }
      };

      return () => {
        localStorage.setItem = originalSetItem;
      };
    } catch (e) {
      console.warn("Não foi possível interceptar localStorage.setItem:", e);
    }
  }, [token]);

  const save = async (newAthletes: Athlete[], specificAthleteId?: string) => {
    // Immediate local state and cache update for maximum responsiveness
    safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(newAthletes));
    console.log("Iniciando sincronização em segundo plano...");
    setSyncing(true);
    syncingRef.current = true;
    try {
      if (specificAthleteId) {
        const athlete = newAthletes.find(a => a.id === specificAthleteId);
        if (athlete) {
          // Optimized: save only the relevant athlete and keep local state intact
          await api.saveAthlete(athlete);
        } else {
          await api.saveAthletes(newAthletes);
        }
      } else {
        await api.saveAthletes(newAthletes);
      }
      setLastSyncedAt(new Date());
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('lb_sports_data_sync');
          bc.postMessage('data_saved');
          bc.close();
        }
      } catch (e) {}
      console.log("Sincronização concluída com sucesso.");
    } catch (e: any) {
      logError("Erro na sincronização:", e);
      const detail = e?.detail || e?.response?.data?.detail || '';
      const message = e?.message || String(e);
      toast.error(`Erro ao sincronizar: ${message} ${detail ? `(${detail})` : ''}`, { id: 'sync-error' });
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  };

  const updateAthlete = async (athleteId: string, data: Partial<Athlete>) => {
    const updated = athletes.map(a => a.id === athleteId ? { ...a, ...data } : a);
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Atleta atualizado!");
  };

  const addWellness = async (athleteId: string, entry: Omit<WellnessEntry, 'id' | 'readinessScore'>) => {
    const score = calculateReadiness(entry);
    const newId = `w-${Date.now()}-${Math.random()}`;
    const nowIso = new Date().toISOString();
    
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = Array.isArray(a.wellness) ? a.wellness : [];
        const newHistory = [{ ...entry, id: newId, readinessScore: score, updatedAt: nowIso }, ...history];
        newHistory.sort((x, y) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
        return { ...a, wellness: newHistory };
      }
      return a;
    });

    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Prontidão registrada!");
  };

  const updateWellness = async (athleteId: string, wellnessId: string, entry: Partial<WellnessEntry>) => {
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = (a.wellness || []).map(w => {
          if (w.id === wellnessId) {
            const updatedEntry = { ...w, ...entry };
            const score = calculateReadiness(updatedEntry as WellnessEntry);
            return { ...updatedEntry, readinessScore: score };
          }
          return w;
        });
        history.sort((x, y) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
        return { ...a, wellness: history };
      }
      return a;
    });

    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Prontidão atualizada!");
  };

  const deleteWellness = async (athleteId: string, wellnessId: string) => {
    recordDeletedItemId(wellnessId);
    setSyncing(true);
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        return { ...a, wellness: (a.wellness || []).filter(w => w.id !== wellnessId) };
      }
      return a;
    });
    setAthletes(updated);

    try {
      if (token) {
        const res = await fetch(`/api/wellness/${wellnessId}`, {
          cache: 'no-store',
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Erro ao deletar wellness via API. Status: ${res.status}`);
        }
      } else {
        await supabaseService.deleteWellness(wellnessId);
      }
      
      safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(updated));
      toast.success("Check-in removido!");
    } catch (e) {
      logError("Erro ao deletar wellness:", e);
      toast.error("Erro ao sincronizar exclusão.");
    } finally {
      setSyncing(false);
    }
  };

  const addWorkout = async (athleteId: string, workout: Omit<Workout, 'id'>) => {
    const newId = `wk-${Date.now()}-${Math.random()}`;
    const nowIso = new Date().toISOString();
    const normalizedWorkout = {
      ...workout,
      id: newId,
      updatedAt: nowIso,
      exercises: (workout.exercises || []).map((ex, idx) => ({ ...ex, order_index: idx }))
    };
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = Array.isArray(a.workouts) ? a.workouts : [];
        return { ...a, workouts: [normalizedWorkout, ...history] };
      }
      return a;
    });
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Treino adicionado!");
  };

  const addWorkouts = async (athleteId: string, workoutsToAdd: Omit<Workout, 'id'>[]) => {
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = Array.isArray(a.workouts) ? a.workouts : [];
        const newWorkoutsWithIds = workoutsToAdd.map((w, idx) => ({
          ...w,
          id: `wk-bulk-${Date.now()}-${idx}-${Math.random()}`,
          exercises: (w.exercises || []).map((ex, exIdx) => ({ ...ex, order_index: exIdx }))
        }));
        return { ...a, workouts: [...newWorkoutsWithIds, ...history] };
      }
      return a;
    });
    setAthletes(updated);
    await save(updated, athleteId);
  };

  const deleteWorkout = async (athleteId: string, workoutId: string) => {
    recordDeletedItemId(workoutId);
    setSyncing(true);
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        return { ...a, workouts: (a.workouts || []).filter(w => w.id !== workoutId) };
      }
      return a;
    });
    setAthletes(updated);

    try {
      if (token) {
        const res = await fetch(`/api/workouts/${workoutId}`, {
          cache: 'no-store',
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Erro ao deletar treino via API. Status: ${res.status}`);
        }
      } else {
        await supabaseService.deleteWorkout(workoutId);
      }
      
      safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(updated));
      toast.success("Treino removido!");
    } catch (e) {
      logError("Erro ao deletar treino:", e);
      toast.error("Erro ao sincronizar exclusão.");
    } finally {
      setSyncing(false);
    }
  };

  const updateWorkout = async (athleteId: string, workout: Workout) => {
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        let updatedWorkout = {
          ...workout,
          updatedAt: new Date().toISOString(),
          exercises: (workout.exercises || []).map((ex, idx) => ({ ...ex, order_index: idx }))
        };
        if (workout.status === 'completed') {
          const athleteWeight = a.assessments.bioimpedance[0]?.weight;
          updatedWorkout.totalLoad = calculateWorkoutLoad(workout, athleteWeight);
          const workoutsList = (a.workouts || []).map(w => w.id === workout.id ? updatedWorkout : w);
          const { monotony, strain } = calculateAdvancedMetrics(workoutsList, a.externalSessions);
          updatedWorkout.monotony = monotony;
          updatedWorkout.strain = strain;
          return { ...a, workouts: workoutsList };
        }
        return { ...a, workouts: (a.workouts || []).map(w => w.id === workout.id ? updatedWorkout : w) };
      }
      return a;
    });
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Treino atualizado!");
  };

  const addAssessment = async (athleteId: string, type: AssessmentType, data: any) => {
    const nowIso = new Date().toISOString();
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const currentAssessments = a.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] };
        const history = Array.isArray(currentAssessments[type]) ? currentAssessments[type] : [];
        const assessments = { ...currentAssessments, [type]: [{ ...data, id: `asm-${Date.now()}-${Math.floor(Math.random() * 10000)}`, updatedAt: nowIso }, ...history] };
        return { ...a, assessments };
      }
      return a;
    });
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success(`Avaliação salva!`);
  };

  const updateAssessment = async (athleteId: string, type: AssessmentType, assessmentId: string, data: any) => {
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const currentAssessments = a.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] };
        const history = Array.isArray(currentAssessments[type]) ? currentAssessments[type] : [];
        const assessments = { 
          ...currentAssessments, 
          [type]: history.map((asm: any) => asm.id === assessmentId ? { ...asm, ...data } : asm) 
        };
        return { ...a, assessments };
      }
      return a;
    });
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success(`Avaliação atualizada!`);
  };

  const removeAssessment = async (athleteId: string, type: AssessmentType, assessmentId: string) => {
    recordDeletedItemId(assessmentId);
    setSyncing(true);
    const updatedAthletes = athletes.map(a => {
      if (a.id === athleteId) {
        const currentAssessments = a.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] };
        const history = Array.isArray(currentAssessments[type]) ? currentAssessments[type] : [];
        const assessments = { 
          ...currentAssessments, 
          [type]: history.filter((asm: any) => asm.id !== assessmentId) 
        };
        return { ...a, assessments };
      }
      return a;
    });
    setAthletes(updatedAthletes);

    try {
      if (token) {
        const res = await fetch(`/api/assessments/${type}/${assessmentId}`, {
          cache: 'no-store',
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Erro ao deletar avaliação via API. Status: ${res.status}`);
        }
      } else {
        await supabaseService.deleteAssessment(type, assessmentId);
      }

      safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(updatedAthletes));
      toast.success(`Avaliação removida!`);
    } catch (e) {
      logError("Erro ao deletar avaliação:", e);
      toast.error("Erro ao sincronizar exclusão.");
    } finally {
      setSyncing(false);
    }
  };

  const addAthlete = async (data: any) => {
    const freshId = `ath-${Date.now()}-${Math.random()}`;
    const newAthlete: Athlete = { 
      ...data, 
      id: freshId, 
      assessments: { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] }, 
      wellness: [], 
      workouts: [] 
    };
    const updated = [newAthlete, ...athletes];
    setAthletes(updated);
    await save(updated, freshId);
    toast.success("Atleta cadastrado!");
  };

  const deleteAthlete = async (athleteId: string) => {
    recordDeletedItemId(athleteId);
    setSyncing(true);
    try {
      if (token) {
        const res = await fetch(`/api/atletas/${athleteId}`, {
          cache: 'no-store',
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Erro ao deletar atleta via API. Status: ${res.status}`);
        }
      } else {
        await supabaseService.deleteAthlete(athleteId);
      }
      setAthletes(prev => prev.filter(a => a.id !== athleteId));
      toast.success("Atleta removido com sucesso!");
    } catch (e) {
      logError("Delete Athlete Error:", e);
      toast.error("Erro de conexão ao remover atleta.");
    } finally {
      setSyncing(false);
    }
  };

  const analyzePerformance = async (athlete: Athlete): Promise<string> => {
    const lastWorkout = athlete.workouts.find(w => w.status === 'completed');
    const recentWellness = athlete.wellness.slice(0, 14); // More context for load analysis
    const lastBio = athlete.assessments.bioimpedance[0];
    const lastStrength = athlete.assessments.isometricStrength[0];
    const lastCmj = athlete.assessments.cmj[0];
    const lastVo2 = athlete.assessments.vo2max[0];
    const lastSpeed = athlete.assessments.speed[0];
    const age = calculateAge(athlete.dob);
    
    const prompt = `
      PERSONA:
      Você é um Treinador Elite, Analista de Performance e Especialista em Ciência de Dados aplicada ao treinamento esportivo de alto rendimento.
      Fale diretamente com o atleta ou seu treinador utilizando uma terminologia técnica, porém encorajadora e profissional, típica de um ambiente de alta performance.
      Utilize princípios de Platonov, Matveev, Issurin, Foster e Daniels.

      PARÂMETRO CRÍTICO (I/Q):
      Para a relação Isquios/Quadríceps (I/Q), o padrão de excelência e segurança para este sistema é de 50% a 60%. Utilize esta faixa como referência obrigatória para suas análises de equilíbrio muscular.

      OBJETIVO:
      Calcular indicadores automáticos e gerar análises avançadas de performance normalizadas (0-100).

      DADOS DO ATLETA:
      - Nome: ${athlete.name}
      - Idade: ${age} anos
      - Sexo: ${athlete.gender === 'M' ? 'Masculino' : 'Feminino'}
      - Modalidade: ${athlete.modality || 'Não informada'}
      - Nível Competitivo: ${athlete.competitiveLevel || 'Não informado'}
      - Posição/Especialidade: ${athlete.position || 'Não informada'}
      - Objetivo: ${athlete.goal || 'Performance'}
      - MODO TORNEIO: ${athlete.isTournamentMode ? 'ATIVADO (Foco total em recuperação e prontidão)' : 'DESATIVADO'}
      - Histórico de Lesões: ${athlete.injuryHistory || 'Nenhum'}
      - Prontidão Recente (Wellness): ${JSON.stringify(recentWellness)}
      - Composição Corporal: ${JSON.stringify(lastBio)}
      - Força Isométrica: ${JSON.stringify(lastStrength)}
      - Salto Vertical (CMJ): ${JSON.stringify(lastCmj)}
      - Capacidade Aeróbica (VO2): ${JSON.stringify(lastVo2)}
      - Velocidade/Sprints: ${JSON.stringify(lastSpeed)}
      - Histórico de Treinos (Carga Academia): ${JSON.stringify(athlete.workouts.slice(0, 15))}
      - Histórico de Treinos de Quadra/Competição: ${JSON.stringify(athlete.externalSessions?.slice(0, 15))}
      
      TAREFAS ANALÍTICAS:
      1. NORMALIZAÇÃO: Converta dados em escala 0-100 comparando com referências de elite para a modalidade/sexo/idade.
      2. RADAR DE CAPACIDADES: Calcule scores (0-100) para Força, Potência, Resistência Aeróbia, Resistência Anaeróbia, Velocidade, Agilidade, Mobilidade e Composição Corporal.
      3. ÍNDICE DE PERFORMANCE GERAL (IPG): Calcule a média ponderada (Força 20%, Potência 20%, Aeróbio 20%, Anaeróbio 15%, Velocidade 10%, Composição 10%, Mobilidade 5%).
      4. SCORE DE PRONTIDÃO: Baseado em sono, fadiga, dor, estresse e motivação. Se MODO TORNEIO estiver ATIVADO, este score é o mais importante.
      5. SCORE DE RISCO DE LESÃO: Baseado em Monotonia, Strain, fadiga acumulada (incluindo treinos de quadra), dor e desequilíbrios.
      6. ALERTAS: Gere alertas se Prontidão < 50, Risco > 60 ou Queda de Performance > 10%.
      7. CONTEXTO DE TORNEIO: Se o atleta estiver em modo torneio, as recomendações DEVEM focar em estratégias de recuperação (gelo, compressão, sono, nutrição) e manutenção de prontidão, evitando treinos de alta carga na academia.

      Sua resposta deve ser um JSON estritamente no seguinte formato:
      {
        "status": "string (ex: Elite, Moderado, Risco Crítico)",
        "performanceScore": number (0-100),
        "readinessScore": number (0-100),
        "injuryRiskScore": number (0-100),
        "radarData": [
          {"subject": "Força", "A": number, "fullMark": 100},
          {"subject": "Potência", "A": number, "fullMark": 100},
          {"subject": "Aeróbio", "A": number, "fullMark": 100},
          {"subject": "Anaeróbio", "A": number, "fullMark": 100},
          {"subject": "Velocidade", "A": number, "fullMark": 100},
          {"subject": "Agilidade", "A": number, "fullMark": 100},
          {"subject": "Mobilidade", "A": number, "fullMark": 100},
          {"subject": "Composição", "A": number, "fullMark": 100}
        ],
        "summary": "string (resumo executivo objetivo)",
        "detailedAnalysis": "string (texto longo em MARKDOWN com a interpretação técnica das etapas 1 a 7)",
        "alerts": ["string", "string"],
        "recommendations": ["string", "string"],
        "conclusion": "string (conclusão técnica final)"
      }
    `;
    try {
      const res = await fetch("/api/analyze-performance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned ${res.status}`);
      }

      const responseData = await res.json();
      return responseData.result || "{}";
    } catch (e: any) {
      logError("AI Analysis Error:", e);
      const errorMsg = e.message || String(e);
      if (errorMsg.includes("403")) {
        return "Erro 403: Sem permissão para o modelo de IA. Verifique sua chave de API.";
      }
      return `Indisponível: ${errorMsg}`;
    }
  };

  const tryParseAndRepairArray = (str: string): any[] => {
    let cleaned = str.trim();
    
    // Remove enclosing markdown block if present
    if (cleaned.startsWith("```")) {
      const parts = cleaned.split("```");
      if (parts.length >= 3) {
        cleaned = parts[1].replace(/^(json|JSON)/, "").trim();
      } else {
        cleaned = cleaned.replace(/^```(json|JSON)?/, "").replace(/```$/, "").trim();
      }
    } else if (cleaned.includes("```")) {
      cleaned = cleaned.split("```")[1].replace(/^(json|JSON)/, "").trim();
    }
    
    // 1. Try standard JSON.parse
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Direct parse failed, proceed to try repairing truncated JSON
      console.warn("[JSON Repair] Direct parsing failed. Trying to recover partial JSON...", e);
    }

    const suffixes = [
      "]",
      "}]",
      " ]}",
      " ]}]",
      "}]}]",
      "}]}]}]"
    ];

    // Find all occurrences of '}' from right to left to locate last fully closed workout or exercise node
    const indices: number[] = [];
    for (let i = cleaned.length - 1; i >= 0; i--) {
      if (cleaned[i] === '}') {
        indices.push(i);
      }
    }

    for (const idx of indices) {
      const sub = cleaned.substring(0, idx + 1);
      for (const suffix of suffixes) {
        try {
          const candidate = sub + suffix;
          const parsed = JSON.parse(candidate);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.warn(`[JSON Repair] Recovered truncated JSON! Substring index: ${idx}, Suffix: "${suffix}", Items recovered: ${parsed.length}`);
            return parsed;
          }
        } catch (err) {
          // Keep looking for a matching candidate
        }
      }
    }

    // Try finding the last array bracket open '[' and close it
    try {
      const lastOpenBracket = cleaned.lastIndexOf('[');
      if (lastOpenBracket !== -1) {
        const sub = cleaned.substring(0, lastOpenBracket);
        const parsed = JSON.parse(sub + "]");
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    throw new Error("Não foi possível processar a periodização devido a uma instabilidade no servidor do Gemini. Por favor, tente novamente com um intervalo de datas menor.");
  };

  const generateAIWorkouts = async (athlete: Athlete, coachInstructions?: string): Promise<void> => {
    const toastId = toast.loading("IA elaborando periodização elite...");
    console.log("Iniciando geração de treinos para:", athlete.name);
    
    try {
      // Calculate exact calendar dates based on athlete training config
      const startStr = athlete.periodizationStart || getLocalDateString();
      let endStr = athlete.periodizationEnd;
      const targetDays = Array.isArray(athlete.trainingDays) && athlete.trainingDays.length > 0 
        ? athlete.trainingDays 
        : [1, 3, 5]; // Default to Mon, Wed, Fri (Seg, Qua, Sex)

      if (!endStr) {
        // Generate a standard robust 2-week cycle block
        const startDateVal = new Date(startStr + "T12:00:00");
        const endDateVal = new Date(startDateVal.getTime() + (14 * 24 * 60 * 60 * 1000));
        endStr = endDateVal.toISOString().split('T')[0];
      }

      // Find all matching dates between start and end str with their training type meta
      const trainingDatesMeta: { date: string; type: "academia" | "quadra" | "ambos" }[] = [];
      let currentDate = new Date(startStr + "T12:00:00");
      const endDateVal = new Date(endStr + "T12:00:00");
      let safetyCounter = 0;
      const maxWorkouts = 12; // Maintain safety boundaries

      while (currentDate <= endDateVal && safetyCounter < 180 && trainingDatesMeta.length < maxWorkouts) {
        const dayOfWeek = currentDate.getDay();
        if (targetDays.includes(dayOfWeek)) {
          const isAcademy = Array.isArray(athlete.academyDays) && athlete.academyDays.includes(dayOfWeek);
          const isCourt = Array.isArray(athlete.courtDays) && athlete.courtDays.includes(dayOfWeek);
          let type: "academia" | "quadra" | "ambos" = "academia";
          if (isAcademy && isCourt) {
            type = "ambos";
          } else if (isCourt) {
            type = "quadra";
          }
          trainingDatesMeta.push({
            date: currentDate.toISOString().split('T')[0],
            type
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
        safetyCounter++;
      }

      // Ultimate fallback if dates are out of bounds or none generated
      if (trainingDatesMeta.length === 0) {
        let fallbackDate = new Date();
        for (let i = 0; i < 6; i++) {
          trainingDatesMeta.push({
            date: fallbackDate.toISOString().split('T')[0],
            type: i % 2 === 0 ? "academia" : "quadra"
          });
          fallbackDate.setDate(fallbackDate.getDate() + 2);
        }
      }

      const context = {
        name: athlete.name,
        modality: athlete.modality,
        injuries: athlete.injuries || [],
        goal: athlete.goal,
        weeklyFrequency: athlete.weeklyFrequency,
        periodizationStart: startStr,
        periodizationEnd: endStr,
        trainingDays: athlete.trainingDays,
        academyDays: athlete.academyDays,
        courtDays: athlete.courtDays,
        lastAssessments: {
          bioimpedance: athlete.assessments.bioimpedance?.[0],
          strength: athlete.assessments.isometricStrength?.[0],
          cmj: athlete.assessments.cmj?.[0],
          vo2max: athlete.assessments.vo2max?.[0],
          speed: athlete.assessments.speed?.[0]
        },
        recentWorkouts: athlete.workouts.filter(w => w.status === 'completed').slice(0, 10)
      };

      console.log("[AI] Contexto enviado:", JSON.stringify(context, null, 2));

      // Build trainer's combined library list
      let customLibrary: any[] = [];
      try {
        const stored = safeLocalStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
        customLibrary = stored ? JSON.parse(stored) : [];
      } catch (e) {}

      let deletedIds: string[] = [];
      try {
        const stored = safeLocalStorage.getItem("LB_DELETED_LIBRARY_EXERCISES");
        deletedIds = stored ? JSON.parse(stored) : [];
      } catch (e) {}

      const customMap = new Map(customLibrary.map(ex => [ex.id, ex]));
      const combinedLibrary: any[] = [];
      ENRICHED_LIBRARY.forEach(builtIn => {
        if (deletedIds.includes(builtIn.id)) return;
        if (customMap.has(builtIn.id)) {
          combinedLibrary.push(customMap.get(builtIn.id)!);
        } else {
          combinedLibrary.push(builtIn);
        }
      });
      customLibrary.forEach(custom => {
        if (deletedIds.includes(custom.id)) return;
        if (!ENRICHED_LIBRARY.some(b => b.id === custom.id)) {
          combinedLibrary.push(custom);
        }
      });

      const libraryText = combinedLibrary.map(ex => 
        `- "${ex.name}" | Categoria: ${ex.category} | Valência: ${ex.physicalQuality || ex.muscleGroup || ''}`
      ).join('\n');

      const prompt = `
        Você é um Treinador de Elite Mundial e Cientista do Esporte de referência.
        Sua missão é criar uma PERIODIZAÇÃO INDIVIDUALIZADA e ALTAMENTE ESTRUTURADA para o atleta ${context.name}.
        
        CONTEXTO DO ATLETA:
        - Modalidade: ${context.modality}
        - Sexo: ${athlete.gender === 'M' ? 'Masculino' : 'Feminino'}
        - Idade: ${calculateAge(athlete.dob)} anos
        - Objetivo Principal: ${context.goal || 'Performance de Elite'}
        - Histórico de Lesões (ATENÇÃO CRÍTICA): ${JSON.stringify(context.injuries)}
        
        PREFERÊNCIA ABSOLUTA DA BIBLIOTECA DO TREINADOR:
        Ao montar as sessões de treino e escolher os exercícios, você DEVE consultar a lista de exercícios cadastrados abaixo e dar preferência absoluta aos itens já cadastrados na biblioteca do treinador.
        Se um exercício cadastrado preencher a função fisiológica/biomecânica desejada, use-o com o mesmo nome exato da lista abaixo.
        Você PODE criar e prescrever novos exercícios específicos que não estão na lista abaixo caso considere que são mais adequados, específicos ou necessários para o atleta e seu esporte (assim o treinador poderá ir cadastrando novos exercícios), mas tente usar os da lista o máximo possível.

        Exercícios cadastrados na Biblioteca:
        ${libraryText}

        CRONOGRAMA DE DATAS DA PERIODIZAÇÃO E FOCO DOS TREINOS (MUITO IMPORTANTE):
        Você DEVE criar exatamente ${trainingDatesMeta.length} sessões de treino, combinando cada treino com uma data exclusiva do cronograma fornecido e respeitando rigorosamente o foco especificado para cada dia:
        - Dias rotulados como ACADEMIA: Elabore rotinas de musculação, fortalecimento, força máxima, RFD (taxa de desenvolvimento de força), potência muscular, força explosiva, estabilidade articular, core ou exercícios resistidos específicos.
        - Dias rotulados como CAMPO/QUADRA: Elabore rotinas específicas da modalidade (${context.modality}) como treinos de agilidade, aceleração/desaceleração, potência aeróbica/anaeróbica, táticos ou técnicos, gestos esportivos e corrida/movimentação específica na quadra ou campo.
        - Dias rotulados como AMBOS: Treinos mistos de transição ou sessões integradas de força e campo.
        
        Lista de datas cronológicas e focos para gerar treinos:
        ${trainingDatesMeta.map(d => `- Data: ${d.date} | Foco do Treino: ${d.type === 'academia' ? 'ACADEMIA' : d.type === 'quadra' ? 'CAMPO/QUADRA' : 'MISTO / AMBOS'}`).join('\n')}

        DADOS DE PERFORMANCE (USE PARA INDIVIDUALIZAR CARGAS E INTENSIDADES):
        - Força/Potência: ${JSON.stringify(context.lastAssessments.strength)} | Salto CMJ: ${JSON.stringify(context.lastAssessments.cmj)}
        - Velocidade/Resistência: ${JSON.stringify(context.lastAssessments.speed)} | VO2 Máximo: ${JSON.stringify(context.lastAssessments.vo2max)}
        
        ${coachInstructions ? `DIRETRIZES ESTRATÉGICAS ESPECÍFICA DO TREINADOR: "${coachInstructions}"` : ''}

        ORGANIZAÇÃO DAS FASES DE TREINO (DIFERENCIE CADA FASE):
        Para que seja uma VERDADEIRA periodização, distribua progressivamente os treinos conforme a passagem do tempo:
        1. FASE DE PREPARAÇÃO GERAL (Primeiros treinos): Concentre em fortalecimento de base, correção de desequilíbrios musculares (I/Q, estabilidade de core/tornozelo), reabilitação preventiva integrada de lesões, maior volume e menor intensidade relativa.
        2. FASE DE PREPARAÇÃO ESPECÍFICA (Treinos intermediários): Foco no gesto esportivo de ${context.modality}, aplicação de potência máxima (RFD, explosão e CMJ), e treinos mais complexos.
        3. FASE DE POLIMENTO / TAPERING (Últimos treinos próximos ao fim da periodização): Redução acentuada de volume (menos séries e exercícios), mantendo a intensidade alta para aumentar os índices de prontidão física ("Readiness") e explosão reativa.

        INSTRUÇÕES ADICIONAIS:
        - Cada sessão de treino deve ser única, progressiva e conter nome técnico descritivo de acordo com seu foco (ex: "Fase de Preparação Geral - ACADEMIA: Força de Base", "Fase Específica - CAMPO/QUADRA: Taxa de Desenvolvimento de Velocidade").
        - Se houver lesão ativa, inclua exercícios específicos de reabilitação estruturada no aquecimento.

        FORMATO DE SAÍDA:
        Retorne APENAS um array JSON válido de objetos de treino para as datas do cronograma fornecido, no formato JSON especificado.
      `;

      const res = await fetch("/api/generate-workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Servidor respondeu com status ${res.status}`);
      }

      const responseData = await res.json();
      const rawText = responseData.result || "";
      if (!rawText) throw new Error("Resposta da IA está vazia.");
      
      const newWorkoutsData = tryParseAndRepairArray(rawText);

      if (Array.isArray(newWorkoutsData)) {
        const formattedWorkouts = newWorkoutsData.map((w: any) => ({
          id: `wk-ai-${Date.now()}-${Math.random()}`,
          date: w.date || getLocalDateString(),
          name: w.name || 'Treino Periodizado',
          phase: w.phase || 'Competição',
          status: 'planned' as const,
          exercises: (Array.isArray(w.exercises) ? w.exercises : []).map((ex: any) => ({
            id: `ex-ai-${Date.now()}-${Math.random()}`,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            sets: Number(ex.sets) || 3,
            reps: String(ex.reps),
            repsType: String(ex.reps).toLowerCase().includes("s") ? ("time" as const) : ("reps" as const),
            weight: String(ex.weight),
            rest: '60-90s',
            notes: '',
            performedSets: Array.from({ length: Number(ex.sets) || 3 }).map(() => ({
              id: `set-${Math.random()}`,
              reps: 0,
              weight: 0,
              rpe: 0
            }))
          })),
          rpe: 0,
          totalLoad: 0,
          durationMinutes: 0
        }));

        const updated = athletes.map(a => {
          if (a.id === athlete.id) {
            const currentWorkouts = Array.isArray(a.workouts) ? a.workouts : [];
            // Merge and sort by date (Ascending for periodization flow)
            const merged = [...formattedWorkouts, ...currentWorkouts].sort((x, y) => 
               new Date(x.date).getTime() - new Date(y.date).getTime()
            );
            return { ...a, workouts: merged };
          }
          return a;
        });

        setAthletes(updated);
        await save(updated, athlete.id);
        toast.success(`Periodização com ${formattedWorkouts.length} treinos gerada com sucesso!`, { id: toastId });
      } else {
        throw new Error("Formato de resposta inválido.");
      }
    } catch (e: any) {
      console.error("[AI] Erro na periodização:", e);
      toast.error(`Falha na IA: ${e.message || "Erro desconhecido"}`, { id: toastId });
    }
  };

  const addExternalSession = async (athleteId: string, session: Omit<ExternalSession, 'id' | 'load'>) => {
    const load = (session.durationMinutes || 0) * (session.rpe || 0);
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = Array.isArray(a.externalSessions) ? a.externalSessions : [];
        const newSession = {
          ...session,
          id: `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          load
        };
        const newHistory = [newSession, ...history].sort((x, y) => {
          const dateX = getSafeDateTime(x.date);
          const dateY = getSafeDateTime(y.date);
          if (dateY !== dateX) return dateY - dateX;
          return (y.id || "").localeCompare(x.id || "");
        });
        
        return { ...a, externalSessions: newHistory };
      }
      return a;
    });
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Treino de quadra registrado!");
  };

  const updateExternalSession = async (athleteId: string, sessionId: string, data: Partial<ExternalSession>) => {
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = (a.externalSessions || []).map(s => {
          if (s.id === sessionId) {
            const updatedSession = { ...s, ...data };
            updatedSession.load = (updatedSession.durationMinutes || 0) * (updatedSession.rpe || 0);
            return updatedSession;
          }
          return s;
        });
        history.sort((x, y) => {
          const dateX = getSafeDateTime(x.date);
          const dateY = getSafeDateTime(y.date);
          if (dateY !== dateX) return dateY - dateX;
          return (y.id || "").localeCompare(x.id || "");
        });
        return { ...a, externalSessions: history };
      }
      return a;
    });

    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Treino de quadra atualizado!");
  };

  const deleteExternalSession = async (athleteId: string, sessionId: string) => {
    recordDeletedItemId(sessionId);
    setSyncing(true);
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = Array.isArray(a.externalSessions) ? a.externalSessions : [];
        return { ...a, externalSessions: history.filter(s => s.id !== sessionId) };
      }
      return a;
    });
    setAthletes(updated);

    try {
      if (token) {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          cache: 'no-store',
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Erro ao deletar sessão via API. Status: ${res.status}`);
        }
      } else {
        await supabaseService.deleteExternalSession(sessionId);
      }
      
      safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(updated));
      await save(updated, athleteId);
      toast.success("Sessão removida!");
    } catch (e) {
      logError("Erro ao deletar sessão:", e);
      toast.error("Erro ao sincronizar exclusão.");
    } finally {
      setSyncing(false);
    }
  };

  const importDemoAthlete = async () => {
    setSyncing(true);
    const toastId = toast.loading("Gerando e sincronizando atleta demo...");
    try {
      const demoAthlete = generateModelAthlete();
      
      console.log("[Hooks] Salvando atleta modelo...");
      await api.saveAthlete(demoAthlete);
      
      const newAthletes = [demoAthlete, ...athletes.filter(a => a.id !== demoAthlete.id)];
      setAthletes(newAthletes);
      safeLocalStorage.setItem('lb_athletes_cache', JSON.stringify(newAthletes));
      
      toast.success("Atleta de demonstração importado com sucesso!", { id: toastId });
    } catch (e: any) {
      logError("Erro ao importar atleta demo:", e);
      toast.error(`Falha ao salvar. Erro: ${e.message || e}.`, { id: toastId, duration: 8000 });
    } finally {
      setSyncing(false);
    }
  };

  return { 
    athletes, loading, syncing, lastSyncedAt, setAthletes, save, addAthlete, updateAthlete, deleteAthlete, addWellness, updateWellness, deleteWellness,
    addWorkout, addWorkouts, updateWorkout, deleteWorkout, addAssessment, updateAssessment, 
    removeAssessment, analyzePerformance, generateAIWorkouts, addExternalSession, updateExternalSession, deleteExternalSession,
    importDemoAthlete, syncData, iframeCookieWarning
  };
};
