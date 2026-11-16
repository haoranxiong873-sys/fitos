import { describe, expect, test } from '@jest/globals';

import {
    fitosPlan,
    getPlanWeek,
    nextThreeDaySession,
    progressionAdvice,
    weeklyCompletionRate,
} from './plan';

const bench = fitosPlan.sessions.push.exercises[0];
const completed = (reps: number) => ({ reps, weightKg: 60, completed: true });

describe('FitOS training plan', () => {
    test('covers twelve weeks and keeps the three-day rotation across week boundaries', () => {
        expect(getPlanWeek(1).phaseName).toBe('适应与校准');
        expect(getPlanWeek(7).phaseName).toBe('恢复评估');
        expect(getPlanWeek(12).phaseName).toBe('总结评估');
        expect(() => getPlanWeek(13)).toThrow(RangeError);
        expect(nextThreeDaySession(['push', 'pull', 'legs'])).toBe('upper');
        expect(nextThreeDaySession(['push', 'pull', 'legs', 'upper'])).toBe('push');
    });

    test('does not recommend automatic load increases without complete working sets', () => {
        expect(progressionAdvice(bench, [completed(8), completed(8)]).kind).toBe(
            'insufficient_data',
        );
        expect(
            progressionAdvice(bench, [
                completed(8),
                completed(8),
                { ...completed(8), completed: false },
            ]).kind,
        ).toBe('insufficient_data');
        expect(progressionAdvice(bench, [completed(8), completed(8), completed(8)]).kind).toBe(
            'add_weight',
        );
        expect(progressionAdvice(bench, [completed(8), completed(7), completed(6)]).kind).toBe(
            'add_reps',
        );
    });

    test('flags two below-minimum sessions for recovery review', () => {
        expect(
            progressionAdvice(
                bench,
                [completed(5), completed(6), completed(6)],
                [completed(5), completed(6), completed(6)],
            ).kind,
        ).toBe('review_recovery');
        expect(
            progressionAdvice(
                bench,
                [completed(5), completed(6), completed(6)],
                [completed(6), completed(6), completed(6)],
            ).kind,
        ).toBe('add_reps');
    });

    test('counts weekly completion against the selected schedule', () => {
        expect(weeklyCompletionRate(2, 4)).toBe(50);
        expect(weeklyCompletionRate(2, 3)).toBe(67);
        expect(weeklyCompletionRate(5, 4)).toBe(100);
    });
});
