import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, Package, TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  XCircle, Filter, Download, RefreshCw, Calendar, Layers, Building2,
  PieChart as PieChartIcon, ArrowUpDown, Target, Box, FileText
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { apiService, Category, Supplier } from '@/lib/api';
import { Product } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const CHART_COLORS = [
  'hsl(205, 90%, 45%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 
  'hsl(0, 72%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 45%)',
  'hsl(320, 70%, 50%)', 'hsl(45, 85%, 50%)'
];

interface StockSnapshot {
  date: string;
  total_products: number;
  total_stock: number;
  total_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProductsFromApi, setTotalProductsFromApi] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('7');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch total from API first
      const stats = await apiService.getDashboardStats();
      setTotalProductsFromApi(stats.totalProducts);
      
      const [allProducts, cats, supps] = await Promise.all([
        apiService.getAllProductsForStats(),
        apiService.getCategories(),
        apiService.getSuppliers(),
      ]);
      
      setProducts(allProducts);
      setCategories(cats);
      setSuppliers(supps);
      
      // Load historical snapshots
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(periodFilter));
      
      const { data: snapshotData } = await supabase
        .from('daily_stock_snapshots')
        .select('*')
        .gte('date', daysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      setSnapshots(snapshotData || []);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, [periodFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter products
  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (supplierFilter !== 'all' && p.supplier !== supplierFilter) return false;
    if (stockFilter === 'in_stock' && p.stock === 0) return false;
    if (stockFilter === 'low_stock' && (p.stock === 0 || p.stock > 80)) return false;
    if (stockFilter === 'out_of_stock' && p.stock !== 0) return false;
    return true;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Calculate metrics - ESTOQUE ONLY (usando costPrice = Custo Wedrop)
  // Use API total when no filters, otherwise use filtered count
  const totalProducts = (categoryFilter === 'all' && supplierFilter === 'all' && stockFilter === 'all') 
    ? totalProductsFromApi 
    : filteredProducts.length;
  const totalStock = filteredProducts.reduce((acc, p) => acc + p.stock, 0);
  const totalCostValue = filteredProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockCount = filteredProducts.filter(p => p.stock > 0 && p.stock <= 80).length;
  const outOfStockCount = filteredProducts.filter(p => p.stock === 0).length;
  const avgStock = totalProducts > 0 ? totalStock / totalProducts : 0;
  const inStockCount = filteredProducts.filter(p => p.stock > 80).length;

  // Category analysis - ESTOQUE ONLY
  const categoryAnalysis = categories.map(cat => {
    const catProducts = filteredProducts.filter(p => p.category === cat.name);
    const stock = catProducts.reduce((acc, p) => acc + p.stock, 0);
    const costValue = catProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
    const lowStock = catProducts.filter(p => p.stock > 0 && p.stock <= 80).length;
    const outOfStock = catProducts.filter(p => p.stock === 0).length;
    return {
      name: cat.name,
      products: catProducts.length,
      stock,
      costValue,
      lowStock,
      outOfStock,
    };
  }).filter(c => c.products > 0).sort((a, b) => b.costValue - a.costValue);

  // Supplier analysis
  const supplierAnalysis = suppliers.map(sup => {
    const supProducts = filteredProducts.filter(p => p.supplier === sup.name);
    const stock = supProducts.reduce((acc, p) => acc + p.stock, 0);
    const costValue = supProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
    const lowStock = supProducts.filter(p => p.stock > 0 && p.stock <= 80).length;
    const outOfStock = supProducts.filter(p => p.stock === 0).length;
    return {
      name: sup.name,
      products: supProducts.length,
      stock,
      costValue,
      lowStock,
      outOfStock,
    };
  }).filter(s => s.products > 0).sort((a, b) => b.costValue - a.costValue);

  // ABC Analysis
  const abcProducts = [...filteredProducts]
    .map(p => ({
      ...p,
      totalCostValue: p.price * p.stock,
      salesScore: (p.avgSellsQuantityPast30Days ?? 0) * 30 + (p.soldQuantity ?? 0),
    }))
    .sort((a, b) => b.salesScore - a.salesScore);

  const totalSalesScore = abcProducts.reduce((acc, p) => acc + p.salesScore, 0);
  let accumulatedScore = 0;
  const abcClassified = abcProducts.map(p => {
    accumulatedScore += p.salesScore;
    const percentage = totalSalesScore > 0 ? (accumulatedScore / totalSalesScore) * 100 : 0;
    let classification: 'A' | 'B' | 'C' = 'C';
    if (percentage <= 80) classification = 'A';
    else if (percentage <= 95) classification = 'B';
    return { ...p, classification, accumulatedPercentage: percentage };
  });

  const abcSummary = {
    A: abcClassified.filter(p => p.classification === 'A').length,
    B: abcClassified.filter(p => p.classification === 'B').length,
    C: abcClassified.filter(p => p.classification === 'C').length,
  };

  // Stock status distribution
  const stockDistribution = [
    { name: 'Em Estoque', value: inStockCount, color: CHART_COLORS[1] },
    { name: 'Estoque Baixo', value: lowStockCount, color: CHART_COLORS[2] },
    { name: 'Sem Estoque', value: outOfStockCount, color: CHART_COLORS[3] },
  ];

  // Top products by cost value
  const topByCostValue = [...filteredProducts]
    .map(p => ({ name: p.name.substring(0, 30), costValue: p.price * p.stock, stock: p.stock }))
    .sort((a, b) => b.costValue - a.costValue)
    .slice(0, 10);

  // Top products by stock
  const topByStock = [...filteredProducts]
    .map(p => ({ name: p.name.substring(0, 30), stock: p.stock, costValue: p.price * p.stock }))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 10);

  // Products needing attention (low stock + high sales)
  const needsAttention = [...filteredProducts]
    .filter(p => p.stock <= 80 && (p.avgSellsQuantityPast7Days ?? 0) > 0)
    .sort((a, b) => (b.avgSellsQuantityPast7Days ?? 0) - (a.avgSellsQuantityPast7Days ?? 0))
    .slice(0, 15);

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading && products.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando relatórios...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Relatórios de Estoque"
        description="Análise completa do seu estoque de produtos"
      >
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Fornecedores</SelectItem>
              {suppliers.map(sup => (
                <SelectItem key={sup.id} value={sup.name}>{sup.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="in_stock">Em Estoque</SelectItem>
              <SelectItem value="low_stock">Estoque Baixo</SelectItem>
              <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Produtos</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">{formatNumber(totalProducts)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Box className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Estoque Total</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-success">{formatNumber(totalStock)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">Valor Estoque</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-chart-1">{formatCurrency(totalCostValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Média/Prod</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">{avgStock.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Estoque Baixo</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-warning">{formatNumber(lowStockCount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Sem Estoque</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-destructive">{formatNumber(outOfStockCount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm">
            <Layers className="w-4 h-4 mr-1" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs sm:text-sm">
            <Building2 className="w-4 h-4 mr-1" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="abc" className="text-xs sm:text-sm">
            <Target className="w-4 h-4 mr-1" />
            Curva ABC
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs sm:text-sm">
            <Box className="w-4 h-4 mr-1" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Alertas
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Stock Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-primary" />
                  Distribuição do Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {stockDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {stockDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top by Cost Value */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    Top 10 por Valor em Estoque
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(topByCostValue, 'top_valor_estoque')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topByCostValue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="costValue" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} name="Valor Estoque" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Stock Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Estoque por Categoria
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => exportToCSV(categoryAnalysis, 'estoque_por_categoria')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryAnalysis.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="stock" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Estoque" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Análise por Categoria
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(categoryAnalysis, 'analise_categorias')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Produtos</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Valor Estoque</TableHead>
                      <TableHead className="text-right">Estoque Baixo</TableHead>
                      <TableHead className="text-right">Sem Estoque</TableHead>
                      <TableHead className="w-[150px]">Participação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryAnalysis.slice(0, 20).map((cat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">{formatNumber(cat.products)}</TableCell>
                        <TableCell className="text-right">{formatNumber(cat.stock)}</TableCell>
                        <TableCell className="text-right text-chart-1">{formatCurrency(cat.costValue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            {cat.lowStock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">
                            {cat.outOfStock}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={totalCostValue > 0 ? (cat.costValue / totalCostValue) * 100 : 0} className="h-2" />
                            <span className="text-xs text-muted-foreground w-12">
                              {totalCostValue > 0 ? ((cat.costValue / totalCostValue) * 100).toFixed(1) : '0'}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Category Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estoque por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryAnalysis.slice(0, 6)}
                        dataKey="stock"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name }) => name.substring(0, 15)}
                      >
                        {categoryAnalysis.slice(0, 6).map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatNumber(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valor em Estoque por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryAnalysis.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="costValue" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Valor Estoque" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Análise por Fornecedor
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(supplierAnalysis, 'analise_fornecedores')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Produtos</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Valor Estoque</TableHead>
                      <TableHead className="text-right">Estoque Baixo</TableHead>
                      <TableHead className="text-right">Sem Estoque</TableHead>
                      <TableHead>Saúde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierAnalysis.slice(0, 20).map((sup, idx) => {
                      const healthScore = sup.products > 0 
                        ? 100 - ((sup.lowStock + sup.outOfStock * 2) / sup.products * 100)
                        : 100;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{sup.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(sup.products)}</TableCell>
                          <TableCell className="text-right">{formatNumber(sup.stock)}</TableCell>
                          <TableCell className="text-right text-chart-1">{formatCurrency(sup.costValue)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-warning/10 text-warning">
                              {sup.lowStock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-destructive/10 text-destructive">
                              {sup.outOfStock}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={healthScore} 
                                className={`h-2 ${healthScore >= 70 ? '[&>div]:bg-success' : healthScore >= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`}
                              />
                              <span className="text-xs text-muted-foreground w-10">
                                {healthScore.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estoque por Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierAnalysis.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatNumber(v)} />
                      <Bar dataKey="stock" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Estoque" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valor em Estoque por Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierAnalysis.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="costValue" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Valor Estoque" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABC Analysis Tab */}
        <TabsContent value="abc" className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Classe A (80%)</p>
                    <p className="text-2xl font-bold text-success">{abcSummary.A}</p>
                    <p className="text-xs text-muted-foreground">Alta rotatividade</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-success">A</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-warning">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Classe B (15%)</p>
                    <p className="text-2xl font-bold text-warning">{abcSummary.B}</p>
                    <p className="text-xs text-muted-foreground">Média rotatividade</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-warning">B</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-muted">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Classe C (5%)</p>
                    <p className="text-2xl font-bold text-muted-foreground">{abcSummary.C}</p>
                    <p className="text-xs text-muted-foreground">Baixa rotatividade</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xl font-bold text-muted-foreground">C</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Classificação ABC
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(
                    abcClassified.map(p => ({
                      sku: p.sku,
                      nome: p.name,
                      classificacao: p.classification,
                      estoque: p.stock,
                      precoVenda: p.price,
                      valorTotalEstoque: p.totalCostValue,
                      mediaSaida30d: p.avgSellsQuantityPast30Days || 0,
                    })),
                    'curva_abc'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Classe</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Média Saída/30d</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abcClassified.slice(0, 30).map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={
                              p.classification === 'A' 
                                ? 'bg-success/10 text-success border-success/20' 
                                : p.classification === 'B'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {p.classification}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(p.stock)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                        <TableCell className="text-right text-chart-1">{formatCurrency(p.totalCostValue)}</TableCell>
                        <TableCell className="text-right">{(p.avgSellsQuantityPast30Days ?? 0).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Box className="w-4 h-4 text-primary" />
                    Top 10 por Quantidade
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(topByStock, 'top_quantidade')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topByStock} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="stock" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Estoque" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-chart-1" />
                    Top 10 por Valor em Estoque
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => exportToCSV(topByCostValue, 'top_custo')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topByCostValue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="costValue" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} name="Valor Estoque" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Details Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Detalhamento do Estoque</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(
                    filteredProducts.map(p => ({
                      sku: p.sku,
                      nome: p.name,
                      categoria: p.category,
                      fornecedor: p.supplier,
                      estoque: p.stock,
                      precoVenda: p.price,
                      valorTotalEstoque: p.price * p.stock,
                      status: p.stock === 0 ? 'Sem Estoque' : p.stock <= 80 ? 'Estoque Baixo' : 'Em Estoque',
                    })),
                    'detalhamento_estoque'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 50).map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.category}</TableCell>
                        <TableCell className="text-muted-foreground">{p.supplier}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(p.stock)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                        <TableCell className="text-right text-chart-1">{formatCurrency(p.price * p.stock)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              p.stock === 0 
                                ? 'bg-destructive/10 text-destructive' 
                                : p.stock <= 80 
                                ? 'bg-warning/10 text-warning' 
                                : 'bg-success/10 text-success'
                            }
                          >
                            {p.stock === 0 ? 'Sem Estoque' : p.stock <= 80 ? 'Baixo' : 'OK'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {snapshots.length > 0 ? (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Evolução do Estoque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={snapshots}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip 
                            labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                            formatter={(v: number) => formatNumber(v)}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="total_stock" 
                            stroke={CHART_COLORS[0]} 
                            fill={`${CHART_COLORS[0]}33`}
                            name="Estoque Total"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-chart-1" />
                      Evolução do Valor em Estoque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={snapshots}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                          <Tooltip 
                            labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                            formatter={(v: number) => formatCurrency(v)}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="total_value" 
                            stroke={CHART_COLORS[1]} 
                            fill={`${CHART_COLORS[1]}33`}
                            name="Valor Estoque"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Evolução de Alertas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={snapshots}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="low_stock_products" 
                          stroke={CHART_COLORS[2]} 
                          strokeWidth={2}
                          name="Estoque Baixo"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="out_of_stock_products" 
                          stroke={CHART_COLORS[3]} 
                          strokeWidth={2}
                          name="Sem Estoque"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sem dados históricos</h3>
                <p className="text-muted-foreground">
                  Os dados de tendência serão coletados automaticamente ao acessar o Dashboard.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="border-l-4 border-l-warning">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos com Estoque Baixo</p>
                    <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos Sem Estoque</p>
                    <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {needsAttention.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Produtos que Precisam de Atenção
                    <Badge variant="outline" className="ml-2">Alta demanda + Baixo estoque</Badge>
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(
                      needsAttention.map(p => ({
                        sku: p.sku,
                        nome: p.name,
                        estoque: p.stock,
                        mediaSaida7d: p.avgSellsQuantityPast7Days || 0,
                        precoVenda: p.price,
                      })),
                      'produtos_atencao'
                    )}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Média Saída/7d</TableHead>
                        <TableHead className="text-right">Dias de Estoque</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {needsAttention.map((p, idx) => {
                        const daysOfStock = p.avgSellsQuantityPast7Days && p.avgSellsQuantityPast7Days > 0 
                          ? Math.round(p.stock / p.avgSellsQuantityPast7Days)
                          : 999;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-warning/10 text-warning">
                                {p.stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{(p.avgSellsQuantityPast7Days ?? 0).toFixed(1)}</TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                variant="outline"
                                className={daysOfStock <= 7 ? 'bg-destructive/10 text-destructive' : daysOfStock <= 14 ? 'bg-warning/10 text-warning' : ''}
                              >
                                {daysOfStock} dias
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products without stock */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  Produtos Sem Estoque
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                    onClick={() => exportToCSV(
                      filteredProducts.filter(p => p.stock === 0).map(p => ({
                        sku: p.sku,
                        nome: p.name,
                        categoria: p.category,
                        fornecedor: p.supplier,
                        precoVenda: p.price,
                      })),
                      'produtos_sem_estoque'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.filter(p => p.stock === 0).slice(0, 20).map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.category}</TableCell>
                        <TableCell className="text-muted-foreground">{p.supplier}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
