import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useEditor } from '@/hooks/use-editor';
import { useUser } from '@/hooks/use-user';
import { queryClient } from '@/queries';
import {
    FitosSessionKey,
    fitosPlan,
    getPlanWeek,
    nextThreeDaySession,
    sessionKeys,
    weeklyCompletionRate,
} from '@/fitos/plan';
import { createFitosWorkout, getExerciseProgress, getFitosOverview } from '@/fitos/storage';

type Overview = Awaited<ReturnType<typeof getFitosOverview>>;
type Progress = Awaited<ReturnType<typeof getExerciseProgress>>;

const colors = {
    background: '#101510',
    card: '#1D261E',
    text: '#F5F8F4',
    muted: '#B2BEB3',
    accent: '#A3E635',
};
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 48, gap: 18 },
    title: { color: colors.text, fontSize: 30, fontWeight: '800' },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: { padding: 16, borderRadius: 18, backgroundColor: colors.card, gap: 8 },
    heading: { color: colors.text, fontSize: 19, fontWeight: '700' },
    text: { color: colors.text, fontSize: 15, lineHeight: 22 },
    muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    pill: {
        borderWidth: 1,
        borderColor: '#4B594B',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    pillText: { color: colors.text, fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: '#172006' },
    button: { backgroundColor: colors.accent, borderRadius: 14, padding: 15, alignItems: 'center' },
    buttonText: { color: '#172006', fontWeight: '800', fontSize: 16 },
    divider: { height: 1, backgroundColor: '#354035', marginVertical: 4 },
    smallButton: { paddingVertical: 6, paddingHorizontal: 12 },
});

