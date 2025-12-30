export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  status: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  supplier: string;
  barcode?: string;
  weight?: number;
  dimensions?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'entry' | 'exit' | 'adjustment' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ApiConfig {
  baseUrl: string;
  token: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentMovements: number;
}
