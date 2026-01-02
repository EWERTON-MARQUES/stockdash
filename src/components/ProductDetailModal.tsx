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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, Truck, Scale, Ruler, Barcode, Calendar, DollarSign, Box, Tag, 
  TrendingUp, TrendingDown, ArrowUpDown, History, ShoppingCart, Store, Download, FileText, ChevronLeft, ChevronRight
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
  const currentImage = images[selectedImage]?.lg || images[selectedImage]?.md || product.imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" className="gap-1 h-7 px-2" onClick={() => onOpenChange(false)}>
              <ChevronLeft className="w-4 h-4" />
              Voltar ao Catálogo
            </Button>
          </div>
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Side - Images */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {images.length} imagens disponíveis
                  </span>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Baixar Todas
                  </Button>
                </div>
                
                {/* Main Image */}
                <div className="relative bg-card rounded-xl border border-border overflow-hidden aspect-square mb-4">
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
                        className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                          idx === selectedImage ? 'border-primary' : 'border-border hover:border-primary/50'
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
              </div>

              {/* Right Side - Product Info */}
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-3">{product.name}</h1>
                
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <span>SKU: <span className="font-mono text-foreground">{product.sku}</span></span>
                  <span className="text-border">|</span>
                  <span>EAN: <span className="font-mono text-foreground">{product.barcode || '-'}</span></span>
                </div>

                <div className="text-3xl font-bold text-primary mb-4">
                  {formatCurrency(product.price)}
                </div>

                <Badge className={`mb-4 ${product.stock > 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                  {product.stock > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
                </Badge>

                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Categoria:</span>
                    <span className="font-medium text-foreground">{product.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span className="font-medium text-foreground">{product.supplier}</span>
                  </div>
                  {product.supplierState && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Estado de origem:</span>
                      <span className="font-medium text-foreground">{product.supplierState}</span>
                    </div>
                  )}
                </div>

                {/* Marketplace Selection */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border mb-6">
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

                {/* Technical Specs */}
                <div className="bg-card rounded-xl border border-border p-4 mb-6">
                  <h3 className="font-semibold text-foreground mb-4">Especificações Técnicas</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Marca</p>
                      <p className="font-medium text-foreground">{product.brand || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">NCM</p>
                      <p className="font-medium text-foreground">{product.ncm || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso</p>
                      <p className="font-medium text-foreground">{product.weight ? `${product.weight}g` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Altura</p>
                      <p className="font-medium text-foreground">{product.height ? `${product.height}cm` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Largura</p>
                      <p className="font-medium text-foreground">{product.width ? `${product.width}cm` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Comprimento</p>
                      <p className="font-medium text-foreground">{product.length ? `${product.length}cm` : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Supplier Info */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4">Fornecedor</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendido por</span>
                      <span className="font-medium text-foreground">{product.supplier}</span>
                    </div>
                    {product.supplierCnpj && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CNPJ</span>
                        <span className="font-medium text-foreground">{product.supplierCnpj}</span>
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
              </div>
            </div>

            {/* Tabs Section */}
            <div className="mt-8">
              <Tabs defaultValue="descricao">
                <TabsList className="grid w-full grid-cols-3 max-w-lg">
                  <TabsTrigger value="descricao" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Descrição
                  </TabsTrigger>
                  <TabsTrigger value="estoque" className="gap-2">
                    <Box className="w-4 h-4" />
                    Estoque
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Estoque
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="descricao" className="mt-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    {product.description ? (
                      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                        {product.description}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhuma descrição disponível para este produto.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="estoque" className="mt-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-success/10 rounded-xl p-4 text-center border border-success/20">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Disponível</p>
                        <p className="text-3xl font-bold text-success">{product.stock}</p>
                        <p className="text-xs text-muted-foreground">{product.unit}</p>
                      </div>
                      <div className="bg-warning/10 rounded-xl p-4 text-center border border-warning/20">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Reservado</p>
                        <p className="text-3xl font-bold text-warning">{product.reservedQuantity ?? 0}</p>
                        <p className="text-xs text-muted-foreground">{product.unit}</p>
                      </div>
                      <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Preço Custo</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(product.costPrice)}</p>
                      </div>
                      <div className="bg-muted rounded-xl p-4 text-center border border-border">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Valor em Estoque</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(product.price * product.stock)}</p>
                      </div>
                    </div>

                    {/* Sales averages */}
                    {(product.avgSellsQuantityPast7Days || product.avgSellsQuantityPast15Days || product.avgSellsQuantityPast30Days) && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Média de Vendas
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                            <p className="text-2xl font-bold text-foreground">{product.avgSellsQuantityPast7Days ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                            <p className="text-2xl font-bold text-foreground">{product.avgSellsQuantityPast15Days ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Últimos 15 dias</p>
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                            <p className="text-2xl font-bold text-foreground">{product.avgSellsQuantityPast30Days ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      Histórico de Movimentação
                    </h4>
                    
                    {loadingMovements ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : movements.length > 0 ? (
                      <div className="space-y-3">
                        {movements.map((movement) => (
                          <div 
                            key={movement.id} 
                            className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border hover:border-primary/30 transition-colors"
                          >
                            <div className="shrink-0 p-2 rounded-full bg-background">
                              {getMovementIcon(movement.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
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
                                {movement.reference && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    #{movement.reference}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {movement.reason}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">
                                {formatDate(movement.createdAt)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {movement.previousStock} → {movement.newStock}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          O histórico de movimentações será exibido aqui quando disponível na API
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}