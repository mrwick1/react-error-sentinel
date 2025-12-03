import { useState, useEffect, useCallback } from 'react';
import { Transport } from '../../core/transport';
import { AuthStrategy } from '../../types/config';
import { ErrorEvent } from '../../types';
import { UseErrorDataReturn } from '../types';

export function useErrorData(
  apiEndpoint: string,
  authStrategy: AuthStrategy = 'none',
  authToken?: string,
  refreshInterval: number = 0
): UseErrorDataReturn {
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create transport instance
  const transport = new Transport(apiEndpoint, authStrategy, authToken);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedErrors = await transport.fetch();
      setErrors(fetchedErrors);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch errors';
      setError(errorMessage);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, authStrategy, authToken]);

  // Initial fetch
  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchErrors();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [refreshInterval, fetchErrors]);

  return {
    errors,
    loading,
    error,
    refetch: fetchErrors,
  };
}
