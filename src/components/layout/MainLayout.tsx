import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
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
      
      <main className="lg:pl-64">
        <div className="min-h-screen p-3 sm:p-4 lg:p-6 xl:p-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
