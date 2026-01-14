import { useEffect, useState, useMemo } from 'react';
import { Plus, RefreshCw, User, Pencil, Trash2, CheckCircle, ArrowUpRight, ArrowDownRight, Search, Tags, BarChart3, PieChart, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isBefore, isAfter, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AccountFormModal } from '@/components/financial/AccountFormModal';
import { MarkAsPaidModal } from '@/components/financial/MarkAsPaidModal';
import { AccountFilters, AccountFiltersState } from '@/components/financial/AccountFilters';
import { FinancialReports } from '@/components/financial/FinancialReports';
import { categorySchema } from '@/lib/validation/financial';
import { z } from 'zod';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

interface Account {
  id: string;
  description: string;
  supplier?: string | null;
  customer?: string | null;
  amount: number;
  due_date: string;
  paid_date?: string | null;
  received_date?: string | null;
  status: 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled';
  payment_method: string | null;
  category: string | null;
  notes: string | null;
  document_number: string | null;
}

interface CashFlowEntry {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string | null;
  payment_method: string | null;
}

interface FinancialCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  description: string | null;
}

const CHART_COLORS = ['hsl(205, 90%, 45%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 45%)'];

const DEFAULT_CATEGORIES_EXPENSE = [
  'Fornecedores', 'Aluguel', 'Energia', 'Internet', 'Água',
  'Salários', 'Impostos', 'Marketing', 'Frete', 'Taxas Marketplace', 'Taxa de Cartão', 'Outros'
];

const DEFAULT_CATEGORIES_INCOME = [
  'Vendas Amazon', 'Vendas Mercado Livre', 'Vendas Diretas', 
  'Serviços', 'Outros'
];

