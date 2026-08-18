
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
        const hasOrderIndex = exs.some(x => typeof x.order_index === 'number' || typeof (x as any).orderIndex === 'number');
        const sortedExs = hasOrderIndex
          ? exs.sort((x: any, y: any) => {
              const xVal = typeof x.order_index === 'number' ? x.order_index : (typeof x.orderIndex === 'number' ? x.orderIndex : 9999);
              const yVal = typeof y.order_index === 'number' ? y.order_index : (typeof y.orderIndex === 'number' ? y.orderIndex : 9999);
              return xVal - yVal;
            })
          : exs;

        return {
          ...w,
          exercises: sortedExs.map((ex, idx) => ({
            ...ex,
            order_index: idx
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

    // Auto-sync when page recovers focus, online connection, visibility change, or page show (with 5-min throttle)
    const handleRefocusOrOnline = () => {
      const now = Date.now();
      // Throttle window refocus sync to at most once every 5 minutes (300,000 ms) to prevent excessive bandwidth consumption
      const MIN_REFOCUS_SYNC_INTERVAL_MS = 5 * 60 * 1000;
      if (now - lastSyncTimeRef.current > MIN_REFOCUS_SYNC_INTERVAL_MS && navigator.onLine && document.visibilityState === 'visible' && !syncingRef.current) {
        console.log('[Auto-Sync] Janela ativa e online após inatividade. Sincronizando dados em background...');
        lastSyncTimeRef.current = now;
        syncDataRef.current(true); // Silent sync
      }
    };

    window.addEventListener('focus', handleRefocusOrOnline);
    window.addEventListener('online', handleRefocusOrOnline);
    window.addEventListener('pageshow', handleRefocusOrOnline);
    document.addEventListener('visibilitychange', handleRefocusOrOnline);

    // BroadcastChannel for cross-tab/multi-window synchronization on the same device (Zero bandwidth cost)
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

    return () => {
      window.removeEventListener('focus', handleRefocusOrOnline);
      window.removeEventListener('online', handleRefocusOrOnline);
      window.removeEventListener('pageshow', handleRefocusOrOnline);
      document.removeEventListener('visibilitychange', handleRefocusOrOnline);
      if (bc) bc.close();
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
    
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const history = Array.isArray(a.wellness) ? a.wellness : [];
        const newHistory = [{ ...entry, id: newId, readinessScore: score }, ...history];
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
    const normalizedWorkout = {
      ...workout,
      id: newId,
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
    const updated = athletes.map(a => {
      if (a.id === athleteId) {
        const currentAssessments = a.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] };
        const history = Array.isArray(currentAssessments[type]) ? currentAssessments[type] : [];
        const assessments = { ...currentAssessments, [type]: [{ ...data, id: `asm-${Date.now()}-${Math.floor(Math.random() * 10000)}` }, ...history] };
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

  const generateAIWorkouts = async (
    athlete: Athlete, 
    coachInstructions?: string,
    options?: {
      periodizationStart?: string;
      periodizationEnd?: string;
      academyDays?: number[];
      courtDays?: number[];
    }
  ): Promise<void> => {
    const toastId = toast.loading("IA Co-Pilot elaborando periodização...");
    console.log("Iniciando geração de treinos IA Co-Pilot para:", athlete.name, "com opções:", options);
    
    try {
      const dayNamesPt = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      
      // Calculate exact calendar dates based on options or athlete training config
      let startStr = options?.periodizationStart || athlete.periodizationStart || getLocalDateString();
      let endStr = options?.periodizationEnd || athlete.periodizationEnd;
      
      const effectiveAcademyDays = options?.academyDays ?? (Array.isArray(athlete.academyDays) ? athlete.academyDays : []);
      const effectiveCourtDays = options?.courtDays ?? (Array.isArray(athlete.courtDays) ? athlete.courtDays : []);
      
      let targetDays = Array.from(new Set([...effectiveAcademyDays, ...effectiveCourtDays])).sort();
      if (targetDays.length === 0 && Array.isArray(athlete.trainingDays) && athlete.trainingDays.length > 0) {
        targetDays = athlete.trainingDays;
      }
      if (targetDays.length === 0) {
        targetDays = [1, 3, 5]; // Default to Mon, Wed, Fri (Seg, Qua, Sex)
      }

      if (!endStr) {
        // Generate a standard robust 2-week cycle block
        const [sy, sm, sd] = startStr.split('-').map(Number);
        const startDateVal = new Date(sy, sm - 1, sd, 12, 0, 0);
        const endDateVal = new Date(startDateVal.getTime() + (14 * 24 * 60 * 60 * 1000));
        const ey = endDateVal.getFullYear();
        const em = String(endDateVal.getMonth() + 1).padStart(2, '0');
        const ed = String(endDateVal.getDate()).padStart(2, '0');
        endStr = `${ey}-${em}-${ed}`;
      }

      // Check date ordering
      let [sy, sm, sd] = startStr.split('-').map(Number);
      let [ey, em, ed] = endStr.split('-').map(Number);
      let startDateVal = new Date(sy, sm - 1, sd, 12, 0, 0);
      let endDateVal = new Date(ey, em - 1, ed, 12, 0, 0);

      if (startDateVal > endDateVal) {
        // Swap if reversed
        const temp = startStr;
        startStr = endStr;
        endStr = temp;
        [sy, sm, sd] = startStr.split('-').map(Number);
        [ey, em, ed] = endStr.split('-').map(Number);
        startDateVal = new Date(sy, sm - 1, sd, 12, 0, 0);
        endDateVal = new Date(ey, em - 1, ed, 12, 0, 0);
      }

      // Find all matching dates between start and end str with their training type meta
      const trainingDatesMeta: { date: string; dayOfWeek: number; dayName: string; type: "academia" | "quadra" | "ambos" }[] = [];
      let currentDate = new Date(startDateVal);
      let safetyCounter = 0;
      const maxWorkouts = 28; // Support full mesocycles

      while (currentDate <= endDateVal && safetyCounter < 365 && trainingDatesMeta.length < maxWorkouts) {
        const dayOfWeek = currentDate.getDay();
        if (targetDays.includes(dayOfWeek)) {
          const isAcademy = effectiveAcademyDays.includes(dayOfWeek);
          const isCourt = effectiveCourtDays.includes(dayOfWeek);
          let type: "academia" | "quadra" | "ambos" = "academia";
          if (isAcademy && isCourt) {
            type = "ambos";
          } else if (isCourt) {
            type = "quadra";
          }
          const cy = currentDate.getFullYear();
          const cm = String(currentDate.getMonth() + 1).padStart(2, '0');
          const cd = String(currentDate.getDate()).padStart(2, '0');
          trainingDatesMeta.push({
            date: `${cy}-${cm}-${cd}`,
            dayOfWeek,
            dayName: dayNamesPt[dayOfWeek],
            type
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
        safetyCounter++;
      }

      // Fallback if no matching dates found in the chosen interval
      if (trainingDatesMeta.length === 0) {
        let fallbackDate = new Date(startDateVal);
        for (let i = 0; i < 6; i++) {
          const dayOfWeek = fallbackDate.getDay();
          const isAcademy = effectiveAcademyDays.includes(dayOfWeek);
          const isCourt = effectiveCourtDays.includes(dayOfWeek);
          const cy = fallbackDate.getFullYear();
          const cm = String(fallbackDate.getMonth() + 1).padStart(2, '0');
          const cd = String(fallbackDate.getDate()).padStart(2, '0');
          trainingDatesMeta.push({
            date: `${cy}-${cm}-${cd}`,
            dayOfWeek,
            dayName: dayNamesPt[dayOfWeek],
            type: isCourt ? "quadra" : isAcademy ? "academia" : (i % 2 === 0 ? "academia" : "quadra")
          });
          fallbackDate.setDate(fallbackDate.getDate() + 2);
        }
      }

      const academyDaysNames = effectiveAcademyDays.length > 0
        ? effectiveAcademyDays.map(d => dayNamesPt[d]).join(', ')
        : "Nenhum dia específico marcado (padrão flexível)";

      const courtDaysNames = effectiveCourtDays.length > 0
        ? effectiveCourtDays.map(d => dayNamesPt[d]).join(', ')
        : "Nenhum dia específico marcado (padrão flexível)";

      const context = {
        name: athlete.name,
        modality: athlete.modality,
        injuries: athlete.injuries || [],
        goal: athlete.goal,
        weeklyFrequency: athlete.weeklyFrequency,
        periodizationStart: startStr,
        periodizationEnd: endStr,
        trainingDays: targetDays,
        academyDays: effectiveAcademyDays,
        courtDays: effectiveCourtDays,
        lastAssessments: {
          bioimpedance: athlete.assessments.bioimpedance?.[0],
          strength: athlete.assessments.isometricStrength?.[0],
          cmj: athlete.assessments.cmj?.[0],
          vo2max: athlete.assessments.vo2max?.[0],
          speed: athlete.assessments.speed?.[0]
        },
        recentWorkouts: athlete.workouts.filter(w => w.status === 'completed').slice(0, 10)
      };

      console.log("[AI Co-Pilot] Cronograma gerado:", trainingDatesMeta);

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
        Você é o IA CO-PILOT DE PERIODIZAÇÃO ESPORTIVA DE ALTO RENDIMENTO.
        Sua missão é analisar minuciosamente os dias da semana de treino do atleta, o período configurado, a descrição/diretrizes do treinador e os dados fisiológicos/antropométricos para elaborar a periodização completa nas datas e dias corretos para ${context.name}.
        
        PERFIL DO ATLETA:
        - Nome: ${context.name}
        - Modalidade: ${context.modality}
        - Sexo: ${athlete.gender === 'M' ? 'Masculino' : 'Feminino'}
        - Idade: ${calculateAge(athlete.dob)} anos
        - Objetivo Principal: ${context.goal || 'Performance de Elite'}
        - Histórico de Lesões / Cuidados: ${JSON.stringify(context.injuries)}
        
        CONFIGURAÇÃO DOS DIAS DA SEMANA E PERÍODO (IA CO-PILOT):
        - Período: De ${startStr} até ${endStr}
        - Dias de Academia (Fortalecimento / Musculação / Potência): ${academyDaysNames}
        - Dias de Campo / Quadra (Técnico / Tático / Agilidade): ${courtDaysNames}
        
        DIRETRIZES ESTRATÉGICAS / DESCRIÇÃO DO TREINADOR:
        "${coachInstructions || 'Desenvolver a melhor forma física e atlética do atleta, respeitando os dias e focos de treinamento.'}"
        
        CRONOGRAMA EXATO DE SESSÕES A SEREM GERADAS (Total: ${trainingDatesMeta.length} treinos):
        ${trainingDatesMeta.map(d => `- Data: ${d.date} (${d.dayName}) | Foco: ${d.type === 'academia' ? '🏋️‍♂️ ACADEMIA (Musculação / Força / Potência / RFD)' : d.type === 'quadra' ? '⚽ CAMPO/QUADRA (Agilidade / Técnico / Tático / Velocidade)' : '⚡ MISTO / INTEGRADO'}`).join('\n')}

        PREFERÊNCIA ABSOLUTA DA BIBLIOTECA DO TREINADOR:
        Ao prescrever os exercícios, consulte a lista abaixo e dê preferência aos nomes já cadastrados. Crie novos apenas quando indispensável para a modalidade:
        ${libraryText}

        DADOS DE TESTES E AVALIAÇÕES DO ATLETA:
        - Força Isométrica / Dinamométrica: ${JSON.stringify(context.lastAssessments.strength)}
        - Salto Vertical (CMJ / RSI): ${JSON.stringify(context.lastAssessments.cmj)}
        - Velocidade / Sprint: ${JSON.stringify(context.lastAssessments.speed)}
        - Capacidade Cardiorrespiratória (VO2): ${JSON.stringify(context.lastAssessments.vo2max)}

        REGRAS RIGOROSAS DA PERIODIZAÇÃO (IA CO-PILOT):
        1. Para cada item do cronograma acima, gere um objeto de treino com a 'date' correspondente exata (formato YYYY-MM-DD).
        2. Incorpore integralmente a DESCRIÇÃO DO TREINADOR nas escolhas metodológicas, séries, repetições e seleção de exercícios.
        3. Diferencie as fases: Inicie com Preparação Geral (base estrutural), evolua para Preparação Específica (potência e gesto esportivo de ${context.modality}) e finalize com Polimento / Tapering (alta prontidão).
        4. Em dias de ACADEMIA, foque em musculação, fortalecimento, RFD e força. Em dias de CAMPO/QUADRA, foque em velocidade, mudança de direção, agilidade e fundamentos do esporte.

        FORMATO DE SAÍDA:
        Retorne APENAS um array JSON de objetos de treino para as datas do cronograma fornecido.
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
        const formattedWorkouts = newWorkoutsData.map((w: any, idx: number) => {
          const matchedMeta = trainingDatesMeta.find(m => m.date === w.date) || trainingDatesMeta[idx] || { date: w.date || getLocalDateString(), dayName: "" };
          const workoutDate = (w.date && /^\d{4}-\d{2}-\d{2}$/.test(w.date)) ? w.date : matchedMeta.date;
          
          return {
            id: `wk-ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            date: workoutDate,
            name: w.name || `Treino Periodizado (${matchedMeta.dayName || 'Sessão'})`,
            phase: w.phase || 'Preparação Geral',
            status: 'planned' as const,
            exercises: (Array.isArray(w.exercises) ? w.exercises : []).map((ex: any, exIdx: number) => ({
              id: `ex-ai-${Date.now()}-${idx}-${exIdx}-${Math.random().toString(36).substring(2, 7)}`,
              name: ex.name,
              muscleGroup: ex.muscleGroup || 'Geral',
              sets: Number(ex.sets) || 3,
              reps: String(ex.reps || '10'),
              repsType: String(ex.reps).toLowerCase().includes("s") ? ("time" as const) : ("reps" as const),
              weight: String(ex.weight || 'Carga Moderada'),
              rest: '60-90s',
              notes: '',
              order_index: exIdx,
              performedSets: Array.from({ length: Number(ex.sets) || 3 }).map(() => ({
                id: `set-${Math.random().toString(36).substring(2, 7)}`,
                reps: 0,
                weight: 0,
                rpe: 0
              }))
            })),
            rpe: 0,
            totalLoad: 0,
            durationMinutes: 0
          };
        });

        const updated = athletes.map(a => {
          if (a.id === athlete.id) {
            const currentWorkouts = Array.isArray(a.workouts) ? a.workouts : [];
            // Merge and sort by date (Ascending for periodization flow)
            const merged = [...formattedWorkouts, ...currentWorkouts].sort((x, y) => 
               new Date(x.date).getTime() - new Date(y.date).getTime()
            );
            return {
              ...a,
              periodizationStart: startStr,
              periodizationEnd: endStr,
              trainingDays: targetDays,
              academyDays: effectiveAcademyDays,
              courtDays: effectiveCourtDays,
              workouts: merged
            };
          }
          return a;
        });

        setAthletes(updated);
        await save(updated, athlete.id);
        toast.success(`IA Co-Pilot: Periodização com ${formattedWorkouts.length} treinos gerada com sucesso!`, { id: toastId });
      } else {
        throw new Error("Formato de resposta inválido.");
      }
    } catch (e: any) {
      console.error("[IA Co-Pilot] Erro na periodização:", e);
      toast.error(`Falha no IA Co-Pilot: ${e.message || "Erro desconhecido"}`, { id: toastId });
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
