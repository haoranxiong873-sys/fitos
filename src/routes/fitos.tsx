import { useAnalyticsScreen } from '@/hooks/use-analytics-screen';
import FitosScreen from '@/screens/fitos';

export default function FitosRoute() {
    useAnalyticsScreen('fitos_plan');
    return <FitosScreen />;
}
