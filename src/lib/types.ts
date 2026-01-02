export interface ProductImage {
  xl?: string;
  lg?: string;
  md?: string;
  sm?: string;
  xs?: string;
  isCover?: boolean;
  key?: string;
}

export interface Product {
  id: string;
  sku: string;
  skuSuplier?: string;
  name: string;
  fiscalName?: string;
  description: string;
  category: string;
  categoryId?: number;
  price: number;
  costPrice: number;
  priceCostWithTaxes?: number;
  stock: number;
  reservedQuantity?: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  unitsByBox?: number;
  status: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  supplier: string;
  supplierId?: number;
  supplierState?: string;
  supplierCnpj?: string;
  supplierCorporateName?: string;
  brand?: string;
  barcode?: string;
  ncm?: string;
  cest?: string;
  origin?: string;
  weight?: number;
  boxWeight?: number;
  height?: number;
  width?: number;
  length?: number;
  dimensions?: string;
  imageUrl?: string;
  images?: ProductImage[];
  videoLink?: string;
  createdAt: string;
  updatedAt: string;
  isSelling?: boolean;
  avgSellsQuantityPast7Days?: number | null;
  avgSellsQuantityPast15Days?: number | null;
  avgSellsQuantityPast30Days?: number | null;
  soldQuantity?: number | null;
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