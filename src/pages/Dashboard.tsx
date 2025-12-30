import { useEffect, useState } from 'react';
import { Package, Boxes, AlertTriangle, XCircle, DollarSign, ArrowUpDown } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { apiService } from '@/lib/api';
import { DashboardStats, Product } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, products] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getProducts(),
        ]);
        setStats(statsData);
        setRecentProducts(products.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu estoque e produtos"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total de Produtos"
          value={stats?.totalProducts || 0}
          icon={Package}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="Itens em Estoque"
          value={stats?.totalStock || 0}
          icon={Boxes}
          iconClassName="bg-chart-2/10 text-success"
        />
        <StatCard
          title="Estoque Baixo"
          value={stats?.lowStockProducts || 0}
          icon={AlertTriangle}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="Sem Estoque"
          value={stats?.outOfStockProducts || 0}
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
          value={stats?.recentMovements || 0}
          icon={ArrowUpDown}
          iconClassName="bg-chart-5/10 text-chart-5"
        />
      </div>

      {/* Recent Products Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Produtos Recentes</h2>
            <p className="text-sm text-muted-foreground">Últimos produtos atualizados</p>
          </div>
          <Link
            to="/catalogo"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Categoria
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
              {recentProducts.map((product) => (
                <tr key={product.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <Link
                      to={`/catalogo/${product.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
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
