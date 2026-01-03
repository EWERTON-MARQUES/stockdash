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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, Scale, Barcode, DollarSign, Box, 
  TrendingUp, TrendingDown, ArrowUpDown, History, Store, Download, 
  ChevronLeft, ChevronRight, Play, Building2, MapPin, Tag, Layers, FileText, Info
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
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (product && open) {
      setLoadingMovements(true);
      setSelectedImage(0);
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

  const images = product.images || [];
  const currentImage = images[selectedImage]?.lg || images[selectedImage]?.md || images[selectedImage]?.xl || product.imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="gap-1 h-7 px-2" onClick={() => onOpenChange(false)}>
              <ChevronLeft className="w-4 h-4" />
              Voltar ao Catálogo
            </Button>
          </div>
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6">
            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Side - Images */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {images.length} imagens disponíveis
                  </span>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Baixar Todas</span>
                  </Button>
                </div>
                
                {/* Main Image */}
                <div className="relative bg-card rounded-xl border border-border overflow-hidden aspect-square">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-16 h-16" />
                    </div>
                  )}
                  {images.length > 1 && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                        onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                        onClick={() => setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 overflow-hidden transition-all ${
                          idx === selectedImage ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img 
                          src={img.sm || img.md || img.lg} 
                          alt={`Imagem ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Video Section */}
                {product.videoLink && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Play className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Vídeo do Produto</span>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={product.videoLink.replace('watch?v=', 'embed/')}
                        title="Vídeo do produto"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Product Info */}
              <div className="space-y-4">
                {/* Product Title & SKU */}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{product.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      SKU: <span className="font-mono text-foreground">{product.sku}</span>
                    </span>
                    {product.barcode && (
                      <>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          EAN: <span className="font-mono text-foreground">{product.barcode}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {formatCurrency(product.price)}
                  </span>
                  {product.costPrice > 0 && (
                    <span className="text-sm text-muted-foreground">
                      Custo: {formatCurrency(product.costPrice)}
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${product.stock > 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                    {product.stock > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
                  </Badge>
                  <Badge variant="outline" className="text-foreground">
                    Estoque: {product.stock} {product.unit}
                  </Badge>
                  {product.reservedQuantity !== undefined && product.reservedQuantity > 0 && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Reservado: {product.reservedQuantity}
                    </Badge>
                  )}
                </div>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                    <p className="font-medium text-foreground text-sm flex items-center gap-1">
                      <Layers className="w-3 h-3 text-primary" />
                      {product.category}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Fornecedor</p>
                    <p className="font-medium text-foreground text-sm flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-primary" />
                      {product.supplier}
                    </p>
                  </div>
                  {product.supplierState && (
                    <div className="bg-card rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Estado de Origem</p>
                      <p className="font-medium text-foreground text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        {product.supplierState}
                      </p>
                    </div>
                  )}
                  {product.brand && (
                    <div className="bg-card rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Marca</p>
                      <p className="font-medium text-foreground text-sm">{product.brand}</p>
                    </div>
                  )}
                </div>

                {/* Technical Specifications */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Especificações Técnicas
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {product.brand && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Marca</p>
                        <p className="font-medium text-foreground">{product.brand}</p>
                      </div>
                    )}
                    {product.ncm && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">NCM</p>
                        <p className="font-medium text-foreground font-mono">{product.ncm}</p>
                      </div>
                    )}
                    {product.weight !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso</p>
                        <p className="font-medium text-foreground">{product.weight}g</p>
                      </div>
                    )}
                    {product.height !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Altura</p>
                        <p className="font-medium text-foreground">{product.height}cm</p>
                      </div>
                    )}
                    {product.width !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Largura</p>
                        <p className="font-medium text-foreground">{product.width}cm</p>
                      </div>
                    )}
                    {product.length !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Comprimento</p>
                        <p className="font-medium text-foreground">{product.length}cm</p>
                      </div>
                    )}
                    {product.unitsByBox !== undefined && product.unitsByBox > 1 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Unid. por Caixa</p>
                        <p className="font-medium text-foreground">{product.unitsByBox}</p>
                      </div>
                    )}
                    {product.barcode && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Código de Barras</p>
                        <p className="font-medium text-foreground font-mono text-xs">{product.barcode}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Supplier Info */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Fornecedor
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendido por</span>
                      <span className="font-medium text-foreground">{product.supplierCorporateName || product.supplier}</span>
                    </div>
                    {product.supplierCnpj && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CNPJ</span>
                        <span className="font-medium text-foreground font-mono">{product.supplierCnpj}</span>
                      </div>
                    )}
                    {product.supplierState && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado de Origem</span>
                        <span className="font-medium text-foreground">{product.supplierState}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Marketplace Selection */}
                <div className="bg-muted/30 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Onde está vendendo?</span>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="amazon" 
                        checked={amazon} 
                        onCheckedChange={(v) => handleMarketplaceChange('amazon', !!v)} 
                      />
                      <Label htmlFor="amazon" className="text-sm cursor-pointer">Amazon</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="ml" 
                        checked={mercadoLivre} 
                        onCheckedChange={(v) => handleMarketplaceChange('mercado_livre', !!v)} 
                      />
                      <Label htmlFor="ml" className="text-sm cursor-pointer">Mercado Livre</Label>
                    </div>
                  </div>
                </div>

                {/* Stock & Pricing Info */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Box className="w-4 h-4 text-primary" />
                    Estoque e Preços
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-success/10 rounded-lg p-3 text-center border border-success/20">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Disponível</p>
                      <p className="text-xl font-bold text-success">{product.stock}</p>
                    </div>
                    <div className="bg-warning/10 rounded-lg p-3 text-center border border-warning/20">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Reservado</p>
                      <p className="text-xl font-bold text-warning">{product.reservedQuantity ?? 0}</p>
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Preço Custo</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(product.costPrice)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center border border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Valor Estoque</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(product.price * product.stock)}</p>
                    </div>
                  </div>

                  {/* Sales Averages */}
                  {(product.avgSellsQuantityPast7Days || product.avgSellsQuantityPast15Days || product.avgSellsQuantityPast30Days) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Média de Vendas
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
                          <p className="text-lg font-bold text-foreground">{product.avgSellsQuantityPast7Days ?? 0}</p>
                          <p className="text-xs text-muted-foreground">7 dias</p>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
                          <p className="text-lg font-bold text-foreground">{product.avgSellsQuantityPast15Days ?? 0}</p>
                          <p className="text-xs text-muted-foreground">15 dias</p>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
                          <p className="text-lg font-bold text-foreground">{product.avgSellsQuantityPast30Days ?? 0}</p>
                          <p className="text-xs text-muted-foreground">30 dias</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description Section - Full Width */}
            {product.description && (
              <div className="mt-6 bg-card rounded-xl border border-border p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Descrição do Produto
                </h3>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </div>
              </div>
            )}

            {/* Movement History Section - Full Width */}
            <div className="mt-6 bg-card rounded-xl border border-border p-4 sm:p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Histórico de Movimentação
              </h3>
              
              {loadingMovements ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : movements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Quantidade</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Estoque</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Motivo</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {movements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.type)}
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
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`font-semibold ${movement.type === 'entry' ? 'text-success' : 'text-destructive'}`}>
                              {movement.type === 'entry' ? '+' : '-'}{movement.quantity} {product.unit}
                            </span>
                          </td>
                          <td className="py-3 px-2 hidden sm:table-cell">
                            <span className="text-muted-foreground">{movement.previousStock}</span>
                            <span className="mx-1">→</span>
                            <span className="font-medium text-foreground">{movement.newStock}</span>
                          </td>
                          <td className="py-3 px-2 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                            {movement.reason}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground text-xs whitespace-nowrap">
                            {formatDate(movement.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O histórico será exibido quando disponível na API
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
