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
      // Wait for apiService to initialize and load config
      await apiService.waitForInit();
      const loadedConfig = await apiService.getConfigAsync();
      setConfig(loadedConfig);
      
      // Preload data in background for faster experience
      if (loadedConfig?.baseUrl && loadedConfig?.token) {
        apiService.preloadData().catch(() => {
          // Silently ignore preload errors
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if apiService is already ready (config pre-loaded)
    if (apiService.isReady()) {
      apiService.getConfigAsync().then(c => {
        setConfig(c);
        setIsLoading(false);
        // Preload data in background
        if (c?.baseUrl && c?.token) {
          apiService.preloadData().catch(() => {});
        }
      });
    } else {
      loadConfig();
    }
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
