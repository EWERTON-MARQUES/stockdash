import { useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/lib/api';

interface UseDataRefreshOptions {
  // Interval in milliseconds to refresh data (default: 5 minutes)
  refreshInterval?: number;
  // Whether to refresh on mount
  refreshOnMount?: boolean;
  // Whether to refresh on window focus
  refreshOnFocus?: boolean;
}

/**
 * Hook to manage automatic data refresh for ABC Curve and Reports.
 * Refreshes product cache and ABC curve calculations periodically.
 */
export function useDataRefresh(options: UseDataRefreshOptions = {}) {
  const {
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    refreshOnMount = true,
    refreshOnFocus = true,
  } = options;

  const isRefreshing = useRef(false);
  const lastRefresh = useRef<number>(0);

  const refreshData = useCallback(async (force = false) => {
    // Prevent concurrent refreshes
    if (isRefreshing.current) return;
    
    // Skip if refreshed recently (within 30 seconds) unless forced
    const now = Date.now();
    if (!force && now - lastRefresh.current < 30000) return;

    isRefreshing.current = true;
    lastRefresh.current = now;

    try {
      // Refresh all data in parallel
      await Promise.all([
        apiService.getAllProductsForStats(),
        apiService.calculateABCCurve(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    if (refreshOnMount) {
      refreshData(true);
    }
  }, [refreshOnMount, refreshData]);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, refreshData]);

  // Refresh on window focus
  useEffect(() => {
    if (!refreshOnFocus) return;

    const handleFocus = () => {
      // Only refresh if last refresh was more than 1 minute ago
      if (Date.now() - lastRefresh.current > 60000) {
        refreshData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshOnFocus, refreshData]);

  return {
    refreshData,
    isRefreshing: isRefreshing.current,
  };
}
