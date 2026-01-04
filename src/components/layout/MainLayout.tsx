import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen p-3 pt-16 sm:p-4 sm:pt-4 lg:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
