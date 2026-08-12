
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Athlete, Workout, WellnessEntry, AssessmentType, ExternalSession } from '../types';
import { getSafeDateTime, safeParseFloat, formatSleepHours } from '../utils';

const safeParse = (val: any, defaultVal: any = []) => {
  if (!val) return defaultVal;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      console.error("[SafeParse] JSON parse error:", val, e);
      return defaultVal;
    }
  }
  return val;
};

const parseBackupAthleteFields = (a: any) => {
  let injuryHistory = a.injury_history || '';
  let injuries = safeParse(a.injuries, []);
  let medicalExams = safeParse(a.medical_exams || a.medicalExams, []);
  let trainingDays = safeParse(a.training_days, [1, 3, 5]);
  let academyDays = safeParse(a.training_days, [1, 3, 5]); // default/fallback
  let courtDays = [2, 4]; // default/fallback
  let dropJumpBackup = [];
  let imtpBackup = [];
  let posturalBackup = [];
  let matches = [];
  let photoUrl = a.photo_url || a.photoUrl || undefined;

  if (a.injury_history && typeof a.injury_history === 'string' && a.injury_history.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(a.injury_history);
      if (parsed && typeof parsed === 'object') {
        if (parsed.hasOwnProperty('legacy') || parsed.hasOwnProperty('injuries')) {
          injuryHistory = parsed.legacy || '';
          if (!injuries || injuries.length === 0) {
            injuries = parsed.injuries || [];
          }
          if ((!a.training_days || a.training_days.length === 0) && parsed.trainingDays) {
            trainingDays = parsed.trainingDays || [1, 3, 5];
          }
        }
        if (parsed.hasOwnProperty('medicalExams') && Array.isArray(parsed.medicalExams)) {
          medicalExams = parsed.medicalExams;
        }
        if (parsed.hasOwnProperty('academyDays') && Array.isArray(parsed.academyDays)) {
          academyDays = parsed.academyDays;
        } else if (parsed.hasOwnProperty('trainingDays') && Array.isArray(parsed.trainingDays)) {
          academyDays = parsed.trainingDays;
        }
        if (parsed.hasOwnProperty('courtDays') && Array.isArray(parsed.courtDays)) {
          courtDays = parsed.courtDays;
        }
        if (parsed.hasOwnProperty('dropJumpBackup') && Array.isArray(parsed.dropJumpBackup)) {
          dropJumpBackup = parsed.dropJumpBackup;
        }
        if (parsed.hasOwnProperty('imtpBackup') && Array.isArray(parsed.imtpBackup)) {
          imtpBackup = parsed.imtpBackup;
        }
        if (parsed.hasOwnProperty('posturalBackup') && Array.isArray(parsed.posturalBackup)) {
          posturalBackup = parsed.posturalBackup;
        }
        if (parsed.hasOwnProperty('matches') && Array.isArray(parsed.matches)) {
          matches = parsed.matches;
        }
        if (parsed.photoUrl) {
          photoUrl = parsed.photoUrl;
        }
      }
    } catch (e) {
      console.error("[SafeParse] Error parsing backup in injury_history:", e);
    }
  }
  
  return { injuryHistory, injuries, medicalExams, trainingDays, academyDays, courtDays, dropJumpBackup, imtpBackup, posturalBackup, matches, photoUrl };
};

const serializeBackupAthleteFields = (athlete: any) => {
  const dropJump = athlete.assessments?.dropJump || athlete.dropJumpBackup || [];
  const imtp = athlete.assessments?.imtp || athlete.imtpBackup || [];
  const postural = athlete.assessments?.postural || athlete.posturalBackup || [];
  return JSON.stringify({
    legacy: athlete.injuryHistory || '',
    injuries: athlete.injuries || [],
    medicalExams: athlete.medicalExams || [],
    trainingDays: athlete.trainingDays || [1, 3, 5],
    academyDays: athlete.academyDays || [],
    courtDays: athlete.courtDays || [],
    dropJumpBackup: dropJump,
    imtpBackup: imtp,
    posturalBackup: postural,
    matches: athlete.matches || [],
    photoUrl: athlete.photoUrl || athlete.photo_url || ''
  });
};

const extractMissingColumnFromSupabaseError = (errorMessage: string): string | null => {
  if (!errorMessage) return null;

  // e.g. "Could not find the 'training_days' column of 'athletes' in the schema cache"
  const match1 = errorMessage.match(/Could not find the '([^']+)' column/i);
  if (match1 && match1[1]) return match1[1];

  // e.g. "column 'training_days' of relation 'athletes' does not exist"
  const match2 = errorMessage.match(/column ["']?([^"'\s]+)["']? (?:of relation [^\s]+ )?does not exist/i);
  if (match2 && match2[1]) return match2[1];

  // e.g. "column training_days does not exist"
  const match3 = errorMessage.match(/column ([^\s]+) does not exist/i);
  if (match3 && match3[1]) return match3[1];

  return null;
};

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('connection refused') ||
    msg.includes('load failed') ||
    msg.includes('abort') ||
    msg.includes('timeout')
  );
};

