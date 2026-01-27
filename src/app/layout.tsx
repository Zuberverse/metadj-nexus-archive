import { Cinzel, Poppins } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import { GlobalScreenReaderRegions } from '@/components/accessibility/ScreenReaderAnnouncer';
import { AppErrorBoundary } from '@/components/error';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { PlaylistProvider } from '@/contexts/PlaylistContext';
import { QueueProvider } from '@/contexts/QueueContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { TourProvider } from '@/contexts/TourContext';
import { UIProvider } from '@/contexts/UIContext';
import tracks from '@/data/music.json';
import { getAppBaseUrl } from '@/lib/app-url';
import { FEATURED_TRACK_IDS } from '@/lib/app.constants';
// Axe-core disabled - run accessibility audits manually via Playwright or Lighthouse
// import { initAxe } from '@/lib/axe';
import { generateArtistSchema, generateWebsiteSchema, generateFeaturedPlaylistSchema, combineSchemas } from '@/lib/structured-data';
import type { Metadata } from 'next';

const appBaseUrl = getAppBaseUrl();

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
  title: 'MetaDJ Nexus — Hub, Music, Cinema, Wisdom & MetaDJai',
  description: 'The primary creative hub for MetaDJ. Hub, Music, Cinema, Wisdom, Journal, and MetaDJai in a living showcase of AI-driven creation.',
  keywords: ['MetaDJ', 'metadjnexus.ai', 'MetaDJ Nexus', 'electronic music', 'AI companion', 'Metaverse', 'original music', 'MetaDJai'],
  authors: [{ name: 'MetaDJ' }],
  creator: 'MetaDJ',
  publisher: 'Zuberant',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MetaDJ Nexus',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appBaseUrl,
    title: 'MetaDJ Nexus — Hub, Music, Cinema, Wisdom & MetaDJai',
    description: 'The primary creative hub for MetaDJ. Hub, Music, Cinema, Wisdom, Journal, and MetaDJai in a living showcase of AI-driven creation.',
    siteName: 'MetaDJ Nexus',
    images: [
      {
        url: `${appBaseUrl}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'MetaDJ Nexus share preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetaDJ Nexus — Hub, Music, Cinema, Wisdom & MetaDJai',
    description: 'The primary creative hub for MetaDJ. Hub, Music, Cinema, Wisdom, Journal, and MetaDJai in a living showcase of AI-driven creation.',
    images: [`${appBaseUrl}/images/og-image.png`],
    creator: '@metadjai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-visual',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#0a0a0a' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io';

  // Get featured tracks for playlist schema
  const featuredTracks = FEATURED_TRACK_IDS
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track): track is typeof tracks[0] => track !== undefined);

  // Generate structured data for SEO and music platforms
  const artistSchema = generateArtistSchema();
  const websiteSchema = generateWebsiteSchema();
  const featuredPlaylistSchema = generateFeaturedPlaylistSchema(featuredTracks);
  const structuredData = combineSchemas(artistSchema, websiteSchema, featuredPlaylistSchema);

  return (
    <html lang="en" suppressHydrationWarning className="h-full" data-csp-nonce={nonce}>
      <head>
        {/* Resource hints for performance optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${cinzel.variable} ${poppins.variable} font-sans antialiased min-h-full overflow-x-hidden text-foreground bg-[var(--bg-surface-base)]`}>
        {/* JSON-LD Structured Data for Music Schema */}
        <script
          id="structured-data"
          type="application/ld+json"
          nonce={nonce}
          // Inline JSON-LD keeps metadata stable while honoring CSP nonces.
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src={`${plausibleHost}/js/script.js`}
            strategy="afterInteractive"
            nonce={nonce}
          />
        )}

        <AppErrorBoundary>
          <AuthProvider>
            <ModalProvider>
              <UIProvider>
                <TourProvider>
                  <ToastProvider>
                    <QueueProvider>
                      <PlayerProvider>
                        <PlaylistProvider>
                          <GlobalScreenReaderRegions />
                          <OfflineIndicator />
                          {children}
                          <ToastContainer />
                        </PlaylistProvider>
                      </PlayerProvider>
                    </QueueProvider>
                  </ToastProvider>
                </TourProvider>
              </UIProvider>
            </ModalProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
