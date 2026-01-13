import { redirect } from 'next/navigation';
import { HomePageClient } from '@/components/home/HomePageClient';
import wisdomData from '@/data/wisdom-content.json';
import { FEATURED_TRACK_IDS, FEATURES } from '@/lib/app.constants';
import { getSession } from '@/lib/auth';
import { getMusicSnapshot } from '@/lib/music/server';

/**
 * App Layout
 *
 * Protected layout for authenticated users.
 * Loads the main application experience.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  const { collections, tracks } = await getMusicSnapshot();
  const initialWisdomSpotlight = {
    thought: wisdomData.thoughtsPosts?.[0]
      ? {
          id: wisdomData.thoughtsPosts[0].id,
          title: wisdomData.thoughtsPosts[0].title,
          excerpt: wisdomData.thoughtsPosts[0].excerpt,
          date: wisdomData.thoughtsPosts[0].date,
        }
      : null,
    guide: wisdomData.guides?.[0]
      ? {
          id: wisdomData.guides[0].id,
          title: wisdomData.guides[0].title,
          excerpt: wisdomData.guides[0].excerpt,
          category: wisdomData.guides[0].category,
        }
      : null,
    reflection: wisdomData.reflections?.[0]
      ? {
          id: wisdomData.reflections[0].id,
          title: wisdomData.reflections[0].title,
          excerpt: wisdomData.reflections[0].excerpt,
        }
      : null,
  };

  return (
    <>
      <HomePageClient
        collections={collections}
        tracks={tracks}
        featuredTrackIds={FEATURED_TRACK_IDS}
        feature={FEATURES.HUB}
        wisdomSpotlight={initialWisdomSpotlight}
      />
      {children}
    </>
  );
}
