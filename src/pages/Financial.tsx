import { useEffect, useState } from 'react';
import { Plus, RefreshCw, DollarSign, TrendingUp, TrendingDown, Calendar, FileText, ArrowUpRight, ArrowDownRight, Pencil, Trash2, Tags, PieChart, BarChart3, LayoutDashboard, CheckCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO, isSameMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { categorySchema } from '@/lib/validation/financial';
import { z } from 'zod';
import { FinancialReports } from '@/components/financial/FinancialReports';
import { AccountFormModal } from '@/components/financial/AccountFormModal';
import { MarkAsPaidModal } from '@/components/financial/MarkAsPaidModal';

interface AccountPayable {
  id: string;
  description: string;
  supplier: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string | null;
  category: string | null;
  notes: string | null;
  document_number: string | null;
}

interface AccountReceivable {
  id: string;
  description: string;
  customer: string | null;
  amount: number;
  due_date: string;
  received_date: string | null;
  status: 'pending' | 'received' | 'overdue' | 'cancelled';
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

const PAYMENT_METHODS = [
  'Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 
  'Boleto', 'Transferência', 'Cheque'
];

const DEFAULT_CATEGORIES_EXPENSE = [
  'Fornecedores', 'Aluguel', 'Energia', 'Internet', 'Água',
  'Salários', 'Impostos', 'Marketing', 'Frete', 'Taxas Marketplace', 'Taxa de Cartão', 'Outros'
];

const DEFAULT_CATEGORIES_INCOME = [
  'Vendas Amazon', 'Vendas Mercado Livre', 'Vendas Diretas', 
  'Serviços', 'Outros'
];

const CHART_COLORS = ['hsl(205, 90%, 45%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 45%)'];

export default function Financial() {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [customCategories, setCustomCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [markAsPaidModalOpen, setMarkAsPaidModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'payable' | 'receivable'>('payable');
  const [editingItem, setEditingItem] = useState<AccountPayable | AccountReceivable | null>(null);
  const [itemToPay, setItemToPay] = useState<AccountPayable | AccountReceivable | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
    description: '',
  });

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
        })) as AccountPayable[];
        setPayables(updated);
      }

      if (receivablesRes.data) {
        const today = new Date();
        const updated = receivablesRes.data.map(r => ({
          ...r,
          status: r.status === 'pending' && isBefore(parseISO(r.due_date), today) ? 'overdue' : r.status,
        })) as AccountReceivable[];
        setReceivables(updated);
      }

      if (cashFlowRes.data) {
        setCashFlow(cashFlowRes.data as CashFlowEntry[]);
      }

      if (categoriesRes.data) {
        setCustomCategories(categoriesRes.data as FinancialCategory[]);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading financial data:', error);
      }
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get categories based on type
  const getCategories = (type: 'payable' | 'receivable') => {
    const customCats = customCategories.filter(c => 
      type === 'payable' ? c.type === 'expense' : c.type === 'income'
    ).map(c => c.name);
    
    const defaults = type === 'payable' ? DEFAULT_CATEGORIES_EXPENSE : DEFAULT_CATEGORIES_INCOME;
    return [...new Set([...defaults, ...customCats])];
  };

  // handleSubmit is now in AccountFormModal

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
        if (import.meta.env.DEV) {
          console.error('Error saving category:', error);
        }
        toast.error('Erro ao salvar categoria');
      }
    }
  };

  const handleEdit = (item: AccountPayable | AccountReceivable, type: 'payable' | 'receivable') => {
    setModalType(type);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'payable' | 'receivable') => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const table = type === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      const refType = type === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      
      // First, delete related cash_flow entries
      const { error: cashFlowError } = await supabase
        .from('cash_flow')
        .delete()
        .eq('reference_id', id)
        .eq('reference_type', refType);
      
      if (cashFlowError) {
        console.error('Error deleting related cash flow:', cashFlowError);
      }
      
      // Then delete the account itself
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;
      toast.success('Registro excluído!');
      loadData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting entry:', error);
      }
      toast.error('Erro ao excluir registro');
    }
  };

  const handleOpenMarkAsPaidModal = (item: AccountPayable | AccountReceivable, type: 'payable' | 'receivable') => {
    setModalType(type);
    setItemToPay(item);
    setMarkAsPaidModalOpen(true);
  };

  const openModal = (type: 'payable' | 'receivable') => {
    setModalType(type);
    setEditingItem(null);
    setModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string, type: 'payable' | 'receivable') => {
    const styles = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      paid: 'bg-success/10 text-success border-success/20',
      received: 'bg-success/10 text-success border-success/20',
      overdue: 'bg-destructive/10 text-destructive border-destructive/20',
      cancelled: 'bg-muted text-muted-foreground border-border',
    };
    const labels = {
      pending: 'Pendente',
      paid: 'Pago',
      received: 'Recebido',
      overdue: 'Vencido',
      cancelled: 'Cancelado',
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  // Calculate summary stats
  const totalPayable = payables.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((acc, p) => acc + p.amount, 0);
  const totalReceivable = receivables.filter(r => r.status === 'pending' || r.status === 'overdue').reduce((acc, r) => acc + r.amount, 0);
  const overduePayable = payables.filter(p => p.status === 'overdue').length;
  const overdueReceivable = receivables.filter(r => r.status === 'overdue').length;

  // DRE calculation - automatic based on cash flow
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const monthCashFlow = cashFlow.filter(c => {
    const date = parseISO(c.date);
    return isAfter(date, monthStart) && isBefore(date, monthEnd) || isSameMonth(date, currentMonth);
  });

  const monthIncome = monthCashFlow
    .filter(c => c.type === 'income')
    .reduce((acc, c) => acc + c.amount, 0);
  const monthExpense = monthCashFlow
    .filter(c => c.type === 'expense')
    .reduce((acc, c) => acc + c.amount, 0);
  const monthResult = monthIncome - monthExpense;

  // Group expenses by category for DRE
  const expensesByCategory = monthCashFlow
    .filter(c => c.type === 'expense')
    .reduce((acc, c) => {
      const cat = c.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

  const incomeByCategory = monthCashFlow
    .filter(c => c.type === 'income')
    .reduce((acc, c) => {
      const cat = c.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

  // Cash flow chart data - last 30 days
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return format(date, 'yyyy-MM-dd');
  });

  const cashFlowChartData = last30Days.map(date => {
    const dayEntries = cashFlow.filter(c => c.date === date);
    const income = dayEntries.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
    const expense = dayEntries.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0);
    return {
      date,
      income,
      expense,
      balance: income - expense,
    };
  });

  // Monthly comparison data for charts
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

  // Expense distribution for pie chart
  const expensePieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <MainLayout>
      <PageHeader
        title="Financeiro"
        description="Controle de contas a pagar e receber"
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
            <span className="text-sm font-medium text-muted-foreground">A Pagar</span>
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
            <span className="text-sm font-medium text-muted-foreground">A Receber</span>
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
        {/* Monthly Comparison */}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'income' ? 'Receita' : name === 'expense' ? 'Despesa' : 'Resultado'
                  ]}
                />
                <Bar dataKey="income" fill="hsl(var(--success))" name="income" />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" name="expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution */}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
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

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-4 gap-1">
          <TabsTrigger value="reports" className="text-xs sm:text-sm gap-1">
            <LayoutDashboard className="w-3 h-3 hidden sm:inline" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="payables" className="text-xs sm:text-sm">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivables" className="text-xs sm:text-sm">Contas a Receber</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="dre" className="text-xs sm:text-sm">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <FinancialReports 
            cashFlow={cashFlow} 
            payables={payables} 
            receivables={receivables} 
          />
        </TabsContent>

        <TabsContent value="payables">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModal('payable')} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Conta a Pagar</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Fornecedor</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Vencimento</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payables.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-medium text-foreground text-sm">{item.description}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{item.supplier || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-destructive">{formatCurrency(item.amount)}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(item.due_date)}</td>
                      <td className="px-3 sm:px-4 py-3">{getStatusBadge(item.status, 'payable')}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleEdit(item, 'payable')}>
                            <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => handleDelete(item.id, 'payable')}>
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          {(item.status === 'pending' || item.status === 'overdue') && (
                            <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs gap-1" onClick={() => handleOpenMarkAsPaidModal(item, 'payable')}>
                              <CheckCircle className="w-3 h-3" />
                              Pagar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payables.length === 0 && (
              <div className="py-12 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma conta a pagar cadastrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="receivables">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModal('receivable')} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Conta a Receber</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Cliente</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Vencimento</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receivables.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-medium text-foreground text-sm">{item.description}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{item.customer || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-success">{formatCurrency(item.amount)}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(item.due_date)}</td>
                      <td className="px-3 sm:px-4 py-3">{getStatusBadge(item.status, 'receivable')}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleEdit(item, 'receivable')}>
                            <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => handleDelete(item.id, 'receivable')}>
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          {(item.status === 'pending' || item.status === 'overdue') && (
                            <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs gap-1" onClick={() => handleOpenMarkAsPaidModal(item, 'receivable')}>
                              <CheckCircle className="w-3 h-3" />
                              Receber
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {receivables.length === 0 && (
              <div className="py-12 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma conta a receber cadastrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cashflow">
          {/* Cash Flow Chart */}
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
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'income' ? 'Entrada' : name === 'expense' ? 'Saída' : 'Saldo'
                    ]}
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
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Categoria</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cashFlow.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground">{formatDate(item.date)}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <Badge variant="outline" className={item.type === 'income' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {item.type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td className="px-3 sm:px-4 py-3 font-medium text-foreground text-sm">{item.description}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{item.category || '-'}</td>
                      <td className={`px-3 sm:px-4 py-3 text-sm font-semibold ${item.type === 'income' ? 'text-success' : 'text-destructive'}`}>
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

        <TabsContent value="dre">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Demonstrativo de Resultado - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            
            <div className="space-y-6">
              {/* Receitas */}
              <div>
                <h4 className="font-semibold text-foreground border-b border-border pb-2 mb-3">RECEITAS</h4>
                {Object.entries(incomeByCategory).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(incomeByCategory).map(([cat, value]) => (
                      <div key={cat} className="flex justify-between items-center py-2 px-3 bg-success/5 rounded-lg">
                        <span className="text-sm text-foreground">{cat}</span>
                        <span className="font-medium text-success">{formatCurrency(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Nenhuma receita registrada</p>
                )}
                <div className="flex justify-between items-center py-3 mt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total Receitas</span>
                  <span className="font-bold text-success text-lg">{formatCurrency(monthIncome)}</span>
                </div>
              </div>
              
              {/* Despesas */}
              <div>
                <h4 className="font-semibold text-foreground border-b border-border pb-2 mb-3">DESPESAS</h4>
                {Object.entries(expensesByCategory).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(expensesByCategory).map(([cat, value]) => (
                      <div key={cat} className="flex justify-between items-center py-2 px-3 bg-destructive/5 rounded-lg">
                        <span className="text-sm text-foreground">{cat}</span>
                        <span className="font-medium text-destructive">({formatCurrency(value)})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Nenhuma despesa registrada</p>
                )}
                <div className="flex justify-between items-center py-3 mt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total Despesas</span>
                  <span className="font-bold text-destructive text-lg">({formatCurrency(monthExpense)})</span>
                </div>
              </div>
              
              {/* Resultado */}
              <div className="flex justify-between items-center py-4 px-4 bg-primary/10 rounded-xl border border-primary/20">
                <span className="text-base sm:text-lg font-bold text-foreground">RESULTADO DO PERÍODO</span>
                <span className={`text-xl sm:text-2xl font-bold ${monthResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(monthResult)}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              * DRE calculado automaticamente com base nos lançamentos de contas a pagar e receber baixados no mês.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account Form Modal */}
      <AccountFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        editingItem={editingItem}
        customCategories={customCategories}
        onSuccess={loadData}
      />

      {/* Mark as Paid Modal */}
      <MarkAsPaidModal
        open={markAsPaidModalOpen}
        onOpenChange={setMarkAsPaidModalOpen}
        type={modalType}
        item={itemToPay}
        onSuccess={loadData}
      />

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cat_name">Nome da Categoria *</Label>
              <Input
                id="cat_name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Ex: Taxa de Cartão"
              />
            </div>

            <div>
              <Label htmlFor="cat_type">Tipo *</Label>
              <Select 
                value={categoryFormData.type} 
                onValueChange={(value: 'expense' | 'income') => setCategoryFormData({ ...categoryFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa (Contas a Pagar)</SelectItem>
                  <SelectItem value="income">Receita (Contas a Receber)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cat_description">Descrição</Label>
              <Input
                id="cat_description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>

            {customCategories.length > 0 && (
              <div className="mt-4">
                <Label>Categorias Personalizadas</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {customCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">{cat.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {cat.type === 'expense' ? 'Despesa' : 'Receita'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleSaveCategory}>
              Criar Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
