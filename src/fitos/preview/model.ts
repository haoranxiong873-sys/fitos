import {
    FitosExercise,
    FitosSessionKey,
    fitosPlan,
    nextThreeDaySession,
    progressionAdvice,
    weeklyCompletionRate,
} from '../plan';

export type PreviewSet = {
    weightKg: string;
    reps: string;
    completed: boolean;
};

export type PreviewWorkout = {
    id: string;
    week: number;
    sessionKey: FitosSessionKey;
    date: string;
    finishedAt: string | null;
    sets: Record<string, PreviewSet[]>;
};

export type PreviewWeight = { id: string; date: string; kg: number };
export type PreviewState = {
    mode: 3 | 4;
    week: number;
    selected: FitosSessionKey;
    workouts: PreviewWorkout[];
    weights: PreviewWeight[];
    draft: PreviewWorkout | null;
};

export const emptyPreviewState: PreviewState = {
    mode: 4,
    week: 1,
    selected: 'push',
    workouts: [],
    weights: [],
    draft: null,
};

export function createPreviewWorkout(
    id: string,
    week: number,
    sessionKey: FitosSessionKey,
    date: string,
    history: PreviewWorkout[] = [],
): PreviewWorkout {
    const sets: Record<string, PreviewSet[]> = {};
    for (const exercise of fitosPlan.sessions[sessionKey].exercises) {
        const prior = [...history]
            .reverse()
            .find((item) => item.finishedAt && item.sets[exercise.key]);
        const priorWeight = prior?.sets[exercise.key].find((set) => set.completed)?.weightKg ?? '';
        sets[exercise.key] = Array.from({ length: exercise.workingSets }, () => ({
            weightKg: priorWeight,
            reps: '',
            completed: false,
        }));
    }
    return { id, week, sessionKey, date, finishedAt: null, sets };
}

export function completedSetCount(workout: PreviewWorkout) {
    return Object.values(workout.sets)
        .flat()
        .filter((set) => set.completed).length;
}

export function totalSetCount(workout: PreviewWorkout) {
    return Object.values(workout.sets).flat().length;
}

export function finishPreviewWorkout(workout: PreviewWorkout, finishedAt: string) {
    if (completedSetCount(workout) === 0) throw new Error('请先完成至少一组');
    const day = new Date(`${workout.date}T00:00:00`);
    const valid =
        /^\d{4}-\d{2}-\d{2}$/.test(workout.date) &&
        !Number.isNaN(day.getTime()) &&
        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}` ===
            workout.date;
    if (!valid) throw new Error('训练日期需为有效的 YYYY-MM-DD');
    return { ...workout, finishedAt };
}

export function getPreviewAdvice(exercise: FitosExercise, workouts: PreviewWorkout[]) {
    const completed = workouts
        .filter((item) => item.finishedAt && item.sets[exercise.key])
        .slice(-2)
        .reverse();
    const toWorkingSets = (workout?: PreviewWorkout) =>
        workout?.sets[exercise.key].map((set) => ({
            weightKg: set.weightKg === '' ? null : Number(set.weightKg),
            reps: set.reps === '' ? null : Number(set.reps),
            completed: set.completed,
        })) ?? [];
    return progressionAdvice(exercise, toWorkingSets(completed[0]), toWorkingSets(completed[1]));
}

export function getPreviewOverview(state: PreviewState, now: Date) {
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const completed = state.workouts.filter((item) => item.finishedAt);
    const thisWeek = completed.filter((item) => {
        const day = new Date(`${item.date}T00:00:00`);
        return day.getTime() >= monday.getTime() && day.getTime() <= now.getTime();
    }).length;
    const recommended = nextThreeDaySession(completed.map((item) => item.sessionKey));
    const latestWeight = [...state.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
        thisWeek,
        completion: weeklyCompletionRate(thisWeek, state.mode),
        recommended,
        latestWeight,
        completedCount: completed.length,
    };
}
