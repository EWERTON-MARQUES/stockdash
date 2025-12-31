import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Barcode,
  DollarSign,
  Boxes,
  Building2,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCcw,
  RotateCcw,
  Edit,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';
import { Product, StockMovement } from '@/lib/types';
import { cn } from '@/lib/utils';

const movementTypeConfig = {
  entry: {
    label: 'Entrada',
    icon: ArrowDownCircle,
    className: 'text-success',
    bgClassName: 'bg-success/10',
  },
  exit: {
    label: 'Saída',
    icon: ArrowUpCircle,
    className: 'text-destructive',
    bgClassName: 'bg-destructive/10',
  },
  adjustment: {
    label: 'Ajuste',
    icon: RefreshCcw,
    className: 'text-warning',
    bgClassName: 'bg-warning/10',
  },
  return: {
    label: 'Devolução',
    icon: RotateCcw,
    className: 'text-primary',
    bgClassName: 'bg-primary/10',
  },
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        const [productData, movementsData] = await Promise.all([
          apiService.getProduct(id),
          apiService.getProductMovements(id),
        ]);
        setProduct(productData || null);
        setMovements(movementsData);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Produto não encontrado
          </h2>
          <Link to="/catalogo">
            <Button variant="default">Voltar ao Catálogo</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Back Button */}
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar ao Catálogo</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
                {product.name}
              </h1>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-muted-foreground font-mono">{product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Informações do Produto
            </h2>
            <p className="text-muted-foreground mb-6">{product.description}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Barcode className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Código de Barras</p>
                  <p className="font-mono text-sm text-foreground">
                    {product.barcode || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="text-sm font-medium text-foreground">
                    {product.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fornecedor</p>
                  <p className="text-sm font-medium text-foreground">
                    {product.supplier}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Última Atualização</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(product.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            {(product.weight || product.dimensions) && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Especificações
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {product.weight && (
                    <div>
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="text-sm font-medium text-foreground">
                        {product.weight} kg
                      </p>
                    </div>
                  )}
                  {product.dimensions && (
                    <div>
                      <p className="text-xs text-muted-foreground">Dimensões</p>
                      <p className="text-sm font-medium text-foreground">
                        {product.dimensions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Movement History */}
          <div className="bg-card rounded-xl border border-border shadow-sm animate-fade-in">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Histórico de Movimentação
              </h2>
              <p className="text-sm text-muted-foreground">
                Todas as entradas, saídas e ajustes deste produto
              </p>
            </div>

            {movements.length > 0 ? (
              <div className="divide-y divide-border">
                {movements.map((movement) => {
                  const config = movementTypeConfig[movement.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={movement.id}
                      className="flex items-start gap-4 p-6 table-row-hover"
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-xl',
                          config.bgClassName
                        )}
                      >
                        <Icon className={cn('w-5 h-5', config.className)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn('font-semibold text-sm', config.className)}
                          >
                            {config.label}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {movement.type === 'exit' ? '-' : '+'}
                            {Math.abs(movement.quantity)} un
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {movement.reason}
                        </p>
                        {movement.reference && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Ref: {movement.reference}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{formatDate(movement.createdAt)}</span>
                          <span>Por: {movement.userName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Estoque</p>
                        <p className="text-sm font-mono text-foreground">
                          {movement.previousStock} → {movement.newStock}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCcw className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-foreground mb-4">Estoque</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Boxes className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade Atual</p>
                  <p className="text-2xl font-bold text-foreground">
                    {product.stock}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {product.unit}
                    </span>
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estoque Mínimo</span>
                  <span className="font-medium text-foreground">
                    {product.minStock} {product.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-foreground mb-4">Preços</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Preço de Custo + Impostos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço de Custo</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(product.costPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margem</span>
                  <span className="font-medium text-success">
                    {(
                      ((product.price - product.costPrice) / product.costPrice) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor em Estoque</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(product.price * product.stock)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
