import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, RefreshCw, Image, ArrowUp, ArrowDown, Store } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiService, PaginatedProducts, CatalogFilters, Category, Supplier } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceData {
  [productId: string]: { amazon: boolean; mercado_livre: boolean };
}

export default function Catalog() {
  const [paginatedData, setPaginatedData] = useState<PaginatedProducts>({
    products: [],
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortByStock, setSortByStock] = useState<'asc' | 'desc' | null>(null);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData>({});
  const [limit, setLimit] = useState(50);

  // Load marketplace data
  const loadMarketplaceData = async () => {
    const { data } = await supabase.from('product_marketplaces').select('*');
    if (data) {
      const mapped: MarketplaceData = {};
      data.forEach(item => {
        mapped[item.product_id] = { amazon: item.amazon, mercado_livre: item.mercado_livre };
      });
      setMarketplaceData(mapped);
    }
  };

  useEffect(() => {
    async function loadFilters() {
      const [cats, sups] = await Promise.all([
        apiService.getCategories(),
        apiService.getSuppliers()
      ]);
      setCategories(cats);
      setSuppliers(sups);
    }
    loadFilters();
    loadMarketplaceData();
  }, []);

  const loadProducts = useCallback(async (page: number, search: string, currentFilters: CatalogFilters, currentLimit: number, sort: 'asc' | 'desc' | null) => {
    setLoading(true);
    try {
      // Build filters with sortBy
      const filtersWithSort: CatalogFilters = {
        ...currentFilters,
        sortBy: sort === 'desc' ? 'stock_desc' : sort === 'asc' ? 'stock_asc' : undefined
      };
      
      const data = await apiService.getProducts(page, currentLimit, search, filtersWithSort);
      
      let filteredProducts = [...data.products];
      
      // Apply status filter client-side
      if (currentFilters.status && currentFilters.status !== 'all') {
        if (currentFilters.status === 'active') {
          filteredProducts = filteredProducts.filter(p => p.stock > 0);
        } else if (currentFilters.status === 'low_stock') {
          filteredProducts = filteredProducts.filter(p => p.stock > 0 && p.stock <= 80);
        } else if (currentFilters.status === 'out_of_stock') {
          filteredProducts = filteredProducts.filter(p => p.stock === 0);
        }
      }
      
      // Apply marketplace filter client-side
      if (currentFilters.marketplace && currentFilters.marketplace !== 'all') {
        filteredProducts = filteredProducts.filter(p => {
          const mp = marketplaceData[p.id];
          if (!mp) return currentFilters.marketplace === 'none';
          if (currentFilters.marketplace === 'amazon') return mp.amazon;
          if (currentFilters.marketplace === 'mercado_livre') return mp.mercado_livre;
          if (currentFilters.marketplace === 'both') return mp.amazon && mp.mercado_livre;
          return true;
        });
      }
      
      // Client-side stock sort as fallback
      if (sort) {
        filteredProducts.sort((a, b) => sort === 'desc' ? b.stock - a.stock : a.stock - b.stock);
      }
      
      const totalPages = Math.ceil(data.total / currentLimit);
      
      setPaginatedData({
        ...data,
        products: filteredProducts,
        totalPages,
        limit: currentLimit
      });
    } finally {
      setLoading(false);
    }
  }, [marketplaceData]);

  useEffect(() => {
    loadProducts(currentPage, searchQuery, filters, limit, sortByStock);
  }, [currentPage, filters, limit, sortByStock, loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadProducts(1, searchQuery, filters, limit, sortByStock);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, loadProducts, filters, limit, sortByStock]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= paginatedData.totalPages) setCurrentPage(page);
  };

  const handleRefresh = () => loadProducts(currentPage, searchQuery, filters, limit, sortByStock);

  const clearFilters = () => { 
    setFilters({}); 
    setSortByStock(null);
    setCurrentPage(1); 
  };

  const updateFilter = (key: keyof CatalogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const activeFiltersCount = Object.entries(filters).filter(([_, v]) => v && v !== 'all').length + (sortByStock ? 1 : 0);

  const getMarketplaceBadges = (productId: string) => {
    const mp = marketplaceData[productId];
    if (!mp) return null;
    return (
      <div className="flex gap-1">
        {mp.amazon && <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">AMZ</Badge>}
        {mp.mercado_livre && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">ML</Badge>}
      </div>
    );
  };

  const isSelling = (productId: string) => {
    const mp = marketplaceData[productId];
    return mp && (mp.amazon || mp.mercado_livre);
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { totalPages } = paginatedData;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleLimitChange = (newLimit: string) => {
    const l = parseInt(newLimit);
    setLimit(l);
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <PageHeader title="Catálogo de Produtos" description="Gerencie seu inventário de produtos">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="default" className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hidden sm:flex">
            <Package className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      </PageHeader>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Buscar por nome ou SKU..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10 h-11 bg-card border-border/50 focus:border-primary" 
            />
          </div>
          
          <Button 
            variant={sortByStock === 'desc' ? 'default' : 'outline'} 
            onClick={() => setSortByStock(sortByStock === 'desc' ? null : 'desc')} 
            className="gap-2 h-11"
          >
            {sortByStock === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            <span className="hidden sm:inline">Maior Estoque</span>
            <span className="sm:hidden">Estoque</span>
          </Button>
          
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 relative">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">Filtros</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria</label>
                    <Select value={filters.category || 'all'} onValueChange={(value) => updateFilter('category', value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fornecedor</label>
                    <Select value={filters.supplier || 'all'} onValueChange={(value) => updateFilter('supplier', value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {suppliers.map(sup => <SelectItem key={sup.id} value={String(sup.id)}>{sup.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                    <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Com Estoque</SelectItem>
                        <SelectItem value="low_stock">Estoque Baixo (≤80)</SelectItem>
                        <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Marketplace</label>
                    <Select value={filters.marketplace || 'all'} onValueChange={(value) => updateFilter('marketplace', value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="mercado_livre">Mercado Livre</SelectItem>
                        <SelectItem value="both">Ambos</SelectItem>
                        <SelectItem value="none">Nenhum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setFiltersOpen(false)}>Aplicar Filtros</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {sortByStock === 'desc' && (
              <Badge variant="secondary" className="gap-1">
                Maior Estoque
                <button onClick={() => setSortByStock(null)} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.category && filters.category !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Categoria: {categories.find(c => String(c.id) === filters.category)?.name}
                <button onClick={() => updateFilter('category', 'all')} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.supplier && filters.supplier !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Fornecedor: {suppliers.find(s => String(s.id) === filters.supplier)?.name}
                <button onClick={() => updateFilter('supplier', 'all')} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.status && filters.status !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Status: {filters.status === 'active' ? 'Com Estoque' : filters.status === 'low_stock' ? 'Estoque Baixo' : 'Sem Estoque'}
                <button onClick={() => updateFilter('status', 'all')} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.marketplace && filters.marketplace !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Marketplace: {filters.marketplace === 'amazon' ? 'Amazon' : filters.marketplace === 'mercado_livre' ? 'Mercado Livre' : filters.marketplace === 'both' ? 'Ambos' : 'Nenhum'}
                <button onClick={() => updateFilter('marketplace', 'all')} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {paginatedData.total > 0 ? (
            <>
              Mostrando <span className="font-semibold text-foreground">{((currentPage - 1) * limit) + 1}</span> - <span className="font-semibold text-foreground">{Math.min(currentPage * limit, paginatedData.total)}</span> de <span className="font-semibold text-foreground">{paginatedData.total.toLocaleString('pt-BR')}</span> produtos
            </>
          ) : (
            'Nenhum produto encontrado'
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <Select value={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando produtos...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Produto</th>
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">SKU</th>
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Categoria</th>
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Estoque</th>
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Preço</th>
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Vendendo</th>
                    <th className="px-3 sm:px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedData.products.map((product) => (
                    <tr 
                      key={product.id} 
                      className={`table-row-hover group cursor-pointer hover:bg-primary/5 transition-colors ${isSelling(product.id) ? 'bg-success/5' : ''}`} 
                      onClick={() => { setSelectedProduct(product); setModalOpen(true); }}
                    >
                      <td className="px-3 sm:px-4 py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base max-w-[150px] sm:max-w-[250px]">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-4 text-sm text-muted-foreground font-mono hidden sm:table-cell">{product.sku}</td>
                      <td className="px-3 sm:px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">{product.category}</td>
                      <td className="px-3 sm:px-4 py-4">
                        <span className={`text-sm font-bold ${product.stock === 0 ? 'text-destructive' : product.stock <= 80 ? 'text-warning' : 'text-success'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 text-sm font-semibold text-foreground">{formatCurrency(product.price)}</td>
                      <td className="px-3 sm:px-4 py-4 hidden lg:table-cell">
                        {getMarketplaceBadges(product.id) || <span className="text-xs text-muted-foreground">-</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-4 hidden sm:table-cell"><StatusBadge status={product.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {paginatedData.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <p className="text-sm text-muted-foreground">Página {currentPage} de {paginatedData.totalPages}</p>
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {renderPageNumbers().map((page, i) => typeof page === 'number' ? (
                  <Button key={i} variant={page === currentPage ? 'default' : 'outline'} size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => goToPage(page)}>
                    {page}
                  </Button>
                ) : (
                  <span key={i} className="px-1 sm:px-2 text-muted-foreground">...</span>
                ))}
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === paginatedData.totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => goToPage(paginatedData.totalPages)} disabled={currentPage === paginatedData.totalPages}>
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductDetailModal product={selectedProduct} open={modalOpen} onOpenChange={setModalOpen} onMarketplaceUpdate={loadMarketplaceData} />
    </MainLayout>
  );
}
