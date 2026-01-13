import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Globe, CheckCircle2, XCircle, Loader2, TestTube, Sun, Moon, Monitor } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      try {
        const config = await apiService.getConfigAsync();
        if (config) {
          setBaseUrl(config.baseUrl);
          setToken(config.token);
          setIsSaved(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!baseUrl.trim()) {
      toast.error('Informe a URL da API');
      return;
    }
    if (!token.trim()) {
      toast.error('Informe o Token de acesso');
      return;
    }

    setIsSaving(true);
    try {
      const success = await apiService.saveConfigToDatabase({ 
        baseUrl: baseUrl.trim(), 
        token: token.trim() 
      });
      
      if (success) {
        setIsSaved(true);
        setTestResult(null);
        toast.success('Configurações salvas permanentemente!');
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } finally {
      setIsSaving(false);
    }
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

  const handleClear = async () => {
    await apiService.clearConfig();
    setBaseUrl('');
    setToken('');
    setIsSaved(false);
    setTestResult(null);
    toast.info('Configurações removidas');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Configurações"
        description="Configure a conexão com a API externa e aparência"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Theme Settings Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 shrink-0">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              ) : theme === 'light' ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              ) : (
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Aparência
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Escolha o tema de exibição do sistema
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme('light')}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs">Claro</span>
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme('dark')}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs">Escuro</span>
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme('system')}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs">Sistema</span>
            </Button>
          </div>
        </div>

        {/* API Settings Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 shrink-0">
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Configuração da API Wedrop
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configure a URL e Token para conectar com a API
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2 text-sm">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
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
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: https://api.wedrop.com.br/v3/api
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2 text-sm">
                <Key className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
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
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Token JWT de autenticação da API Wedrop
              </p>
            </div>

            {isSaved && !testResult && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Configurações salvas permanentemente no servidor</span>
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

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-border">
              <Button onClick={handleSave} className="gap-2 w-full sm:w-auto" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTest} 
                disabled={!isSaved || isTesting}
                className="gap-2 w-full sm:w-auto"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Testar Conexão
              </Button>
              <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto">
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-4 sm:mt-6 bg-muted/30 rounded-xl border border-border p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2 sm:mb-3">
            ℹ️ Configuração Persistente
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            As configurações são salvas no servidor e permanecem ativas mesmo após limpar o histórico do navegador.
          </p>
          <h3 className="text-sm font-semibold text-foreground mb-2 sm:mb-3">
            Endpoints Utilizados
          </h3>
          <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground font-mono break-all">
            <p>GET /catalog/products</p>
            <p>GET /catalog/products/:id</p>
            <p>GET /products/:id/stock-history</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
