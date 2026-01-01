import { useEffect, useState } from 'react';
import { Product, StockMovement } from '@/lib/types';
import { apiService } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Package, Truck, Scale, Ruler, Barcode, Calendar, DollarSign, Box, Tag, 
  TrendingUp, TrendingDown, ArrowUpDown, History, ShoppingCart, Store
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarketplaceUpdate?: () => void;
}

export function ProductDetailModal({ product, open, onOpenChange, onMarketplaceUpdate }: ProductDetailModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [amazon, setAmazon] = useState(false);
  const [mercadoLivre, setMercadoLivre] = useState(false);

  useEffect(() => {
    if (product && open) {
      setLoadingMovements(true);
      apiService.getProductMovements(product.id)
        .then(setMovements)
        .finally(() => setLoadingMovements(false));
      
      // Load marketplace data
      supabase.from('product_marketplaces').select('*').eq('product_id', product.id).maybeSingle()
        .then(({ data }) => {
          setAmazon(data?.amazon || false);
          setMercadoLivre(data?.mercado_livre || false);
        });
    }
  }, [product, open]);

  const handleMarketplaceChange = async (field: 'amazon' | 'mercado_livre', value: boolean) => {
    if (!product) return;
    const newAmazon = field === 'amazon' ? value : amazon;
    const newML = field === 'mercado_livre' ? value : mercadoLivre;
    
    setAmazon(newAmazon);
    setMercadoLivre(newML);

    const { error } = await supabase.from('product_marketplaces').upsert({
      product_id: product.id,
      amazon: newAmazon,
      mercado_livre: newML,
    }, { onConflict: 'product_id' });

    if (error) {
      toast.error('Erro ao salvar marketplace');
    } else {
      toast.success('Marketplace atualizado!');
      onMarketplaceUpdate?.();
    }
  };

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

  const formatShortDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{value || '-'}</p>
      </div>
    </div>
  );

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'exit':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <ArrowUpDown className="w-4 h-4 text-warning" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'entry':
        return 'Entrada';
      case 'exit':
        return 'Saída';
      case 'adjustment':
        return 'Ajuste';
      case 'return':
        return 'Devolução';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 p-6 pb-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
          <DialogTitle className="flex items-start gap-4">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-20 h-20 object-cover rounded-xl border-2 border-card shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground line-clamp-2">{product.name}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs bg-card">{product.sku}</Badge>
                <StatusBadge status={product.status} />
                {product.isSelling && (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Vendendo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">
                  Estoque: <span className="font-bold text-foreground">{product.stock}</span> {product.unit}
                </span>
                <span className="text-muted-foreground">
                  Preço: <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Marketplace Checkboxes */}
        <div className="mx-6 mt-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Onde está vendendo?</span>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="amazon" checked={amazon} onCheckedChange={(v) => handleMarketplaceChange('amazon', !!v)} />
              <Label htmlFor="amazon" className="text-sm cursor-pointer">Amazon</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ml" checked={mercadoLivre} onCheckedChange={(v) => handleMarketplaceChange('mercado_livre', !!v)} />
              <Label htmlFor="ml" className="text-sm cursor-pointer">Mercado Livre</Label>
            </div>
          </div>
        </div>

        <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5 shrink-0 mx-6 mt-4 max-w-none" style={{ width: 'calc(100% - 48px)' }}>
            <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
            <TabsTrigger value="estoque" className="text-xs">Estoque</TabsTrigger>
            <TabsTrigger value="precos" className="text-xs">Preços</TabsTrigger>
            <TabsTrigger value="dimensoes" className="text-xs">Dimensões</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <TabsContent value="geral" className="mt-0 space-y-0">
              <div className="bg-muted/30 rounded-xl p-4">
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
                      <a href={product.videoLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                        Ver vídeo
                      </a>
                    } 
                  />
                )}
                <InfoRow label="Criado em" value={formatDate(product.createdAt)} icon={Calendar} />
                <InfoRow label="Atualizado em" value={formatDate(product.updatedAt)} icon={Calendar} />
              </div>
            </TabsContent>

            <TabsContent value="estoque" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-5 text-center border border-success/20">
                  <p className="text-xs text-muted-foreground font-medium">Disponível</p>
                  <p className="text-3xl font-bold text-success mt-1">{product.stock}</p>
                  <p className="text-xs text-muted-foreground">{product.unit}</p>
                </div>
                <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl p-5 text-center border border-warning/20">
                  <p className="text-xs text-muted-foreground font-medium">Reservado</p>
                  <p className="text-3xl font-bold text-warning mt-1">{product.reservedQuantity ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{product.unit}</p>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-xl p-4">
                <InfoRow label="Estoque Disponível" value={`${product.stock} ${product.unit}`} icon={Box} />
                <InfoRow label="Estoque Reservado" value={`${product.reservedQuantity ?? 0} ${product.unit}`} />
                <InfoRow label="Quantidade Mínima para Envio" value={product.minStock ? `${product.minStock} ${product.unit}` : '-'} />
                <InfoRow label="Quantidade Máxima para Envio" value={product.maxStock ? `${product.maxStock} ${product.unit}` : '-'} />
                <InfoRow label="Unidades por Caixa" value={product.unitsByBox} />
                <InfoRow 
                  label="Vendendo" 
                  value={
                    <Badge variant={product.isSelling ? 'default' : 'secondary'} className={product.isSelling ? 'bg-success text-success-foreground' : ''}>
                      {product.isSelling ? 'Sim' : 'Não'}
                    </Badge>
                  } 
                />
              </div>

              {/* Sales averages */}
              {(product.avgSellsQuantityPast7Days || product.avgSellsQuantityPast15Days || product.avgSellsQuantityPast30Days) && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Média de Vendas
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-card rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{product.avgSellsQuantityPast7Days ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                    </div>
                    <div className="text-center p-3 bg-card rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{product.avgSellsQuantityPast15Days ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Últimos 15 dias</p>
                    </div>
                    <div className="text-center p-3 bg-card rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{product.avgSellsQuantityPast30Days ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="precos" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 text-center border border-primary/20">
                  <p className="text-xs text-muted-foreground font-medium">Preço de Custo - Wedrop</p>
                  <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(product.price)}</p>
                </div>
                <div className="bg-gradient-to-br from-muted to-muted/50 rounded-xl p-5 text-center border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Custo</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(product.costPrice)}</p>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-xl p-4">
                <InfoRow label="Preço de Custo - Wedrop" value={formatCurrency(product.price)} icon={DollarSign} />
                <InfoRow label="Custo" value={formatCurrency(product.costPrice)} icon={DollarSign} />
                <InfoRow label="Custo com Impostos" value={formatCurrency(product.priceCostWithTaxes ?? 0)} icon={DollarSign} />
                <InfoRow 
                  label="Margem de Lucro" 
                  value={
                    product.costPrice > 0 
                      ? <span className="text-success font-bold">{(((product.price - product.costPrice) / product.costPrice) * 100).toFixed(1)}%</span>
                      : '-'
                  } 
                />
                <InfoRow 
                  label="Valor em Estoque" 
                  value={<span className="text-primary font-bold">{formatCurrency(product.price * product.stock)}</span>}
                  icon={DollarSign}
                />
              </div>
            </TabsContent>

            <TabsContent value="dimensoes" className="mt-0">
              <div className="bg-muted/30 rounded-xl p-4">
                <InfoRow label="Peso" value={product.weight ? `${product.weight}g` : '-'} icon={Scale} />
                <InfoRow label="Peso da Caixa" value={product.boxWeight ? `${product.boxWeight}g` : '-'} icon={Scale} />
                <InfoRow label="Altura" value={product.height ? `${product.height} cm` : '-'} icon={Ruler} />
                <InfoRow label="Largura" value={product.width ? `${product.width} cm` : '-'} icon={Ruler} />
                <InfoRow label="Comprimento" value={product.length ? `${product.length} cm` : '-'} icon={Ruler} />
                <InfoRow label="Dimensões" value={product.dimensions} icon={Ruler} />
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-0">
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Histórico de Movimentação
                </h4>
                
                {loadingMovements ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : movements.length > 0 ? (
                  <div className="space-y-3">
                    {movements.map((movement) => (
                      <div 
                        key={movement.id} 
                        className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="shrink-0">
                          {getMovementIcon(movement.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={
                                movement.type === 'entry' 
                                  ? 'bg-success/10 text-success border-success/20' 
                                  : movement.type === 'exit'
                                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                                  : 'bg-warning/10 text-warning border-warning/20'
                              }
                            >
                              {getMovementLabel(movement.type)}
                            </Badge>
                            <span className="text-sm font-semibold">
                              {movement.type === 'entry' ? '+' : '-'}{movement.quantity} {product.unit}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {movement.reason}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-foreground">
                            {movement.previousStock} → {movement.newStock}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatShortDate(movement.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      O histórico será exibido quando houver entradas ou saídas
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Images Gallery */}
        {product.images && product.images.length > 0 && (
          <div className="p-6 pt-0 shrink-0 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium mb-3">Imagens ({product.images.length})</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, index) => (
                <img
                  key={img.key || index}
                  src={img.md || img.sm || img.lg}
                  alt={`${product.name} - ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-border shrink-0 hover:border-primary transition-colors cursor-pointer shadow-sm"
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}