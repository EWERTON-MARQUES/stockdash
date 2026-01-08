import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { accountPayableSchema, accountReceivableSchema } from '@/lib/validation/financial';
import { z } from 'zod';
import { X, Check } from 'lucide-react';

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

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'payable' | 'receivable';
  editingItem?: AccountPayable | AccountReceivable | null;
  customCategories: FinancialCategory[];
  onSuccess: () => void;
}

export function AccountFormModal({
  open,
  onOpenChange,
  type,
  editingItem,
  customCategories,
  onSuccess,
}: AccountFormModalProps) {
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
    status: 'pending' as 'pending' | 'paid' | 'received',
    paid_amount: '',
    paid_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      const isPaid = editingItem.status === 'paid' || editingItem.status === 'received';
      setFormData({
        description: editingItem.description,
        amount: String(editingItem.amount),
        due_date: editingItem.due_date,
        supplier: type === 'payable' ? (editingItem as AccountPayable).supplier || '' : '',
        customer: type === 'receivable' ? (editingItem as AccountReceivable).customer || '' : '',
        payment_method: editingItem.payment_method || '',
        category: editingItem.category || '',
        notes: editingItem.notes || '',
        document_number: editingItem.document_number || '',
        status: isPaid ? (type === 'payable' ? 'paid' : 'received') : 'pending',
        paid_amount: isPaid ? String(editingItem.amount) : '',
        paid_date: type === 'payable' 
          ? (editingItem as AccountPayable).paid_date || format(new Date(), 'yyyy-MM-dd')
          : (editingItem as AccountReceivable).received_date || format(new Date(), 'yyyy-MM-dd'),
      });
    } else {
      resetForm();
    }
  }, [editingItem, type, open]);

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
      status: 'pending',
      paid_amount: '',
      paid_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const getCategories = () => {
    const customCats = customCategories.filter(c => 
      type === 'payable' ? c.type === 'expense' : c.type === 'income'
    ).map(c => c.name);
    
    const defaults = type === 'payable' ? DEFAULT_CATEGORIES_EXPENSE : DEFAULT_CATEGORIES_INCOME;
    return [...new Set([...defaults, ...customCats])];
  };

  const isPaidStatus = formData.status === 'paid' || formData.status === 'received';

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const amountNum = parseFloat(formData.amount);
      const paidAmountNum = parseFloat(formData.paid_amount);
      
      if (type === 'payable') {
        const validated = accountPayableSchema.parse({
          description: formData.description,
          amount: isNaN(amountNum) ? 0 : amountNum,
          due_date: formData.due_date,
          supplier: formData.supplier || null,
          payment_method: isPaidStatus ? formData.payment_method : (formData.payment_method || null),
          category: formData.category || null,
          notes: formData.notes || null,
          document_number: formData.document_number || null,
        });

        // Validate payment method is required when status is paid
        if (isPaidStatus && !formData.payment_method) {
          toast.error('Forma de pagamento é obrigatória quando status é Pago');
          setSaving(false);
          return;
        }

        const dataToSave = {
          description: validated.description,
          amount: validated.amount,
          due_date: validated.due_date,
          supplier: validated.supplier,
          payment_method: validated.payment_method,
          category: validated.category,
          notes: validated.notes,
          document_number: validated.document_number,
          status: formData.status === 'paid' ? 'paid' : 'pending',
          paid_date: formData.status === 'paid' ? formData.paid_date : null,
        };

        if (editingItem) {
          const { error } = await supabase.from('accounts_payable').update(dataToSave).eq('id', editingItem.id);
          if (error) throw error;
          toast.success('Conta a pagar atualizada!');
        } else {
          const { error, data } = await supabase.from('accounts_payable').insert([dataToSave]).select().single();
          if (error) throw error;
          
          // If marked as paid, create cash flow entry
          if (formData.status === 'paid' && data) {
            await supabase.from('cash_flow').insert([{
              type: 'expense',
              description: validated.description,
              amount: isNaN(paidAmountNum) ? validated.amount : paidAmountNum,
              date: formData.paid_date,
              category: validated.category,
              payment_method: validated.payment_method,
              reference_id: data.id,
              reference_type: 'accounts_payable',
            }]);
          }
          toast.success('Conta a pagar criada!');
        }
      } else {
        // For receivables, payment_method is always required
        const validated = accountReceivableSchema.parse({
          description: formData.description,
          amount: isNaN(amountNum) ? 0 : amountNum,
          due_date: formData.due_date,
          customer: formData.customer || null,
          payment_method: formData.payment_method,
          category: formData.category || null,
          notes: formData.notes || null,
          document_number: formData.document_number || null,
        });

        const dataToSave = {
          description: validated.description,
          amount: validated.amount,
          due_date: validated.due_date,
          customer: validated.customer,
          payment_method: validated.payment_method,
          category: validated.category,
          notes: validated.notes,
          document_number: validated.document_number,
          status: formData.status === 'received' ? 'received' : 'pending',
          received_date: formData.status === 'received' ? formData.paid_date : null,
        };

        if (editingItem) {
          const { error } = await supabase.from('accounts_receivable').update(dataToSave).eq('id', editingItem.id);
          if (error) throw error;
          toast.success('Conta a receber atualizada!');
        } else {
          const { error, data } = await supabase.from('accounts_receivable').insert([dataToSave]).select().single();
          if (error) throw error;
          
          // If marked as received, create cash flow entry
          if (formData.status === 'received' && data) {
            await supabase.from('cash_flow').insert([{
              type: 'income',
              description: validated.description,
              amount: isNaN(paidAmountNum) ? validated.amount : paidAmountNum,
              date: formData.paid_date,
              category: validated.category,
              payment_method: validated.payment_method,
              reference_id: data.id,
              reference_type: 'accounts_receivable',
            }]);
          }
          toast.success('Conta a receber criada!');
        }
      }

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Erro ao salvar registro');
      }
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = type === 'payable' ? 'paid' : 'received';
  const titleType = type === 'payable' ? 'Conta a Pagar' : 'Conta a Receber';
  const partyLabel = type === 'payable' ? 'Fornecedor' : 'Cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-semibold text-primary">
            {editingItem ? 'Editar' : 'Novo Lançamento'} - {titleType}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Row 1: Party + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="party" className="text-sm font-medium">
                {partyLabel}
              </Label>
              <Input
                id="party"
                value={type === 'payable' ? formData.supplier : formData.customer}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [type === 'payable' ? 'supplier' : 'customer']: e.target.value 
                })}
                placeholder={`Nome do ${partyLabel.toLowerCase()}`}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Categoria
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {getCategories().map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Compra de mercadorias"
              className="h-10"
            />
          </div>

          {/* Row 3: Amount + Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Valor {type === 'payable' ? 'a Pagar' : 'a Receber'} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                  className="h-10 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date" className="text-sm font-medium">
                Vencimento em <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="h-10"
              />
            </div>
          </div>

          {/* Row 4: Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment_method" className="text-sm font-medium">
              Forma de Pagamento {(type === 'receivable' || isPaidStatus) && <span className="text-destructive">*</span>}
            </Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 5: Status */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Status <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={formData.status}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                status: value as 'pending' | 'paid' | 'received',
                paid_amount: value !== 'pending' ? formData.amount : formData.paid_amount,
              })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending" className="cursor-pointer font-normal">Pendente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={statusLabel} id={statusLabel} />
                <Label htmlFor={statusLabel} className="cursor-pointer font-normal">
                  {type === 'payable' ? 'Pago' : 'Recebido'}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional: Paid fields */}
          {isPaidStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-success/5 rounded-lg border border-success/20">
              <div className="space-y-2">
                <Label htmlFor="paid_amount" className="text-sm font-medium">
                  Valor {type === 'payable' ? 'Pago' : 'Recebido'} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    id="paid_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    placeholder="0,00"
                    className="h-10 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_date" className="text-sm font-medium">
                  {type === 'payable' ? 'Pago em' : 'Recebido em'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="paid_date"
                  type="date"
                  value={formData.paid_date}
                  onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          )}

          {/* Row 6: Document Number */}
          <div className="space-y-2">
            <Label htmlFor="document_number" className="text-sm font-medium">
              Número da Nota Fiscal
            </Label>
            <Input
              id="document_number"
              value={formData.document_number}
              onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
              placeholder="Ex: NF-001"
              className="h-10"
            />
          </div>

          {/* Row 7: Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Histórico / Observações
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Salvando...' : (editingItem ? 'Salvar' : 'Criar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
