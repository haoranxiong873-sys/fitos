import { Dispatch, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FitosSessionKey, fitosPlan, getPlanWeek, sessionKeys } from '../plan';
import { getPreviewAdvice, getPreviewOverview, PreviewState } from './model';
import { Screen } from './App.web';
import { ExerciseCard, labels, PrimaryButton, SessionChooser } from './shared';
import { styles } from './styles';

type Overview = ReturnType<typeof getPreviewOverview>;
type BaseProps = { state: PreviewState; overview: Overview; navigate: (screen: Screen) => void };

export function HomeScreen({
    state,
    overview,
    navigate,
    selectSession,
}: BaseProps & {
    selectSession: (key: FitosSessionKey) => void;
}) {
    const phase = getPlanWeek(state.week).phaseName;
    const nextIndex = sessionKeys.indexOf(overview.recommended);
    const strengthDays =
        state.mode === 4
            ? [
                  { day: '周一', title: labels.push, detail: '60–80 分钟' },
                  { day: '周二', title: labels.pull, detail: '60–80 分钟' },
                  { day: '周四', title: labels.legs, detail: '60–80 分钟' },
                  { day: '周五', title: labels.upper, detail: '60–80 分钟' },
              ]
            : Array.from({ length: 3 }, (_, index) => ({
                  day: `第${index + 1}课`,
                  title: labels[sessionKeys[(nextIndex + index) % sessionKeys.length]],
                  detail: '训练日自选',
              }));
    return (
        <>
            <View>
                <Text style={styles.eyebrow}>欢迎来到 FitOS</Text>
                <Text style={styles.title}>让每一次训练都算数。</Text>
                <Text style={styles.muted}>清晰计划、认真记录，按自己的节奏进步。</Text>
            </View>
            <View style={styles.hero}>
                <Text style={styles.eyebrow}>本周训练进度</Text>
                <Text style={styles.big}>
                    {overview.thisWeek} / {state.mode} 次
                </Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${overview.completion}%` }]} />
                </View>
                <Text style={styles.muted}>
                    完成率 {overview.completion}% · 正在查看第 {state.week} 周
                </Text>
                <View style={styles.rule} />
                <View style={styles.between}>
                    <Text style={styles.muted}>下一次训练（建议）</Text>
                    <Text style={styles.h3}>{labels[overview.recommended]}</Text>
                </View>
                <PrimaryButton
                    label="开始训练"
                    onPress={() => {
                        selectSession(overview.recommended);
                        navigate('today');
                    }}
                />
            </View>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
                <View style={styles.stat}>
                    <Text style={styles.muted}>计划阶段 · 第 {state.week} 周</Text>
                    <Text style={styles.h3}>{phase}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.muted}>最近体重</Text>
                    <Text style={styles.h3}>
                        {overview.latestWeight ? `${overview.latestWeight.kg} kg` : '暂无记录'}
                    </Text>
                </View>
            </View>
            <View style={styles.card}>
                <Text style={styles.h2}>本周训练安排</Text>
                {strengthDays.map((item) => (
                    <View key={item.day} style={styles.scheduleRow}>
                        <Text style={styles.scheduleDay}>{item.day}</Text>
                        <Text style={[styles.text, { flex: 1 }]}>{item.title}</Text>
                        <Text style={styles.muted}>{item.detail}</Text>
                    </View>
                ))}
                <Text style={styles.muted}>
                    {state.mode === 3
                        ? '三天模式跨周轮换四种力量课；周三可轻松游泳，周六篮球，周日休息。'
                        : '周三轻松游泳或主动恢复；周六篮球；周日休息。'}
                </Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.h2}>预览数据说明</Text>
                <Text style={styles.muted}>
                    此浏览器预览使用 localStorage，仅保存在当前浏览器；与 iPhone 的 SQLite
                    日志不同步。这里不读取 HealthKit 或 Apple Watch 数据。
                </Text>
            </View>
        </>
    );
}

export function PlanScreen({
    state,
    setState,
    overview,
    navigate,
    selectSession,
}: BaseProps & {
    setState: Dispatch<SetStateAction<PreviewState>>;
    selectSession: (key: FitosSessionKey) => void;
}) {
    return (
        <>
            <Text style={styles.title}>12 周训练计划</Text>
            <Text style={styles.muted}>
                按训练表现与恢复调整进度；第 7 周只评估是否减量，不自动更改。
            </Text>
            <View style={styles.card}>
                <Text style={styles.h3}>选择训练周</Text>
                <View style={styles.wrap}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
                        <Pressable
                            key={week}
                            accessibilityRole="button"
                            onPress={() => setState((current) => ({ ...current, week }))}
                            style={[styles.pill, state.week === week && styles.pillActive]}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    state.week === week && styles.pillTextActive,
                                ]}
                            >
                                {week}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.text}>
                    第 {state.week} 周 · {getPlanWeek(state.week).phaseName}
                </Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.h3}>每周力量训练</Text>
                <View style={styles.wrap}>
                    {([4, 3] as const).map((mode) => (
                        <Pressable
                            key={mode}
                            accessibilityRole="button"
                            onPress={() => setState((current) => ({ ...current, mode }))}
                            style={[styles.pill, state.mode === mode && styles.pillActive]}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    state.mode === mode && styles.pillTextActive,
                                ]}
                            >
                                {mode} 天版本
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.muted}>
                    {state.mode === 3
                        ? `跨周轮换 Push → Pull → Legs → Upper。下一课建议：${labels[overview.recommended]}；训练日由你安排。`
                        : '周一 Push · 周二 Pull · 周四 Legs · 周五 Upper。'}
                </Text>
            </View>
            <SessionChooser selected={state.selected} onSelect={selectSession} />
            <Text style={styles.h2}>{fitosPlan.sessions[state.selected].name}</Text>
            <Text style={styles.muted}>
                正式工作组不含热身。一般热身 5–8 分钟，专项热身 5–10 分钟；大多数组保留 1–3 次余力。
            </Text>
            {fitosPlan.sessions[state.selected].exercises.map((exercise, index) => {
                const prior = [...state.workouts]
                    .reverse()
                    .find((item) => item.finishedAt && item.sets[exercise.key]);
                const suggestedWeight = prior?.sets[exercise.key].find(
                    (set) => set.completed,
                )?.weightKg;
                return (
                    <ExerciseCard
                        key={exercise.key}
                        exercise={exercise}
                        index={index}
                        suggestedWeight={suggestedWeight}
                        advice={getPreviewAdvice(exercise, state.workouts).message}
                    />
                );
            })}
            <PrimaryButton label="去记录这堂训练 →" onPress={() => navigate('today')} />
        </>
    );
}
