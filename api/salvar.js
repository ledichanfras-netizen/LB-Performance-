
import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ message: 'Apenas POST' });

  const athletes = request.body;
  const client = await db.connect();

  // Helper function to prevent any undefined values from crashing the PostgreSQL parameters array
  const cleanParam = (val) => (val === undefined ? null : val);

  try {
    await client.query('BEGIN');
    
    // Add columns dynamically to existing legacy table, if they are missing
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS travel_fatigue INTEGER;');
    await client.query('ALTER TABLE wellness ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;');
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS gender VARCHAR(10);');
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS modality VARCHAR(255);');
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS competitive_level VARCHAR(255);');
    await client.query('ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_competitive_level_check;').catch(() => {});
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS position VARCHAR(255);');
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS goal VARCHAR(255);');
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER;');
    await client.query('ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_tournament_mode BOOLEAN;');

    const athleteIds = (athletes || []).map(a => a.id).filter(Boolean);
    if (athleteIds.length > 0) {
      // Deleta os registros dependentes APENAS para os atletas que estão sendo salvos
      await client.query('DELETE FROM wellness WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM bioimpedance WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM isometric_strength WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM cmj WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM vo2max WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM speed WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM external_sessions WHERE athlete_id = ANY($1)', [athleteIds]);
      await client.query('DELETE FROM workouts WHERE athlete_id = ANY($1)', [athleteIds]);
    }
    // Cascade cuidará de prescribed_exercises e performed_sets

    for (const athlete of athletes) {
      await client.query(
        'INSERT INTO athletes (id, name, dob, injury_history, gender, modality, competitive_level, position, goal, weekly_frequency, is_tournament_mode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET name = $2, dob = $3, injury_history = $4, gender = $5, modality = $6, competitive_level = $7, position = $8, goal = $9, weekly_frequency = $10, is_tournament_mode = $11',
        [
          cleanParam(athlete.id),
          cleanParam(athlete.name),
          cleanParam(athlete.dob),
          cleanParam(athlete.injuryHistory || athlete.injury_history),
          cleanParam(athlete.gender || 'M'),
          cleanParam(athlete.modality),
          cleanParam(athlete.competitiveLevel || athlete.competitive_level),
          cleanParam(athlete.position),
          cleanParam(athlete.goal),
          cleanParam(athlete.weeklyFrequency || athlete.weekly_frequency),
          cleanParam(athlete.isTournamentMode !== undefined ? athlete.isTournamentMode : athlete.is_tournament_mode)
        ]
      );
      
      for (const w of (athlete.wellness || [])) {
        await client.query(
          'INSERT INTO wellness (id, athlete_id, date, fatigue, sleep, stress, soreness, mood, cognitive_load, readiness_score, travel_fatigue, sleep_quality) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            cleanParam(w.id),
            cleanParam(athlete.id),
            cleanParam(w.date),
            cleanParam(w.fatigue),
            cleanParam(w.sleep),
            cleanParam(w.stress),
            cleanParam(w.soreness),
            cleanParam(w.mood),
            cleanParam(w.cognitiveLoad !== undefined ? w.cognitiveLoad : w.cognitive_load),
            cleanParam(w.readinessScore !== undefined ? w.readinessScore : w.readiness_score),
            cleanParam(w.travelFatigue !== undefined ? w.travelFatigue : w.travel_fatigue),
            cleanParam(w.sleepQuality !== undefined ? w.sleepQuality : w.sleep_quality)
          ]
        );
      }

      for (const wk of (athlete.workouts || [])) {
        await client.query(
          'INSERT INTO workouts (id, athlete_id, date, name, phase, status, rpe, total_load, duration_minutes, monotony, strain, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            cleanParam(wk.id),
            cleanParam(athlete.id),
            cleanParam(wk.date),
            cleanParam(wk.name),
            cleanParam(wk.phase),
            cleanParam(wk.status),
            cleanParam(wk.rpe),
            cleanParam(wk.totalLoad !== undefined ? wk.totalLoad : wk.total_load),
            cleanParam(wk.durationMinutes !== undefined ? wk.durationMinutes : wk.duration_minutes),
            cleanParam(wk.monotony),
            cleanParam(wk.strain),
            cleanParam(wk.feedback)
          ]
        );
        for (const ex of (wk.exercises || [])) {
          await client.query(
            'INSERT INTO prescribed_exercises (id, workout_id, name, muscle_group, sets, reps, weight, rest, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
              cleanParam(ex.id),
              cleanParam(wk.id),
              cleanParam(ex.name),
              cleanParam(ex.muscleGroup !== undefined ? ex.muscleGroup : ex.muscle_group),
              cleanParam(ex.sets),
              cleanParam(ex.reps),
              cleanParam(ex.weight),
              cleanParam(ex.rest),
              cleanParam(ex.notes)
            ]
          );
          
          if (ex.performedSets && ex.performedSets.length > 0) {
            for (const set of ex.performedSets) {
              const setId = set.id || `s-${Date.now()}-${Math.random()}`;
              await client.query(
                'INSERT INTO performed_sets (id, exercise_id, reps, weight, rpe) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET reps = $3, weight = $4, rpe = $5',
                [
                  cleanParam(setId),
                  cleanParam(ex.id),
                  cleanParam(set.reps),
                  cleanParam(set.weight),
                  cleanParam(set.rpe)
                ]
              );
            }
          }
        }
      }

      for (const asm of (athlete.assessments?.bioimpedance || [])) {
        await client.query('INSERT INTO bioimpedance (id, athlete_id, date, weight, fat_percentage, muscle_mass, visceral_fat, hydration, observations, basal_metabolism, metabolic_age, bone_mass, physique_rating, fat_arm_r, fat_arm_l, fat_leg_r, fat_leg_l, fat_trunk, muscle_arm_r, muscle_arm_l, muscle_leg_r, muscle_leg_l, muscle_trunk) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)', [
          cleanParam(asm.id),
          cleanParam(athlete.id),
          cleanParam(asm.date),
          cleanParam(asm.weight),
          cleanParam(asm.fatPercentage !== undefined ? asm.fatPercentage : asm.fat_percentage),
          cleanParam(asm.muscleMass !== undefined ? asm.muscleMass : asm.muscle_mass),
          cleanParam(asm.visceralFat !== undefined ? asm.visceralFat : asm.visceral_fat),
          cleanParam(asm.hydration),
          cleanParam(asm.observations),
          cleanParam(asm.basalMetabolism !== undefined ? asm.basalMetabolism : asm.basal_metabolism),
          cleanParam(asm.metabolicAge !== undefined ? asm.metabolicAge : asm.metabolic_age),
          cleanParam(asm.boneMass !== undefined ? asm.boneMass : asm.bone_mass),
          cleanParam(asm.physiqueRating !== undefined ? asm.physiqueRating : asm.physique_rating),
          cleanParam(asm.fatArmR !== undefined ? asm.fatArmR : asm.fat_arm_r),
          cleanParam(asm.fatArmL !== undefined ? asm.fatArmL : asm.fat_arm_l),
          cleanParam(asm.fatLegR !== undefined ? asm.fatLegR : asm.fat_leg_r),
          cleanParam(asm.fatLegL !== undefined ? asm.fatLegL : asm.fat_leg_l),
          cleanParam(asm.fatTrunk !== undefined ? asm.fatTrunk : asm.fat_trunk),
          cleanParam(asm.muscleArmR !== undefined ? asm.muscleArmR : asm.muscle_arm_r),
          cleanParam(asm.muscleArmL !== undefined ? asm.muscleArmL : asm.muscle_arm_l),
          cleanParam(asm.muscleLegR !== undefined ? asm.muscleLegR : asm.muscle_leg_r),
          cleanParam(asm.muscleLegL !== undefined ? asm.muscleLegL : asm.muscle_leg_l),
          cleanParam(asm.muscleTrunk !== undefined ? asm.muscleTrunk : asm.muscle_trunk)
        ]);
      }
      for (const asm of (athlete.assessments?.isometricStrength || [])) {
        await client.query('INSERT INTO isometric_strength (id, athlete_id, date, half_squat_kgf, quadriceps_r, quadriceps_l, hamstrings_r, hamstrings_l, rfd_peak, observations, iq_ratio_r, iq_ratio_l) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
          cleanParam(asm.id),
          cleanParam(athlete.id),
          cleanParam(asm.date),
          cleanParam(asm.halfSquatKgf !== undefined ? asm.halfSquatKgf : asm.half_squat_kgf),
          cleanParam(asm.quadricepsR !== undefined ? asm.quadricepsR : asm.quadriceps_r),
          cleanParam(asm.quadricepsL !== undefined ? asm.quadricepsL : asm.quadriceps_l),
          cleanParam(asm.hamstringsR !== undefined ? asm.hamstringsR : asm.hamstrings_r),
          cleanParam(asm.hamstringsL !== undefined ? asm.hamstringsL : asm.hamstrings_l),
          cleanParam(asm.rfdPeak !== undefined ? asm.rfdPeak : asm.rfd_peak),
          cleanParam(asm.observations),
          cleanParam(asm.iqRatioR !== undefined ? asm.iqRatioR : asm.iq_ratio_r),
          cleanParam(asm.iqRatioL !== undefined ? asm.iqRatioL : asm.iq_ratio_l)
        ]);
      }
      for (const asm of (athlete.assessments?.cmj || [])) {
        await client.query('INSERT INTO cmj (id, athlete_id, date, height, power, depth, rsi, observations, flight_time, weight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
          cleanParam(asm.id),
          cleanParam(athlete.id),
          cleanParam(asm.date),
          cleanParam(asm.height),
          cleanParam(asm.power),
          cleanParam(asm.depth),
          cleanParam(asm.rsi),
          cleanParam(asm.observations),
          cleanParam(asm.flightTime !== undefined ? asm.flightTime : asm.flight_time),
          cleanParam(asm.weight)
        ]);
      }
      for (const asm of (athlete.assessments?.vo2max || [])) {
        await client.query('INSERT INTO vo2max (id, athlete_id, date, vo2max, max_heart_rate, threshold_heart_rate, max_ventilation, threshold_ventilation, max_load, threshold_load, vam, rec10s, rec30s, rec60s, score, observations, max_speed, threshold_speed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)', [
          cleanParam(asm.id),
          cleanParam(athlete.id),
          cleanParam(asm.date),
          cleanParam(asm.vo2max),
          cleanParam(asm.maxHeartRate !== undefined ? asm.maxHeartRate : asm.max_heart_rate),
          cleanParam(asm.thresholdHeartRate !== undefined ? asm.thresholdHeartRate : asm.threshold_heart_rate),
          cleanParam(asm.maxVentilation !== undefined ? asm.maxVentilation : asm.max_ventilation),
          cleanParam(asm.thresholdVentilation !== undefined ? asm.thresholdVentilation : asm.threshold_ventilation),
          cleanParam(asm.maxLoad !== undefined ? asm.maxLoad : asm.max_load),
          cleanParam(asm.thresholdLoad !== undefined ? asm.thresholdLoad : asm.threshold_load),
          cleanParam(asm.vam),
          cleanParam(asm.rec10s),
          cleanParam(asm.rec30s),
          cleanParam(asm.rec60s),
          cleanParam(asm.score),
          cleanParam(asm.observations),
          cleanParam(asm.maxSpeed !== undefined ? asm.maxSpeed : asm.max_speed),
          cleanParam(asm.thresholdSpeed !== undefined ? asm.thresholdSpeed : asm.threshold_speed)
        ]);
      }
      for (const asm of (athlete.assessments?.speed || [])) {
        await client.query('INSERT INTO speed (id, athlete_id, date, time_5m, time_10m, time_20m, time_30m, speed_5m, speed_10m, speed_20m, speed_30m, observations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
          cleanParam(asm.id),
          cleanParam(athlete.id),
          cleanParam(asm.date),
          cleanParam(asm.time5m !== undefined ? asm.time5m : asm.time_5m),
          cleanParam(asm.time10m !== undefined ? asm.time10m : asm.time_10m),
          cleanParam(asm.time20m !== undefined ? asm.time20m : asm.time_20m),
          cleanParam(asm.time30m !== undefined ? asm.time30m : asm.time_30m),
          cleanParam(asm.speed5m !== undefined ? asm.speed5m : asm.speed_5m),
          cleanParam(asm.speed10m !== undefined ? asm.speed10m : asm.speed_10m),
          cleanParam(asm.speed20m !== undefined ? asm.speed20m : asm.speed_20m),
          cleanParam(asm.speed30m !== undefined ? asm.speed30m : asm.speed_30m),
          cleanParam(asm.observations)
        ]);
      }
      for (const es of (athlete.externalSessions || athlete.external_sessions || [])) {
        await client.query('INSERT INTO external_sessions (id, athlete_id, date, "type", duration_minutes, rpe, notes, "load") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
          cleanParam(es.id),
          cleanParam(athlete.id),
          cleanParam(es.date),
          cleanParam(es.type),
          cleanParam(es.durationMinutes !== undefined ? es.durationMinutes : es.duration_minutes),
          cleanParam(es.rpe),
          cleanParam(es.notes),
          cleanParam(es.load)
        ]);
      }
    }

    await client.query('COMMIT');
    return response.status(200).json({ message: 'Sincronizado!' });
  } catch (error) {
    await client.query('ROLLBACK');
    return response.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}
