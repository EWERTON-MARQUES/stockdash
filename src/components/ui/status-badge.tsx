import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Ativo',
    className: 'badge-success',
  },
  inactive: {
    label: 'Inativo',
    className: 'bg-muted text-muted-foreground',
  },
  low_stock: {
    label: 'Estoque Baixo',
    className: 'badge-warning',
  },
  out_of_stock: {
    label: 'Sem Estoque',
    className: 'badge-destructive',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
