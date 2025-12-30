import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Globe, CheckCircle2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const config = apiService.getConfig();
    if (config) {
      setBaseUrl(config.baseUrl);
      setToken(config.token);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!baseUrl.trim()) {
      toast.error('Informe a URL da API');
      return;
    }
    if (!token.trim()) {
      toast.error('Informe o Token de acesso');
      return;
    }

    apiService.setConfig({ baseUrl: baseUrl.trim(), token: token.trim() });
    setIsSaved(true);
    toast.success('Configurações salvas com sucesso!');
  };

  const handleClear = () => {
    apiService.clearConfig();
    setBaseUrl('');
    setToken('');
    setIsSaved(false);
    toast.info('Configurações removidas');
  };

  return (
    <MainLayout>
      <PageHeader
        title="Configurações"
        description="Configure a conexão com a API externa"
      />

      <div className="max-w-2xl">
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Configuração da API
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure a URL e Token para conectar com sua API
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                URL Base da API
              </Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="https://api.suaempresa.com/v1"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setIsSaved(false);
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Endereço base da API onde os dados serão buscados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Token de Acesso
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="seu-token-secreto"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setIsSaved(false);
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Token de autenticação Bearer para acessar a API
              </p>
            </div>

            {isSaved && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Configurações salvas</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar Configurações
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-muted/30 rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Endpoints Esperados
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground font-mono">
            <p>GET /products - Lista todos os produtos</p>
            <p>GET /products/:id - Detalhes do produto</p>
            <p>GET /products/:id/movements - Histórico de movimentação</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
