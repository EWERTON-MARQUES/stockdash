import { useEffect, useState, useCallback } from 'react';
import { Package, Boxes, AlertTriangle, XCircle, DollarSign, Layers, RefreshCw, TrendingUp, TrendingDown, ArrowRight, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
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

const CHART_COLORS = ['hsl(205, 90%, 45%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 45%)', 'hsl(320, 70%, 50%)', 'hsl(60, 80%, 45%)', 'hsl(100, 60%, 45%)', 'hsl(220, 75%, 55%)', 'hsl(350, 65%, 55%)', 'hsl(160, 65%, 45%)', 'hsl(45, 85%, 50%)', 'hsl(260, 60%, 55%)', 'hsl(190, 70%, 50%)'];

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
    // Parse date as local date (YYYY-MM-DD format) to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
      <motion.div 
        className="grid gap-3 sm:gap-4 mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        initial="initial"
        animate="animate"
        variants={{
          initial: {},
          animate: {
            transition: {
              staggerChildren: 0.05,
            }
          }
        }}
      >
        <StatCard
          title="Total de Produtos"
          value={formatNumber(stats?.totalProducts || 0)}
          icon={Package}
          iconClassName="bg-primary/10 text-primary"
          delay={0}
        />
        <StatCard
          title="Estoque Ativo"
          value={formatNumber(stats?.totalStock || 0)}
          icon={Boxes}
          iconClassName="bg-success/10 text-success"
          delay={0.05}
        />
        <StatCard
          title="Estoque Baixo"
          value={formatNumber(stats?.lowStockProducts || 0)}
          icon={AlertTriangle}
          iconClassName="bg-warning/10 text-warning"
          delay={0.1}
        />
        <StatCard
          title="Sem Estoque"
          value={formatNumber(stats?.outOfStockProducts || 0)}
          icon={XCircle}
          iconClassName="bg-destructive/10 text-destructive"
          delay={0.15}
        />
        <StatCard
          title="Custo em Estoque"
          value={formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
          iconClassName="bg-chart-1/10 text-chart-1"
          delay={0.2}
        />
        <StatCard
          title="Categorias"
          value={formatNumber(categoryData.length || 0)}
          icon={Layers}
          iconClassName="bg-chart-2/10 text-chart-2"
          delay={0.25}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div 
        className="grid gap-4 sm:gap-6 mb-6 lg:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {/* Stock Trend Chart */}
        <motion.div 
          className="bg-card rounded-xl border border-border/50 p-4 sm:p-5 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tendência de Estoque
            </h3>
            <Badge variant="outline" className="text-xs">Últimos 7 dias</Badge>
          </div>
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Estoque']}
                  labelFormatter={(label) => `Data: ${formatShortDate(label)}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Products Chart */}
        <motion.div 
          className="bg-card rounded-xl border border-border/50 p-4 sm:p-5 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4 text-success" />
              Top Produtos (Vendas)
            </h3>
          </div>
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Vendas']}
                />
              <Bar dataKey="sales" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {/* Second Charts Row */}
      <motion.div 
        className="grid gap-4 sm:gap-6 mb-6 lg:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        {/* Value Trend Chart */}
        <motion.div 
          className="bg-card rounded-xl border border-border/50 p-4 sm:p-5 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="w-4 h-4 text-warning" />
              Valor do Estoque
            </h3>
            <Badge variant="outline" className="text-xs">Últimos 7 dias</Badge>
          </div>
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  labelFormatter={(label) => `Data: ${formatShortDate(label)}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--warning))', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div 
          className="bg-card rounded-xl border border-border/50 p-4 sm:p-5 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Package className="w-4 h-4 text-chart-1" />
              Distribuição por Categoria
            </h3>
          </div>
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="stock"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2 max-h-[60px] overflow-y-auto">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate max-w-[60px] sm:max-w-[80px]">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Products with Latest Movements */}
      <motion.div 
        className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-xl transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base">Produtos com Últimas Movimentações</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Produtos com entradas e saídas recentes</p>
          </div>
          <Link
            to="/catalogo"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Produto
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  SKU
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Movimentação
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Quantidade
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Data/Hora
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Estoque
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Preço
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movementProducts.map((product) => (
                <tr key={product.id} className="table-row-hover">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {product.imageUrl && (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-8 h-8 rounded-lg object-cover border border-border flex-shrink-0"
                        />
                      )}
                      <Link
                        to={`/catalogo`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 max-w-[150px] text-sm"
                      >
                        {product.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground font-mono whitespace-nowrap">
                    {product.sku}
                  </td>
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3">
                    <span className={`text-sm font-semibold ${
                      product.movementType === 'exit' ? 'text-destructive' : 'text-success'
                    }`}>
                      {product.movementType === 'exit' ? '-' : '+'}{product.movementQuantity || 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
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
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3 text-sm font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-3 py-3">
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
      </motion.div>
    </MainLayout>
  );
}
