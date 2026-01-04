import { useEffect, useState, useCallback } from 'react';
import { Package, Boxes, AlertTriangle, XCircle, DollarSign, Layers, RefreshCw, TrendingUp, TrendingDown, ArrowRight, BarChart3 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { apiService } from '@/lib/api';
import { DashboardStats, Product, StockMovement } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ProductWithMovement extends Product {
  lastMovement?: StockMovement;
  movementType?: 'entry' | 'exit';
  movementQuantity?: number;
  movementDate?: string;
}

const CHART_COLORS = ['hsl(205, 90%, 45%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 45%)'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [movementProducts, setMovementProducts] = useState<ProductWithMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stockTrend, setStockTrend] = useState<{ date: string; stock: number; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number; stock: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; stock: number }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Save daily snapshot first (will update or create for today)
      await apiService.saveDailySnapshot();
      
      const [statsData, trendData, topData, catData] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getStockTrendData(),
        apiService.getTopSellingProducts(),
        apiService.getCategoryDistribution(),
      ]);
      setStats(statsData);
      setStockTrend(trendData);
      setTopProducts(topData);
      setCategoryData(catData);
      
      // Get products with recent movements (ordered by update date from API)
      const recentProducts = await apiService.getRecentMovementProducts();
      setMovementProducts(recentProducts);
      
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

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
      <div className="grid gap-3 sm:gap-4 mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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
          title="Custo em Estoque"
          value={formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
          iconClassName="bg-chart-1/10 text-chart-1"
        />
        <StatCard
          title="Categorias"
          value={formatNumber(categoryData.length || 0)}
          icon={Layers}
          iconClassName="bg-chart-2/10 text-chart-2"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 mb-6 lg:grid-cols-2">
        {/* Stock Trend Chart */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tendência de Estoque
            </h3>
            <Badge variant="outline" className="text-xs border-border/50">Últimos 7 dias</Badge>
          </div>
          <div className="h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Estoque']}
                  labelFormatter={(label) => `Data: ${formatShortDate(label)}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4 text-success" />
              Top Produtos (Vendas)
            </h3>
          </div>
          <div className="h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Vendas']}
                />
                <Bar dataKey="sales" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 sm:gap-6 mb-6 lg:grid-cols-2">
        {/* Value Trend Chart */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="w-4 h-4 text-warning" />
              Valor do Estoque
            </h3>
            <Badge variant="outline" className="text-xs border-border/50">Últimos 7 dias</Badge>
          </div>
          <div className="h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  labelFormatter={(label) => `Data: ${formatShortDate(label)}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--warning))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Package className="w-4 h-4 text-primary" />
              Distribuição por Categoria
            </h3>
          </div>
          <div className="h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="stock"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {categoryData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs bg-muted/30 px-2 py-1 rounded-lg">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products with Latest Movements */}
      <div className="glass-card animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base">Produtos com Últimas Movimentações</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Produtos com entradas e saídas recentes</p>
          </div>
          <Link
            to="/catalogo"
            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  SKU
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Movimentação
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Data/Hora
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Preço
                </th>
                <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movementProducts.map((product) => (
                <tr key={product.id} className="table-row-hover">
                  <td className="px-3 sm:px-5 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {product.imageUrl && (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-border"
                        />
                      )}
                      <Link
                        to={`/catalogo`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 max-w-[120px] sm:max-w-[200px] text-sm"
                      >
                        {product.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-sm text-muted-foreground font-mono hidden sm:table-cell">
                    {product.sku}
                  </td>
                  <td className="px-3 sm:px-5 py-3">
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
                  <td className="px-3 sm:px-5 py-3">
                    <span className={`text-sm font-semibold ${
                      product.movementType === 'exit' ? 'text-destructive' : 'text-success'
                    }`}>
                      {product.movementType === 'exit' ? '-' : '+'}{product.movementQuantity || 1}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {product.movementDate 
                        ? new Date(product.movementDate).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                        : '-'
                      }
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-3">
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
                    </div>
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-sm font-semibold text-foreground hidden md:table-cell">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-3 sm:px-5 py-3 hidden lg:table-cell">
                    <StatusBadge status={product.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {movementProducts.length === 0 && (
          <div className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma movimentação recente</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
