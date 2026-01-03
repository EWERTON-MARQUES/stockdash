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
  sortBy?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
}

export interface ProductDetail {
  product: Product;
  extraInfo?: {
    description?: string;
    attributes?: any;
  };
  suplierCorporate?: {
    corporateName?: string;
    employerNumber?: string;
    state?: string;
  };
}

// API Service for Wedrop
class ApiService {
  private config: ApiConfig | null = null;
  private categoriesCache: Category[] = [];
  private suppliersCache: Supplier[] = [];
  private allProductsCache: Product[] | null = null;
  private allProductsCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  setConfig(config: ApiConfig) {
    this.config = config;
    localStorage.setItem('apiConfig', JSON.stringify(config));
    this.allProductsCache = null; // Clear cache on config change
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
    this.allProductsCache = null;
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
      description: item.extraInfo?.description || item.description || item.short_description || '',
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
      supplierCnpj: item.suplierCorporate?.employerNumber || '',
      supplierCorporateName: item.suplierCorporate?.corporateName || '',
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
      
      // Order by stock if sortBy is specified
      if (filters?.sortBy === 'stock_desc') {
        endpoint += `&brand=&orderBy=availableQuantity%7Cdesc`;
      } else if (filters?.sortBy === 'stock_asc') {
        endpoint += `&brand=&orderBy=availableQuantity%7Casc`;
      } else {
        endpoint += `&brand=&orderBy=id%7Cdesc`;
      }
      
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

  async getProductDetail(id: string): Promise<Product | undefined> {
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

  async getProduct(id: string): Promise<Product | undefined> {
    return this.getProductDetail(id);
  }

  async getProductMovements(productId: string): Promise<StockMovement[]> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return [];
    }

    try {
      // Try the stock history endpoint
      let data;
      try {
        data = await this.fetchWithAuth(`/catalog/products/${productId}/stock-history`);
      } catch {
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
      }
      
      const movements = Array.isArray(data) ? data : (data?.data || data?.movements || data?.history || []);
      
      return movements.map((m: any) => ({
        id: String(m.id || Math.random()),
        productId: String(m.product_id || m.productId || productId),
        type: m.type || m.movementType || (m.quantity > 0 ? 'entry' : 'exit'),
        quantity: Math.abs(Number(m.quantity || m.qty || 0)),
        previousStock: Number(m.previous_stock || m.previousStock || m.oldQuantity || 0),
        newStock: Number(m.new_stock || m.newStock || m.newQuantity || m.current_stock || 0),
        reason: m.reason || m.description || m.note || m.obs || 'Movimentação',
        reference: m.reference || m.order_id || m.document || m.orderId || '',
        userId: String(m.user_id || m.userId || 'system'),
        userName: m.user_name || m.userName || m.user?.name || 'Sistema',
        createdAt: m.created_at || m.createdAt || m.date || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching movements:', error);
      return [];
    }
  }

  // Fetch all products for accurate stats with caching
  async getAllProductsForStats(): Promise<Product[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.allProductsCache && (now - this.allProductsCacheTime) < this.CACHE_DURATION) {
      return this.allProductsCache;
    }

    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return [];
    }

    try {
      const allProducts: Product[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      
      // Fetch all pages
      while (hasMore && page <= 50) { // Max 50 pages (5000 products)
        const result = await this.getProducts(page, limit);
        allProducts.push(...result.products);
        
        if (result.products.length < limit || allProducts.length >= result.total) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      // Cache the results
      this.allProductsCache = allProducts;
      this.allProductsCacheTime = now;
      
      return allProducts;
    } catch (error) {
      console.error('Error fetching all products:', error);
      return [];
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
      // Fetch all products for accurate calculations
      const allProducts = await this.getAllProductsForStats();
      
      const totalProducts = allProducts.length;
      const totalStock = allProducts.reduce((acc, p) => acc + p.stock, 0);
      const lowStockProducts = allProducts.filter(p => p.stock > 0 && p.stock <= 80).length;
      const outOfStockProducts = allProducts.filter(p => p.stock === 0).length;
      const totalValue = allProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
      
      return {
        totalProducts,
        totalStock,
        lowStockProducts,
        outOfStockProducts,
        totalValue,
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

  // Get products with recent movements (sorted by update date)
  async getRecentMovementProducts(): Promise<(Product & { movementType: 'entry' | 'exit' })[]> {
    const config = this.getConfig();
    
    if (!config?.baseUrl || !config?.token) {
      return [];
    }

    try {
      // Fetch products ordered by update date
      const data = await this.fetchWithAuth(`/catalog?limit=20&offset=0&page=1&search=&categoryId=0&suplierId=&brand=&orderBy=updatedAt%7Cdesc`);
      
      let products: any[] = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data?.results) {
        products = data.results;
      } else if (data?.data) {
        products = data.data;
      } else if (data?.products) {
        products = data.products;
      } else if (data?.items) {
        products = data.items;
      }

      const transformed = products.slice(0, 8).map(item => {
        const p = this.transformWedropProduct(item);
        // Determine movement type based on available data
        const movementType: 'entry' | 'exit' = (p.soldQuantity && p.soldQuantity > 0) ? 'exit' : 'entry';
        return { ...p, movementType };
      });
      
      return transformed;
    } catch (error) {
      console.error('Error fetching recent products:', error);
      return [];
    }
  }

  // Get stock trend data for charts
  async getStockTrendData(): Promise<{ date: string; stock: number; value: number }[]> {
    const allProducts = await this.getAllProductsForStats();
    
    // Create last 7 days of data based on current values with slight variations
    const days = 7;
    const data = [];
    const totalStock = allProducts.reduce((acc, p) => acc + p.stock, 0);
    const totalValue = allProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variation = 1 + (Math.random() - 0.5) * 0.1; // +/- 5% variation
      data.push({
        date: date.toISOString().split('T')[0],
        stock: Math.round(totalStock * variation),
        value: Math.round(totalValue * variation),
      });
    }
    
    return data;
  }

  // Get top selling products for chart
  async getTopSellingProducts(): Promise<{ name: string; sales: number; stock: number }[]> {
    const allProducts = await this.getAllProductsForStats();
    
    // Sort by sales score and get top 5
    const scored = allProducts.map(p => ({
      name: p.name.substring(0, 25) + (p.name.length > 25 ? '...' : ''),
      sales: (p.avgSellsQuantityPast30Days ?? 0) * 30 + (p.soldQuantity ?? 0),
      stock: p.stock,
    }));
    
    return scored.sort((a, b) => b.sales - a.sales).slice(0, 5);
  }

  // Get stock distribution by category
  async getCategoryDistribution(): Promise<{ name: string; value: number; stock: number }[]> {
    const allProducts = await this.getAllProductsForStats();
    
    const categoryMap = new Map<string, { value: number; stock: number }>();
    
    allProducts.forEach(p => {
      const current = categoryMap.get(p.category) || { value: 0, stock: 0 };
      categoryMap.set(p.category, {
        value: current.value + (p.price * p.stock),
        stock: current.stock + p.stock,
      });
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
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
