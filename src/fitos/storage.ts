import { and, asc, desc, eq, inArray, like } from 'drizzle-orm';

import { db } from '@/db';
import { exercise, exerciseSet, measurement, workout, workoutExercise } from '@/db/schema';
import { createExercise, createExerciseSet } from '@/crud/exercise';
import {
    createWorkout,
    createWorkoutExercise,
    createWorkoutGroup,
    deleteWorkout,
} from '@/crud/workout';
import { FitosExercise, FitosSessionKey, fitosPlan, progressionAdvice } from './plan';

const sourceId = (key: string) => `fitos:v1:${key}`;
const workoutName = (week: number, key: FitosSessionKey) =>
    `FitOS 第${week}周 ${fitosPlan.sessions[key].name} #${key}`;

async function findOrCreateExercise(userId: string, prescribed: FitosExercise) {
    const existing = await db
        .select()
        .from(exercise)
        .where(
            and(eq(exercise.userId, userId), eq(exercise.skulptSourceId, sourceId(prescribed.key))),
        )
        .limit(1);
    if (existing[0]) return existing[0];
    return createExercise({
        userId,
        name: prescribed.name,
        category: 'strength',
        source: 'user',
        skulptSourceId: sourceId(prescribed.key),
        tracking: prescribed.durationSeconds ? ['time'] : ['weight', 'reps'],
        weightUnits: prescribed.durationSeconds ? null : 'kg',
        timeOptions: prescribed.durationSeconds ? 'timer' : null,
    });
}

export async function getExerciseProgress(userId: string, prescribed: FitosExercise) {
    const rows = await db
        .select({
            workoutId: workout.id,
            workoutCompletedAt: workout.completedAt,
            order: exerciseSet.order,
            reps: exerciseSet.reps,
            weight: exerciseSet.weight,
            completedAt: exerciseSet.completedAt,
        })
        .from(exerciseSet)
        .innerJoin(workoutExercise, eq(exerciseSet.workoutExerciseId, workoutExercise.id))
        .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
        .innerJoin(exercise, eq(workoutExercise.exerciseId, exercise.id))
        .where(
            and(
                eq(workout.userId, userId),
                eq(workout.status, 'completed'),
                eq(exercise.skulptSourceId, sourceId(prescribed.key)),
                eq(exerciseSet.type, 'working'),
            ),
        )
        .orderBy(desc(workout.completedAt), asc(exerciseSet.order));
    const sessions = new Map<string, typeof rows>();
    for (const row of rows) {
        if (!sessions.has(row.workoutId)) sessions.set(row.workoutId, []);
        sessions.get(row.workoutId)!.push(row);
    }
    const [latest = [], previous = []] = [...sessions.values()];
    const asWorkingSets = (session: typeof rows) =>
        session.map((row) => ({
            reps: row.reps,
            weightKg: row.weight,
            completed: row.completedAt != null,
        }));
    return {
        suggestedWeightKg:
            latest.find((row) => row.completedAt != null && row.weight != null)?.weight ?? null,
        advice: progressionAdvice(prescribed, asWorkingSets(latest), asWorkingSets(previous)),
    };
}

export async function createFitosWorkout(userId: string, week: number, key: FitosSessionKey) {
    const name = workoutName(week, key);
    const existing = await db
        .select()
        .from(workout)
        .where(
            and(
                eq(workout.userId, userId),
                eq(workout.name, name),
                inArray(workout.status, ['planned', 'in_progress']),
            ),
        )
        .limit(1);
    if (existing[0]) return existing[0];
    const prescriptions = fitosPlan.sessions[key].exercises;
    // Resolve exercises before creating the workout to avoid an empty planned workout on a catalogue error.
    const exercises = await Promise.all(
        prescriptions.map((item) => findOrCreateExercise(userId, item)),
    );
    const history = await Promise.all(
        prescriptions.map((item) => getExerciseProgress(userId, item)),
    );
    const createdWorkout = await createWorkout({
        userId,
        name,
        status: 'planned',
        startAt: new Date(),
    });
    try {
        for (let index = 0; index < prescriptions.length; index += 1) {
            const prescribed = prescriptions[index];
            const group = await createWorkoutGroup({
                workoutId: createdWorkout.id,
                order: index,
                type: 'single',
            });
            const item = await createWorkoutExercise({
                workoutId: createdWorkout.id,
                exerciseId: exercises[index].id,
                groupId: group.id,
                orderInGroup: 0,
            });
            for (let setIndex = 0; setIndex < prescribed.workingSets; setIndex += 1) {
                await createExerciseSet({
                    workoutExerciseId: item.id,
                    order: setIndex,
                    type: 'working',
                    weight: prescribed.durationSeconds ? null : history[index].suggestedWeightKg,
                    weightUnits: prescribed.durationSeconds ? null : 'kg',
                    reps: null,
                    time: null,
                    restTime: prescribed.restSeconds.min,
                });
            }
        }
    } catch (error) {
        await deleteWorkout(createdWorkout.id);
        throw error;
    }
    return createdWorkout;
}

export async function getFitosOverview(userId: string) {
    const workouts = await db
        .select()
        .from(workout)
        .where(and(eq(workout.userId, userId), like(workout.name, 'FitOS 第%')))
        .orderBy(asc(workout.completedAt));
    const completed = workouts.filter((item) => item.status === 'completed' && item.completedAt);
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const thisWeek = completed.filter((item) => item.completedAt! >= monday).length;
    const completedKeys = completed
        .map((item) => /#(push|pull|legs|upper)$/.exec(item.name)?.[1])
        .filter(
            (key): key is FitosSessionKey =>
                key != null && ['push', 'pull', 'legs', 'upper'].includes(key),
        );
    const latestWeight = await db
        .select()
        .from(measurement)
        .where(and(eq(measurement.userId, userId), eq(measurement.metric, 'body_weight')))
        .orderBy(desc(measurement.recordedAt))
        .limit(1);
    return { workouts, thisWeek, completedKeys, latestWeight: latestWeight[0] ?? null };
}
