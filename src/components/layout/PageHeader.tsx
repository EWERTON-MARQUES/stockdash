import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-4 sm:mb-6 lg:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl lg:text-3xl truncate">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground sm:text-base line-clamp-2">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 sm:gap-3 shrink-0">{children}</div>}
    </div>
  );
}
