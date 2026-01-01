import { Product, StockMovement, DashboardStats, ApiConfig } from './types';

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CatalogFilters {
  category?: string;
  supplier?: string;
  status?: string;
  marketplace?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
}

// API Service for Wedrop
class ApiService {
  private config: ApiConfig | null = null;
  private categoriesCache: Category[] = [];
  private suppliersCache: Supplier[] = [];

  setConfig(config: ApiConfig) {
    this.config = config;
    localStorage.setItem('apiConfig', JSON.stringify(config));
  }

  getConfig(): ApiConfig | null {
    if (!this.config) {
      const stored = localStorage.getItem('apiConfig');
      if (stored) {
        this.config = JSON.parse(stored);
      }
    }
    return this.config;
  }

  clearConfig() {
    this.config = null;
    localStorage.removeItem('apiConfig');
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      throw new Error('API não configurada');
    }

    const url = `${config.baseUrl}${endpoint}`;
    console.log('Fetching:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData);
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Transform Wedrop product to our format
  private transformWedropProduct(item: any): Product {
    const stock = item.availableQuantity ?? item.stock ?? item.quantity ?? 0;
    const minStock = item.minQuantityToSend ?? item.minStock ?? item.min_stock ?? 10;
    
    let status: Product['status'] = 'active';
    if (stock === 0) {
      status = 'out_of_stock';
    } else if (stock <= minStock) {
      status = 'low_stock';
    } else if (item.status === 'inactive' || item.active === false) {
      status = 'inactive';
    }

    // Get cover image
    const coverImage = item.images?.find((img: any) => img.isCover) || item.images?.[0];

    return {
      id: String(item.id),
      sku: item.sku || item.code || `SKU-${item.id}`,
      skuSuplier: item.skuSuplier || '',
      name: item.name || item.title || 'Produto sem nome',
      fiscalName: item.fiscalName || '',
      description: item.description || item.short_description || '',
      category: item.category?.name || item.categoryName || 'Sem categoria',
      categoryId: item.categoryId,
      price: Number(item.price) || Number(item.sale_price) || 0,
      costPrice: Number(item.cost) || Number(item.cost_price) || Number(item.costPrice) || 0,
      priceCostWithTaxes: Number(item.priceCostWithTaxes) || 0,
      stock: stock,
      reservedQuantity: item.reservedQuantity ?? 0,
      minStock: minStock,
      maxStock: item.maxQuantityToSend ?? undefined,
      unit: item.unit || 'un',
      unitsByBox: item.unitsByBox ?? 1,
      status: status,
      supplier: item.suplier?.name || item.supplier?.name || item.supplierName || 'N/A',
      supplierId: item.suplierId,
      supplierState: item.suplierCorporate?.state || item.suplierCorporateState || '',
      brand: item.brand || '',
      barcode: item.ean || item.barcode || item.gtin || '',
      ncm: item.ncm || '',
      cest: item.cest || '',
      origin: item.origin || '',
      weight: item.weight ? Number(item.weight) : undefined,
      boxWeight: item.boxWeight ? Number(item.boxWeight) : undefined,
      height: item.height ? Number(item.height) : undefined,
      width: item.width ? Number(item.width) : undefined,
      length: item.length ? Number(item.length) : undefined,
      dimensions: item.width && item.height && item.length 
        ? `${item.width} x ${item.height} x ${item.length} cm` 
        : undefined,
      imageUrl: coverImage?.lg || coverImage?.md || item.image || item.imageUrl,
      images: item.images || [],
      videoLink: item.videoLink || item.ytVideo || '',
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
      isSelling: item.isSelling ?? true,
      avgSellsQuantityPast7Days: item.avgSellsQuantityPast7Days,
      avgSellsQuantityPast15Days: item.avgSellsQuantityPast15Days,
      avgSellsQuantityPast30Days: item.avgSellsQuantityPast30Days,
      soldQuantity: item.soldQuantity,
    };
  }

  async getProducts(page: number = 1, limit: number = 50, search: string = '', filters?: CatalogFilters): Promise<PaginatedProducts> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return { products: [], total: 0, page: 1, limit, totalPages: 0 };
    }

