import { useEffect, useState } from 'react';
import { Search, Filter, Package } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';
import { Product } from '@/lib/types';
import { Link } from 'react-router-dom';

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await apiService.getProducts();
        setProducts(data);
        setFilteredProducts(data);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
      <p className="mb-4 text-sm text-muted-foreground">
        {filteredProducts.length} produto(s) encontrado(s)
      </p>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="table-row-hover group">
                    <td className="px-6 py-4">
                      <Link
                        to={`/catalogo/${product.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {product.description}
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Mín: {product.minStock}
                      </p>
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

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground/70">
                Tente buscar com outros termos
              </p>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
