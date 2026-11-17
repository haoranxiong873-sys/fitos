import { Dispatch, SetStateAction, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { FitosSessionKey, fitosPlan } from '../plan';
import {
    completedSetCount,
    getPreviewAdvice,
    getPreviewOverview,
    PreviewState,
    totalSetCount,
} from './model';
import { Screen } from './App.web';
import { labels, prescription, PrimaryButton, SecondaryButton, SessionChooser } from './shared';
import { colors, styles } from './styles';

export function TodayScreen({
    state,
    setState,
    selectSession,
    start,
    editSet,
    toggleSet,
    finish,
    setTimerDeadline,
    remaining,
    setRemaining,
}: {
    state: PreviewState;
    setState: Dispatch<SetStateAction<PreviewState>>;
    navigate: (screen: Screen) => void;
    selectSession: (key: FitosSessionKey) => void;
    start: () => void;
    editSet: (key: string, index: number, field: 'weightKg' | 'reps', value: string) => void;
    toggleSet: (key: string, index: number) => void;
    finish: () => void;
    timerDeadline: number | null;
    setTimerDeadline: (deadline: number | null) => void;
    remaining: number;
    setRemaining: (seconds: number) => void;
}) {
    return (
        <>
            <Text style={styles.title}>今日训练</Text>
            <Text style={styles.muted}>
                第 {state.week} 周 ·
                选课后创建训练草稿。重量和次数由你填写；预览不会自动修改训练计划。
            </Text>
            {!state.draft ? (
                <>
                    <SessionChooser selected={state.selected} onSelect={selectSession} />
                    <View style={styles.hero}>
                        <Text style={styles.eyebrow}>准备开始</Text>
                        <Text style={styles.h2}>{fitosPlan.sessions[state.selected].name}</Text>
                        <Text style={styles.muted}>
                            {fitosPlan.sessions[state.selected].exercises.length} 个动作 · 约 60–80
                            分钟（含热身）
                        </Text>
                        <PrimaryButton label="开始并创建训练日志" onPress={start} />
                    </View>
                </>
            ) : (
                <>
                    <View style={styles.card}>
                        <View style={styles.between}>
                            <Text style={styles.h2}>{labels[state.draft.sessionKey]}</Text>
                            <Text style={styles.eyebrow}>
                                {completedSetCount(state.draft)}/{totalSetCount(state.draft)} 组
                            </Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${Math.round((completedSetCount(state.draft) / totalSetCount(state.draft)) * 100)}%`,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.muted}>训练日期（本地）</Text>
                        <TextInput
                            accessibilityLabel="训练日期"
                            value={state.draft.date}
                            onChangeText={(date) =>
                                setState((current) =>
                                    current.draft
                                        ? { ...current, draft: { ...current.draft, date } }
                                        : current,
                                )
                            }
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.muted}
                        />
                    </View>
                    {fitosPlan.sessions[state.draft.sessionKey].exercises.map((exercise) => (
                        <View key={exercise.key} style={styles.card}>
                            <Text style={styles.h3}>{exercise.name}</Text>
                            <Text style={styles.muted}>{prescription(exercise)}</Text>
                            <View style={styles.setRow}>
                                <Text style={[styles.muted, { width: 36 }]}>组</Text>
                                {!exercise.durationSeconds && (
                                    <Text style={[styles.muted, { width: 72 }]}>重量 kg</Text>
                                )}
                                <Text style={[styles.muted, { width: 68 }]}>
                                    {exercise.durationSeconds ? '持续秒数' : '次数'}
                                </Text>
                                <Text style={styles.muted}>状态</Text>
                            </View>
                            {state.draft?.sets[exercise.key].map((set, index) => (
                                <View key={index} style={styles.setRow}>
                                    <Text style={[styles.text, { width: 36 }]}>#{index + 1}</Text>
                                    {!exercise.durationSeconds && (
                                        <TextInput
                                            accessibilityLabel={`${exercise.name}第${index + 1}组重量`}
                                            keyboardType="decimal-pad"
                                            value={set.weightKg}
                                            onChangeText={(value) =>
                                                editSet(exercise.key, index, 'weightKg', value)
                                            }
                                            placeholder="kg"
                                            placeholderTextColor={colors.muted}
                                            style={[styles.input, { width: 72 }]}
                                        />
                                    )}
                                    <TextInput
                                        accessibilityLabel={`${exercise.name}第${index + 1}组${exercise.durationSeconds ? '秒数' : '次数'}`}
                                        keyboardType="number-pad"
                                        value={set.reps}
                                        onChangeText={(value) =>
                                            editSet(exercise.key, index, 'reps', value)
                                        }
                                        placeholder={exercise.durationSeconds ? '秒' : '次'}
                                        placeholderTextColor={colors.muted}
                                        style={[styles.input, { width: 68 }]}
                                    />
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`${exercise.name}第${index + 1}组${set.completed ? '取消完成' : '标记完成'}`}
                                        onPress={() => toggleSet(exercise.key, index)}
                                        style={set.completed ? styles.done : styles.notDone}
                                    >
                                        <Text
                                            style={
                                                set.completed
                                                    ? styles.pillTextActive
                                                    : styles.pillText
                                            }
                                        >
                                            {set.completed ? '✓ 已完成' : '完成'}
                                        </Text>
                                    </Pressable>
                                </View>
                            ))}
                            <Text style={styles.muted}>
                                进阶参考：{getPreviewAdvice(exercise, state.workouts).message}
                            </Text>
                        </View>
                    ))}
                    <PrimaryButton label="保存并结束训练" onPress={finish} />
                    <SecondaryButton
                        label="放弃草稿"
                        onPress={() => {
                            if (window.confirm('放弃当前训练草稿？'))
                                setState((current) => ({ ...current, draft: null }));
                        }}
                    />
                </>
            )}
            <View style={styles.card}>
                <Text style={styles.h2}>组间休息</Text>
                <Text style={[styles.big, { color: colors.primary }]}>
                    {remaining > 0
                        ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                        : '00:00'}
                </Text>
                <View style={styles.wrap}>
                    {[60, 90, 120, 180].map((seconds) => (
                        <Pressable
                            key={seconds}
                            accessibilityRole="button"
                            onPress={() => setTimerDeadline(Date.now() + seconds * 1000)}
                            style={styles.pill}
                        >
                            <Text style={styles.pillText}>{seconds} 秒</Text>
                        </Pressable>
                    ))}
                </View>
                <Pressable
                    onPress={() => {
                        setTimerDeadline(null);
                        setRemaining(0);
                    }}
                >
                    <Text style={[styles.muted, { color: colors.primary }]}>停止计时</Text>
                </Pressable>
            </View>
        </>
    );
}

export function HistoryScreen({
    state,
    overview,
    addWeight,
    clear,
}: {
    state: PreviewState;
    overview: ReturnType<typeof getPreviewOverview>;
    addWeight: (input: string) => boolean;
    clear: () => void;
}) {
    const [weightInput, setWeightInput] = useState('');
    const chartWeights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
    const minWeight = Math.min(...chartWeights.map((entry) => entry.kg));
    const maxWeight = Math.max(...chartWeights.map((entry) => entry.kg));
    return (
        <>
            <Text style={styles.title}>训练历史</Text>
            <Text style={styles.muted}>
                记录保存在当前浏览器。刷新页面后仍可查看；不会同步至原生 App。
            </Text>
            <View style={styles.card}>
                <Text style={styles.h2}>体重趋势</Text>
                <View style={styles.row}>
                    <TextInput
                        accessibilityLabel="记录体重千克"
                        keyboardType="decimal-pad"
                        value={weightInput}
                        onChangeText={setWeightInput}
                        placeholder="体重 kg"
                        placeholderTextColor={colors.muted}
                        style={[styles.input, { flex: 1 }]}
                    />
                    <Pressable
                        accessibilityRole="button"
                        style={styles.primary}
                        onPress={() => {
                            if (addWeight(weightInput)) setWeightInput('');
                        }}
                    >
                        <Text style={styles.primaryText}>记录</Text>
                    </Pressable>
                </View>
                {state.weights.length === 0 ? (
                    <Text style={styles.muted}>尚无体重记录。</Text>
                ) : (
                    <>
                        <Text style={styles.muted}>
                            最近 {chartWeights.length} 条 · {minWeight}–{maxWeight} kg
                        </Text>
                        <View style={[styles.row, { height: 120, alignItems: 'flex-end' }]}>
                            {chartWeights.map((entry) => (
                                <View
                                    key={entry.id}
                                    style={{ flex: 1, alignItems: 'center', gap: 5 }}
                                >
                                    <Text style={styles.muted}>{entry.kg}</Text>
                                    <View
                                        style={{
                                            width: '70%',
                                            height:
                                                22 +
                                                (maxWeight === minWeight
                                                    ? 0
                                                    : ((entry.kg - minWeight) /
                                                          (maxWeight - minWeight)) *
                                                      62),
                                            backgroundColor: colors.primary,
                                            borderRadius: 7,
                                        }}
                                    />
                                    <Text style={styles.muted}>{entry.date.slice(5)}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </View>
            <Text style={styles.h2}>已完成的训练 · {overview.completedCount}</Text>
            {state.workouts.length === 0 ? (
                <View style={styles.card}>
                    <Text style={styles.muted}>
                        尚无训练日志。到「今日训练」完成一堂训练后，会出现在这里。
                    </Text>
                </View>
            ) : (
                [...state.workouts].reverse().map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.between}>
                            <Text style={styles.h3}>{labels[item.sessionKey]}</Text>
                            <Text style={styles.eyebrow}>第 {item.week} 周</Text>
                        </View>
                        <Text style={styles.muted}>
                            {item.date} · 完成 {completedSetCount(item)} / {totalSetCount(item)} 组
                        </Text>
                        {fitosPlan.sessions[item.sessionKey].exercises
                            .filter((exercise) =>
                                item.sets[exercise.key]?.some((set) => set.completed),
                            )
                            .map((exercise) => (
                                <Text key={exercise.key} style={styles.muted}>
                                    {exercise.name}：
                                    {item.sets[exercise.key]
                                        .filter((set) => set.completed)
                                        .map(
                                            (set) =>
                                                `${set.weightKg ? `${set.weightKg}kg×` : ''}${set.reps}${exercise.durationSeconds ? '秒' : '次'}`,
                                        )
                                        .join(' / ')}
                                </Text>
                            ))}
                    </View>
                ))
            )}
            <SecondaryButton label="清空此浏览器的预览记录" onPress={clear} />
        </>
    );
}
