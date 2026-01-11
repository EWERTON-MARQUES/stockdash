import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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
  delay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  iconClassName,
  delay = 0
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'group relative overflow-hidden bg-card rounded-xl p-5 border border-border/50',
        'shadow-md hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30',
        'transition-all duration-300',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:via-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100',
        'after:absolute after:top-0 after:right-0 after:w-32 after:h-32 after:bg-gradient-to-br after:from-primary/10 after:to-transparent after:rounded-full after:blur-2xl after:opacity-0 after:transition-opacity after:duration-500',
        'hover:after:opacity-100',
        className
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <motion.p 
            className="mt-1 sm:mt-2 text-lg sm:text-2xl lg:text-3xl font-bold text-foreground text-left break-words leading-tight"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1, duration: 0.3 }}
          >
            {value}
          </motion.p>
          {trend && (
            <p className={cn(
              'mt-1 sm:mt-2 text-xs sm:text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% vs mês anterior
            </p>
          )}
        </div>
        <motion.div 
          className={cn(
            'flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl',
            'transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow',
            iconClassName || 'bg-primary/10 text-primary'
          )}
          whileHover={{ rotate: 5 }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-none" />
        </motion.div>
      </div>
    </motion.div>
  );
}
