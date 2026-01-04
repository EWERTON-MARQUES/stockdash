import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}
export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  iconClassName
}: StatCardProps) {
  return <div className={cn('stat-card animate-fade-in', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 sm:mt-2 text-lg sm:text-2xl lg:text-3xl font-bold text-foreground text-left break-words leading-tight">{value}</p>
          {trend && <p className={cn('mt-1 sm:mt-2 text-xs sm:text-sm font-medium', trend.isPositive ? 'text-success' : 'text-destructive')}>
              {trend.isPositive ? '+' : ''}{trend.value}% vs mês anterior
            </p>}
        </div>
        <div className={cn('flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl', iconClassName || 'bg-primary/10 text-primary')}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-none" />
        </div>
      </div>
    </div>;
}