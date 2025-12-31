import { Product } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { Package, Truck, Scale, Ruler, Barcode, Calendar, DollarSign, Box, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({ product, open, onOpenChange }: ProductDetailModalProps) {
  if (!product) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-start gap-4">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg border border-border"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground line-clamp-2">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">{product.sku}</Badge>
                <StatusBadge status={product.status} />
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-4 shrink-0">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
            <TabsTrigger value="precos">Preços</TabsTrigger>
            <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="geral" className="mt-0 space-y-1">
              <InfoRow label="Nome" value={product.name} icon={Package} />
              <InfoRow label="Nome Fiscal" value={product.fiscalName} icon={Tag} />
              <InfoRow label="SKU" value={product.sku} icon={Barcode} />
              <InfoRow label="SKU Fornecedor" value={product.skuSuplier} />
              <InfoRow label="Código de Barras (EAN)" value={product.barcode} icon={Barcode} />
              <InfoRow label="Marca" value={product.brand} />
              <InfoRow label="Categoria" value={product.category} />
              <InfoRow label="Fornecedor" value={`${product.supplier} ${product.supplierState ? `(${product.supplierState})` : ''}`} icon={Truck} />
              <InfoRow label="NCM" value={product.ncm} />
              <InfoRow label="CEST" value={product.cest} />
              {product.videoLink && (
                <InfoRow 
                  label="Vídeo" 
                  value={
                    <a href={product.videoLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Ver vídeo
                    </a>
                  } 
                />
              )}
              <InfoRow label="Criado em" value={formatDate(product.createdAt)} icon={Calendar} />
              <InfoRow label="Atualizado em" value={formatDate(product.updatedAt)} icon={Calendar} />
            </TabsContent>

            <TabsContent value="estoque" className="mt-0 space-y-1">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Disponível</p>
                  <p className="text-2xl font-bold text-foreground">{product.stock}</p>
                  <p className="text-xs text-muted-foreground">{product.unit}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Reservado</p>
                  <p className="text-2xl font-bold text-foreground">{product.reservedQuantity ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{product.unit}</p>
                </div>
              </div>
              <InfoRow label="Estoque Disponível" value={`${product.stock} ${product.unit}`} icon={Box} />
              <InfoRow label="Estoque Reservado" value={`${product.reservedQuantity ?? 0} ${product.unit}`} />
              <InfoRow label="Quantidade Mínima para Envio" value={product.minStock ? `${product.minStock} ${product.unit}` : '-'} />
              <InfoRow label="Quantidade Máxima para Envio" value={product.maxStock ? `${product.maxStock} ${product.unit}` : '-'} />
              <InfoRow label="Unidades por Caixa" value={product.unitsByBox} />
              <InfoRow 
                label="Vendendo" 
                value={
                  <Badge variant={product.isSelling ? 'default' : 'secondary'}>
                    {product.isSelling ? 'Sim' : 'Não'}
                  </Badge>
                } 
              />
            </TabsContent>

            <TabsContent value="precos" className="mt-0 space-y-1">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Preço de Venda</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Custo</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(product.costPrice)}</p>
                </div>
              </div>
              <InfoRow label="Preço de Venda" value={formatCurrency(product.price)} icon={DollarSign} />
              <InfoRow label="Custo" value={formatCurrency(product.costPrice)} icon={DollarSign} />
              <InfoRow label="Custo com Impostos" value={formatCurrency(product.priceCostWithTaxes ?? 0)} icon={DollarSign} />
              <InfoRow 
                label="Margem" 
                value={
                  product.costPrice > 0 
                    ? `${(((product.price - product.costPrice) / product.costPrice) * 100).toFixed(1)}%`
                    : '-'
                } 
              />
            </TabsContent>

            <TabsContent value="dimensoes" className="mt-0 space-y-1">
              <InfoRow label="Peso" value={product.weight ? `${product.weight}g` : '-'} icon={Scale} />
              <InfoRow label="Peso da Caixa" value={product.boxWeight ? `${product.boxWeight}g` : '-'} icon={Scale} />
              <InfoRow label="Altura" value={product.height ? `${product.height} cm` : '-'} icon={Ruler} />
              <InfoRow label="Largura" value={product.width ? `${product.width} cm` : '-'} icon={Ruler} />
              <InfoRow label="Comprimento" value={product.length ? `${product.length} cm` : '-'} icon={Ruler} />
              <InfoRow label="Dimensões" value={product.dimensions} icon={Ruler} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Images Gallery */}
        {product.images && product.images.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Imagens ({product.images.length})</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, index) => (
                <img
                  key={img.key || index}
                  src={img.md || img.sm || img.lg}
                  alt={`${product.name} - ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-border shrink-0 hover:border-primary transition-colors cursor-pointer"
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
