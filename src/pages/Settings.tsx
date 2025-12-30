import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Globe, CheckCircle2, XCircle, Loader2, TestTube } from 'lucide-react';
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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    setTestResult(null);
    toast.success('Configurações salvas com sucesso!');
  };

  const handleTest = async () => {
    if (!baseUrl.trim() || !token.trim()) {
      toast.error('Salve as configurações antes de testar');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await apiService.testConnection();
      setTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast.error(error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    apiService.clearConfig();
    setBaseUrl('');
    setToken('');
    setIsSaved(false);
    setTestResult(null);
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
                Configuração da API Wedrop
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure a URL e Token para conectar com a API Wedrop
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
                placeholder="https://api.wedrop.com.br/v3/api"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setIsSaved(false);
                  setTestResult(null);
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: https://api.wedrop.com.br/v3/api
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Token de Acesso (Bearer)
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="seu-token-jwt"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setIsSaved(false);
                  setTestResult(null);
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Token JWT de autenticação da API Wedrop
              </p>
            </div>

            {isSaved && !testResult && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Configurações salvas</span>
              </div>
            )}

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                testResult.success 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{testResult.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTest} 
                disabled={!isSaved || isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Testar Conexão
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
            Endpoints Utilizados
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground font-mono">
            <p>GET /catalog/products - Lista todos os produtos</p>
            <p>GET /catalog/products/:id - Detalhes do produto</p>
            <p>GET /catalog/products/:id/movements - Histórico</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
