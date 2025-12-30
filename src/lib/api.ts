import { Product, StockMovement, DashboardStats, ApiConfig } from './types';

// Mock data for demonstration
const mockProducts: Product[] = [
  {
    id: '1',
    sku: 'SKU-001',
    name: 'Notebook Dell Inspiron 15',
    description: 'Notebook Dell Inspiron 15 polegadas, Intel Core i5, 8GB RAM, 256GB SSD',
    category: 'Eletrônicos',
    price: 3499.99,
    costPrice: 2800.00,
    stock: 45,
    minStock: 10,
    unit: 'un',
    status: 'active',
    supplier: 'Dell Brasil',
    barcode: '7891234567890',
    weight: 2.1,
    dimensions: '36 x 24 x 2 cm',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-28T14:30:00Z',
  },
  {
    id: '2',
    sku: 'SKU-002',
    name: 'Mouse Logitech MX Master 3',
    description: 'Mouse sem fio ergonômico com sensor de alta precisão',
    category: 'Periféricos',
    price: 599.99,
    costPrice: 420.00,
    stock: 3,
    minStock: 15,
    unit: 'un',
    status: 'low_stock',
    supplier: 'Logitech',
    barcode: '7891234567891',
    weight: 0.14,
    dimensions: '12 x 8 x 5 cm',
    createdAt: '2024-02-20T09:00:00Z',
    updatedAt: '2024-12-27T11:00:00Z',
  },
  {
    id: '3',
    sku: 'SKU-003',
    name: 'Monitor Samsung 27" 4K',
    description: 'Monitor Samsung 27 polegadas, resolução 4K UHD, painel IPS',
    category: 'Monitores',
    price: 2199.99,
    costPrice: 1750.00,
    stock: 0,
    minStock: 5,
    unit: 'un',
    status: 'out_of_stock',
    supplier: 'Samsung',
    barcode: '7891234567892',
    weight: 5.2,
    dimensions: '62 x 45 x 18 cm',
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-12-26T16:45:00Z',
  },
  {
    id: '4',
    sku: 'SKU-004',
    name: 'Teclado Mecânico Keychron K2',
    description: 'Teclado mecânico wireless 75%, switches Gateron Brown',
    category: 'Periféricos',
    price: 449.99,
    costPrice: 320.00,
    stock: 28,
    minStock: 10,
    unit: 'un',
    status: 'active',
    supplier: 'Keychron',
    barcode: '7891234567893',
    weight: 0.68,
    dimensions: '31 x 12 x 4 cm',
    createdAt: '2024-04-05T11:30:00Z',
    updatedAt: '2024-12-28T09:15:00Z',
  },
  {
    id: '5',
    sku: 'SKU-005',
    name: 'Webcam Logitech C920',
    description: 'Webcam Full HD 1080p com microfone estéreo',
    category: 'Periféricos',
    price: 399.99,
    costPrice: 280.00,
    stock: 52,
    minStock: 20,
    unit: 'un',
    status: 'active',
    supplier: 'Logitech',
    barcode: '7891234567894',
    weight: 0.16,
    dimensions: '9 x 7 x 4 cm',
    createdAt: '2024-05-12T08:00:00Z',
    updatedAt: '2024-12-25T13:20:00Z',
  },
  {
    id: '6',
    sku: 'SKU-006',
    name: 'SSD Samsung 1TB NVMe',
    description: 'SSD NVMe M.2 Samsung 980 Pro, 1TB, leitura 7000MB/s',
    category: 'Armazenamento',
    price: 899.99,
    costPrice: 650.00,
    stock: 67,
    minStock: 25,
    unit: 'un',
    status: 'active',
    supplier: 'Samsung',
    barcode: '7891234567895',
    weight: 0.01,
    dimensions: '8 x 2.2 x 0.2 cm',
    createdAt: '2024-06-18T16:00:00Z',
    updatedAt: '2024-12-28T10:00:00Z',
  },
];

const mockMovements: StockMovement[] = [
  {
    id: 'm1',
    productId: '1',
    type: 'entry',
    quantity: 20,
    previousStock: 25,
    newStock: 45,
    reason: 'Reposição de estoque',
    reference: 'NF-2024-001234',
    userId: 'u1',
    userName: 'João Silva',
    createdAt: '2024-12-28T14:30:00Z',
  },
  {
    id: 'm2',
    productId: '1',
    type: 'exit',
    quantity: 5,
    previousStock: 30,
    newStock: 25,
    reason: 'Venda',
    reference: 'PED-2024-005678',
    userId: 'u2',
    userName: 'Maria Santos',
    createdAt: '2024-12-27T11:15:00Z',
  },
  {
    id: 'm3',
    productId: '2',
    type: 'exit',
    quantity: 12,
    previousStock: 15,
    newStock: 3,
    reason: 'Venda',
    reference: 'PED-2024-005679',
    userId: 'u1',
    userName: 'João Silva',
    createdAt: '2024-12-27T11:00:00Z',
  },
  {
    id: 'm4',
    productId: '3',
    type: 'exit',
    quantity: 8,
    previousStock: 8,
    newStock: 0,
    reason: 'Venda',
    reference: 'PED-2024-005680',
    userId: 'u2',
    userName: 'Maria Santos',
    createdAt: '2024-12-26T16:45:00Z',
  },
  {
    id: 'm5',
    productId: '1',
    type: 'adjustment',
    quantity: -2,
    previousStock: 32,
    newStock: 30,
    reason: 'Ajuste de inventário - produto danificado',
    userId: 'u1',
    userName: 'João Silva',
    createdAt: '2024-12-25T09:30:00Z',
  },
];

// API Service
class ApiService {
  private config: ApiConfig | null = null;

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
    
    // For demo, use mock data
    if (!config?.baseUrl || !config?.token) {
      return null;
    }

    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getProducts(): Promise<Product[]> {
    try {
      const data = await this.fetchWithAuth('/products');
      return data || mockProducts;
    } catch {
      return mockProducts;
    }
  }

  async getProduct(id: string): Promise<Product | undefined> {
    try {
      const data = await this.fetchWithAuth(`/products/${id}`);
      return data || mockProducts.find(p => p.id === id);
    } catch {
      return mockProducts.find(p => p.id === id);
    }
  }

  async getProductMovements(productId: string): Promise<StockMovement[]> {
    try {
      const data = await this.fetchWithAuth(`/products/${productId}/movements`);
      return data || mockMovements.filter(m => m.productId === productId);
    } catch {
      return mockMovements.filter(m => m.productId === productId);
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const products = await this.getProducts();
    
    return {
      totalProducts: products.length,
      totalStock: products.reduce((acc, p) => acc + p.stock, 0),
      lowStockProducts: products.filter(p => p.status === 'low_stock').length,
      outOfStockProducts: products.filter(p => p.status === 'out_of_stock').length,
      totalValue: products.reduce((acc, p) => acc + (p.price * p.stock), 0),
      recentMovements: mockMovements.length,
    };
  }

  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getProducts();
    const lowerQuery = query.toLowerCase();
    
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.sku.toLowerCase().includes(lowerQuery)
    );
  }
}

export const apiService = new ApiService();
