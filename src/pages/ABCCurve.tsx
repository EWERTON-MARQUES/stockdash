import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Info, BarChart3 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiService } from '@/lib/api';
import { Product } from '@/lib/types';

interface ABCProduct extends Product {
  curveClass: 'A' | 'B' | 'C';
  cumulativePercentage: number;
  salesScore: number;
}

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
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all products to calculate ABC curve
      const result = await apiService.getAllProductsStats();
      const allProducts = result.products;

      // Calculate sales score based on available data
      // Use avgSellsQuantityPast30Days, soldQuantity, or estimate from stock movement
      const productsWithScore = allProducts.map(p => {
        const salesScore = 
          (p.avgSellsQuantityPast30Days ?? 0) * 30 +
          (p.avgSellsQuantityPast15Days ?? 0) * 15 +
          (p.avgSellsQuantityPast7Days ?? 0) * 7 +
          (p.soldQuantity ?? 0);
        return { ...p, salesScore };
      });

      // Sort by sales score descending
      productsWithScore.sort((a, b) => b.salesScore - a.salesScore);

      // Calculate total sales score
      const totalScore = productsWithScore.reduce((acc, p) => acc + p.salesScore, 0);

      // Calculate cumulative percentage and assign ABC class
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

      setStats({
        totalA: aProducts.length,
        totalB: bProducts.length,
        totalC: cProducts.length,
        percentA: totalScore > 0 ? Math.round((aProducts.reduce((a, p) => a + p.salesScore, 0) / totalScore) * 100) : 0,
        percentB: totalScore > 0 ? Math.round((bProducts.reduce((a, p) => a + p.salesScore, 0) / totalScore) * 100) : 0,
        percentC: totalScore > 0 ? Math.round((cProducts.reduce((a, p) => a + p.salesScore, 0) / totalScore) * 100) : 0,
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

  const getCurveIcon = (curveClass: 'A' | 'B' | 'C') => {
    switch (curveClass) {
      case 'A':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'B':
        return <Minus className="w-4 h-4 text-warning" />;
      case 'C':
        return <TrendingDown className="w-4 h-4 text-muted-foreground" />;
    }
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

  const ProductTable = ({ products }: { products: ABCProduct[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Estoque</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Score Vendas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">% Acumulado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Curva</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
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
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Como funciona a Curva ABC?</p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Curva A (80%):</strong> Produtos de alta rotatividade, representam 80% das vendas.<br />
              <strong>Curva B (15%):</strong> Produtos de média rotatividade, representam 15% das vendas.<br />
              <strong>Curva C (5%):</strong> Produtos de baixa rotatividade, representam 5% das vendas.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 mb-6 sm:grid-cols-3">
        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-5 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="font-semibold text-success">Curva A</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalA}</p>
          <p className="text-xs text-muted-foreground">produtos ({stats.percentA}% das vendas)</p>
        </div>
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl p-5 border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <Minus className="w-5 h-5 text-warning" />
            <span className="font-semibold text-warning">Curva B</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalB}</p>
          <p className="text-xs text-muted-foreground">produtos ({stats.percentB}% das vendas)</p>
        </div>
        <div className="bg-gradient-to-br from-muted to-muted/50 rounded-xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Curva C</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalC}</p>
          <p className="text-xs text-muted-foreground">produtos ({stats.percentC}% das vendas)</p>
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