export const logError = (context: string, error: any) => {
  if (!isNetworkError(error)) {
    console.error(context, error?.message || error);
  }
};

export const supabaseService = {
  async loadAthletes(): Promise<Athlete[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      // 1. Fetch core athletes information with wellness, external_sessions and workouts/exercises/sets
      const primaryQuery = await supabase
        .from('athletes')
        .select(`
          *,
          wellness (*),
          external_sessions (*),
          workouts (
            *,
            prescribed_exercises (
              *,
              performed_sets (*)
            )
          )
        `)
        .order('name', { ascending: true });

      if (primaryQuery.error) {
        logError('Supabase Load Error:', primaryQuery.error);
        throw primaryQuery.error;
      }

      const athletes = primaryQuery.data || [];

      // Helper function to query other tables individually to avoid potential PostgREST schema cache relation issues.
      // If a table is missing, the query is caught gracefully and doesn't interrupt loading the rest of the application.
      const fetchTableSafely = async (tableName: string): Promise<any[]> => {
        try {
          const { data, error } = await supabase.from(tableName).select('*');
          if (error) {
            console.warn(`[Supabase Load] Alerta ao carregar tabela '${tableName}':`, error.message);
            return [];
          }
          return data || [];
        } catch (err: any) {
          console.warn(`[Supabase Load] Exceção ao carregar tabela '${tableName}':`, err.message);
          return [];
        }
      };

      // 2. Query assessments in parallel
      const [
        bioimpedanceData,
        isometricStrengthData,
        cmjData,
        dropJumpData,
        vo2maxData,
        speedData,
        imtpData
      ] = await Promise.all([
        fetchTableSafely('bioimpedance'),
        fetchTableSafely('isometric_strength'),
        fetchTableSafely('cmj'),
        fetchTableSafely('drop_jump'),
        fetchTableSafely('vo2max'),
        fetchTableSafely('speed'),
        fetchTableSafely('imtp')
      ]);

      // 3. Create index maps for O(1) matching of assessments by athlete ID
      const bioMap = new Map<string, any[]>();
      bioimpedanceData.forEach(item => {
        if (item.athlete_id) {
          const arr = bioMap.get(item.athlete_id) || [];
          arr.push(item);
          bioMap.set(item.athlete_id, arr);
        }
      });

      const strengthMap = new Map<string, any[]>();
      isometricStrengthData.forEach(item => {
        if (item.athlete_id) {
          const arr = strengthMap.get(item.athlete_id) || [];
          arr.push(item);
          strengthMap.set(item.athlete_id, arr);
        }
      });

      const cmjMap = new Map<string, any[]>();
      cmjData.forEach(item => {
        if (item.athlete_id) {
          const arr = cmjMap.get(item.athlete_id) || [];
          arr.push(item);
          cmjMap.set(item.athlete_id, arr);
        }
      });

      const dropJumpMap = new Map<string, any[]>();
      dropJumpData.forEach(item => {
        if (item.athlete_id) {
          const arr = dropJumpMap.get(item.athlete_id) || [];
          arr.push(item);
          dropJumpMap.set(item.athlete_id, arr);
        }
      });

      const vo2maxMap = new Map<string, any[]>();
      vo2maxData.forEach(item => {
        if (item.athlete_id) {
          const arr = vo2maxMap.get(item.athlete_id) || [];
          arr.push(item);
          vo2maxMap.set(item.athlete_id, arr);
        }
      });

      const speedMap = new Map<string, any[]>();
      speedData.forEach(item => {
        if (item.athlete_id) {
          const arr = speedMap.get(item.athlete_id) || [];
          arr.push(item);
          speedMap.set(item.athlete_id, arr);
        }
      });

      const imtpMap = new Map<string, any[]>();
      imtpData.forEach(item => {
        if (item.athlete_id) {
          const arr = imtpMap.get(item.athlete_id) || [];
          arr.push(item);
          imtpMap.set(item.athlete_id, arr);
        }
      });

      // 4. Map the core and relational data back to the Athlete object structure
      return athletes.map((a: any) => {
        const parsedFields = parseBackupAthleteFields(a);
        
        // Retrieve separate tables safely
        const athleteBio = bioMap.get(a.id) || [];
        const athleteIsometric = strengthMap.get(a.id) || [];
        const athleteCmj = cmjMap.get(a.id) || [];
        const athleteDropJump = dropJumpMap.get(a.id) || [];
        const athleteVo2 = vo2maxMap.get(a.id) || [];
        const athleteSpeed = speedMap.get(a.id) || [];
        const athleteImtp = imtpMap.get(a.id) || [];

        return {
          id: a.id,
          name: a.name,
          photoUrl: a.photo_url || a.photoUrl || parsedFields.photoUrl || undefined,
          dob: a.dob,
          gender: a.gender || 'M',
          modality: a.modality,
          competitiveLevel: a.competitive_level,
          position: a.position,
          goal: a.goal,
          weeklyFrequency: a.weekly_frequency,
          injuryHistory: parsedFields.injuryHistory,
          isTournamentMode: a.is_tournament_mode,
          periodizationStart: a.periodization_start,
          periodizationEnd: a.periodization_end,
          trainingDays: parsedFields.trainingDays,
          academyDays: parsedFields.academyDays,
          courtDays: parsedFields.courtDays,
          injuries: parsedFields.injuries,
          medicalExams: parsedFields.medicalExams || [],
          matches: parsedFields.matches || [],
          wellness: (a.wellness || []).map((w: any) => {
            const exactSleep = w.calculated_sleep_hours !== undefined && w.calculated_sleep_hours !== null 
              ? Number(w.calculated_sleep_hours) 
              : safeParseFloat(w.sleep);
            return {
              ...w,
              sleep: exactSleep,
              cognitiveLoad: w.cognitive_load !== undefined ? w.cognitive_load : w.cognitiveLoad,
              readinessScore: w.readiness_score !== undefined ? w.readiness_score : w.readinessScore,
              travelFatigue: w.travel_fatigue !== undefined ? w.travel_fatigue : w.travelFatigue,
              sleepQuality: w.sleep_quality !== undefined ? w.sleep_quality : w.sleepQuality,
              sleepHoursFormatted: w.sleep_hours_formatted || (exactSleep ? formatSleepHours(exactSleep) : undefined),
              sleepStartTime: w.sleep_start_time || w.sleepStartTime,
              wakeUpTime: w.wake_up_time || w.wakeUpTime,
              calculatedSleepHours: exactSleep,
              isMatchDay: w.is_match_day !== undefined ? w.is_match_day : w.isMatchDay,
              emotionalReadiness: w.emotional_readiness !== undefined ? w.emotional_readiness : w.emotionalReadiness,
              psychologicalReadiness: w.psychological_readiness !== undefined ? w.psychological_readiness : w.psychologicalReadiness,
              psychologyNotes: w.psychology_notes || w.psychologyNotes,
            };
          }).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
          externalSessions: (a.external_sessions || []).map((es: any) => ({
            ...es,
            durationMinutes: es.duration_minutes
          })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
          workouts: (a.workouts || []).map((wk: any) => ({
            ...wk,
            durationMinutes: wk.duration_minutes,
            totalLoad: wk.total_load,
            trainerNotes: wk.trainer_notes,
            exercises: (wk.prescribed_exercises || []).map((ex: any) => ({ 
              ...ex, 
              muscleGroup: ex.muscle_group,
              painLevel: ex.pain_level,
              repsType: ex.reps_type || 'reps',
              videoUrl: ex.video_url || '',
              imageUrl: ex.image_url || '',
              performedSets: (ex.performed_sets || [])
            })).sort((x: any, y: any) => (x.order_index || 0) - (y.order_index || 0))
          })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
          assessments: {
            bioimpedance: athleteBio.map((b: any) => ({
                ...b, 
                fatPercentage: b.fat_percentage,
                muscleMass: b.muscle_mass,
                visceralFat: b.visceral_fat,
                hydration: b.hydration,
                basalMetabolism: b.basal_metabolism,
                metabolicAge: b.metabolic_age,
                boneMass: b.bone_mass,
                physiqueRating: b.physique_rating,
                fatArmR: b.fat_arm_r,
                fatArmL: b.fat_arm_l,
                fatLegR: b.fat_leg_r,
                fatLegL: b.fat_leg_l,
                fatTrunk: b.fat_trunk,
                muscleArmR: b.muscle_arm_r,
                muscleArmL: b.muscle_arm_l,
                muscleLegR: b.muscle_leg_r,
                muscleLegL: b.muscle_leg_l,
                muscleTrunk: b.muscle_trunk,
                observations: b.observations
            })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
            isometricStrength: athleteIsometric.map((s: any) => ({
                ...s, 
                iqRatioR: s.iq_ratio_r, 
                iqRatioL: s.iq_ratio_l, 
                quadricepsR: s.quadriceps_r, 
                quadricepsL: s.quadriceps_l, 
                hamstringsR: s.hamstrings_r, 
                hamstringsL: s.hamstrings_l,
                halfSquatKgf: s.half_squat_kgf,
                observations: s.observations
            })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
            cmj: athleteCmj.map((c: any) => ({
                ...c, 
                flightTime: c.flight_time,
                rsi: c.rsi,
                weight: c.weight,
                averageForce: c.average_force,
                observations: c.observations
            })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
            dropJump: (() => {
              const dbDj = athleteDropJump.map((dj: any) => ({
                ...dj,
                id: dj.id,
                date: dj.date,
                weight: dj.weight ?? 0,
                dropHeight: dj.drop_height !== undefined ? dj.drop_height : dj.dropHeight,
                jumpHeight: dj.jump_height !== undefined ? dj.jump_height : dj.jumpHeight,
                flightTime: dj.flight_time !== undefined ? dj.flight_time : dj.flightTime,
                contactTime: dj.contact_time !== undefined ? dj.contact_time : dj.contactTime,
                meanForce: dj.mean_force !== undefined ? dj.mean_force : dj.meanForce,
                meanPower: dj.mean_power !== undefined ? dj.mean_power : dj.meanPower,
                stiffness: dj.stiffness !== undefined ? dj.stiffness : dj.stiffness,
                rsi: dj.rsi,
                observations: dj.observations
              }));
              const bkDj = parsedFields.dropJumpBackup || [];
              const mergedMap = new Map();
              for (const item of bkDj) {
                if (item && item.id) mergedMap.set(item.id, item);
              }
              for (const item of dbDj) {
                if (item && item.id) mergedMap.set(item.id, item);
              }
              return Array.from(mergedMap.values()).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
            })(),
            vo2max: athleteVo2.map((v: any) => ({
                ...v, 
                maxSpeed: v.max_speed,
                maxHeartRate: v.max_heart_rate,
                thresholdHeartRate: v.threshold_heart_rate,
                thresholdSpeed: v.threshold_speed,
                vam: v.vam,
                rec10s: v.rec_10s,
                rec30s: v.rec_30s,
                rec60s: v.rec_60s,
                maxVentilation: v.max_ventilation,
                score: v.score,
                observations: v.observations
            })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
            speed: athleteSpeed.map((sp: any) => ({
                ...sp,
                time5m: sp.time_5m,
                time10m: sp.time_10m,
                time20m: sp.time_20m,
                time30m: sp.time_30m,
                speed5m: sp.speed_5m,
                speed10m: sp.speed_10m,
                speed20m: sp.speed_20m,
                speed30m: sp.speed_30m,
                observations: sp.observations
            })).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date)),
            imtp: (() => {
              const dbIm = athleteImtp.map((im: any) => ({
                ...im,
                id: im.id,
                date: im.date,
                weight: im.weight,
                peakForce: im.peak_force,
                relativePeakForce: im.relative_peak_force,
                timeToPeakForce: im.time_to_peak_force,
                meanForce: im.mean_force,
                rfdPeak: im.rfd_peak,
                rfd100: im.rfd_100,
                rfd200: im.rfd_200,
                rfd300: im.rfd_300,
                impulsePeak: im.impulse_peak,
                impulse100: im.impulse_100,
                impulse200: im.impulse_200,
                impulse300: im.impulse_300,
                aiDetails: im.ai_details ? (typeof im.ai_details === 'string' ? JSON.parse(im.ai_details) : im.ai_details) : undefined,
                observations: im.observations
              }));
              const bkIm = parsedFields.imtpBackup || [];
              const mergedMap = new Map();
              for (const item of bkIm) {
                if (item && item.id) mergedMap.set(item.id, item);
              }
              for (const item of dbIm) {
                if (item && item.id) mergedMap.set(item.id, item);
              }
              return Array.from(mergedMap.values()).sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
            })(),
            postural: (() => {
              const bkPostural = parsedFields.posturalBackup || [];
              return [...bkPostural].sort((x: any, y: any) => getSafeDateTime(y.date) - getSafeDateTime(x.date));
            })()
          }
        };
      });
    } catch (e: any) {
      logError('Supabase load crash:', e);
      throw e;
    }
  },

  async saveAthlete(athlete: Athlete): Promise<void> {
    console.log(`[Supabase] Iniciando salvamento do atleta: ${athlete.name} (${athlete.id})`);
    
    const wellness = Array.isArray(athlete.wellness) ? athlete.wellness : [];
    const externalSessions = Array.isArray(athlete.externalSessions) ? athlete.externalSessions : [];
    const workouts = Array.isArray(athlete.workouts) ? athlete.workouts : [];
    const assessments = athlete.assessments || {};

    const payload: any = {
      id: athlete.id,
      name: athlete.name,
      photo_url: athlete.photoUrl || (athlete as any).photo_url || null,
      dob: athlete.dob,
      gender: athlete.gender || 'M',
      modality: athlete.modality,
      competitive_level: athlete.competitiveLevel,
      position: athlete.position,
      injury_history: serializeBackupAthleteFields(athlete),
      goal: athlete.goal,
      weekly_frequency: athlete.weeklyFrequency || (athlete as any).weekly_frequency || (athlete.trainingDays?.length || 3),
      is_tournament_mode: athlete.isTournamentMode,
      periodization_start: athlete.periodizationStart,
      periodization_end: athlete.periodizationEnd,
      training_days: athlete.trainingDays || [],
      injuries: athlete.injuries || [],
      updated_at: new Date().toISOString()
    };

    let attempts = 0;
    let athleteError: any = null;

    while (attempts < 10) {
      attempts++;
      const res = await supabase
        .from('athletes')
        .upsert(payload);
      athleteError = res.error;

      if (!athleteError) {
        break;
      }

      const errMsg = athleteError.message || '';
      console.warn(`[Supabase] Tentativa ${attempts} de salvar atleta '${athlete.name}' falhou: ${errMsg}`);

      const missingCol = extractMissingColumnFromSupabaseError(errMsg);
      let removedAny = false;

      if (missingCol && (missingCol in payload)) {
        console.warn(`[Supabase] Removendo coluna inexistente '${missingCol}' do payload do atleta e retentando...`);
        delete payload[missingCol];
        removedAny = true;
      } else {
        const optionalCols = [
          'training_days',
          'photo_url',
          'is_tournament_mode',
          'periodization_start',
          'periodization_end',
          'weekly_frequency',
          'injury_history',
          'competitive_level',
          'position',
          'goal'
        ];
        for (const col of optionalCols) {
          if ((col in payload) && errMsg.toLowerCase().includes(col.toLowerCase())) {
            console.warn(`[Supabase] Removendo coluna com erro '${col}' do payload do atleta e retentando...`);
            delete payload[col];
            removedAny = true;
            break;
          }
        }
      }

      if (!removedAny) {
        break;
      }
    }

    if (athleteError) {
      logError('[Supabase] Erro ao salvar atleta base:', athleteError);
      throw athleteError;
    }

    // Wellness
    if (athlete.wellness) {
      console.log(`[Supabase] Sincronizando wellness...`);
      const incomingWlIds = (athlete.wellness || []).map(w => w.id).filter(id => id);
      if (incomingWlIds.length > 0) {
        await supabase.from('wellness').delete().eq('athlete_id', athlete.id).not('id', 'in', `(${incomingWlIds.join(',')})`);
      } else {
        await supabase.from('wellness').delete().eq('athlete_id', athlete.id);
      }
      
      if (athlete.wellness.length > 0) {
        const { error: wError } = await supabase.from('wellness').upsert(athlete.wellness.map(w => ({
          id: w.id,
          athlete_id: athlete.id,
          date: w.date,
          fatigue: Number(w.fatigue || 0),
          sleep: Math.round(safeParseFloat(w.sleep) || 0),
          stress: Number(w.stress || 0),
          soreness: Number(w.soreness || 0),
          mood: Number(w.mood || 0),
          cognitive_load: w.cognitiveLoad !== undefined ? Number(w.cognitiveLoad) : (w as any).cognitive_load !== undefined ? Number((w as any).cognitive_load) : 0,
          readiness_score: w.readinessScore !== undefined ? Number(w.readinessScore) : (w as any).readiness_score !== undefined ? Number((w as any).readiness_score) : 0,
          travel_fatigue: w.travelFatigue !== undefined ? Number(w.travelFatigue) : (w as any).travel_fatigue !== undefined ? Number((w as any).travel_fatigue) : 0,
          sleep_quality: w.sleepQuality !== undefined ? Number(w.sleepQuality) : (w as any).sleep_quality !== undefined ? Number((w as any).sleep_quality) : 8,
        })));
        if (wError) {
          logError('[Supabase] Erro ao salvar wellness:', wError);
          throw wError;
        }
      }
    }

    // External Sessions
    if (athlete.externalSessions) {
      console.log(`[Supabase] Sincronizando sessões externas...`);
      const incomingSessIds = (athlete.externalSessions || []).map(es => es.id).filter(id => id);
      if (incomingSessIds.length > 0) {
        await supabase.from('external_sessions').delete().eq('athlete_id', athlete.id).not('id', 'in', `(${incomingSessIds.join(',')})`);
      } else {
        await supabase.from('external_sessions').delete().eq('athlete_id', athlete.id);
      }

      if (athlete.externalSessions.length > 0) {
        const { error: esError } = await supabase.from('external_sessions').upsert(athlete.externalSessions.map(es => ({
          id: es.id || `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          athlete_id: athlete.id,
          date: es.date,
          type: es.type || 'tecnico',
          duration_minutes: es.durationMinutes ?? (es as any).duration_minutes ?? 0,
          rpe: es.rpe ?? 0,
          notes: es.notes || '',
          load: es.load ?? ((es.durationMinutes || 0) * (es.rpe || 0))
        })));
        if (esError) {
          logError('[Supabase] Erro ao salvar sessões externas:', esError);
          throw esError;
        }
      }
    }

    // Workouts
    console.log(`[Supabase] Sincronizando treinos...`);
    const incomingWkIds = workouts.map(wk => wk.id).filter(id => id);
    const { data: existingWks } = await supabase.from('workouts').select('id').eq('athlete_id', athlete.id);
    const toDeleteWkIds = (existingWks || []).filter(w => !incomingWkIds.includes(w.id)).map(w => w.id);
    
    if (toDeleteWkIds.length > 0) {
      for (const idToDelete of toDeleteWkIds) {
        await this.deleteWorkout(idToDelete);
      }
    }

    if (workouts.length > 0) {
      for (const wk of workouts) {
        if (!wk.id) wk.id = `wk-${Date.now()}-${Math.random()}`;
        const { error: wkError } = await supabase.from('workouts').upsert({
          id: wk.id,
          athlete_id: athlete.id,
          date: wk.date,
          name: wk.name,
          phase: wk.phase,
          status: wk.status,
          rpe: wk.rpe,
          total_load: wk.totalLoad,
          duration_minutes: wk.durationMinutes,
          monotony: wk.monotony,
          strain: wk.strain,
          feedback: wk.feedback,
          trainer_notes: wk.trainerNotes,
          updated_at: new Date().toISOString()
        });
        if (wkError) {
          logError('[Supabase] Erro ao salvar treino:', wkError);
          throw wkError;
        }

        if (Array.isArray(wk.exercises)) {
          // Sync exercises: Delete exercises that are no longer in the list
          const { data: existingEx } = await supabase.from('prescribed_exercises').select('id').eq('workout_id', wk.id);
          const currentExIds = wk.exercises.map(e => e.id);
          const toDelete = (existingEx || []).filter(e => !currentExIds.includes(e.id)).map(e => e.id);
          
          if (toDelete.length > 0) {
            for (const idToDelete of toDelete) {
              await supabase.from('performed_sets').delete().eq('exercise_id', idToDelete);
              await supabase.from('prescribed_exercises').delete().eq('id', idToDelete);
            }
          }

          const exercisesList = wk.exercises || [];
          for (let idx = 0; idx < exercisesList.length; idx++) {
            const ex = exercisesList[idx];
            if (!ex.id) ex.id = `ex-${Date.now()}-${Math.random()}`;
            const { error: exError } = await supabase.from('prescribed_exercises').upsert({
              id: ex.id,
              workout_id: wk.id,
              name: ex.name,
              muscle_group: ex.muscleGroup,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              rest: ex.rest,
              notes: ex.notes,
              pain_level: ex.painLevel,
              reps_type: ex.repsType || 'reps',
              order_index: idx,
              video_url: ex.videoUrl ?? null,
              image_url: ex.imageUrl ?? null
            });
            if (exError) {
              logError('[Supabase] Erro ao salvar exercício:', exError);
              throw exError;
            }

            if (Array.isArray(ex.performedSets)) {
              const { data: existingSets } = await supabase.from('performed_sets').select('id').eq('exercise_id', ex.id);
              const currentSetIds = ex.performedSets.map(s => s.id).filter(id => id);
              const setsToDelete = (existingSets || []).filter(s => !currentSetIds.includes(s.id)).map(s => s.id);
              if (setsToDelete.length > 0) {
                await supabase.from('performed_sets').delete().in('id', setsToDelete);
              }
              if (ex.performedSets.length > 0) {
                const { error: setsError } = await supabase.from('performed_sets').upsert(ex.performedSets.map((s: any) => {
                  if (!s.id) s.id = `s-${Date.now()}-${Math.random()}`;
                  return {
                    id: s.id,
                    exercise_id: ex.id,
                    reps: s.reps,
                    weight: s.weight,
                    rpe: s.rpe,
                    is_completed: s.isCompleted ?? false
                  };
                }));
                if (setsError) {
                  logError('[Supabase] Erro ao salvar conjuntos de exercícios:', setsError);
                  throw setsError;
                }
              }
            }
          }
        }
      }
    }

    // Assessments
    if (athlete.assessments) {
      const { bioimpedance, isometricStrength, cmj, dropJump, vo2max, speed, imtp } = athlete.assessments;
      const assessmentTables = [
        { table: 'bioimpedance', items: bioimpedance, type: 'bioimpedance' as AssessmentType },
        { table: 'isometric_strength', items: isometricStrength, type: 'isometricStrength' as AssessmentType },
        { table: 'cmj', items: cmj, type: 'cmj' as AssessmentType },
        { table: 'drop_jump', items: dropJump, type: 'dropJump' as AssessmentType },
        { table: 'vo2max', items: vo2max, type: 'vo2max' as AssessmentType },
        { table: 'speed', items: speed, type: 'speed' as AssessmentType },
        { table: 'imtp', items: imtp, type: 'imtp' as AssessmentType }
      ];

      for (const { table, items } of assessmentTables) {
        if (items) {
          const incomingIds = (items || []).map((i: any) => i.id).filter(id => id);
          try {
            if (incomingIds.length > 0) {
               await supabase.from(table).delete().eq('athlete_id', athlete.id).not('id', 'in', `(${incomingIds.join(',')})`);
            } else {
               await supabase.from(table).delete().eq('athlete_id', athlete.id);
            }
          } catch (err: any) {
            console.warn(`⚠️ Erro ao deletar registros da tabela "${table}". Pode ser que a tabela não esteja criada no Supabase ainda.`, err);
          }
        }
      }

      const assessmentPromises: Promise<any>[] = [];

      if (bioimpedance && bioimpedance.length > 0) {
        assessmentPromises.push((async () => {
          const { error } = await supabase.from('bioimpedance').upsert(bioimpedance.map(b => ({
            id: b.id || `bio-${Date.now()}-${Math.random()}`,
            athlete_id: athlete.id,
            date: b.date,
            weight: b.weight ?? 0,
            fat_percentage: b.fatPercentage ?? 0,
            muscle_mass: b.muscleMass ?? 0,
            visceral_fat: b.visceralFat ?? 0,
            hydration: b.hydration ?? 0,
            basal_metabolism: b.basalMetabolism ?? 0,
            metabolic_age: b.metabolicAge ?? 0,
            bone_mass: b.boneMass ?? 0,
            physique_rating: b.physiqueRating ?? 0,
            fat_arm_r: b.fatArmR ?? 0,
            fat_arm_l: b.fatArmL ?? 0,
            fat_leg_r: b.fatLegR ?? 0,
            fat_leg_l: b.fatLegL ?? 0,
            fat_trunk: b.fatTrunk ?? 0,
            muscle_arm_r: b.muscleArmR ?? 0,
            muscle_arm_l: b.muscleArmL ?? 0,
            muscle_leg_r: b.muscleLegR ?? 0,
            muscle_leg_l: b.muscleLegL ?? 0,
            muscle_trunk: b.muscleTrunk ?? 0,
            observations: b.observations || ''
          })));
          if (error) throw error;
        })());
      }

      if (isometricStrength && isometricStrength.length > 0) {
        assessmentPromises.push((async () => {
          const { error } = await supabase.from('isometric_strength').upsert(isometricStrength.map(s => ({
            id: s.id || `str-${Date.now()}-${Math.random()}`,
            athlete_id: athlete.id,
            date: s.date,
            half_squat_kgf: s.halfSquatKgf ?? 0,
            quadriceps_r: s.quadricepsR ?? 0,
            quadriceps_l: s.quadricepsL ?? 0,
            hamstrings_r: s.hamstringsR ?? 0,
            hamstrings_l: s.hamstringsL ?? 0,
            iq_ratio_r: s.iqRatioR ?? 0,
            iq_ratio_l: s.iqRatioL ?? 0,
            observations: s.observations || ''
          })));
          if (error) throw error;
        })());
      }

      if (cmj && cmj.length > 0) {
        assessmentPromises.push((async () => {
          const payload = cmj.map(c => ({
            id: c.id || `cmj-${Date.now()}-${Math.random()}`,
            athlete_id: athlete.id,
            date: c.date,
            height: c.height ?? 0,
            power: c.power ?? 0,
            depth: c.depth ?? 0,
            rsi: c.rsi ?? 0,
            flight_time: c.flightTime ?? 0,
            weight: c.weight ?? 0,
            average_force: c.averageForce ?? 0,
            observations: c.observations || ''
          }));
          const { error } = await supabase.from('cmj').upsert(payload);
          if (error) {
            console.warn("Failing to upsert with average_force column, retrying without it:", error.message);
            const fallbackPayload = payload.map(({ average_force, ...rest }) => rest);
            const { error: fallbackError } = await supabase.from('cmj').upsert(fallbackPayload);
            if (fallbackError) throw fallbackError;
          }
        })());
      }

      if (dropJump && dropJump.length > 0) {
        assessmentPromises.push((async () => {
          try {
            const { error } = await supabase.from('drop_jump').upsert(dropJump.map(dj => ({
              id: dj.id || `dj-${Date.now()}-${Math.random()}`,
              athlete_id: athlete.id,
              date: dj.date,
              weight: dj.weight ?? 0,
              drop_height: dj.dropHeight ?? 30,
              jump_height: dj.jumpHeight ?? 0,
              flight_time: dj.flightTime ?? 0,
              contact_time: dj.contactTime ?? 0,
              mean_force: dj.meanForce ?? 0,
              mean_power: dj.meanPower ?? 0,
              stiffness: dj.stiffness ?? 0,
              rsi: dj.rsi ?? 0,
              observations: dj.observations || ''
            })));
            if (error) throw error;
          } catch (err: any) {
            console.warn(`⚠️ Erro ao persistir dados na tabela "drop_jump" no Supabase. O suporte a Drop Jump requer a execução da migração SQL no seu banco.`, err);
          }
        })());
      }

      if (vo2max && vo2max.length > 0) {
        assessmentPromises.push((async () => {
          const { error } = await supabase.from('vo2max').upsert(vo2max.map(v => ({
            id: v.id || `vo2-${Date.now()}-${Math.random()}`,
            athlete_id: athlete.id,
            date: v.date,
            vo2max: v.vo2max ?? 0,
            max_heart_rate: v.maxHeartRate ?? 0,
            threshold_heart_rate: v.thresholdHeartRate ?? 0,
            max_speed: v.maxSpeed ?? 0,
            threshold_speed: v.thresholdSpeed ?? 0,
            vam: v.vam ?? 0,
            rec_10s: v.rec10s ?? 0,
            rec_30s: v.rec30s ?? 0,
            rec_60s: v.rec60s ?? 0,
            max_ventilation: v.maxVentilation ?? 0,
            score: v.score ?? 0,
            observations: v.observations || ''
          })));
          if (error) throw error;
        })());
      }

      if (speed && speed.length > 0) {
        assessmentPromises.push((async () => {
          const { error } = await supabase.from('speed').upsert(speed.map(sp => ({
            id: sp.id || `spd-${Date.now()}-${Math.random()}`,
            athlete_id: athlete.id,
            date: sp.date,
            time_5m: sp.time5m ?? 0,
            time_10m: sp.time10m ?? 0,
            time_20m: sp.time20m ?? 0,
            time_30m: sp.time30m ?? 0,
            speed_5m: sp.speed5m ?? 0,
            speed_10m: sp.speed10m ?? 0,
            speed_20m: sp.speed20m ?? 0,
            speed_30m: sp.speed30m ?? 0,
            observations: sp.observations || ''
          })));
          if (error) throw error;
        })());
      }

      if (imtp && imtp.length > 0) {
        assessmentPromises.push((async () => {
          try {
            const { error } = await supabase.from('imtp').upsert(imtp.map(im => ({
              id: im.id || `im-${Date.now()}-${Math.random()}`,
              athlete_id: athlete.id,
              date: im.date,
              weight: im.weight,
              peak_force: im.peakForce ?? 0,
              relative_peak_force: im.relativePeakForce ?? 0,
              time_to_peak_force: im.timeToPeakForce ?? 0,
              mean_force: im.meanForce ?? 0,
              rfd_peak: im.rfdPeak ?? 0,
              rfd_100: im.rfd100 ?? 0,
              rfd_200: im.rfd200 ?? 0,
              rfd_300: im.rfd300 ?? 0,
              impulse_peak: im.impulsePeak ?? 0,
              impulse_100: im.impulse100 ?? 0,
              impulse_200: im.impulse200 ?? 0,
              impulse_300: im.impulse300 ?? 0,
              ai_details: im.aiDetails ? JSON.stringify(im.aiDetails) : null,
              observations: im.observations || ''
            })));
            if (error) throw error;
          } catch (err: any) {
            console.warn(`⚠️ Erro ao persistir dados na tabela "imtp" no Supabase. O suporte a IMTP requer a execução da migração SQL no seu banco.`, err);
          }
        })());
      }

      try {
        await Promise.all(assessmentPromises);
      } catch (globalAsmError: any) {
        logError('[Supabase] Erro crítico na seção de avaliações:', globalAsmError);
      }
    }
    
    console.log(`[Supabase] Atleta ${athlete.name} salvo com sucesso.`);
  },

  async saveAthletes(athletes: Athlete[]): Promise<void> {
    // This is a complex operation because of the relational structure.
    // In a real Supabase app, we would use granular updates.
    // For now, we'll implement a basic sync logic or just use the Express API if it's easier.
    // But since the user wants to "integrate Supabase", let's try to do it right.
    
    for (const athlete of athletes) {
      await this.saveAthlete(athlete);
    }
  },

  async deleteAthlete(id: string): Promise<void> {
    try {
      // Manual deep delete with individual try-catch blocks to prevent missing tables from blocking athlete deletion
      const safeDelete = async (table: string) => {
        try {
          await supabase.from(table).delete().eq('athlete_id', id);
        } catch (e) {
          console.warn(`[Supabase] Safe delete failed/skipped for table ${table}:`, e);
        }
      };

      await safeDelete('wellness');
      await safeDelete('external_sessions');
      await safeDelete('bioimpedance');
      await safeDelete('isometric_strength');
      await safeDelete('cmj');
      await safeDelete('drop_jump');
      await safeDelete('vo2max');
      await safeDelete('speed');
      
      const { data: workouts } = await supabase.from('workouts').select('id').eq('athlete_id', id);
      if (workouts && workouts.length > 0) {
        for (const wk of workouts) {
          try {
            await this.deleteWorkout(wk.id);
          } catch (wkErr) {
            console.warn('[Supabase] Failed to delete workout during athlete delete:', wkErr);
          }
        }
      }

      await supabase.from('athletes').delete().eq('id', id);
    } catch (e) { logError('Supabase Delete Athlete Error:', e); }
  },

  async deleteWorkout(id: string): Promise<void> {
    try {
      const { data: exercises } = await supabase.from('prescribed_exercises').select('id').eq('workout_id', id);
      if (exercises && exercises.length > 0) {
        for (const ex of exercises) {
          await supabase.from('performed_sets').delete().eq('exercise_id', ex.id);
        }
        await supabase.from('prescribed_exercises').delete().eq('workout_id', id);
      }
      await supabase.from('workouts').delete().eq('id', id);
    } catch (e) { logError('Supabase Delete Workout Error:', e); }
  },

  async deleteWellness(id: string): Promise<void> {
    try {
      await supabase.from('wellness').delete().eq('id', id);
    } catch (e) { logError('Supabase Delete Wellness Error:', e); }
  },

  async deleteExternalSession(id: string): Promise<void> {
    try {
      await supabase.from('external_sessions').delete().eq('id', id);
    } catch (e) { logError('Supabase Delete Session Error:', e); }
  },

  async deleteAssessment(type: AssessmentType, id: string): Promise<void> {
    try {
      const tableMap: Record<string, string> = {
        'bioimpedance': 'bioimpedance',
        'isometricStrength': 'isometric_strength',
        'cmj': 'cmj',
        'dropJump': 'drop_jump',
        'vo2max': 'vo2max',
        'speed': 'speed'
      };
      const tableName = tableMap[type];
      if (tableName) {
        await supabase.from(tableName).delete().eq('id', id);
      }
    } catch (e) { logError('Supabase Delete Assessment Error:', e); }
  }
};
