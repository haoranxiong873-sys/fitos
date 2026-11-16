import { emptyPreviewState, PreviewState } from './model';

const key = 'fitos:web-preview:v1';

// Browser-only preview adapter. The native app continues to use Expo SQLite.
export function loadPreviewState(): PreviewState {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return emptyPreviewState;
        const value: unknown = JSON.parse(raw);
        if (
            typeof value !== 'object' ||
            value === null ||
            !Array.isArray((value as PreviewState).workouts) ||
            !Array.isArray((value as PreviewState).weights)
        )
            return emptyPreviewState;
        return { ...emptyPreviewState, ...(value as PreviewState) };
    } catch {
        return emptyPreviewState;
    }
}

export function savePreviewState(value: PreviewState): boolean {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function clearPreviewState() {
    window.localStorage.removeItem(key);
}
