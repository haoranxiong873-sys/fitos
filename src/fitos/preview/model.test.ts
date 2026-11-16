import { describe, expect, test } from '@jest/globals';

import { fitosPlan } from '../plan';
import {
    completedSetCount,
    createPreviewWorkout,
    emptyPreviewState,
    finishPreviewWorkout,
    getPreviewAdvice,
    getPreviewOverview,
    totalSetCount,
} from './model';

describe('browser preview training model', () => {
    test('creates the prescribed number of editable working sets', () => {
        const draft = createPreviewWorkout('one', 1, 'push', '2026-11-16');
        const expected = fitosPlan.sessions.push.exercises.reduce(
            (sum, exercise) => sum + exercise.workingSets,
            0,
        );
        expect(totalSetCount(draft)).toBe(expected);
        expect(completedSetCount(draft)).toBe(0);
        expect(draft.sets.barbell_flat_bench_press).toHaveLength(3);
    });

    test('requires at least one completed set and a valid training date', () => {
        const draft = createPreviewWorkout('one', 1, 'push', '2026-11-16');
        expect(() => finishPreviewWorkout(draft, '2026-11-16T10:00:00Z')).toThrow('至少一组');
        draft.sets.barbell_flat_bench_press[0] = { weightKg: '50', reps: '8', completed: true };
        draft.date = '2026-02-31';
        expect(() => finishPreviewWorkout(draft, '2026-11-16T10:00:00Z')).toThrow('训练日期');
        draft.date = '2026-11-16';
        expect(finishPreviewWorkout(draft, '2026-11-16T10:00:00Z').finishedAt).toBeTruthy();
    });

    test('three-day rotation and weekly completion use saved workouts', () => {
        const push = createPreviewWorkout('one', 1, 'push', '2026-11-16');
        push.sets.barbell_flat_bench_press[0] = { weightKg: '50', reps: '8', completed: true };
        const state = {
            ...emptyPreviewState,
            mode: 3 as const,
            workouts: [finishPreviewWorkout(push, '2026-11-16T10:00:00Z')],
        };
        const overview = getPreviewOverview(state, new Date('2026-11-17T12:00:00'));
        expect(overview.thisWeek).toBe(1);
        expect(overview.completion).toBe(33);
        expect(overview.recommended).toBe('pull');
    });

    test('last completed weight prefills the next draft, but reps remain empty', () => {
        const old = createPreviewWorkout('one', 1, 'push', '2026-11-16');
        old.sets.barbell_flat_bench_press[0] = { weightKg: '50', reps: '8', completed: true };
        const next = createPreviewWorkout('two', 2, 'push', '2026-11-23', [
            finishPreviewWorkout(old, '2026-11-16T10:00:00Z'),
        ]);
        expect(next.sets.barbell_flat_bench_press[0]).toEqual({
            weightKg: '50',
            reps: '',
            completed: false,
        });
        expect(getPreviewAdvice(fitosPlan.sessions.push.exercises[0], [old]).kind).toBe(
            'insufficient_data',
        );
    });
});
