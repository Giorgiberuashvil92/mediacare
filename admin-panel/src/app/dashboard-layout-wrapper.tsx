'use client';

import { Sidebar } from '@/components/Layouts/sidebar';
import { Header } from '@/components/Layouts/header';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Check if current path is auth page
  const isAuthPage = pathname?.startsWith('/auth');

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If on auth page, don't show sidebar and header
  if (isAuthPage) {
    return <>{children}</>;
  }

  // If not authenticated, don't show sidebar and header (middleware will redirect)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Show dashboard layout with sidebar and header
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
        <Header />
        <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

