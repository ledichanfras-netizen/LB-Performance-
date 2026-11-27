import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { Athlete, Workout } from '../src/types';
import { summarizeWorkoutsByCycle } from '../src/utils/workoutCycles';
import { dashboardSummary } from '../src/utils/dashboardSummary';
import { reconcilePrescriptionSets } from '../src/utils/prescriptionSets';
import { persistPeriodization } from '../src/utils/periodizationSave';
import { calculateACWR, calculateAdvancedMetrics, sanitizeAthleteData } from '../src/utils';
import { validateSportsPayload } from './sportsValidation';
import { saveWorkoutExecution } from './workoutExecution';
import { saveStudentData } from './studentSave';
import { readWorkoutHistoryPage, workoutFromRows } from './workoutHistory';
import { ensureSportsSchema } from './ensureSchema';
import { validateScopedSave } from './saveScope';
import { lockAthleteSnapshots, archiveMissingWorkoutsSQL } from './workoutSync';
import { createSaveBatch } from './saveBatch';

const revision = '2026-11-25T10:00:00.000Z';
const coach = { user_id: 'c1', role: 'coach', organization_id: 'org' };
const student = { user_id: 'u1', role: 'athlete', organization_id: 'org', athlete_id: 'a1' };

const makeWorkout = (patch: Partial<Workout> = {}): Workout => ({
  id: 'w1',
  date: '2026-11-24',
  name: 'Força A',
  phase: 'Base',
  status: 'planned',
  exercises: [
    {
      id: 'ex1',
      name: 'Agachamento',
      muscleGroup: 'MMII',
      sets: 3,
      reps: '6',
      weight: '80kg',
      rest: '120s',
      notes: '',
      performedSets: [{ id: 's1', reps: 6, weight: 80, rpe: 7, isCompleted: true }],
    },
  ],
  ...patch,
});

test('summarizeWorkoutsByCycle groups concluded, missed, pending, reasons and adherence per cycle and active periodization', () => {
  const workouts: Workout[] = [
    makeWorkout({ id: '1', date: '2026-11-01', phase: 'Base', status: 'completed' }),
    makeWorkout({ id: '2', date: '2026-11-03', phase: 'Base', status: 'missed', missedReason: 'Viagem / Competição' }),
    makeWorkout({ id: '3', date: '2026-11-05', phase: 'Base', status: 'missed', missedReason: 'Viagem / Competição' }),
    makeWorkout({ id: '4', date: '2026-11-07', phase: 'Base', status: 'missed' }),
    makeWorkout({ id: '5', date: '2026-11-18', phase: 'Força Máxima', status: 'completed' }),
    makeWorkout({ id: '6', date: '2026-11-20', phase: 'Força Máxima', status: 'completed' }),
    makeWorkout({ id: '7', date: '2026-11-22', phase: 'Força Máxima', status: 'missed', missedReason: 'Lesão ou dor' }),
    makeWorkout({ id: '8', date: '2026-11-27', phase: 'Força Máxima', status: 'planned' }),
  ];

  const report = summarizeWorkoutsByCycle(workouts, { start: '2026-11-15', end: '2026-11-30' });
  assert.equal(report.totals.total, 8);
  assert.equal(report.totals.completed, 3);
  assert.equal(report.totals.missed, 4);
  assert.equal(report.totals.pending, 1);
  assert.equal(report.totals.adherencePercent, 43);

  assert.equal(report.cycles.length, 2);
  // Most recent cycle first
  assert.equal(report.cycles[0].phase, 'Força Máxima');
  assert.equal(report.cycles[0].completed, 2);
  assert.equal(report.cycles[0].missed, 1);
  assert.equal(report.cycles[0].pending, 1);
  assert.equal(report.cycles[0].adherencePercent, 67);
  assert.deepEqual(report.cycles[0].missedReasons, [{ reason: 'Lesão ou dor', count: 1 }]);

  assert.equal(report.cycles[1].phase, 'Base');
  assert.equal(report.cycles[1].completed, 1);
  assert.equal(report.cycles[1].missed, 3);
  assert.equal(report.cycles[1].adherencePercent, 25);
  assert.deepEqual(report.cycles[1].missedReasons, [
    { reason: 'Viagem / Competição', count: 2 },
    { reason: 'Motivo não informado', count: 1 },
  ]);

  assert.ok(report.activePeriodization);
  assert.equal(report.activePeriodization?.completed, 2);
  assert.equal(report.activePeriodization?.missed, 1);
  assert.equal(report.activePeriodization?.pending, 1);
  assert.equal(report.activePeriodization?.adherencePercent, 67);
});