    try {
      const offset = (page - 1) * limit;
      let endpoint = `/catalog?limit=${limit}&offset=${offset}&page=${page}&search=${encodeURIComponent(search)}`;
      
      if (filters?.category && filters.category !== 'all') {
        endpoint += `&categoryId=${filters.category}`;
      } else {
        endpoint += `&categoryId=0`;
      }
      
      if (filters?.supplier && filters.supplier !== 'all') {
        endpoint += `&suplierId=${filters.supplier}`;
      } else {
        endpoint += `&suplierId=`;
      }
      
      endpoint += `&brand=&orderBy=id%7Cdesc`;
      
      const data = await this.fetchWithAuth(endpoint);
      
      // Handle different response formats
      let products: any[] = [];
      let total = 0;
      
      if (Array.isArray(data)) {
        products = data;
        total = data.length;
      } else if (data?.results && Array.isArray(data.results)) {
        products = data.results;
        total = data.total || products.length;
      } else if (data?.data && Array.isArray(data.data)) {
        products = data.data;
        total = data.total || data.count || products.length;
      } else if (data?.products && Array.isArray(data.products)) {
        products = data.products;
        total = data.total || data.count || products.length;
      } else if (data?.items && Array.isArray(data.items)) {
        products = data.items;
        total = data.total || data.count || products.length;
      }

      // Cache categories and suppliers for filters
      this.extractFiltersFromProducts(products);

      let transformedProducts = products.map(item => this.transformWedropProduct(item));
      
      // Apply status filter client-side if needed
      if (filters?.status && filters.status !== 'all') {
        transformedProducts = transformedProducts.filter(p => p.status === filters.status);
      }

      const totalPages = Math.ceil(total / limit);

      return {
        products: transformedProducts,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return { products: [], total: 0, page: 1, limit, totalPages: 0 };
    }
  }

  private extractFiltersFromProducts(products: any[]) {
    const categoriesMap = new Map<number, string>();
    const suppliersMap = new Map<number, string>();
    
    products.forEach(p => {
      if (p.categoryId && p.category?.name) {
        categoriesMap.set(p.categoryId, p.category.name);
      }
      if (p.suplierId && p.suplier?.name) {
        suppliersMap.set(p.suplierId, p.suplier.name.trim());
      }
    });
    
    if (categoriesMap.size > 0) {
      this.categoriesCache = Array.from(categoriesMap.entries()).map(([id, name]) => ({ id, name }));
    }
    if (suppliersMap.size > 0) {
      this.suppliersCache = Array.from(suppliersMap.entries()).map(([id, name]) => ({ id, name }));
    }
  }

  async getCategories(): Promise<Category[]> {
    if (this.categoriesCache.length > 0) {
      return this.categoriesCache;
    }
    // Fetch some products to populate cache
    await this.getProducts(1, 100);
    return this.categoriesCache;
  }

  async getSuppliers(): Promise<Supplier[]> {
    if (this.suppliersCache.length > 0) {
      return this.suppliersCache;
    }
    // Fetch some products to populate cache
    await this.getProducts(1, 100);
    return this.suppliersCache;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return undefined;
    }

    try {
      const data = await this.fetchWithAuth(`/catalog/products/${id}`);
      
      // Handle response format
      const product = data?.data || data?.product || data;
      
      if (product) {
        return this.transformWedropProduct(product);
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching product:', error);
      return undefined;
    }
  }

