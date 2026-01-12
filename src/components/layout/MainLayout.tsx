import { ReactNode, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PageTransition } from './PageTransition';
import { useDataRefresh } from '@/hooks/useDataRefresh';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // Start automatic data refresh for ABC Curve and Reports
  useDataRefresh({
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refreshOnMount: true,
    refreshOnFocus: true,
  });
  return (
    <div className="min-h-screen bg-background futuristic-grid">
      <AppSidebar />
      
      {/* Theme Toggle - Fixed position on desktop */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <ThemeToggle />
      </div>
      
      <main className="lg:pl-64">
        <div className="min-h-screen p-3 pt-16 sm:p-4 sm:pt-4 lg:p-6 xl:p-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
