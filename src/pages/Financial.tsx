import { useEffect, useState } from 'react';
import { Plus, RefreshCw, DollarSign, TrendingUp, TrendingDown, Calendar, FileText, ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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

const PAYMENT_METHODS = [
  'Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 
  'Boleto', 'Transferência', 'Cheque'
];

const CATEGORIES_PAYABLE = [
  'Fornecedores', 'Aluguel', 'Energia', 'Internet', 'Água',
  'Salários', 'Impostos', 'Marketing', 'Frete', 'Taxas Marketplace', 'Outros'
];

const CATEGORIES_RECEIVABLE = [
  'Vendas Amazon', 'Vendas Mercado Livre', 'Vendas Diretas', 
  'Serviços', 'Outros'
];

export default function Financial() {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'payable' | 'receivable'>('payable');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    customer: '',
    payment_method: '',
    category: '',
    notes: '',
    document_number: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [payablesRes, receivablesRes, cashFlowRes] = await Promise.all([
        supabase.from('accounts_payable').select('*').order('due_date', { ascending: true }),
        supabase.from('accounts_receivable').select('*').order('due_date', { ascending: true }),
        supabase.from('cash_flow').select('*').order('date', { ascending: false }).limit(100),
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
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.due_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        if (modalType === 'payable') {
          const { error } = await supabase.from('accounts_payable').update({
            description: formData.description,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            supplier: formData.supplier || null,
            payment_method: formData.payment_method || null,
            category: formData.category || null,
            notes: formData.notes || null,
            document_number: formData.document_number || null,
          }).eq('id', editingId);

          if (error) throw error;
          toast.success('Conta a pagar atualizada!');
        } else {
          const { error } = await supabase.from('accounts_receivable').update({
            description: formData.description,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            customer: formData.customer || null,
            payment_method: formData.payment_method || null,
            category: formData.category || null,
            notes: formData.notes || null,
            document_number: formData.document_number || null,
          }).eq('id', editingId);

          if (error) throw error;
          toast.success('Conta a receber atualizada!');
        }
      } else {
        // Create new
        if (modalType === 'payable') {
          const { error } = await supabase.from('accounts_payable').insert({
            description: formData.description,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            supplier: formData.supplier || null,
            payment_method: formData.payment_method || null,
            category: formData.category || null,
            notes: formData.notes || null,
            document_number: formData.document_number || null,
            status: 'pending',
          });

          if (error) throw error;
          toast.success('Conta a pagar criada!');
        } else {
          const { error } = await supabase.from('accounts_receivable').insert({
            description: formData.description,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            customer: formData.customer || null,
            payment_method: formData.payment_method || null,
            category: formData.category || null,
            notes: formData.notes || null,
            document_number: formData.document_number || null,
            status: 'pending',
          });

          if (error) throw error;
          toast.success('Conta a receber criada!');
        }
      }

      setModalOpen(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Erro ao salvar registro');
    }
  };

  const handleEdit = (item: AccountPayable | AccountReceivable, type: 'payable' | 'receivable') => {
    setModalType(type);
    setEditingId(item.id);
    setFormData({
      description: item.description,
      amount: String(item.amount),
      due_date: item.due_date,
      supplier: type === 'payable' ? (item as AccountPayable).supplier || '' : '',
      customer: type === 'receivable' ? (item as AccountReceivable).customer || '' : '',
      payment_method: item.payment_method || '',
      category: item.category || '',
      notes: item.notes || '',
      document_number: item.document_number || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'payable' | 'receivable') => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const table = type === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;
      toast.success('Registro excluído!');
      loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Erro ao excluir registro');
    }
  };

  const handleMarkAsPaid = async (id: string, type: 'payable' | 'receivable') => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (type === 'payable') {
        const payable = payables.find(p => p.id === id);
        const { error } = await supabase
          .from('accounts_payable')
          .update({ status: 'paid', paid_date: today })
          .eq('id', id);
        
        if (error) throw error;

        if (payable) {
          await supabase.from('cash_flow').insert({
            type: 'expense',
            description: payable.description,
            amount: payable.amount,
            date: today,
            category: payable.category,
            payment_method: payable.payment_method,
            reference_id: id,
            reference_type: 'accounts_payable',
          });
        }

        toast.success('Conta marcada como paga!');
      } else {
        const receivable = receivables.find(r => r.id === id);
        const { error } = await supabase
          .from('accounts_receivable')
          .update({ status: 'received', received_date: today })
          .eq('id', id);
        
        if (error) throw error;

        if (receivable) {
          await supabase.from('cash_flow').insert({
            type: 'income',
            description: receivable.description,
            amount: receivable.amount,
            date: today,
            category: receivable.category,
            payment_method: receivable.payment_method,
            reference_id: id,
            reference_type: 'accounts_receivable',
          });
        }

        toast.success('Conta marcada como recebida!');
      }

      loadData();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Erro ao atualizar registro');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      due_date: format(new Date(), 'yyyy-MM-dd'),
      supplier: '',
      customer: '',
      payment_method: '',
      category: '',
      notes: '',
      document_number: '',
    });
  };

  const openModal = (type: 'payable' | 'receivable') => {
    setModalType(type);
    setEditingId(null);
    resetForm();
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

  return (
    <MainLayout>
      <PageHeader
        title="Financeiro"
        description="Controle de contas a pagar e receber"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPayable)}</p>
          {overduePayable > 0 && (
            <p className="text-xs text-destructive mt-1">{overduePayable} vencido(s)</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-success/10">
              <ArrowUpRight className="w-4 h-4 text-success" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalReceivable)}</p>
          {overdueReceivable > 0 && (
            <p className="text-xs text-warning mt-1">{overdueReceivable} vencido(s)</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Saldo Previsto</span>
          </div>
          <p className={`text-2xl font-bold ${totalReceivable - totalPayable >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalReceivable - totalPayable)}
          </p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-chart-1/10">
              <FileText className="w-4 h-4 text-chart-1" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Resultado do Mês</span>
          </div>
          <p className={`text-2xl font-bold ${monthResult >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(monthResult)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="payables" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="payables">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModal('payable')} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta a Pagar
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Fornecedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payables.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.supplier || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-destructive">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status, 'payable')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item, 'payable')}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id, 'payable')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {(item.status === 'pending' || item.status === 'overdue') && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(item.id, 'payable')}>
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
              Nova Conta a Receber
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receivables.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.customer || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-success">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status, 'receivable')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item, 'receivable')}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id, 'receivable')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {(item.status === 'pending' || item.status === 'overdue') && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(item.id, 'receivable')}>
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
          <div className="bg-card rounded-xl border border-border p-5 mb-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Fluxo de Caixa - Últimos 30 dias
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(v) => format(parseISO(v), 'dd/MM')}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={4}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
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
                  <Bar dataKey="income" fill="hsl(var(--success))" name="income" />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" name="expense" />
                </BarChart>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cashFlow.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={item.type === 'income' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {item.type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.category || '-'}</td>
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

        <TabsContent value="dre">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
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
                <span className="text-lg font-bold text-foreground">RESULTADO DO PERÍODO</span>
                <span className={`text-2xl font-bold ${monthResult >= 0 ? 'text-success' : 'text-destructive'}`}>
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

      {/* Modal for new/edit entry */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : 'Nova'} {modalType === 'payable' ? 'Conta a Pagar' : 'Conta a Receber'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Compra de produtos"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="due_date">Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="party">{modalType === 'payable' ? 'Fornecedor' : 'Cliente'}</Label>
              <Input
                id="party"
                value={modalType === 'payable' ? formData.supplier : formData.customer}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [modalType === 'payable' ? 'supplier' : 'customer']: e.target.value 
                })}
                placeholder={modalType === 'payable' ? 'Nome do fornecedor' : 'Nome do cliente'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(modalType === 'payable' ? CATEGORIES_PAYABLE : CATEGORIES_RECEIVABLE).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_method">Forma de Pagamento</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="document">Nº Documento</Label>
              <Input
                id="document"
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                placeholder="Número da NF, boleto, etc"
              />
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações adicionais"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}