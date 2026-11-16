import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Title } from '@/components/typography/title';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        paddingHorizontal: theme.space(4),
    },
}));

export const Header: FC = () => {
    const { t } = useTranslation(['screens']);
    const router = useRouter();

    return (
        <Box style={styles.container}>
            <Title type="h1">{t('home.title', { ns: 'screens' })}</Title>
            <Pressable
                onPress={() => router.push('/fitos')}
                accessibilityRole="button"
                accessibilityLabel="打开 FitOS 训练计划"
            >
                <Text>FitOS · 查看12周训练计划 ›</Text>
            </Pressable>
        </Box>
    );
};
