import { redirect } from 'next/navigation';
import { getSession, isAdmin } from '@/lib/auth';

/**
 * Admin Layout
 *
 * Protected layout that requires admin access.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  const adminAccess = await isAdmin();

  if (!adminAccess) {
    redirect('/app');
  }

  return <>{children}</>;
}
