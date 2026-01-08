import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { X, Check, DollarSign } from 'lucide-react';

interface AccountPayable {
  id: string;
  description: string;
  supplier: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
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
  status: string;
  payment_method: string | null;
  category: string | null;
  notes: string | null;
  document_number: string | null;
}

const PAYMENT_METHODS = [
  'Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 
  'Boleto', 'Transferência', 'Cheque'
];

interface MarkAsPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'payable' | 'receivable';
  item: AccountPayable | AccountReceivable | null;
  onSuccess: () => void;
}

export function MarkAsPaidModal({
  open,
  onOpenChange,
  type,
  item,
  onSuccess,
}: MarkAsPaidModalProps) {
  const [formData, setFormData] = useState({
    paid_amount: '',
    paid_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
  });
  const [saving, setSaving] = useState(false);

  // Update form when item changes
  useState(() => {
    if (item) {
      setFormData({
        paid_amount: String(item.amount),
        paid_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: item.payment_method || '',
      });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!item) return;
    
    if (!formData.payment_method) {
      toast.error('Forma de pagamento é obrigatória');
      return;
    }

    if (!formData.paid_amount || parseFloat(formData.paid_amount) <= 0) {
      toast.error('Valor pago deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      const paidAmount = parseFloat(formData.paid_amount);

      if (type === 'payable') {
        const { error } = await supabase
          .from('accounts_payable')
          .update({ 
            status: 'paid', 
            paid_date: formData.paid_date,
            payment_method: formData.payment_method,
          })
          .eq('id', item.id);
        
        if (error) throw error;

        // Create cash flow entry
        await supabase.from('cash_flow').insert({
          type: 'expense',
          description: item.description,
          amount: paidAmount,
          date: formData.paid_date,
          category: item.category,
          payment_method: formData.payment_method,
          reference_id: item.id,
          reference_type: 'accounts_payable',
        });

        toast.success('Conta marcada como paga!');
      } else {
        const { error } = await supabase
          .from('accounts_receivable')
          .update({ 
            status: 'received', 
            received_date: formData.paid_date,
            payment_method: formData.payment_method,
          })
          .eq('id', item.id);
        
        if (error) throw error;

        // Create cash flow entry
        await supabase.from('cash_flow').insert({
          type: 'income',
          description: item.description,
          amount: paidAmount,
          date: formData.paid_date,
          category: item.category,
          payment_method: formData.payment_method,
          reference_id: item.id,
          reference_type: 'accounts_receivable',
        });

        toast.success('Conta marcada como recebida!');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Erro ao atualizar registro');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            {type === 'payable' ? 'Registrar Pagamento' : 'Registrar Recebimento'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Info */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Lançamento:</p>
            <p className="font-medium text-foreground">{item.description}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Valor original: <span className="font-semibold">{formatCurrency(item.amount)}</span>
            </p>
          </div>

          {/* Paid Amount */}
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

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment_method" className="text-sm font-medium">
              Forma de Pagamento <span className="text-destructive">*</span>
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

          {/* Paid Date */}
          <div className="space-y-2">
            <Label htmlFor="paid_date" className="text-sm font-medium">
              Data do {type === 'payable' ? 'Pagamento' : 'Recebimento'} <span className="text-destructive">*</span>
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
            className="gap-2 bg-success hover:bg-success/90"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
