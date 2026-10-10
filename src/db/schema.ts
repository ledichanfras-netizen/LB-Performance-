import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(),
  email: text('email'),
  username: text('username').unique(),
  password: text('password'),
  role: text('role').notNull().default('coach'),
  athleteId: text('athlete_id'),
  plan: text('plan').default('free'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const athletes = pgTable('athletes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  dob: text('dob'),
  gender: text('gender').default('M'),
  modality: text('modality'),
  competitiveLevel: text('competitive_level'),
  position: text('position'),
  injuryHistory: text('injury_history'),
  goal: text('goal'),
  weeklyFrequency: integer('weekly_frequency'),
  photoUrl: text('photo_url'),
  isTournamentMode: boolean('is_tournament_mode').default(false),
  periodizationStart: text('periodization_start'),
  periodizationEnd: text('periodization_end'),
  trainingDays: jsonb('training_days'),
  injuries: jsonb('injuries'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wellness = pgTable('wellness', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  fatigue: integer('fatigue'),
  sleep: real('sleep'),
  stress: integer('stress'),
  soreness: integer('soreness'),
  mood: integer('mood'),
  cognitiveLoad: integer('cognitive_load'),
  readinessScore: integer('readiness_score'),
  travelFatigue: integer('travel_fatigue'),
  sleepQuality: integer('sleep_quality'),
  menstrualPhase: text('menstrual_phase'),
  menstrualSymptoms: jsonb('menstrual_symptoms'),
  hrv: real('hrv'),
  sleepHoursFormatted: text('sleep_hours_formatted'),
  sleepStartTime: text('sleep_start_time'),
  wakeUpTime: text('wake_up_time'),
  calculatedSleepHours: real('calculated_sleep_hours'),
  isMatchDay: boolean('is_match_day'),
  emotionalReadiness: integer('emotional_readiness'),
  psychologicalReadiness: integer('psychological_readiness'),
  psychologyNotes: text('psychology_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const workouts = pgTable('workouts', {
  archivedAt: timestamp('archived_at'),
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  name: text('name'),
  phase: text('phase'),
  status: text('status'),
  rpe: integer('rpe'),
  totalLoad: real('total_load'),
  durationMinutes: integer('duration_minutes'),
  monotony: real('monotony'),
  strain: real('strain'),
  feedback: text('feedback'),
  trainerNotes: text('trainer_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const prescribedExercises = pgTable('prescribed_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'cascade' }),
  name: text('name'),
  muscleGroup: text('muscle_group'),
  sets: integer('sets'),
  reps: text('reps'),
  weight: text('weight'),
  rest: text('rest'),
  notes: text('notes'),
  painLevel: integer('pain_level'),
  repsType: text('reps_type'),
  orderIndex: integer('order_index').default(0),
  videoUrl: text('video_url'),
  imageUrl: text('image_url'),
  prescriptionMeta: jsonb('prescription_meta'),
});

export const performedSets = pgTable('performed_sets', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id').references(() => prescribedExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number'),
  reps: integer('reps'),
  weight: real('weight'),
  rpe: integer('rpe'),
  isCompleted: boolean('is_completed').default(false),
});

