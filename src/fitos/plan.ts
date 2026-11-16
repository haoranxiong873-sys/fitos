// Public template only. Loads and personal targets belong in the local workout database.
export type FitosSessionKey = 'push' | 'pull' | 'legs' | 'upper';
export type FitosExercise = {
    key: string;
    name: string;
    workingSets: number;
    reps?: { min: number; max: number; perSide?: boolean };
    durationSeconds?: { min: number; max: number };
    restSeconds: { min: number; max: number };
    targetRir?: number;
};
type PlanSeed = {
    sessions: Record<FitosSessionKey, { name: string; exercises: FitosExercise[] }>;
    weeks: { week: number; phase: string }[];
    phases: Record<string, { name: string }>;
};

export const fitosPlan = require('../../data/fitos/12-week-plan.zh-CN.json') as PlanSeed;
export const sessionKeys: FitosSessionKey[] = ['push', 'pull', 'legs', 'upper'];

export function getPlanWeek(week: number) {
    if (!Number.isInteger(week) || week < 1 || week > 12) throw new RangeError('week must be 1–12');
    const entry = fitosPlan.weeks[week - 1];
    return { ...entry, phaseName: fitosPlan.phases[entry.phase].name };
}

export function nextThreeDaySession(completedSessionKeys: FitosSessionKey[]): FitosSessionKey {
    const last = completedSessionKeys.at(-1);
    return last ? sessionKeys[(sessionKeys.indexOf(last) + 1) % sessionKeys.length] : 'push';
}

export type CompletedWorkingSet = {
    reps: number | null;
    weightKg: number | null;
    completed: boolean;
};
export type ProgressionAdvice =
    | { kind: 'add_weight'; message: string }
    | { kind: 'add_reps'; message: string }
    | { kind: 'review_recovery'; message: string }
    | { kind: 'insufficient_data'; message: string };

export function progressionAdvice(
    exercise: FitosExercise,
    latest: CompletedWorkingSet[],
    previous: CompletedWorkingSet[] = [],
): ProgressionAdvice {
    const range = exercise.reps;
    if (
        !range ||
        latest.length !== exercise.workingSets ||
        latest.some((set) => !set.completed || set.reps == null)
    ) {
        return { kind: 'insufficient_data', message: '记录完整工作组后可评估进阶。' };
    }
    if (latest.every((set) => set.reps! >= range.max)) {
        return {
            kind: 'add_weight',
            message:
                '全部工作组达到次数上限。确认动作标准且末组至少保留约1次余力后，下次可考虑小幅加重；计划不会自动更改。',
        };
    }
    if (
        previous.length === exercise.workingSets &&
        latest.some((set) => set.reps! < range.min) &&
        previous.some((set) => set.completed && set.reps != null && set.reps < range.min)
    ) {
        return {
            kind: 'review_recovery',
            message: '连续两次有工作组低于次数下限。先检查恢复、动作和饮食，再考虑降低约5%负重。',
        };
    }
    return { kind: 'add_reps', message: '保持动作标准，优先在当前重量下增加次数。' };
}

export function weeklyCompletionRate(completedSessionCount: number, plannedSessionCount: 3 | 4) {
    return Math.min(
        100,
        Math.round((Math.max(0, completedSessionCount) / plannedSessionCount) * 100),
    );
}
