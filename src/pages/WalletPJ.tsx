import { useEffect, useState, useMemo } from 'react';
import { Plus, RefreshCw, Building2, Pencil, Trash2, CheckCircle, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AccountFormModal } from '@/components/financial/AccountFormModal';
import { MarkAsPaidModal } from '@/components/financial/MarkAsPaidModal';
import { AccountFilters, AccountFiltersState } from '@/components/financial/AccountFilters';

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

export default function WalletPJ() {
  const [payables, setPayables] = useState<Account[]>([]);
  const [receivables, setReceivables] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [markAsPaidModalOpen, setMarkAsPaidModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'payable' | 'receivable'>('payable');
  const [editingItem, setEditingItem] = useState<Account | null>(null);
  const [itemToPay, setItemToPay] = useState<Account | null>(null);
  
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [payablesRes, receivablesRes] = await Promise.all([
        supabase.from('accounts_payable').select('*').order('due_date', { ascending: true }),
        supabase.from('accounts_receivable').select('*').order('due_date', { ascending: true }),
      ]);

      const filterPJ = (items: Account[], field: 'supplier' | 'customer') => {
        return items.filter(item => {
          const name = item[field]?.toUpperCase() || '';
          // Include only companies by common Brazilian company suffixes
          const isCompany = ['LTDA', 'ME', 'MEI', 'EIRELI', 'S.A.', 'S/A', 'EPP', 'CNPJ'].some(
            suffix => name.includes(suffix)
          );
          return isCompany;
        });
      };

      if (payablesRes.data) {
        const today = new Date();
        const updated = payablesRes.data.map(p => ({
          ...p,
          status: p.status === 'pending' && isBefore(parseISO(p.due_date), today) ? 'overdue' : p.status,
        })) as Account[];
        setPayables(filterPJ(updated, 'supplier'));
      }

      if (receivablesRes.data) {
        const today = new Date();
        const updated = receivablesRes.data.map(r => ({
          ...r,
          status: r.status === 'pending' && isBefore(parseISO(r.due_date), today) ? 'overdue' : r.status,
        })) as Account[];
        setReceivables(filterPJ(updated, 'customer'));
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

  const totalPayable = filteredPayables.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((a, p) => a + p.amount, 0);
  const totalReceivable = filteredReceivables.filter(r => r.status === 'pending' || r.status === 'overdue').reduce((a, r) => a + r.amount, 0);

  return (
    <MainLayout>
      <PageHeader title="Carteira Pessoa Jurídica" description="Contas relacionadas a empresas">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-3 mb-6 grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10"><ArrowDownRight className="w-4 h-4 text-destructive" /></div>
            <span className="text-sm font-medium text-muted-foreground">A Pagar (PJ)</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalPayable)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredPayables.length} conta(s)</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-success/10"><ArrowUpRight className="w-4 h-4 text-success" /></div>
            <span className="text-sm font-medium text-muted-foreground">A Receber (PJ)</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalReceivable)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredReceivables.length} conta(s)</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-4 h-4 text-primary" /></div>
            <span className="text-sm font-medium text-muted-foreground">Saldo Previsto (PJ)</span>
          </div>
          <p className={`text-xl font-bold ${totalReceivable - totalPayable >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalReceivable - totalPayable)}
          </p>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição, fornecedor ou cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="payables" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
        </TabsList>

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
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
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
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma conta encontrada</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AccountFormModal open={modalOpen} onOpenChange={setModalOpen} type={modalType} editingItem={editingItem as any} onSuccess={loadData} customCategories={[]} />
      <MarkAsPaidModal open={markAsPaidModalOpen} onOpenChange={setMarkAsPaidModalOpen} item={itemToPay as any} type={modalType} onSuccess={loadData} />
    </MainLayout>
  );
}
