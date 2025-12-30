import { ShoppingCart } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Orders() {
  return (
    <MainLayout>
      <PageHeader
        title="Pedidos"
        description="Gerencie seus pedidos de compra e venda"
      />

      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-card rounded-xl border border-border p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <ShoppingCart className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Módulo de Pedidos
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta funcionalidade será carregada através da API configurada. 
          Configure a URL e Token da API nas configurações para começar.
        </p>
      </div>
    </MainLayout>
  );
}
