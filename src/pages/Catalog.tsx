import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiService, PaginatedProducts } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductDetailModal } from '@/components/ProductDetailModal';

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
  const limit = 50;

  const loadProducts = useCallback(async (page: number, search: string) => {
    setLoading(true);
    try {
      const data = await apiService.getProducts(page, limit, search);
      setPaginatedData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(currentPage, searchQuery);
  }, [currentPage, loadProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadProducts(1, searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, loadProducts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= paginatedData.totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { totalPages, page } = paginatedData;
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (page > 3) {
        pages.push('...');
      }
      
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Catálogo de Produtos"
        description="Gerencie seu inventário de produtos"
      >
        <Button variant="default" className="gap-2">
          <Package className="w-4 h-4" />
          Novo Produto
        </Button>
      </PageHeader>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 search-input"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {paginatedData.total > 0 ? (
            <>
              Mostrando{' '}
              <span className="font-medium text-foreground">
                {((currentPage - 1) * limit) + 1}
              </span>
              {' '}-{' '}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * limit, paginatedData.total)}
              </span>
              {' '}de{' '}
              <span className="font-medium text-foreground">
                {paginatedData.total.toLocaleString('pt-BR')}
              </span>
              {' '}produtos
            </>
          ) : (
            'Nenhum produto encontrado'
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Fornecedor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedData.products.map((product) => (
                    <tr 
                      key={product.id} 
                      className="table-row-hover group cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product);
                        setModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground hover:text-primary transition-colors">
                          {product.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.category}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-foreground">
                          {product.stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {product.unit}
                        </span>
                        {product.minStock > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Mín: {product.minStock}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.supplier}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={product.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginatedData.products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
                <p className="text-sm text-muted-foreground/70">
                  Tente buscar com outros termos
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {paginatedData.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {paginatedData.totalPages}
              </p>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  {renderPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => goToPage(page as number)}
                        className="h-9 w-9"
                      >
                        {page}
                      </Button>
                    )
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === paginatedData.totalPages}
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(paginatedData.totalPages)}
                  disabled={currentPage === paginatedData.totalPages}
                  className="h-9 w-9"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductDetailModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </MainLayout>
  );
}