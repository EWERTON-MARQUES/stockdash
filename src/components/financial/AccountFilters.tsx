import { useState } from 'react';
import { Filter, X, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AccountFiltersState {
  status: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface AccountFiltersProps {
  filters: AccountFiltersState;
  onFiltersChange: (filters: AccountFiltersState) => void;
  type: 'payable' | 'receivable';
}

const STATUS_OPTIONS_PAYABLE = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];

const STATUS_OPTIONS_RECEIVABLE = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'received', label: 'Recebido' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function AccountFilters({ filters, onFiltersChange, type }: AccountFiltersProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const statusOptions = type === 'payable' ? STATUS_OPTIONS_PAYABLE : STATUS_OPTIONS_RECEIVABLE;
  
  const activeFiltersCount = [
    filters.status !== 'all',
    filters.dateFrom !== undefined,
    filters.dateTo !== undefined,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Filtros:</span>
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From Filter */}
      <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs gap-1 ${filters.dateFrom ? 'border-primary' : ''}`}
          >
            <Calendar className="w-3 h-3" />
            {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy') : 'De'}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={filters.dateFrom}
            onSelect={(date) => {
              onFiltersChange({ ...filters, dateFrom: date });
              setDateFromOpen(false);
            }}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To Filter */}
      <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs gap-1 ${filters.dateTo ? 'border-primary' : ''}`}
          >
            <Calendar className="w-3 h-3" />
            {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy') : 'Até'}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={filters.dateTo}
            onSelect={(date) => {
              onFiltersChange({ ...filters, dateTo: date });
              setDateToOpen(false);
            }}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Active Filters Badge */}
      {activeFiltersCount > 0 && (
        <>
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount} filtro(s)
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        </>
      )}
    </div>
  );
}
