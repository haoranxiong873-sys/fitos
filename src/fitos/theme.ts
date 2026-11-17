/** FitOS Visual Design System V2. Shared by the native training screen and Web preview. */
export const fitosTheme = {
    colors: {
        background: '#F5FAF8',
        primary: '#008F7A',
        primarySoft: '#DDF4EC',
        heading: '#183B35',
        card: '#FFFFFF',
        muted: '#6F8A83',
        border: '#E1ECE7',
        text: '#31564E',
        subtle: '#EEF6F2',
        progressTrack: '#D9EAE2',
        shadow: '#245D4E',
        warning: '#B36B22',
        danger: '#A74B50',
        onPrimary: '#FFFFFF',
    },
    radius: { small: 10, medium: 14, large: 20, pill: 999 },
    space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 },
    shadow: {
        shadowColor: '#245D4E',
        shadowOpacity: 0.07,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
} as const;
