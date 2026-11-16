import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(
  readFileSync(new URL('../data/fitos/12-week-plan.zh-CN.json', import.meta.url), 'utf8'),
);

const expected = {
  push: [
    ['barbell_flat_bench_press', 3, 6, 8, 180, 180],
    ['incline_dumbbell_press', 3, 8, 12, 120, 180],
    ['parallel_bar_dip', 3, 6, 10, 120, 120],
    ['dumbbell_lateral_raise', 3, 12, 20, 60, 90],
    ['cable_triceps_pushdown', 2, 10, 15, 60, 90],
  ],
  pull: [
    ['weighted_pull_up', 3, 5, 8, 180, 180],
    ['chest_supported_row', 3, 8, 12, 120, 120],
    ['lat_pulldown', 2, 10, 12, 90, 120],
    ['reverse_fly', 3, 12, 20, 60, 90],
    ['dumbbell_curl', 3, 8, 12, 60, 90],
  ],
  legs: [
    ['barbell_back_squat', 3, 6, 10, 180, 180],
    ['romanian_deadlift', 3, 8, 10, 120, 180],
    ['bulgarian_split_squat', 2, 8, 12, 120, 120],
    ['leg_curl', 2, 10, 15, 90, 90],
    ['hanging_knee_or_leg_raise', 3, 10, 15, 60, 90],
    ['standing_calf_raise', 3, 12, 20, 60, 90],
  ],
  upper: [
    ['strict_pull_up', 3, 8, 12, 120, 180],
    ['incline_dumbbell_press', 3, 8, 12, 120, 120],
    ['pike_push_up', 3, 6, 12, 120, 120],
    ['single_arm_cable_row', 2, 10, 12, 90, 90],
    ['dumbbell_lateral_raise', 3, 12, 20, 60, 90],
    ['tucked_l_sit', 3, 10, 20, 60, 60],
    ['ab_wheel', 2, 6, 12, 60, 90],
  ],
};

assert.equal(seed.schemaVersion, 1);
assert.equal(seed.locale, 'zh-CN');
assert.deepEqual(seed.weeklySchedule.map(({ weekday, kind, sessionKey }) => [weekday, kind, sessionKey ?? null]), [
  [1, 'strength', 'push'],
  [2, 'strength', 'pull'],
  [3, 'swim_or_active_recovery', null],
  [4, 'strength', 'legs'],
  [5, 'strength', 'upper'],
  [6, 'basketball', null],
  [7, 'rest', null],
]);
assert.deepEqual(seed.weeklySchedule[2].durationMinutes, { min: 20, max: 40 });
assert.deepEqual(seed.weeklySchedule[5].durationMinutes, { min: 45, max: 90 });
assert.deepEqual(seed.sessionDurationMinutes, { min: 60, max: 80, includesWarmup: true });
assert.deepEqual(seed.warmup, {
  generalMinutes: { min: 5, max: 8 },
  specificMinutes: { min: 5, max: 10 },
  warmupSetsExcludedFromWorkingSets: true,
});
assert.deepEqual(seed.defaultRir, { min: 1, max: 3 });

for (const [sessionKey, rows] of Object.entries(expected)) {
  const actual = seed.sessions[sessionKey].exercises.map((exercise) => {
    const range = exercise.reps ?? exercise.durationSeconds;
    assert.equal(typeof exercise.name, 'string');
    assert.ok(range.min > 0 && range.max >= range.min);
    assert.ok(exercise.restSeconds.min > 0 && exercise.restSeconds.max >= exercise.restSeconds.min);
    return [
      exercise.key,
      exercise.workingSets,
      range.min,
      range.max,
      exercise.restSeconds.min,
      exercise.restSeconds.max,
    ];
  });
  assert.deepEqual(actual, rows, sessionKey);
}

assert.equal(seed.sessions.upper.exercises[5].durationSeconds.min, 10);
assert.equal(seed.sessions.upper.exercises[5].reps, undefined);
assert.equal(seed.sessions.legs.exercises[2].reps.perSide, true);
assert.equal(seed.sessions.upper.exercises[3].reps.perSide, true);
assert.equal(seed.sessions.push.exercises[1].targetRir, 2);
assert.equal(seed.sessions.pull.exercises[0].initialResistance, 'bodyweight_or_user_selected_load');

assert.deepEqual(seed.weeks.map(({ week }) => week), Array.from({ length: 12 }, (_, i) => i + 1));
const expectedPhases = [
  'calibration', 'calibration', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy',
  'recovery_review', 'progression', 'progression', 'progression', 'progression', 'review',
];
assert.deepEqual(seed.weeks.map(({ phase }) => phase), expectedPhases);
for (const week of seed.weeks) {
  assert.equal(week.schedule, 'weeklySchedule');
  assert.ok(seed.phases[week.phase].weeks.includes(week.week));
}
assert.equal(seed.phases.calibration.requiresUserDecision, true);
assert.equal(seed.phases.recovery_review.requiresUserDecision, true);
assert.deepEqual(seed.threeDayMode.sessionSequence, ['push', 'pull', 'legs', 'upper']);
assert.equal(seed.threeDayMode.resetCursorEachWeek, false);
assert.equal(seed.progressionRules.automaticPlanMutation, false);
assert.equal(seed.progressionRules.userConfirmationRequired, true);

const serialized = JSON.stringify(seed);
for (const privateField of [
  'heightCm', 'currentWeightKg', 'targetWeightKg', 'benchPressPrKg', 'startingWeightKg',
  'caloriesPerDay', 'proteinGramsPerDay', 'fatGramsPerDay', 'carbsGramsPerDay',
]) {
  assert.equal(serialized.includes(`"${privateField}"`), false, privateField);
}

console.log('FitOS seed valid: 12 weeks, 4 sessions, 23 prescribed exercises, private fields absent.');
