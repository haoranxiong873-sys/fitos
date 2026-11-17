import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FitosSessionKey } from '../plan';
import {
    createPreviewWorkout,
    emptyPreviewState,
    finishPreviewWorkout,
    getPreviewOverview,
    PreviewState,
} from './model';
import { clearPreviewState, loadPreviewState, savePreviewState } from './storage.web';
import { colors, styles } from './styles';
import { newId, todayString } from './shared';
import { HistoryScreen, HomeScreen, PlanScreen, TodayScreen } from './screens';

export type Screen = 'home' | 'plan' | 'today' | 'history';
const tabs: { key: Screen; label: string; icon: string }[] = [
    { key: 'home', label: '概览', icon: '◈' },
    { key: 'plan', label: '计划', icon: '▦' },
    { key: 'today', label: '今日训练', icon: '●' },
    { key: 'history', label: '历史', icon: '↗' },
];

export default function PreviewApp() {
    const [state, setState] = useState<PreviewState>(loadPreviewState);
    const [screen, setScreen] = useState<Screen>('home');
    const [message, setMessage] = useState('');
    const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
    const [remaining, setRemaining] = useState(0);
    const overview = useMemo(() => getPreviewOverview(state, new Date()), [state]);

    useEffect(() => {
        savePreviewState(state);
    }, [state]);
    useEffect(() => {
        if (timerDeadline === null) return;
        const tick = () =>
            setRemaining(Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000)));
        tick();
        const interval = setInterval(tick, 250);
        return () => clearInterval(interval);
    }, [timerDeadline]);

    const selectSession = (key: FitosSessionKey) =>
        setState((current) => ({ ...current, selected: key }));
    const startWorkout = () => {
        setState((current) => ({
            ...current,
            draft: createPreviewWorkout(
                newId(),
                current.week,
                current.selected,
                todayString(),
                current.workouts,
            ),
        }));
        setMessage('训练草稿已创建。逐组填写并标记完成。');
        setScreen('today');
    };
    const editSet = (key: string, index: number, field: 'weightKg' | 'reps', value: string) => {
        if (value && !/^\d*(\.\d{0,2})?$/.test(value)) return;
        setState((current) => {
            if (!current.draft) return current;
            const sets = current.draft.sets[key].map((set, i) =>
                i === index ? { ...set, [field]: value, completed: false } : set,
            );
            return {
                ...current,
                draft: { ...current.draft, sets: { ...current.draft.sets, [key]: sets } },
            };
        });
    };
    const toggleSet = (key: string, index: number) => {
        const set = state.draft?.sets[key][index];
        if (!set) return;
        if (!set.completed && (set.reps === '' || Number(set.reps) <= 0)) {
            setMessage('先填写有效的次数或持续秒数。');
            return;
        }
        setState((current) => {
            if (!current.draft) return current;
            const sets = current.draft.sets[key].map((item, i) =>
                i === index ? { ...item, completed: !item.completed } : item,
            );
            return {
                ...current,
                draft: { ...current.draft, sets: { ...current.draft.sets, [key]: sets } },
            };
        });
        setMessage(set.completed ? '已取消该组完成状态。' : '已记录这一组。');
    };
    const finishWorkout = () => {
        if (!state.draft) return;
        try {
            const finished = finishPreviewWorkout(state.draft, new Date().toISOString());
            setState((current) => ({
                ...current,
                workouts: [...current.workouts, finished],
                draft: null,
            }));
            setMessage('训练已保存到此浏览器。');
            setScreen('history');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '请检查训练记录。');
        }
    };
    const addWeight = (input: string) => {
        const kg = Number(input);
        if (!input || !Number.isFinite(kg) || kg <= 0 || kg > 500) {
            setMessage('请输入有效体重（kg）。');
            return false;
        }
        setState((current) => ({
            ...current,
            weights: [...current.weights, { id: newId(), date: todayString(), kg }],
        }));
        setMessage('体重已保存到此浏览器。');
        return true;
    };
    const clear = () => {
        if (!window.confirm('清除此浏览器中的 FitOS 预览训练和体重记录？此操作无法撤销。')) return;
        clearPreviewState();
        setState(emptyPreviewState);
        setMessage('浏览器预览记录已清空。');
    };

    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.container}>
            <View style={styles.between}>
                <Text style={styles.brand}>FITOS / 训练预览</Text>
                <Text style={styles.muted}>WEB · 本地预览</Text>
            </View>
            <View style={styles.nav}>
                {tabs.map((tab) => (
                    <Pressable
                        key={tab.key}
                        accessibilityRole="button"
                        onPress={() => {
                            setScreen(tab.key);
                            setMessage('');
                        }}
                        style={[styles.navItem, screen === tab.key && styles.navActive]}
                    >
                        <Text style={[styles.navText, screen === tab.key && styles.navTextActive]}>
                            {tab.icon} {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
            {message !== '' && (
                <Text accessibilityRole="alert" style={[styles.muted, { color: colors.lime }]}>
                    {message}
                </Text>
            )}
            {screen === 'home' && (
                <HomeScreen
                    state={state}
                    overview={overview}
                    navigate={setScreen}
                    selectSession={selectSession}
                />
            )}
            {screen === 'plan' && (
                <PlanScreen
                    state={state}
                    setState={setState}
                    overview={overview}
                    navigate={setScreen}
                    selectSession={selectSession}
                />
            )}
            {screen === 'today' && (
                <TodayScreen
                    state={state}
                    setState={setState}
                    navigate={setScreen}
                    selectSession={selectSession}
                    start={startWorkout}
                    editSet={editSet}
                    toggleSet={toggleSet}
                    finish={finishWorkout}
                    timerDeadline={timerDeadline}
                    setTimerDeadline={setTimerDeadline}
                    remaining={remaining}
                    setRemaining={setRemaining}
                />
            )}
            {screen === 'history' && (
                <HistoryScreen
                    state={state}
                    overview={overview}
                    addWeight={addWeight}
                    clear={clear}
                />
            )}
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>
                FITOS WEB PREVIEW · 浏览器本地数据 · 无 HealthKit 连接
            </Text>
        </ScrollView>
    );
}
