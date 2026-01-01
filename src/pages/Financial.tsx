import { useEffect, useState } from 'react';
import { Plus, RefreshCw, DollarSign, TrendingUp, TrendingDown, Calendar, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        supabase.from('cash_flow').select('*').order('date', { ascending: false }).limit(50),
      ]);

      if (payablesRes.data) {
        // Update overdue status
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

      setModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Erro ao criar registro');
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

        // Add to cash flow
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

        // Add to cash flow
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
    const isPaid = type === 'payable' ? status === 'paid' : status === 'received';
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

  // DRE calculation (simplified)
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthIncome = cashFlow
    .filter(c => c.type === 'income' && isAfter(parseISO(c.date), monthStart) && isBefore(parseISO(c.date), monthEnd))
    .reduce((acc, c) => acc + c.amount, 0);
  const monthExpense = cashFlow
    .filter(c => c.type === 'expense' && isAfter(parseISO(c.date), monthStart) && isBefore(parseISO(c.date), monthEnd))
    .reduce((acc, c) => acc + c.amount, 0);
  const monthResult = monthIncome - monthExpense;

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
        <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl p-5 border border-destructive/20">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPayable)}</p>
          {overduePayable > 0 && (
            <p className="text-xs text-destructive mt-1">{overduePayable} vencido(s)</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-5 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-muted-foreground">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalReceivable)}</p>
          {overdueReceivable > 0 && (
            <p className="text-xs text-warning mt-1">{overdueReceivable} vencido(s)</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Saldo Previsto</span>
          </div>
          <p className={`text-2xl font-bold ${totalReceivable - totalPayable >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalReceivable - totalPayable)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 rounded-xl p-5 border border-chart-4/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-chart-4" />
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
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
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
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.supplier || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-destructive">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status, 'payable')}</td>
                      <td className="px-4 py-3">
                        {item.status === 'pending' || item.status === 'overdue' ? (
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(item.id, 'payable')}>
                            Marcar Pago
                          </Button>
                        ) : null}
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
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
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
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.customer || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-success">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.due_date)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status, 'receivable')}</td>
                      <td className="px-4 py-3">
                        {item.status === 'pending' || item.status === 'overdue' ? (
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(item.id, 'receivable')}>
                            Marcar Recebido
                          </Button>
                        ) : null}
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
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cashFlow.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
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
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Demonstrativo de Resultado - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="font-medium text-foreground">Receitas</span>
                <span className="font-bold text-success">{formatCurrency(monthIncome)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="font-medium text-foreground">(-) Despesas</span>
                <span className="font-bold text-destructive">{formatCurrency(monthExpense)}</span>
              </div>
              
              <div className="flex justify-between items-center py-4 bg-muted/30 rounded-lg px-4 -mx-4">
                <span className="text-lg font-bold text-foreground">Resultado do Período</span>
                <span className={`text-xl font-bold ${monthResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(monthResult)}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              * DRE simplificado baseado nas movimentações do fluxo de caixa do mês atual.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal for new entry */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'payable' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
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
            <Button onClick={handleSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
