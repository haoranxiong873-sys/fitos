import { Pressable, Text, View } from 'react-native';
import { FitosExercise, FitosSessionKey, sessionKeys } from '../plan';
import { styles } from './styles';

export const labels: Record<FitosSessionKey, string> = {
    push: 'Push · 胸肩三头',
    pull: 'Pull · 背部二头',
    legs: 'Legs · 腿部核心',
    upper: 'Upper · 街头上肢',
};

export const todayString = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function prescription(exercise: FitosExercise) {
    const target = exercise.reps
        ? `${exercise.reps.min}–${exercise.reps.max} 次${exercise.reps.perSide ? '/侧' : ''}`
        : `${exercise.durationSeconds?.min}–${exercise.durationSeconds?.max} 秒`;
    const rest =
        exercise.restSeconds.min === exercise.restSeconds.max
            ? `${exercise.restSeconds.min} 秒`
            : `${exercise.restSeconds.min}–${exercise.restSeconds.max} 秒`;
    return `${exercise.workingSets} 组 × ${target} · 休息 ${rest}`;
}

export function SessionChooser({
    selected,
    onSelect,
}: {
    selected: FitosSessionKey;
    onSelect: (key: FitosSessionKey) => void;
}) {
    return (
        <View style={styles.wrap}>
            {sessionKeys.map((key) => (
                <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`选择${labels[key]}`}
                    onPress={() => onSelect(key)}
                    style={[styles.pill, selected === key && styles.pillActive]}
                >
                    <Text style={[styles.pillText, selected === key && styles.pillTextActive]}>
                        {labels[key]}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable accessibilityRole="button" style={styles.primary} onPress={onPress}>
            <Text style={styles.primaryText}>{label}</Text>
        </Pressable>
    );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={onPress}>
            <Text style={styles.secondaryText}>{label}</Text>
        </Pressable>
    );
}

export function ExerciseCard({
    exercise,
    index,
    advice,
    suggestedWeight,
}: {
    exercise: FitosExercise;
    index: number;
    advice: string;
    suggestedWeight?: string;
}) {
    return (
        <View style={styles.card}>
            <Text style={styles.eyebrow}>动作 {String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.h3}>{exercise.name}</Text>
            <Text style={styles.text}>{prescription(exercise)}</Text>
            <Text style={styles.muted}>
                建议重量：
                {exercise.durationSeconds
                    ? '计时动作，无需重量'
                    : suggestedWeight
                      ? `${suggestedWeight} kg（上次完成重量）`
                      : '按当天状态自行选择'}
            </Text>
            <View style={styles.rule} />
            <Text style={styles.muted}>进阶：{advice}</Text>
        </View>
    );
}