test('missed workouts are excluded from pending alerts, internal load, ACWR, monotony and set reconciliation', () => {
  const missed = makeWorkout({
    id: 'm1',
    date: '2026-11-24',
    status: 'missed',
    missedReason: 'Falta sem aviso',
    rpe: 9,
    durationMinutes: 60,
    totalLoad: 1500,
  });
  const done = makeWorkout({
    id: 'c1',
    date: '2026-11-23',
    status: 'completed',
    rpe: 5,
    durationMinutes: 40,
    totalLoad: 480,
  });
  const planned = makeWorkout({ id: 'p1', date: '2026-11-23', status: 'planned' });

  const athlete = {
    id: 'a1',
    name: 'Atleta',
    dob: '2000-01-01',
    gender: 'M',
    modality: 'Tênis',
    workouts: [missed, done, planned],
    externalSessions: [],
    wellness: [],
    assessments: {},
  } as unknown as Athlete;

  const summary = dashboardSummary(athlete, '2026-11-25');
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.missedCount, 1);
  assert.equal(summary.previousPending, 1); // Only p1, NOT m1
  assert.equal(summary.load, 200); // Only c1 (5 * 40)

  const acwr = calculateACWR([missed, done], [], '2026-11-25');
  assert.equal(acwr.acute, 200);
  const adv = calculateAdvancedMetrics([missed, done], [], '2026-11-25');
  assert.equal(adv.totalLoad, 200);
  assert.equal(adv.sessionCount, 1);

  const sanitized = sanitizeAthleteData(athlete);
  const sanitizedMissed = sanitized.workouts.find(w => w.id === 'm1')!;
  assert.equal(sanitizedMissed.totalLoad, 0);
  assert.equal(sanitizedMissed.rpe, undefined);
  assert.equal(sanitizedMissed.durationMinutes, undefined);

  const exBefore = structuredClone(missed.exercises[0]);
  assert.deepEqual(reconcilePrescriptionSets(exBefore, 'missed'), exBefore);
});

test('persistPeriodization preserves missed workouts even when replacePending is true', async () => {
  const missed = makeWorkout({ id: 'missed-1', date: '2026-11-20', status: 'missed', missedReason: 'Viagem' });
  const pending = makeWorkout({ id: 'pending-1', date: '2026-11-22', status: 'planned' });
  const generated = makeWorkout({ id: 'new-1', date: '2026-11-26', status: 'planned' });
  const baseAthlete = {
    id: 'a1',
    name: 'Atleta',
    dob: '2000-01-01',
    gender: 'M',
    modality: 'Tênis',
    workouts: [missed, pending],
    externalSessions: [],
    wellness: [],
    assessments: {},
  } as unknown as Athlete;

  let saved: Athlete | undefined;
  await persistPeriodization('a1', [generated], {}, true, {
    load: async () => [baseAthlete],
    save: async a => {
      saved = a;
    },
  });

  assert.deepEqual(saved?.workouts.map(w => w.id).sort(), ['missed-1', 'new-1']);
  assert.equal(saved?.workouts.find(w => w.id === 'missed-1')?.status, 'missed');
  assert.equal(saved?.workouts.find(w => w.id === 'missed-1')?.missedReason, 'Viagem');
});

