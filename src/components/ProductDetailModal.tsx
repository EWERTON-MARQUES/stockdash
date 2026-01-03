import { useEffect, useState } from 'react';
import { Product, StockMovement } from '@/lib/types';
import { apiService } from '@/lib/api';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, ArrowLeft, Download, 
  TrendingUp, TrendingDown, History, Store, 
  ChevronLeft, ChevronRight, Play, FileText, ShoppingBag
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

  const formatDateShort = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const images = product.images || [];
  const currentImage = images[selectedImage]?.xl || images[selectedImage]?.lg || images[selectedImage]?.md || product.imageUrl;

  const activeMarketplaces = [amazon && 'Amazon', mercadoLivre && 'Mercado Livre'].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 bg-background">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border bg-card">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-primary hover:text-primary/80 -ml-2"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Catálogo
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Main Grid: Images + Info */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
              {/* LEFT: Images */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {images.length || 1} imagens disponíveis
                  </span>
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    Baixar Todas
                  </Button>
                </div>

                {/* Main Image */}
                <div className="relative bg-white rounded-xl border border-border overflow-hidden aspect-square">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="w-full h-full object-contain p-6"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                      <Package className="w-20 h-20 opacity-30" />
                    </div>
                  )}
                  
                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full shadow-lg"
                        onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full shadow-lg"
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
                        className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 overflow-hidden transition-all bg-white ${
                          idx === selectedImage 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img 
                          src={img.sm || img.md || img.lg} 
                          alt={`Imagem ${idx + 1}`}
                          className="w-full h-full object-contain p-1"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: Product Info */}
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-2xl font-bold text-foreground leading-tight mb-2">
                    {product.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">SKU:</span> {product.sku}
                    {product.barcode && (
                      <> <span className="mx-2">|</span> <span className="font-medium">EAN:</span> {product.barcode}</>
                    )}
                  </p>
                </div>

                {/* Price */}
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {formatCurrency(product.price)}
                </div>

                {/* Status Badge */}
                <Badge 
                  className={`text-sm px-3 py-1 ${
                    product.stock > 0 
                      ? 'bg-success/20 text-success hover:bg-success/30' 
                      : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                  }`}
                >
                  {product.stock > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
                </Badge>

                {/* Quick Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="text-muted-foreground w-32">Categoria:</span>
                    <span className="text-primary font-medium">{product.category}</span>
                  </div>
                  <div className="flex">
                    <span className="text-muted-foreground w-32">Fornecedor:</span>
                    <span className="text-foreground font-medium">{product.supplier}</span>
                  </div>
                  {product.supplierState && (
                    <div className="flex">
                      <span className="text-muted-foreground w-32">Estado de origem:</span>
                      <span className="text-foreground">{product.supplierState}</span>
                    </div>
                  )}
                </div>

                {/* Technical Specs Box */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
                    Especificações Técnicas
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {product.brand && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Marca</p>
                          <p className="font-medium text-foreground">{product.brand}</p>
                        </div>
                      </>
                    )}
                    {product.ncm && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">NCM</p>
                        <p className="font-medium text-foreground font-mono">{product.ncm}</p>
                      </div>
                    )}
                    {product.weight !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Peso</p>
                        <p className="font-medium text-foreground">{product.weight}g</p>
                      </div>
                    )}
                    {product.height !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Altura</p>
                        <p className="font-medium text-foreground">{product.height}cm</p>
                      </div>
                    )}
                    {product.width !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Largura</p>
                        <p className="font-medium text-foreground">{product.width}cm</p>
                      </div>
                    )}
                    {product.length !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Comprimento</p>
                        <p className="font-medium text-foreground">{product.length}cm</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Supplier Box */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
                    Fornecedor
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendido por</span>
                      <span className="font-medium text-foreground">{product.supplier}</span>
                    </div>
                    {product.supplierCnpj && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CNPJ</span>
                        <span className="font-medium text-foreground font-mono text-xs">{product.supplierCnpj}</span>
                      </div>
                    )}
                    {product.supplierState && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado de Origem</span>
                        <span className="font-medium text-foreground">{product.supplierState}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Histórico de Vendas</p>
                    <p className="text-sm text-success font-medium">
                      {product.soldQuantity ? `+${product.soldQuantity}` : '+1000'} vendas em parceria com a WeDrop
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="mt-8">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="description"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 py-3 text-sm font-medium"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Descrição
                  </TabsTrigger>
                  <TabsTrigger 
                    value="marketplace"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 py-3 text-sm font-medium"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Meus Anúncios ({activeMarketplaces.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 py-3 text-sm font-medium"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Histórico de Estoque
                  </TabsTrigger>
                </TabsList>

                {/* Description Tab */}
                <TabsContent value="description" className="mt-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    {product.description ? (
                      <div className="prose prose-sm max-w-none text-foreground">
                        <div className="whitespace-pre-wrap leading-relaxed text-sm">
                          {product.description}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhuma descrição disponível</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Marketplace Tab */}
                <TabsContent value="marketplace" className="mt-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Store className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Onde está vendendo este produto?</h3>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <Checkbox 
                          id="amazon" 
                          checked={amazon} 
                          onCheckedChange={(v) => handleMarketplaceChange('amazon', !!v)} 
                          className="w-5 h-5"
                        />
                        <Label htmlFor="amazon" className="text-sm font-medium cursor-pointer">Amazon</Label>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <Checkbox 
                          id="ml" 
                          checked={mercadoLivre} 
                          onCheckedChange={(v) => handleMarketplaceChange('mercado_livre', !!v)} 
                          className="w-5 h-5"
                        />
                        <Label htmlFor="ml" className="text-sm font-medium cursor-pointer">Mercado Livre</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    {loadingMovements ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : movements.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantidade</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Estoque Anterior</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Estoque Novo</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Motivo</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {movements.map((movement) => (
                              <tr key={movement.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-4 px-3">
                                  <div className="flex items-center gap-2">
                                    {movement.type === 'entry' ? (
                                      <TrendingUp className="w-4 h-4 text-success" />
                                    ) : (
                                      <TrendingDown className="w-4 h-4 text-destructive" />
                                    )}
                                    <Badge 
                                      variant="outline" 
                                      className={`font-medium ${
                                        movement.type === 'entry' 
                                          ? 'bg-success/10 text-success border-success/30' 
                                          : 'bg-destructive/10 text-destructive border-destructive/30'
                                      }`}
                                    >
                                      {movement.type === 'entry' ? 'Entrada' : 'Saída'}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="py-4 px-3">
                                  <span className={`font-bold ${
                                    movement.type === 'entry' ? 'text-success' : 'text-destructive'
                                  }`}>
                                    {movement.type === 'entry' ? '+' : '-'}{movement.quantity}
                                  </span>
                                </td>
                                <td className="py-4 px-3 hidden sm:table-cell text-muted-foreground">
                                  {movement.previousStock}
                                </td>
                                <td className="py-4 px-3 hidden sm:table-cell font-medium text-foreground">
                                  {movement.newStock}
                                </td>
                                <td className="py-4 px-3 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                                  {movement.reason || '-'}
                                </td>
                                <td className="py-4 px-3 text-muted-foreground">
                                  {formatDateShort(movement.createdAt)}
                                </td>
                                <td className="py-4 px-3 text-muted-foreground">
                                  {formatTime(movement.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <History className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">Nenhuma movimentação registrada</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          O histórico será exibido quando disponível na API
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Video Section */}
            {product.videoLink && (
              <div className="mt-8 bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Vídeo do Produto</h3>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden max-w-3xl">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
