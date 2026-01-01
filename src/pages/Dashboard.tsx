import { useEffect, useState, useCallback } from 'react';
import { Package, Boxes, AlertTriangle, XCircle, DollarSign, ArrowUpDown, RefreshCw, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { apiService } from '@/lib/api';
import { DashboardStats, Product, StockMovement } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductWithMovement extends Product {
  lastMovement?: StockMovement;
  movementType?: 'entry' | 'exit';
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [movementProducts, setMovementProducts] = useState<ProductWithMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, productsResult] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getProducts(1, 20),
      ]);
      setStats(statsData);
      
      // Get products with recent movements (using update dates as proxy)
      const sortedByUpdate = [...productsResult.products].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      // Add movement info based on available data
      const productsWithMovement: ProductWithMovement[] = sortedByUpdate.slice(0, 10).map(p => ({
        ...p,
        movementType: (p.soldQuantity && p.soldQuantity > 0) ? 'exit' : 'entry',
      }));
      
      setMovementProducts(productsWithMovement);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (loading && !stats) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu estoque e produtos"
      >
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadData} 
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total de Produtos"
          value={formatNumber(stats?.totalProducts || 0)}
          icon={Package}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="Estoque Ativo"
          value={formatNumber(stats?.totalStock || 0)}
          icon={Boxes}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="Estoque Baixo"
          value={formatNumber(stats?.lowStockProducts || 0)}
          icon={AlertTriangle}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="Sem Estoque"
          value={formatNumber(stats?.outOfStockProducts || 0)}
          icon={XCircle}
          iconClassName="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="Valor Total"
          value={formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
          iconClassName="bg-chart-4/10 text-chart-4"
        />
        <StatCard
          title="Movimentações"
          value={formatNumber(stats?.recentMovements || 0)}
          icon={ArrowUpDown}
          iconClassName="bg-chart-5/10 text-chart-5"
        />
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Produtos com estoque baixo</p>
            <p className="text-xs text-muted-foreground">
              Consideramos estoque baixo produtos com <span className="font-semibold">80 unidades ou menos</span>
            </p>
          </div>
        </div>
      </div>

      {/* Products with Latest Movements */}
      <div className="bg-card rounded-2xl border border-border shadow-sm animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Produtos com Últimas Movimentações</h2>
            <p className="text-sm text-muted-foreground">Produtos atualizados recentemente na API</p>
          </div>
          <Link
            to="/catalogo"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Movimentação
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movementProducts.map((product) => (
                <tr key={product.id} className="table-row-hover hover:bg-primary/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-border"
                        />
                      )}
                      <Link
                        to={`/catalogo`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {product.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant="outline" 
                      className={
                        product.movementType === 'exit' 
                          ? 'bg-destructive/10 text-destructive border-destructive/20' 
                          : 'bg-success/10 text-success border-success/20'
                      }
                    >
                      {product.movementType === 'exit' ? (
                        <><TrendingDown className="w-3 h-3 mr-1" /> Saída</>
                      ) : (
                        <><TrendingUp className="w-3 h-3 mr-1" /> Entrada</>
                      )}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        product.stock === 0 
                          ? 'text-destructive' 
                          : product.stock <= 80 
                          ? 'text-warning' 
                          : 'text-success'
                      }`}>
                        {product.stock}
                      </span>
                      <span className="text-xs text-muted-foreground">{product.unit}</span>
                      {product.stock <= 80 && product.stock > 0 && (
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                          Baixo
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={product.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