test('validateSportsPayload, history read, execution guard and student save enforce missed workout rules', async () => {
  assert.doesNotThrow(() =>
    validateSportsPayload([
      {
        id: 'a1',
        workouts: [{ id: 'w1', date: '2026-11-24', status: 'missed', missedReason: 'Viagem', exercises: [] }],
      },
    ])
  );
  assert.throws(
    () =>
      validateSportsPayload([
        {
          id: 'a1',
          workouts: [{ id: 'w1', date: '2026-11-24', status: 'missed', missedReason: 'x'.repeat(501), exercises: [] }],
        },
      ]),
    /motivo de ausência/
  );

  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA lb_accounts;
      CREATE TABLE lb_accounts.athlete_scopes(athlete_id text, organization_id text);
      CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
      CREATE TABLE athletes(id text PRIMARY KEY, updated_at timestamptz NOT NULL, injury_history text);
      CREATE TABLE workouts(id text PRIMARY KEY, athlete_id text, date text, status text, name text, phase text, rpe real, duration_minutes integer, total_load numeric, feedback text, trainer_notes text, missed_reason text, archived_at timestamptz, updated_at timestamptz, created_at timestamptz);
      CREATE TABLE prescribed_exercises(id text PRIMARY KEY, workout_id text, name text, muscle_group text, sets integer, reps text, weight text, rest text, notes text, pain_level integer, reps_type text, order_index integer, video_url text, image_url text, prescription_meta jsonb);
      CREATE TABLE performed_sets(id text PRIMARY KEY, exercise_id text, reps integer, weight real, rpe real, is_completed boolean);
      CREATE TABLE wellness(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE external_sessions(id text PRIMARY KEY, athlete_id text);
      INSERT INTO athletes VALUES('a1', '${revision}', NULL);
      INSERT INTO lb_accounts.athlete_scopes VALUES('a1', 'org');
      INSERT INTO workouts(id, athlete_id, date, status, name, phase, missed_reason, total_load, updated_at)
      VALUES('w-missed', 'a1', '2026-11-24', 'missed', 'Força A', 'Base', 'Viagem / Competição', 0, '${revision}');
      INSERT INTO prescribed_exercises VALUES('e1', 'w-missed', 'Agachamento', 'MMII', 3, '6', '80kg', '120s', '', 0, 'reps', 0, '', '', '{}'::jsonb);
    `);

    const pool: any = {
      connect: async () => ({
        query: (q: string, p?: any[]) => db.query(q, p),
        release() {},
      }),
    };

    const page = await readWorkoutHistoryPage(pool, coach, 'a1', { revision });
    assert.equal(page.workouts.length, 1);
    assert.equal(page.workouts[0].status, 'missed');
    assert.equal(page.workouts[0].missedReason, 'Viagem / Competição');

    const rowOnly = workoutFromRows(
      { id: 'w2', date: '2026-11-24', status: 'missed', missed_reason: 'Falta', total_load: '0' },
      [],
      []
    );
    assert.equal(rowOnly.missedReason, 'Falta');

    await assert.rejects(
      saveWorkoutExecution(pool, student, 'a1', 'w-missed', {
        baseUpdatedAt: revision,
        execution: {
          id: 'w-missed',
          date: '2026-11-24',
          status: 'completed',
          rpe: 6,
          durationMinutes: 40,
          exercises: [{ id: 'e1', performedSets: [{ id: 's1', reps: 6, weight: 80, isCompleted: true }] }],
        },
      }),
      /não realizado/
    );

    await assert.rejects(
      saveStudentData(pool, student as any, [
        {
          id: 'a1',
          syncRevision: revision,
          workouts: [{ id: 'w-missed', date: '2026-11-24', status: 'completed', exercises: [] }],
        },
      ])
    );
  } finally {
    await db.close();
  }
});

test('ensureSportsSchema migrates legacy workouts table without missed_reason/archived_at and drops status check constraint before scoped save', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA lb_accounts;
      CREATE TABLE lb_accounts.athlete_scopes(athlete_id text, organization_id text);
      CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
      CREATE TABLE users(id text PRIMARY KEY);
      CREATE TABLE athletes(id text PRIMARY KEY, name text NOT NULL, dob text NOT NULL, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP, injury_history text);
      CREATE TABLE workouts(
        id text PRIMARY KEY,
        athlete_id text REFERENCES athletes(id) ON DELETE CASCADE,
        date text NOT NULL,
        name varchar(255),
        phase varchar(100),
        status varchar(50) CHECK (status IN ('planned', 'in_progress', 'completed')),
        rpe integer,
        total_load real,
        duration_minutes integer,
        monotony real,
        strain real,
        feedback text
      );
      CREATE TABLE prescribed_exercises(id text PRIMARY KEY, workout_id text, name text, muscle_group text, sets integer, reps text, weight text);
      CREATE TABLE performed_sets(id text PRIMARY KEY, exercise_id text, reps integer, weight real, rpe integer);
      CREATE TABLE wellness(id text PRIMARY KEY, athlete_id text, sleep integer);
      CREATE TABLE external_sessions(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE bioimpedance(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE vo2max(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE isometric_strength(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE cmj(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE drop_jump(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE speed(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE imtp(id text PRIMARY KEY, athlete_id text);
      CREATE TABLE general_strength(id text PRIMARY KEY, athlete_id text);
      INSERT INTO athletes(id, name, dob, updated_at) VALUES('a1', 'Atleta', '2000-01-01', '${revision}');
      INSERT INTO lb_accounts.athlete_scopes VALUES('a1', 'org');
      INSERT INTO workouts(id, athlete_id, date, name, phase, status) VALUES('w1', 'a1', '2026-11-25', 'Sessão 1', 'Preparação Específica', 'planned');
    `);

    const clientAdapter: any = {
      query: (sql: string, params?: any[]) => db.query(sql, params),
      release() {},
    };
    const poolAdapter: any = {
      query: (sql: string, params?: any[]) => db.query(sql, params),
      connect: async () => clientAdapter,
    };

    await ensureSportsSchema(poolAdapter);

    const workoutCols = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='workouts'"
    );
    const colNames = new Set(workoutCols.rows.map((r: any) => r.column_name));
    assert.ok(colNames.has('missed_reason'));
    assert.ok(colNames.has('archived_at'));
    assert.ok(colNames.has('trainer_notes'));

    const payload = [
      {
        id: 'a1',
        name: 'Atleta',
        dob: '2000-01-01',
        gender: 'M',
        modality: 'Tênis',
        syncRevision: revision,
        wellness: [],
        externalSessions: [],
        assessments: {},
        workouts: [
          {
            id: 'w1',
            date: '2026-11-25',
            name: 'Sessão 1',
            phase: 'Preparação Específica',
            status: 'missed',
            missedReason: 'Viagem / Competição',
            totalLoad: 0,
            exercises: [],
          },
        ],
      },
    ];

    await validateScopedSave(clientAdapter, coach as any, payload);
    await lockAthleteSnapshots(clientAdapter, payload);
    const writes = createSaveBatch({ query: (sql: string) => db.exec(sql) });
    await writes.query(archiveMissingWorkoutsSQL, ['a1', JSON.stringify(['w1'])]);
    await writes.query(
      'INSERT INTO workouts (id, athlete_id, date, name, phase, status, rpe, total_load, duration_minutes, monotony, strain, feedback, trainer_notes, missed_reason, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET date = $3, name = $4, phase = $5, status = $6, rpe = $7, total_load = $8, duration_minutes = $9, monotony = $10, strain = $11, feedback = $12, trainer_notes = $13, missed_reason = $14, updated_at = CURRENT_TIMESTAMP',
      ['w1', 'a1', '2026-11-25', 'Sessão 1', 'Preparação Específica', 'missed', null, 0, null, null, null, null, null, 'Viagem / Competição']
    );
    await writes.flush();

    const saved = await db.query("SELECT status, missed_reason, total_load FROM workouts WHERE id='w1'");
    assert.equal(saved.rows[0].status, 'missed');
    assert.equal(saved.rows[0].missed_reason, 'Viagem / Competição');
    assert.equal(saved.rows[0].total_load, 0);
  } finally {
    await db.close();
  }
});
