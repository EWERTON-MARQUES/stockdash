import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Info, BarChart3 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiService } from '@/lib/api';
import { Product } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ABCProduct extends Product {
  curveClass: 'A' | 'B' | 'C';
  cumulativePercentage: number;
  salesScore: number;
}

const COLORS = {
  A: 'hsl(142, 71%, 45%)',
  B: 'hsl(38, 92%, 50%)',
  C: 'hsl(215, 20%, 65%)',
};

export default function ABCCurve() {
  const [products, setProducts] = useState<ABCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalA: 0,
    totalB: 0,
    totalC: 0,
    percentA: 0,
    percentB: 0,
    percentC: 0,
    valueA: 0,
    valueB: 0,
    valueC: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all products to calculate ABC curve
      const allProducts = await apiService.getAllProductsForStats();

      // Calculate sales score based on available API data
      // Using avgSellsQuantityPast30Days, soldQuantity, and movement frequency
      const productsWithScore = allProducts.map(p => {
        // Weighted score calculation based on sales frequency
        const salesScore = 
          (p.avgSellsQuantityPast30Days ?? 0) * 30 +
          (p.avgSellsQuantityPast15Days ?? 0) * 20 +
          (p.avgSellsQuantityPast7Days ?? 0) * 10 +
          (p.soldQuantity ?? 0);
        return { ...p, salesScore };
      });

      // Sort by sales score descending
      productsWithScore.sort((a, b) => b.salesScore - a.salesScore);

      // Calculate total sales score
      const totalScore = productsWithScore.reduce((acc, p) => acc + p.salesScore, 0);

      // Calculate cumulative percentage and assign ABC class
      // Following the classic ABC analysis: A=80%, B=15%, C=5%
      let cumulative = 0;
      const classifiedProducts: ABCProduct[] = productsWithScore.map(p => {
        cumulative += p.salesScore;
        const cumulativePercentage = totalScore > 0 ? (cumulative / totalScore) * 100 : 0;
        
        let curveClass: 'A' | 'B' | 'C';
        if (cumulativePercentage <= 80) {
          curveClass = 'A';
        } else if (cumulativePercentage <= 95) {
          curveClass = 'B';
        } else {
          curveClass = 'C';
        }

        return {
          ...p,
          curveClass,
          cumulativePercentage,
          salesScore: p.salesScore,
        };
      });

      // Calculate stats
      const aProducts = classifiedProducts.filter(p => p.curveClass === 'A');
      const bProducts = classifiedProducts.filter(p => p.curveClass === 'B');
      const cProducts = classifiedProducts.filter(p => p.curveClass === 'C');

      const totalProducts = classifiedProducts.length;

      setStats({
        totalA: aProducts.length,
        totalB: bProducts.length,
        totalC: cProducts.length,
        percentA: totalProducts > 0 ? Math.round((aProducts.length / totalProducts) * 100) : 0,
        percentB: totalProducts > 0 ? Math.round((bProducts.length / totalProducts) * 100) : 0,
        percentC: totalProducts > 0 ? Math.round((cProducts.length / totalProducts) * 100) : 0,
        valueA: aProducts.reduce((a, p) => a + (p.price * p.stock), 0),
        valueB: bProducts.reduce((a, p) => a + (p.price * p.stock), 0),
        valueC: cProducts.reduce((a, p) => a + (p.price * p.stock), 0),
      });

      setProducts(classifiedProducts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCurveBadge = (curveClass: 'A' | 'B' | 'C') => {
    const styles = {
      A: 'bg-success/10 text-success border-success/20',
      B: 'bg-warning/10 text-warning border-warning/20',
      C: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <Badge variant="outline" className={styles[curveClass]}>
        Curva {curveClass}
      </Badge>
    );
  };

  const pieData = [
    { name: 'Curva A', value: stats.totalA, color: COLORS.A },
    { name: 'Curva B', value: stats.totalB, color: COLORS.B },
    { name: 'Curva C', value: stats.totalC, color: COLORS.C },
  ];

  const topAProducts = products.filter(p => p.curveClass === 'A').slice(0, 10);

  const ProductTable = ({ products }: { products: ABCProduct[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Estoque</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Score Vendas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">% Acumulado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valor Estoque</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Curva</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product, idx) => (
              <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded object-cover" />
                    )}
                    <span className="font-medium text-foreground line-clamp-1 max-w-[200px]">{product.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{product.sku}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${product.stock === 0 ? 'text-destructive' : product.stock <= 80 ? 'text-warning' : 'text-foreground'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{product.salesScore.toFixed(0)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{product.cumulativePercentage.toFixed(1)}%</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{formatCurrency(product.price * product.stock)}</td>
                <td className="px-4 py-3">{getCurveBadge(product.curveClass)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && (
        <div className="py-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto nesta categoria</p>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout>
      <PageHeader
        title="Curva ABC"
        description="Análise de produtos por recorrência de vendas"
      >
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Como funciona a Curva ABC?</p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong className="text-success">Curva A (80%):</strong> Produtos de alta rotatividade, representam 80% das vendas. Priorize reposição.<br />
              <strong className="text-warning">Curva B (15%):</strong> Produtos de média rotatividade, representam 15% das vendas. Monitore regularmente.<br />
              <strong className="text-muted-foreground">Curva C (5%):</strong> Produtos de baixa rotatividade, representam 5% das vendas. Avalie necessidade de estoque.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 mb-6 sm:grid-cols-3">
        <div className="bg-card rounded-xl p-5 border border-success/20 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="font-semibold text-success">Curva A</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalA}</p>
          <p className="text-xs text-muted-foreground">produtos ({stats.percentA}% do total)</p>
          <p className="text-sm font-medium text-success mt-2">{formatCurrency(stats.valueA)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-warning/20 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Minus className="w-5 h-5 text-warning" />
            <span className="font-semibold text-warning">Curva B</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalB}</p>
          <p className="text-xs text-muted-foreground">produtos ({stats.percentB}% do total)</p>
          <p className="text-sm font-medium text-warning mt-2">{formatCurrency(stats.valueB)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Curva C</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalC}</p>
          <p className="text-xs text-muted-foreground">produtos ({stats.percentC}% do total)</p>
          <p className="text-sm font-medium text-muted-foreground mt-2">{formatCurrency(stats.valueC)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 mb-6 lg:grid-cols-2">
        {/* Distribution Pie Chart */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Distribuição de Produtos</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value} produtos`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top A Products Bar Chart */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Top 10 - Curva A (Maiores Vendas)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => v.length > 20 ? v.substring(0, 20) + '...' : v}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`Score: ${value.toFixed(0)}`, 'Vendas']}
                />
                <Bar dataKey="salesScore" fill={COLORS.A} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analisando produtos...</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all">Todos ({products.length})</TabsTrigger>
            <TabsTrigger value="A" className="text-success">Curva A ({stats.totalA})</TabsTrigger>
            <TabsTrigger value="B" className="text-warning">Curva B ({stats.totalB})</TabsTrigger>
            <TabsTrigger value="C">Curva C ({stats.totalC})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ProductTable products={products.slice(0, 100)} />
            {products.length > 100 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando os 100 primeiros produtos. Use os filtros para ver por categoria.
              </p>
            )}
          </TabsContent>
          <TabsContent value="A">
            <ProductTable products={products.filter(p => p.curveClass === 'A')} />
          </TabsContent>
          <TabsContent value="B">
            <ProductTable products={products.filter(p => p.curveClass === 'B')} />
          </TabsContent>
          <TabsContent value="C">
            <ProductTable products={products.filter(p => p.curveClass === 'C').slice(0, 100)} />
            {stats.totalC > 100 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando os 100 primeiros produtos da Curva C.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </MainLayout>
  );
}