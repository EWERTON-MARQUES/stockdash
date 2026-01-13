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

import { 
  Package, Scale, Barcode, DollarSign, Box, 
  TrendingUp, TrendingDown, ArrowUpDown, History, Store, Download, 
  ChevronLeft, ChevronRight, Play, Building2, MapPin, Tag, Layers, FileText, Info, Image
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
  const [imageEdited, setImageEdited] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [abcClass, setAbcClass] = useState<'A' | 'B' | 'C'>('C');
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (product && open) {
      setLoadingMovements(true);
      setLoadingDetails(true);
      setSelectedImage(0);
      setFullProduct(null);
      
      // Load full product details, movements and ABC class in parallel
      Promise.all([
        apiService.getProductDetail(product.id),
        apiService.getProductMovements(product.id),
        apiService.getProductABCClass(product.id)
      ]).then(([fullProd, movs, abc]) => {
        if (fullProd) {
          setFullProduct(fullProd);
        }
        setMovements(movs);
        setAbcClass(abc);
      }).finally(() => {
        setLoadingMovements(false);
        setLoadingDetails(false);
      });
      
      // Load marketplace and image edited data
      supabase.from('product_marketplaces').select('*').eq('product_id', product.id).maybeSingle()
        .then(({ data }) => {
          setAmazon(data?.amazon || false);
          setMercadoLivre(data?.mercado_livre || false);
          setImageEdited(data?.image_edited || false);
        });
    }
  }, [product, open]);

  const handleMarketplaceChange = async (field: 'amazon' | 'mercado_livre' | 'image_edited', value: boolean) => {
    if (!product) return;
    const newAmazon = field === 'amazon' ? value : amazon;
    const newML = field === 'mercado_livre' ? value : mercadoLivre;
    const newImageEdited = field === 'image_edited' ? value : imageEdited;
    
    setAmazon(newAmazon);
    setMercadoLivre(newML);
    setImageEdited(newImageEdited);

    const { error } = await supabase.from('product_marketplaces').upsert({
      product_id: product.id,
      amazon: newAmazon,
      mercado_livre: newML,
      image_edited: newImageEdited,
    }, { onConflict: 'product_id' });

    if (error) {
      toast.error('Erro ao salvar dados');
    } else {
      toast.success('Dados atualizados!');
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
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
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

  const getABCBadgeStyle = (curveClass: 'A' | 'B' | 'C') => {
    const styles = {
      A: 'bg-success/10 text-success border-success/20',
      B: 'bg-warning/10 text-warning border-warning/20',
      C: 'bg-muted text-muted-foreground border-border',
    };
    return styles[curveClass];
  };

  const images = product.images || [];
  const currentImage = images[selectedImage]?.lg || images[selectedImage]?.md || images[selectedImage]?.xl || product.imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] sm:max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="shrink-0 px-3 sm:px-6 pt-3 sm:pt-5 pb-2 sm:pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="gap-1 h-7 px-2 text-xs sm:text-sm" onClick={() => onOpenChange(false)}>
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Catálogo</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
          </div>
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          <div className="p-3 sm:p-6">
            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-4 lg:gap-8">
              {/* Left Side - Images */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {images.length} imagens
                  </span>
                  <Button variant="outline" size="sm" className="gap-2 h-7 sm:h-8 text-xs">
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Baixar</span>
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
              <div className="space-y-3 sm:space-y-4">
                {/* Product Title & SKU */}
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2 leading-tight">{product.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span className="font-mono text-foreground">{product.sku}</span>
                    </span>
                    {product.barcode && (
                      <>
                        <span className="text-border hidden sm:inline">|</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          <span className="font-mono text-foreground text-xs">{product.barcode}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                    {formatCurrency(product.price)}
                  </span>
                  {product.costPrice > 0 && (
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Custo: {formatCurrency(product.costPrice)}
                    </span>
                  )}
                </div>

                {/* Stock Status and ABC Curve */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${product.stock > 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                    {product.stock > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
                  </Badge>
                  <Badge variant="outline" className={`${getABCBadgeStyle(abcClass)} font-bold`}>
                    Curva {abcClass}
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-card rounded-lg border border-border p-2 sm:p-3">
                    <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Categoria</p>
                    <p className="font-medium text-foreground text-xs sm:text-sm flex items-center gap-1 truncate">
                      <Layers className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{product.category}</span>
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-2 sm:p-3">
                    <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Fornecedor</p>
                    <p className="font-medium text-foreground text-xs sm:text-sm flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{product.supplier}</span>
                    </p>
                  </div>
                  {product.supplierState && (
                    <div className="bg-card rounded-lg border border-border p-2 sm:p-3">
                      <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Estado</p>
                      <p className="font-medium text-foreground text-xs sm:text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        {product.supplierState}
                      </p>
                    </div>
                  )}
                  {product.brand && (
                    <div className="bg-card rounded-lg border border-border p-2 sm:p-3">
                      <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Marca</p>
                      <p className="font-medium text-foreground text-xs sm:text-sm truncate">{product.brand}</p>
                    </div>
                  )}
                </div>

                {/* Technical Specifications */}
                <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
                  <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2 text-sm">
                    <Info className="w-4 h-4 text-primary" />
                    Especificações
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                    {product.brand && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Marca</p>
                        <p className="font-medium text-foreground truncate">{product.brand}</p>
                      </div>
                    )}
                    {product.ncm && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">NCM</p>
                        <p className="font-medium text-foreground font-mono text-xs">{product.ncm}</p>
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
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Comprim.</p>
                        <p className="font-medium text-foreground">{product.length}cm</p>
                      </div>
                    )}
                    {product.unitsByBox !== undefined && product.unitsByBox > 1 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Un./Caixa</p>
                        <p className="font-medium text-foreground">{product.unitsByBox}</p>
                      </div>
                    )}
                    {product.barcode && (
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Cód. Barras</p>
                        <p className="font-medium text-foreground font-mono text-xs break-all">{product.barcode}</p>
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

                {/* Marketplace & Image Status */}
                <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Onde está vendendo?</span>
                    </div>
                    <div className="flex flex-wrap gap-4 sm:gap-6">
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
                  
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Image className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Imagem Editada?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="imageEdited" 
                        checked={imageEdited} 
                        onCheckedChange={(v) => handleMarketplaceChange('image_edited', !!v)} 
                      />
                      <Label htmlFor="imageEdited" className="text-sm cursor-pointer">
                        {imageEdited ? 'SIM - Imagem já foi editada' : 'NÃO - Imagem não editada'}
                      </Label>
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
            <div className="mt-6 bg-card rounded-xl border border-border p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Descrição do Produto
                </h3>
                {(fullProduct?.description || product.description) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-7 sm:h-8 text-xs"
                    onClick={() => {
                      const desc = fullProduct?.description || product.description;
                      navigator.clipboard.writeText(desc);
                      toast.success('Descrição copiada!');
                    }}
                  >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                )}
              </div>
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando descrição...</span>
                </div>
              ) : (fullProduct?.description || product.description) ? (
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed select-text">
                    {fullProduct?.description || product.description}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma descrição disponível</p>
                </div>
              )}
            </div>

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
                        <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Estoque</th>
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
                          <td className="py-3 px-2">
                            <span className="text-muted-foreground">{movement.previousStock}</span>
                            <span className="mx-1 text-muted-foreground">→</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
