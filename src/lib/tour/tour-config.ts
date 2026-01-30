export type TourStepId =
    | 'welcome'
    | 'start-cinematic'
    | 'music-toggle'
    | 'music-tabs'
    | 'player-controls'
    | 'search-toggle'
    | 'nav-hub'
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
        popover: {
            title: 'Welcome to MetaDJ Nexus',
            description: 'Your creative hub for music, visuals, and AI-powered exploration. Let\'s take a quick tour of the key features.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#tour-start-cinematic',
        popover: {
            title: 'Enter Cinema',
            description: 'Start the signature experience — immersive visuals synced to MetaDJ\'s original music.',
            side: 'bottom',
            align: 'start',
        },
    },
    {
        element: '#tour-toggle-music',
        popover: {
            title: 'Music Library',
            description: 'Browse all tracks and collections. Click to expand the full music panel.',
            side: 'bottom',
            align: 'start',
        },
    },
    {
        element: '#tour-music-tabs',
        popover: {
            title: 'Browse • Playlists • Queue',
            description: 'Switch between the full catalog, your saved playlists, and the current playback queue.',
            side: 'right',
            align: 'start',
        },
    },
    {
        element: '#metadj-audio-player',
        popover: {
            title: 'Audio Player',
            description: 'Full playback controls — play/pause, skip, shuffle, repeat, volume, and enter Cinema mode.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#tour-search-toggle',
        popover: {
            title: 'Quick Search',
            description: 'Instantly find tracks, collections, and content across the entire platform.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#tour-nav-hub',
        popover: {
            title: 'Hub',
            description: 'Your home base — discover featured content, news, events, and wisdom highlights.',
            side: 'bottom',
        },
    },
    {
        element: '#tour-nav-cinema',
        popover: {
            title: 'Cinema',
            description: 'Full-screen visual experience with dynamic visualizers and ambient scenes.',
            side: 'bottom',
        },
    },
    {
        element: '#tour-nav-wisdom',
        popover: {
            title: 'Wisdom',
            description: 'Explore Thoughts, Guides, and Reflections — creative insights and production philosophy.',
            side: 'bottom',
        },
    },
    {
        element: '#tour-nav-journal',
        popover: {
            title: 'Journal',
            description: 'Your private creative notebook — capture ideas, drafts, and reflections locally.',
            side: 'bottom',
        },
    },
    {
        element: '#tour-toggle-ai',
        popover: {
            title: 'MetaDJai',
            description: 'Your AI creative companion — get personalized guidance, answer questions, and explore the platform.',
            side: 'bottom',
            align: 'end',
        },
    },
    {
        element: '#tour-toggle-guide',
        popover: {
            title: 'Help & Guide',
            description: 'Access the user guide anytime for tips, keyboard shortcuts, and feature documentation.',
            side: 'bottom',
            align: 'end',
        },
    },
    {
        popover: {
            title: 'Ready to Explore',
            description: 'Start in the Hub, play some music, then dive into Cinema, Wisdom, or chat with MetaDJai.',
            side: 'top',
            align: 'center',
        },
    },
];
