import { Dispatch, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FitosSessionKey, fitosPlan, getPlanWeek } from '../plan';
import { getPreviewAdvice, getPreviewOverview, PreviewState } from './model';
import { Screen } from './App.web';
import { ExerciseCard, labels, PrimaryButton, SecondaryButton, SessionChooser } from './shared';
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
    return (
        <>
            <View style={styles.hero}>
                <Text style={styles.eyebrow}>你的训练控制台</Text>
                <Text style={styles.title}>今天，继续变强。</Text>
                <Text style={styles.muted}>
                    12 周街头健身增肌计划 · 第 {state.week} 周 · {state.mode} 天训练节奏
                </Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${overview.completion}%` }]} />
                </View>
                <Text style={styles.text}>
                    本周完成 {overview.thisWeek} / {state.mode} 次 · {overview.completion}%
                </Text>
                <PrimaryButton
                    label="进入今日训练 →"
                    onPress={() => {
                        if (state.mode === 3) selectSession(overview.recommended);
                        navigate('today');
                    }}
                />
            </View>
            <View style={styles.row}>
                <View style={styles.stat}>
                    <Text style={styles.muted}>建议下一课</Text>
                    <Text style={styles.h3}>
                        {labels[state.mode === 3 ? overview.recommended : state.selected]}
                    </Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.muted}>最近体重</Text>
                    <Text style={styles.big}>
                        {overview.latestWeight ? `${overview.latestWeight.kg} kg` : '—'}
                    </Text>
                </View>
            </View>
            <View style={styles.card}>
                <Text style={styles.h2}>这一周怎么练</Text>
                <Text style={styles.text}>周一 Push · 周二 Pull · 周四 Legs · 周五 Upper</Text>
                <Text style={styles.muted}>
                    周三轻松游泳或主动恢复，周六篮球，周日休息。三天模式跨周轮换四种力量课，不遗漏腿部。
                </Text>
                <SecondaryButton label="查看完整 12 周计划" onPress={() => navigate('plan')} />
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
