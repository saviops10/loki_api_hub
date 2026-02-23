import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  retryLimit?: number;
}

export const useApi = (options: UseApiOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (url: string, fetchOptions: RequestInit = {}, retryCount = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Map HTTP errors to user-friendly messages
        let message = 'An unexpected error occurred';
        if (response.status === 401) message = 'Session expired. Please login again.';
        if (response.status === 403) message = 'You do not have permission to perform this action.';
        if (response.status === 404) message = 'The requested resource was not found.';
        if (response.status >= 500) message = 'Server error. Please try again later.';
        if (data?.error) message = data.error;

        // Retry logic for 5xx errors
        if (response.status >= 500 && retryCount < (options.retryLimit || 0)) {
          console.log(`Retrying... (${retryCount + 1})`);
          return call(url, fetchOptions, retryCount + 1);
        }

        throw new Error(message);
      }

      options.onSuccess?.(data);
      return data;
    } catch (err: any) {
      const message = err.message || 'Connection failed';
      setError(message);
      options.onError?.(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { call, loading, error, setError };
};
