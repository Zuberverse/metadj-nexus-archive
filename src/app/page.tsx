import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing';
import { getSession } from '@/lib/auth';

/**
 * Root Page
 *
 * Shows landing page for unauthenticated users,
 * redirects authenticated users to /app.
 */
export default async function RootPage() {
  const session = await getSession();

  if (session) {
    redirect('/app');
  }

  return <LandingPage />;
}
