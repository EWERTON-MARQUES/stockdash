import { useEffect, useState } from 'react';
import { Send, Save, TestTube, Info, CheckCircle, XCircle, Bell } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TelegramConfig {
  id?: string;
  bot_token: string;
  chat_id: string;
  enabled: boolean;
  low_stock_threshold: number;
}

export default function TelegramSettings() {
  const [config, setConfig] = useState<TelegramConfig>({
    bot_token: '',
    chat_id: '',
    enabled: false,
    low_stock_threshold: 80,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('telegram_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          bot_token: data.bot_token || '',
          chat_id: data.chat_id || '',
          enabled: data.enabled,
          low_stock_threshold: data.low_stock_threshold,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.bot_token || !config.chat_id) {
      toast.error('Preencha o Token do Bot e o Chat ID');
      return;
    }

    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('telegram_config')
          .update({
            bot_token: config.bot_token,
            chat_id: config.chat_id,
            enabled: config.enabled,
            low_stock_threshold: config.low_stock_threshold,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('telegram_config')
          .insert({
            bot_token: config.bot_token,
            chat_id: config.chat_id,
            enabled: config.enabled,
            low_stock_threshold: config.low_stock_threshold,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
        }
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.bot_token || !config.chat_id) {
      toast.error('Preencha o Token do Bot e o Chat ID primeiro');
      return;
    }

    setTesting(true);
    try {
      const message = `🔔 *Teste de Alerta - StockPro*\n\nSua integração com o Telegram está funcionando corretamente!\n\n✅ Você receberá alertas de estoque baixo quando produtos atingirem ${config.low_stock_threshold} unidades ou menos.`;

      const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chat_id,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success('Mensagem de teste enviada! Verifique seu Telegram.');
      } else {
        toast.error(`Erro: ${result.description}`);
      }
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Alertas Telegram"
        description="Configure alertas automáticos de estoque baixo"
      />

      <div className="max-w-2xl">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Como configurar?</p>
              <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                <li>Crie um bot no Telegram conversando com @BotFather</li>
                <li>Copie o Token do bot fornecido</li>
                <li>Adicione o bot a um grupo ou inicie uma conversa com ele</li>
                <li>Obtenha o Chat ID (pode usar @userinfobot ou @getidsbot)</li>
                <li>Cole as informações abaixo e ative os alertas</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-muted-foreground">Status:</span>
          {config.enabled && config.bot_token && config.chat_id ? (
            <Badge className="bg-success/10 text-success border-success/20 gap-1">
              <CheckCircle className="w-3 h-3" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              Inativo
            </Badge>
          )}
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <div>
            <Label htmlFor="bot_token" className="text-foreground">Token do Bot *</Label>
            <Input
              id="bot_token"
              type="password"
              value={config.bot_token}
              onChange={(e) => setConfig({ ...config, bot_token: e.target.value })}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="mt-1.5 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Token fornecido pelo @BotFather ao criar seu bot
            </p>
          </div>

          <div>
            <Label htmlFor="chat_id" className="text-foreground">Chat ID *</Label>
            <Input
              id="chat_id"
              value={config.chat_id}
              onChange={(e) => setConfig({ ...config, chat_id: e.target.value })}
              placeholder="-1001234567890 ou 123456789"
              className="mt-1.5 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ID do chat/grupo onde os alertas serão enviados
            </p>
          </div>

          <div>
            <Label htmlFor="threshold" className="text-foreground">Limite de Estoque Baixo</Label>
            <Input
              id="threshold"
              type="number"
              value={config.low_stock_threshold}
              onChange={(e) => setConfig({ ...config, low_stock_threshold: parseInt(e.target.value) || 80 })}
              className="mt-1.5 max-w-[150px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alertas serão enviados quando produtos atingirem {config.low_stock_threshold} unidades ou menos
            </p>
          </div>

          <div className="flex items-center justify-between py-4 px-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Ativar Alertas</p>
                <p className="text-xs text-muted-foreground">Receber notificações de estoque baixo</p>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleTest} variant="outline" disabled={testing} className="gap-2">
              <TestTube className="w-4 h-4" />
              {testing ? 'Enviando...' : 'Testar Conexão'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 flex-1">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>

        {/* Example Alert */}
        <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-2">Exemplo de alerta:</p>
          <div className="bg-card rounded-lg p-3 border border-border text-sm">
            <p>⚠️ <strong>Alerta de Estoque Baixo</strong></p>
            <p className="text-muted-foreground mt-1">Produto: Aspirador Nasal Infantil</p>
            <p className="text-muted-foreground">SKU: AS2206-F</p>
            <p className="text-warning font-semibold">Estoque atual: 15 unidades</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