  async getProductMovements(productId: string): Promise<StockMovement[]> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return [];
    }

    try {
      // Try different endpoints for movements
      let data;
      try {
        data = await this.fetchWithAuth(`/catalog/products/${productId}/movements`);
      } catch {
        try {
          data = await this.fetchWithAuth(`/products/${productId}/stock-movements`);
        } catch {
          try {
            data = await this.fetchWithAuth(`/stock/movements?product_id=${productId}`);
          } catch {
            // Return empty if no movements endpoint available
            return [];
          }
        }
      }
      
      const movements = Array.isArray(data) ? data : (data?.data || data?.movements || []);
      
      return movements.map((m: any) => ({
        id: String(m.id),
        productId: String(m.product_id || m.productId || productId),
        type: m.type || (m.quantity > 0 ? 'entry' : 'exit'),
        quantity: Math.abs(Number(m.quantity)),
        previousStock: Number(m.previous_stock || m.previousStock || 0),
        newStock: Number(m.new_stock || m.newStock || m.current_stock || 0),
        reason: m.reason || m.description || m.note || 'Movimentação',
        reference: m.reference || m.order_id || m.document,
        userId: String(m.user_id || m.userId || 'system'),
        userName: m.user_name || m.userName || m.user?.name || 'Sistema',
        createdAt: m.created_at || m.createdAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching movements:', error);
      return [];
    }
  }

  // Fetch all products for accurate stats (paginated fetching)
  async getAllProductsStats(): Promise<{ products: Product[], total: number }> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return { products: [], total: 0 };
    }

    try {
      // First get total count
      const firstPage = await this.getProducts(1, 100);
      const total = firstPage.total;
      const allProducts: Product[] = [...firstPage.products];
      
      // Fetch remaining pages in parallel (max 10 pages at a time to avoid overload)
      const totalPages = Math.ceil(total / 100);
      const batchSize = 10;
      
      for (let batch = 1; batch < Math.ceil(totalPages / batchSize); batch++) {
        const startPage = batch * batchSize + 1;
        const endPage = Math.min((batch + 1) * batchSize, totalPages);
        
        const promises = [];
        for (let page = startPage; page <= endPage; page++) {
          promises.push(this.getProducts(page, 100));
        }
        
        const results = await Promise.all(promises);
        results.forEach(result => {
          allProducts.push(...result.products);
        });
      }
      
      return { products: allProducts, total };
    } catch (error) {
      console.error('Error fetching all products:', error);
      return { products: [], total: 0 };
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return {
        totalProducts: 0,
        totalStock: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
        recentMovements: 0,
      };
    }

    try {
      // Fetch multiple pages to get accurate stats
      const allProducts: Product[] = [];
      let totalProducts = 0;
      
      // Fetch first page to get total
      const firstPage = await this.getProducts(1, 100);
      allProducts.push(...firstPage.products);
      totalProducts = firstPage.total;
      
      // Fetch more pages for better accuracy (up to 1000 products for stats)
      const pagesToFetch = Math.min(Math.ceil(totalProducts / 100), 10);
      const promises = [];
      
      for (let page = 2; page <= pagesToFetch; page++) {
        promises.push(this.getProducts(page, 100));
      }
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        allProducts.push(...result.products);
      });
      
      // Calculate stats from fetched products
      const totalStock = allProducts.reduce((acc, p) => acc + p.stock, 0);
      // Low stock = stock <= 80 units
      const lowStockProducts = allProducts.filter(p => p.stock > 0 && p.stock <= 80).length;
      const outOfStockProducts = allProducts.filter(p => p.stock === 0).length;
      const totalValue = allProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
      
      // Extrapolate stats for total products if we didn't fetch all
      const sampleRatio = allProducts.length / totalProducts;
      
      return {
        totalProducts,
        totalStock: sampleRatio < 1 ? Math.round(totalStock / sampleRatio) : totalStock,
        lowStockProducts: sampleRatio < 1 ? Math.round(lowStockProducts / sampleRatio) : lowStockProducts,
        outOfStockProducts: sampleRatio < 1 ? Math.round(outOfStockProducts / sampleRatio) : outOfStockProducts,
        totalValue: sampleRatio < 1 ? Math.round(totalValue / sampleRatio) : totalValue,
        recentMovements: 0,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalProducts: 0,
        totalStock: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
        recentMovements: 0,
      };
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    const result = await this.getProducts(1, 50, query);
    return result.products;
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; total?: number }> {
    try {
      const result = await this.getProducts(1, 1);
      return {
        success: true,
        message: `Conexão bem sucedida! ${result.total} produtos encontrados.`,
        total: result.total
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao conectar com a API'
      };
    }
  }
}

export const apiService = new ApiService();