export default function WalletPF() {
  const [payables, setPayables] = useState<Account[]>([]);
  const [receivables, setReceivables] = useState<Account[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [customCategories, setCustomCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [markAsPaidModalOpen, setMarkAsPaidModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'payable' | 'receivable'>('payable');
  const [editingItem, setEditingItem] = useState<Account | null>(null);
  const [itemToPay, setItemToPay] = useState<Account | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
    description: '',
  });
  
  const [payableFilters, setPayableFilters] = useState<AccountFiltersState>({
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });
  
  const [receivableFilters, setReceivableFilters] = useState<AccountFiltersState>({
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const filterPF = (items: Account[], field: 'supplier' | 'customer') => {
    return items.filter(item => {
      const name = item[field]?.toUpperCase() || '';
      const isCompany = ['LTDA', 'ME', 'MEI', 'EIRELI', 'S.A.', 'S/A', 'EPP', 'CNPJ'].some(
        suffix => name.includes(suffix)
      );
      return !isCompany;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [payablesRes, receivablesRes, cashFlowRes, categoriesRes] = await Promise.all([
        supabase.from('accounts_payable').select('*').order('due_date', { ascending: true }),
        supabase.from('accounts_receivable').select('*').order('due_date', { ascending: true }),
        supabase.from('cash_flow').select('*').order('date', { ascending: false }).limit(100),
        supabase.from('financial_accounts').select('*').order('name'),
      ]);

      if (payablesRes.data) {
        const today = new Date();
        const updated = payablesRes.data.map(p => ({
          ...p,
          status: p.status === 'pending' && isBefore(parseISO(p.due_date), today) ? 'overdue' : p.status,
        })) as Account[];
        setPayables(filterPF(updated, 'supplier'));
      }

      if (receivablesRes.data) {
        const today = new Date();
        const updated = receivablesRes.data.map(r => ({
          ...r,
          status: r.status === 'pending' && isBefore(parseISO(r.due_date), today) ? 'overdue' : r.status,
        })) as Account[];
        setReceivables(filterPF(updated, 'customer'));
      }

      if (cashFlowRes.data) {
        setCashFlow(cashFlowRes.data as CashFlowEntry[]);
      }

      if (categoriesRes.data) {
        setCustomCategories(categoriesRes.data as FinancialCategory[]);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = (items: Account[], filters: AccountFiltersState) => {
    return items.filter(item => {
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.dateFrom && isBefore(parseISO(item.due_date), filters.dateFrom)) return false;
      if (filters.dateTo && isAfter(parseISO(item.due_date), filters.dateTo)) return false;
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesDescription = item.description?.toLowerCase().includes(search);
        const matchesSupplier = item.supplier?.toLowerCase().includes(search);
        const matchesCustomer = item.customer?.toLowerCase().includes(search);
        if (!matchesDescription && !matchesSupplier && !matchesCustomer) return false;
      }
      
      return true;
    });
  };

  const filteredPayables = useMemo(() => applyFilters(payables, payableFilters), [payables, payableFilters, searchTerm]);
  const filteredReceivables = useMemo(() => applyFilters(receivables, receivableFilters), [receivables, receivableFilters, searchTerm]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  const formatDate = (dateString: string) => {
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR }); } catch { return dateString; }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      paid: 'bg-success/10 text-success border-success/20',
      received: 'bg-success/10 text-success border-success/20',
      overdue: 'bg-destructive/10 text-destructive border-destructive/20',
      cancelled: 'bg-muted text-muted-foreground border-border',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente', paid: 'Pago', received: 'Recebido', overdue: 'Vencido', cancelled: 'Cancelado',
    };
    return <Badge variant="outline" className={styles[status] || ''}>{labels[status] || status}</Badge>;
  };

  const handleEdit = (item: Account, type: 'payable' | 'receivable') => {
    setModalType(type);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'payable' | 'receivable') => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const table = type === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      const refType = type === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      await supabase.from('cash_flow').delete().eq('reference_id', id).eq('reference_type', refType);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Registro excluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir registro');
    }
  };

  const handleOpenMarkAsPaidModal = (item: Account, type: 'payable' | 'receivable') => {
    setModalType(type);
    setItemToPay(item);
    setMarkAsPaidModalOpen(true);
  };

  const openModal = (type: 'payable' | 'receivable') => {
    setModalType(type);
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      const validated = categorySchema.parse({
        name: categoryFormData.name,
        type: categoryFormData.type,
        description: categoryFormData.description || null,
      });

      const { error } = await supabase.from('financial_accounts').insert({
        name: validated.name,
        type: validated.type,
        description: validated.description,
      });

      if (error) throw error;
      toast.success('Categoria criada!');
      setCategoryModalOpen(false);
      setCategoryFormData({ name: '', type: 'expense', description: '' });
      loadData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Erro ao salvar categoria');
      }
    }
  };

  // Stats
  const totalPayable = payables.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((a, p) => a + p.amount, 0);
  const totalReceivable = receivables.filter(r => r.status === 'pending' || r.status === 'overdue').reduce((a, r) => a + r.amount, 0);
  const overduePayable = payables.filter(p => p.status === 'overdue').length;
  const overdueReceivable = receivables.filter(r => r.status === 'overdue').length;

  // DRE calculation
  const currentMonth = new Date();
  const monthCashFlow = cashFlow.filter(c => {
    const date = parseISO(c.date);
    return isSameMonth(date, currentMonth);
  });
  const monthIncome = monthCashFlow.filter(c => c.type === 'income').reduce((acc, c) => acc + c.amount, 0);
  const monthExpense = monthCashFlow.filter(c => c.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
  const monthResult = monthIncome - monthExpense;

  // Monthly comparison data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  });

  const monthlyComparisonData = last6Months.map(({ month, start, end }) => {
    const monthEntries = cashFlow.filter(c => {
      const d = parseISO(c.date);
      return (isAfter(d, start) || isSameMonth(d, start)) && (isBefore(d, end) || isSameMonth(d, end));
    });
    const income = monthEntries.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
    const expense = monthEntries.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0);
    return { month, income, expense, result: income - expense };
  });

  // Expense distribution
  const expensesByCategory = monthCashFlow
    .filter(c => c.type === 'expense')
    .reduce((acc, c) => {
      const cat = c.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

  const expensePieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Cash flow chart data
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return format(date, 'yyyy-MM-dd');
  });

  const cashFlowChartData = last30Days.map(date => {
    const dayEntries = cashFlow.filter(c => c.date === date);
    const income = dayEntries.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
    const expense = dayEntries.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0);
    return { date, income, expense, balance: income - expense };
  });

  return (
    <MainLayout>
      <PageHeader
        title="Carteira Pessoa Física"
        description="Gestão financeira de pessoas físicas"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCategoryModalOpen(true)} className="gap-2">
            <Tags className="w-4 h-4" />
            <span className="hidden sm:inline">Categorias</span>
          </Button>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 mb-6 grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-xl p-4 sm:p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">A Pagar (PF)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(totalPayable)}</p>
          {overduePayable > 0 && (
            <p className="text-xs text-destructive mt-1">{overduePayable} vencido(s)</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-4 sm:p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-success/10">
              <ArrowUpRight className="w-4 h-4 text-success" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">A Receber (PF)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(totalReceivable)}</p>
          {overdueReceivable > 0 && (
            <p className="text-xs text-warning mt-1">{overdueReceivable} vencido(s)</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-4 sm:p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Saldo Previsto</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${totalReceivable - totalPayable >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalReceivable - totalPayable)}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 sm:p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-chart-1/10">
              <FileText className="w-4 h-4 text-chart-1" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Resultado do Mês</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${monthResult >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(monthResult)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 mb-6 lg:grid-cols-2">
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4 text-primary" />
              Comparativo Mensal
            </h3>
          </div>
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Receita' : 'Despesa']}
                />
                <Bar dataKey="income" fill="hsl(var(--success))" name="income" />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" name="expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <PieChart className="w-4 h-4 text-warning" />
              Distribuição de Despesas
            </h3>
          </div>
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={expensePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {expensePieData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="text-muted-foreground truncate max-w-[60px]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição, fornecedor ou cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 gap-1">
          <TabsTrigger value="reports" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
          <TabsTrigger value="payables" className="text-xs sm:text-sm">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivables" className="text-xs sm:text-sm">Contas a Receber</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <FinancialReports 
            cashFlow={cashFlow} 
            payables={payables as any} 
            receivables={receivables as any} 
          />
        </TabsContent>

        <TabsContent value="payables">
          <AccountFilters filters={payableFilters} onFiltersChange={setPayableFilters} type="payable" />
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModal('payable')} className="gap-2"><Plus className="w-4 h-4" />Nova Conta</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Fornecedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayables.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{item.supplier || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-destructive">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item, 'payable')}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id, 'payable')}><Trash2 className="w-4 h-4" /></Button>
                          {(item.status === 'pending' || item.status === 'overdue') && (
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleOpenMarkAsPaidModal(item, 'payable')}><CheckCircle className="w-3 h-3" />Pagar</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPayables.length === 0 && (
              <div className="py-12 text-center">
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma conta encontrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="receivables">
          <AccountFilters filters={receivableFilters} onFiltersChange={setReceivableFilters} type="receivable" />
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModal('receivable')} className="gap-2"><Plus className="w-4 h-4" />Nova Conta</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredReceivables.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{item.customer || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-success">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item, 'receivable')}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id, 'receivable')}><Trash2 className="w-4 h-4" /></Button>
                          {(item.status === 'pending' || item.status === 'overdue') && (
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleOpenMarkAsPaidModal(item, 'receivable')}><CheckCircle className="w-3 h-3" />Receber</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredReceivables.length === 0 && (
              <div className="py-12 text-center">
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma conta encontrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cashflow">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5 mb-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Fluxo de Caixa - Últimos 30 dias
            </h3>
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(v) => format(parseISO(v), 'dd/MM')}
                    tick={{ fontSize: 9 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={6}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Entrada' : name === 'expense' ? 'Saída' : 'Saldo']}
                    labelFormatter={(label) => format(parseISO(label), 'dd/MM/yyyy')}
                  />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} name="income" />
                  <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.2} name="expense" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cashFlow.slice(0, 50).map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={item.type === 'income' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {item.type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{item.category || '-'}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${item.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cashFlow.length === 0 && (
              <div className="py-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AccountFormModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        type={modalType} 
        editingItem={editingItem as any} 
        onSuccess={loadData} 
        customCategories={customCategories} 
      />
      <MarkAsPaidModal 
        open={markAsPaidModalOpen} 
        onOpenChange={setMarkAsPaidModalOpen} 
        item={itemToPay as any} 
        type={modalType} 
        onSuccess={loadData} 
      />

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Marketing Digital"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={categoryFormData.type}
                onValueChange={(value: 'expense' | 'income') => setCategoryFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}