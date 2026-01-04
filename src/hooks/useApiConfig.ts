import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { ApiConfig } from '@/lib/types';

interface UseApiConfigResult {
  config: ApiConfig | null;
  isLoading: boolean;
  isConfigured: boolean;
  reload: () => Promise<void>;
}

export function useApiConfig(): UseApiConfigResult {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const loadedConfig = await apiService.getConfigAsync();
      setConfig(loadedConfig);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    isLoading,
    isConfigured: !!config?.baseUrl && !!config?.token,
    reload: loadConfig,
  };
}
