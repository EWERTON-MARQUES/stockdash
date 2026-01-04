import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '@/lib/api';
import { ApiConfig } from '@/lib/types';

interface ApiConfigContextType {
  config: ApiConfig | null;
  isLoading: boolean;
  isConfigured: boolean;
  reload: () => Promise<void>;
}

const ApiConfigContext = createContext<ApiConfigContextType>({
  config: null,
  isLoading: true,
  isConfigured: false,
  reload: async () => {},
});

export function useApiConfigContext() {
  return useContext(ApiConfigContext);
}

interface ApiConfigProviderProps {
  children: ReactNode;
}

export function ApiConfigProvider({ children }: ApiConfigProviderProps) {
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

  return (
    <ApiConfigContext.Provider 
      value={{
        config,
        isLoading,
        isConfigured: !!config?.baseUrl && !!config?.token,
        reload: loadConfig,
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
}
