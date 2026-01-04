import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Globe, CheckCircle2, XCircle, Loader2, TestTube, Sparkles, Trash2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const config = await apiService.getConfigAsync();
        if (config) {
          setBaseUrl(config.baseUrl);
          setToken(config.token);
          setIsSaved(true);
        }
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setIsLoading(false);
      }
    };
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

    try {
      await apiService.setConfig({ baseUrl: baseUrl.trim(), token: token.trim() });
      setIsSaved(true);
      setTestResult(null);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
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
        description="Configure a conexão com a API externa"
      />

      <div className="max-w-2xl">
        <div className="glass-card p-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-400/20 border border-primary/20">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                API Wedrop
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure a URL e Token para conectar com a API
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2 text-foreground">
                <Globe className="w-4 h-4 text-primary" />
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
                className="font-mono bg-muted/50 border-border focus:border-primary/50 focus:ring-primary/20 h-12"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: https://api.wedrop.com.br/v3/api
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2 text-foreground">
                <Key className="w-4 h-4 text-primary" />
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
                className="font-mono bg-muted/50 border-border focus:border-primary/50 focus:ring-primary/20 h-12"
              />
              <p className="text-xs text-muted-foreground">
                Token JWT de autenticação da API Wedrop
              </p>
            </div>

            {isSaved && !testResult && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-success/10 border border-success/20">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">Configurações salvas e persistidas</span>
              </div>
            )}

            {testResult && (
              <div className={`flex items-center gap-2 p-4 rounded-xl border ${
                testResult.success 
                  ? 'bg-success/10 border-success/20' 
                  : 'bg-destructive/10 border-destructive/20'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <span className={`text-sm font-medium ${testResult.success ? 'text-success' : 'text-destructive'}`}>
                  {testResult.message}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-border">
              <Button 
                onClick={handleSave} 
                className="gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
              >
                <Save className="w-4 h-4" />
                Salvar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTest} 
                disabled={!isSaved || isTesting}
                className="gap-2 border-border hover:bg-muted/50"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Testar Conexão
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClear}
                className="gap-2 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Endpoints Utilizados
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground font-mono bg-muted/30 rounded-xl p-4 border border-border/50">
            <p className="flex items-center gap-2">
              <span className="text-success font-semibold">GET</span>
              /catalog/products - Lista todos os produtos
            </p>
            <p className="flex items-center gap-2">
              <span className="text-success font-semibold">GET</span>
              /catalog/products/:id - Detalhes do produto
            </p>
            <p className="flex items-center gap-2">
              <span className="text-success font-semibold">GET</span>
              /catalog/products/:id/movements - Histórico
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
