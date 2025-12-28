export type TourStepId =
    | 'start-cinematic'
    | 'music-toggle'
    | 'music-tabs'
    | 'player-controls'
    | 'search-toggle'
    | 'nav-cinema'
    | 'nav-wisdom'
    | 'nav-journal'
    | 'ai-panel'
    | 'guide-toggle'
    | 'final';

export interface TourStep {
    element?: string;
    popover: {
        title: string;
        description: string;
        side?: 'top' | 'bottom' | 'left' | 'right';
        align?: 'start' | 'center' | 'end';
    };
}

export const GLOBAL_TOUR_STEPS: TourStep[] = [
    {
        element: '#tour-start-cinematic',
        popover: {
            title: 'Start Cinematic Experience',
            description: 'Launch the hero track and open Cinema for a full-screen visual layer.',
            side: 'bottom',
            align: 'start',
        },
    },
    {
        element: '#tour-toggle-music',
        popover: {
            title: 'Music Panel',
            description: 'Open the Music panel for Library, Playlists, and your Queue.',
            side: 'bottom',
            align: 'start',
        },
    },
    {
        element: '#tour-music-tabs',
        popover: {
            title: 'Library • Playlists • Queue',
            description: 'Jump between the catalog, saved sets, and the active queue.',
            side: 'right',
            align: 'start',
        },
    },
    {
        element: '#metadj-audio-player',
        popover: {
            title: 'Player Controls',
            description: 'Control playback, shuffle, repeat, volume, and full-screen mode.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#tour-search-toggle',
        popover: {
            title: 'Search',
            description: 'Search tracks and collections from anywhere in the app.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#tour-nav-cinema',
        popover: {
            title: 'Cinema',
            description: 'Switch to Cinema for visualizers, scenes, and Dream overlays (when Daydream is configured).',
            side: 'bottom',
        },
    },
    {
        element: '#tour-nav-wisdom',
        popover: {
            title: 'Wisdom',
            description: 'Thoughts, Guides, and Reflections behind the music.',
            side: 'bottom',
        },
    },
    {
        element: '#tour-nav-journal',
        popover: {
            title: 'Journal',
            description: 'A private, local-first space to capture ideas and drafts.',
            side: 'bottom',
        },
    },
    {
        element: '#tour-toggle-ai',
        popover: {
            title: 'MetaDJai',
            description: 'Your creative companion for guidance, prompts, and context-aware help.',
            side: 'bottom',
            align: 'end',
        },
    },
    {
        element: '#tour-toggle-guide',
        popover: {
            title: 'User Guide',
            description: 'Open the guide anytime for quick starts, shortcuts, and deep dives.',
            side: 'bottom',
            align: 'end',
        },
    },
    {
        popover: {
            title: "You're Set",
            description: 'Start in the Hub, cue a track, then dive into Cinema, Wisdom, Journal, or MetaDJai when inspiration hits.',
            side: 'top',
            align: 'center',
        },
    },
];