export default function FitosScreen() {
    const { user } = useUser();
    const userId = user?.id;
    const { navigate } = useEditor();
    const router = useRouter();
    const [mode, setMode] = useState<3 | 4>(4);
    const [week, setWeek] = useState(1);
    const [selected, setSelected] = useState<FitosSessionKey>('push');
    const [overview, setOverview] = useState<Overview | null>(null);
    const [progress, setProgress] = useState<Record<string, Progress>>({});
    const [busy, setBusy] = useState(false);
    const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
    const [timerSeconds, setTimerSeconds] = useState(0);

    const reload = useCallback(() => {
        if (!userId) return;
        void getFitosOverview(userId)
            .then(setOverview)
            .catch(() => Alert.alert('读取失败', '请稍后重试训练数据读取。'));
    }, [userId]);
    useFocusEffect(reload);

    const session = fitosPlan.sessions[selected];
    useEffect(() => {
        if (!userId) return;
        let active = true;
        void Promise.all(
            session.exercises.map(
                async (exercise) =>
                    [exercise.key, await getExerciseProgress(userId, exercise)] as const,
            ),
        )
            .then((entries) => {
                if (active) setProgress(Object.fromEntries(entries));
            })
            .catch(() => {
                if (active) setProgress({});
            });
        return () => {
            active = false;
        };
    }, [selected, userId, overview, session.exercises]);

    useEffect(() => {
        if (timerDeadline == null) return;
        const tick = () =>
            setTimerSeconds(Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000)));
        tick();
        const interval = setInterval(tick, 250);
        return () => clearInterval(interval);
    }, [timerDeadline]);

    const recommended = nextThreeDaySession(overview?.completedKeys ?? []);
    const phase = getPlanWeek(week);
    const completion = weeklyCompletionRate(overview?.thisWeek ?? 0, mode);
    const latestWeight = overview?.latestWeight;
    const dayLabels = useMemo(
        () => ({ push: '周一 Push', pull: '周二 Pull', legs: '周四 Legs', upper: '周五 Upper' }),
        [],
    );

    const create = async () => {
        if (!user?.id || busy) return;
        setBusy(true);
        try {
            const workout = await createFitosWorkout(user.id, week, selected);
            await queryClient.invalidateQueries();
            router.navigate(`/workout/${workout.id}`);
        } catch {
            Alert.alert('创建失败', '训练未能完整创建。请检查本地数据后重试。');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
            <Text style={styles.title}>FitOS 训练计划</Text>
            <Text style={styles.subtitle}>
                12周街头健身增肌模板 · 本地训练记录 · 建议需由你确认
            </Text>

            <View style={styles.card}>
                <Text style={styles.heading}>训练周与节奏</Text>
                <View style={styles.row}>
                    <Pressable
                        style={styles.smallButton}
                        disabled={week === 1}
                        onPress={() => setWeek(week - 1)}
                    >
                        <Text style={styles.text}>◀</Text>
                    </Pressable>
                    <Text style={styles.text}>
                        第 {week} / 12 周 · {phase.phaseName}
                    </Text>
                    <Pressable
                        style={styles.smallButton}
                        disabled={week === 12}
                        onPress={() => setWeek(week + 1)}
                    >
                        <Text style={styles.text}>▶</Text>
                    </Pressable>
                </View>
                <View style={styles.wrap}>
                    {([4, 3] as const).map((value) => (
                        <Pressable
                            key={value}
                            style={[styles.pill, mode === value && styles.pillActive]}
                            onPress={() => setMode(value)}
                        >
                            <Text
                                style={[styles.pillText, mode === value && styles.pillTextActive]}
                            >
                                {value}天力量训练
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.muted}>
                    {mode === 3
                        ? `跨周连续轮换 Push → Pull → Legs → Upper；建议下一课：${fitosPlan.sessions[recommended].name}`
                        : '周一 Push · 周二 Pull · 周四 Legs · 周五 Upper'}
                </Text>
                <Text style={styles.muted}>
                    周三轻松游泳或主动恢复；周六篮球；周日休息。第1–2周可按恢复减少工作组，第7周评估是否减量。
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.heading}>本周完成率 {completion}%</Text>
                <Text style={styles.muted}>
                    已完成 {overview?.thisWeek ?? 0} / {mode} 次力量训练。当前体重：
                    {latestWeight ? `${latestWeight.value} ${latestWeight.unit}` : '暂无记录'}
                </Text>
                <Pressable onPress={() => navigate({ type: 'measurement__create' })}>
                    <Text style={[styles.text, { color: colors.accent }]}>记录体重 ›</Text>
                </Pressable>
            </View>

            <View style={styles.wrap}>
                {sessionKeys.map((key) => (
                    <Pressable
                        key={key}
                        style={[styles.pill, selected === key && styles.pillActive]}
                        onPress={() => setSelected(key)}
                    >
                        <Text style={[styles.pillText, selected === key && styles.pillTextActive]}>
                            {dayLabels[key]}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.heading}>{session.name}</Text>
            <Text style={styles.muted}>
                正式工作组不含热身。一般热身5–8分钟，专项热身5–10分钟。大多数工作组保留1–3次余力。
            </Text>
            {session.exercises.map((exercise, index) => {
                const history = progress[exercise.key];
                const target = exercise.reps
                    ? `${exercise.reps.min}–${exercise.reps.max}次${exercise.reps.perSide ? '/侧' : ''}`
                    : `${exercise.durationSeconds?.min}–${exercise.durationSeconds?.max}秒`;
                const rest =
                    exercise.restSeconds.min === exercise.restSeconds.max
                        ? `${exercise.restSeconds.min}秒`
                        : `${exercise.restSeconds.min}–${exercise.restSeconds.max}秒`;
                return (
                    <View key={`${exercise.key}-${index}`} style={styles.card}>
                        <Text style={styles.heading}>
                            {index + 1}. {exercise.name}
                        </Text>
                        <Text style={styles.text}>
                            {exercise.workingSets}组 × {target} · 休息 {rest}
                        </Text>
                        <Text style={styles.muted}>
                            建议重量：
                            {history?.suggestedWeightKg != null
                                ? `${history.suggestedWeightKg} kg（上次完成重量）`
                                : '按当日动作与余力自行选择'}
                        </Text>
                        <View style={styles.divider} />
                        <Text style={styles.muted}>
                            进阶：
                            {history?.advice.message ?? '完成训练后生成建议；任何加重由你确认。'}
                        </Text>
                    </View>
                );
            })}

            <Pressable style={styles.button} disabled={busy} onPress={() => void create()}>
                <Text style={styles.buttonText}>{busy ? '正在创建…' : '创建本地训练日志'}</Text>
            </Pressable>
            <Text style={styles.muted}>
                创建后在训练页逐组填写重量、次数并标记完成；组间倒计时使用本课休息处方。记录保存在设备
                SQLite。
            </Text>

            <View style={styles.card}>
                <Text style={styles.heading}>快捷休息计时</Text>
                <View style={styles.wrap}>
                    {[60, 90, 120, 180].map((seconds) => (
                        <Pressable
                            key={seconds}
                            style={styles.pill}
                            onPress={() => setTimerDeadline(Date.now() + seconds * 1000)}
                        >
                            <Text style={styles.pillText}>{seconds}秒</Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.text}>
                    {timerSeconds > 0
                        ? `剩余 ${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, '0')}`
                        : '选择休息时长'}
                </Text>
                {timerDeadline != null && (
                    <Pressable
                        onPress={() => {
                            setTimerDeadline(null);
                            setTimerSeconds(0);
                        }}
                    >
                        <Text style={[styles.text, { color: colors.accent }]}>停止计时</Text>
                    </Pressable>
                )}
            </View>
        </ScrollView>
    );
}