export const externalSessions = pgTable('external_sessions', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  type: text('type'),
  durationMinutes: integer('duration_minutes'),
  rpe: integer('rpe'),
  notes: text('notes'),
  load: real('load'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const isometricStrength = pgTable('isometric_strength', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  halfSquatKgf: real('half_squat_kgf'),
  quadricepsR: real('quadriceps_r'),
  quadricepsL: real('quadriceps_l'),
  hamstringsR: real('hamstrings_r'),
  hamstringsL: real('hamstrings_l'),
  iqRatioR: real('iq_ratio_r'),
  iqRatioL: real('iq_ratio_l'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cmj = pgTable('cmj', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  height: real('height'),
  power: real('power'),
  depth: real('depth'),
  rsi: real('rsi'),
  flightTime: real('flight_time'),
  weight: real('weight'),
  averageForce: real('average_force'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vo2max = pgTable('vo2max', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  vo2max: real('vo2max'),
  maxHeartRate: real('max_heart_rate'),
  thresholdHeartRate: real('threshold_heart_rate'),
  maxSpeed: real('max_speed'),
  thresholdSpeed: real('threshold_speed'),
  vam: real('vam'),
  rec10s: real('rec_10s'),
  rec30s: real('rec_30s'),
  rec60s: real('rec_60s'),
  maxVentilation: real('max_ventilation'),
  score: real('score'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bioimpedance = pgTable('bioimpedance', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  weight: real('weight'),
  fatPercentage: real('fat_percentage'),
  muscleMass: real('muscle_mass'),
  visceralFat: real('visceral_fat'),
  hydration: real('hydration'),
  basalMetabolism: real('basal_metabolism'),
  metabolicAge: real('metabolic_age'),
  boneMass: real('bone_mass'),
  physiqueRating: real('physique_rating'),
  fatArmR: real('fat_arm_r'),
  fatArmL: real('fat_arm_l'),
  fatLegR: real('fat_leg_r'),
  fatLegL: real('fat_leg_l'),
  fatTrunk: real('fat_trunk'),
  muscleArmR: real('muscle_arm_r'),
  muscleArmL: real('muscle_arm_l'),
  muscleLegR: real('muscle_leg_r'),
  muscleLegL: real('muscle_leg_l'),
  muscleTrunk: real('muscle_trunk'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const speed = pgTable('speed', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  time5m: real('time_5m'),
  time10m: real('time_10m'),
  time20m: real('time_20m'),
  time30m: real('time_30m'),
  speed5m: real('speed_5m'),
  speed10m: real('speed_10m'),
  speed20m: real('speed_20m'),
  speed30m: real('speed_30m'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dropJump = pgTable('drop_jump', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  weight: real('weight'),
  dropHeight: real('drop_height'),
  jumpHeight: real('jump_height'),
  flightTime: real('flight_time'),
  contactTime: real('contact_time'),
  meanForce: real('mean_force'),
  meanPower: real('mean_power'),
  stiffness: real('stiffness'),
  rsi: real('rsi'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const imtp = pgTable('imtp', {
  force100: real('force_100'),
  force200: real('force_200'),
  force300: real('force_300'),
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  weight: real('weight'),
  peakForce: real('peak_force'),
  relativePeakForce: real('relative_peak_force'),
  timeToPeakForce: real('time_to_peak_force'),
  meanForce: real('mean_force'),
  rfdPeak: real('rfd_peak'),
  rfd100: real('rfd_100'),
  rfd200: real('rfd_200'),
  rfd300: real('rfd_300'),
  impulsePeak: real('impulse_peak'),
  impulse100: real('impulse_100'),
  impulse200: real('impulse_200'),
  impulse300: real('impulse_300'),
  aiDetails: text('ai_details'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const generalStrength = pgTable('general_strength', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id').references(() => athletes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const athletesRelations = relations(athletes, ({ many }) => ({
  wellness: many(wellness),
  workouts: many(workouts),
  externalSessions: many(externalSessions),
  isometricStrength: many(isometricStrength),
  cmj: many(cmj),
  vo2max: many(vo2max),
  bioimpedance: many(bioimpedance),
  speed: many(speed),
  dropJump: many(dropJump),
  imtp: many(imtp),
  generalStrength: many(generalStrength),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  athlete: one(athletes, {
    fields: [workouts.athleteId],
    references: [athletes.id],
  }),
  prescribedExercises: many(prescribedExercises),
}));

export const prescribedExercisesRelations = relations(prescribedExercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [prescribedExercises.workoutId],
    references: [workouts.id],
  }),
  performedSets: many(performedSets),
}));

export const performedSetsRelations = relations(performedSets, ({ one }) => ({
  exercise: one(prescribedExercises, {
    fields: [performedSets.exerciseId],
    references: [prescribedExercises.id],
  }),
}));
