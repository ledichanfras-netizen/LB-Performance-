
import { sql } from '@vercel/postgres';

const groupById = (rows, key = 'athlete_id') => {
  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r[key]]) grouped[r[key]] = [];
    grouped[r[key]].push(r);
  });
  return grouped;
};

const asNum = (val) => (val === null || val === undefined ? null : Number(val));

export default async function handler(request, response) {
  try {
    const [
      athletesRes, wellnessRes, workoutsRes, exercisesRes, performedSetsRes,
      bioRes, strengthRes, cmjRes, vo2Res, speedRes, externalRes
    ] = await Promise.all([
      sql`SELECT * FROM athletes ORDER BY name ASC`,
      sql`SELECT * FROM wellness ORDER BY date DESC`,
      sql`SELECT * FROM workouts ORDER BY date DESC`,
      sql`SELECT * FROM prescribed_exercises`,
      sql`SELECT * FROM performed_sets`,
      sql`SELECT * FROM bioimpedance`,
      sql`SELECT * FROM isometric_strength`,
      sql`SELECT * FROM cmj`,
      sql`SELECT * FROM vo2max`,
      sql`SELECT * FROM speed`,
      sql`SELECT * FROM external_sessions`,
    ]);

    const setsByEx = groupById(performedSetsRes.rows, 'exercise_id');
    const exByWorkout = groupById(exercisesRes.rows, 'workout_id');
    const wellnessByAth = groupById(wellnessRes.rows);
    const workoutsByAth = groupById(workoutsRes.rows);
    const bioByAth = groupById(bioRes.rows);
    const strengthByAth = groupById(strengthRes.rows);
    const cmjByAth = groupById(cmjRes.rows);
    const vo2ByAth = groupById(vo2Res.rows);
    const speedByAth = groupById(speedRes.rows);
    const externalByAth = groupById(externalRes.rows);

    const athletes = athletesRes.rows.map(a => ({
      id: a.id,
      name: a.name,
      dob: a.dob,
      gender: a.gender || 'M',
      modality: a.modality,
      competitiveLevel: a.competitive_level,
      position: a.position,
      goal: a.goal,
      weeklyFrequency: a.weekly_frequency,
      isTournamentMode: a.is_tournament_mode,
      injuryHistory: a.injury_history,
      wellness: (wellnessByAth[a.id] || []).map(w => ({ 
        id: w.id, 
        date: w.date, 
        fatigue: w.fatigue, 
        sleep: w.sleep, 
        stress: w.stress, 
        soreness: w.soreness, 
        mood: w.mood, 
        cognitiveLoad: w.cognitive_load, 
        readinessScore: asNum(w.readiness_score),
        travelFatigue: w.travel_fatigue,
        sleepQuality: w.sleep_quality
      })),
      externalSessions: (externalByAth[a.id] || []).map(es => ({
        id: es.id,
        date: es.date,
        type: es.type,
        durationMinutes: es.duration_minutes,
        rpe: es.rpe,
        notes: es.notes,
        load: asNum(es.load)
      })),
      workouts: (workoutsByAth[a.id] || []).map(wk => ({
        id: wk.id, date: wk.date, name: wk.name, phase: wk.phase, status: wk.status, rpe: wk.rpe, totalLoad: asNum(wk.total_load), 
        durationMinutes: wk.duration_minutes, monotony: asNum(wk.monotony), strain: asNum(wk.strain), feedback: wk.feedback, trainerNotes: wk.trainer_notes,
        exercises: (exByWorkout[wk.id] || []).map(ex => ({ 
          id: ex.id, 
          name: ex.name, 
          muscleGroup: ex.muscle_group, 
          sets: ex.sets, 
          reps: ex.reps, 
          weight: ex.weight, 
          rest: ex.rest, 
          notes: ex.notes,
          painLevel: ex.pain_level,
          performedSets: (setsByEx[ex.id] || []).map(ps => ({ reps: ps.reps, weight: ps.weight, rpe: ps.rpe }))
        }))
      })),
      assessments: {
        bioimpedance: (bioByAth[a.id] || []).map(b => ({
          id: b.id, date: b.date, weight: asNum(b.weight), fatPercentage: asNum(b.fat_percentage), muscleMass: asNum(b.muscle_mass),
          visceralFat: asNum(b.visceral_fat), hydration: asNum(b.hydration), basalMetabolism: asNum(b.basal_metabolism), metabolicAge: asNum(b.metabolic_age),
          boneMass: asNum(b.bone_mass), physiqueRating: asNum(b.physique_rating), fatArmR: asNum(b.fat_arm_r), fatArmL: asNum(b.fat_arm_l),
          fatLegR: asNum(b.fat_leg_r), fatLegL: asNum(b.fat_leg_l), fatTrunk: asNum(b.fat_trunk), muscleArmR: asNum(b.muscle_arm_r),
          muscleArmL: asNum(b.muscle_arm_l), muscleLegR: asNum(b.muscle_leg_r), muscleLegL: asNum(b.muscle_leg_l), muscleTrunk: asNum(b.muscle_trunk),
          observations: b.observations
        })),
        isometricStrength: (strengthByAth[a.id] || []).map(s => ({
          id: s.id, date: s.date, halfSquatKgf: asNum(s.half_squat_kgf), quadricepsR: asNum(s.quadriceps_r), quadricepsL: asNum(s.quadriceps_l),
          hamstringsR: asNum(s.hamstrings_r), hamstringsL: asNum(s.hamstrings_l), rfdPeak: asNum(s.rfd_peak), observations: s.observations,
          iqRatioR: asNum(s.iq_ratio_r), iqRatioL: asNum(s.iq_ratio_l)
        })),
        generalStrength: [],
        cmj: (cmjByAth[a.id] || []).map(c => ({
          id: c.id, date: c.date, height: asNum(c.height), power: asNum(c.power), depth: asNum(c.depth), rsi: asNum(c.rsi), observations: c.observations,
          flightTime: asNum(c.flight_time), weight: asNum(c.weight)
        })),
        vo2max: (vo2ByAth[a.id] || []).map(v => ({
          id: v.id, date: v.date, vo2max: asNum(v.vo2max), maxHeartRate: asNum(v.max_heart_rate), thresholdHeartRate: asNum(v.threshold_heart_rate),
          maxVentilation: asNum(v.max_ventilation), thresholdVentilation: asNum(v.threshold_ventilation), maxLoad: asNum(v.max_load),
          thresholdLoad: asNum(v.threshold_load), vam: asNum(v.vam), rec10s: asNum(v.rec10s), rec30s: asNum(v.rec30s), rec60s: asNum(v.rec60s), score: asNum(v.score),
          observations: v.observations, maxSpeed: asNum(v.max_speed), thresholdSpeed: asNum(v.threshold_speed)
        })),
        speed: (speedByAth[a.id] || []).map(sp => ({
          id: sp.id, date: sp.date, time5m: asNum(sp.time_5m), time10m: asNum(sp.time_10m), time20m: asNum(sp.time_20m), time30m: asNum(sp.time_30m),
          speed5m: asNum(sp.speed_5m), speed10m: asNum(sp.speed_10m), speed20m: asNum(sp.speed_20m), speed30m: asNum(sp.speed_30m), observations: sp.observations
        }))
      }
    }));

    return response.status(200).json(athletes);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
