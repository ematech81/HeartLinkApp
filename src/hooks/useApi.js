/**
 * useApi — hook for wrapping async API calls with loading + error state.
 *
 * @example
 * const { execute, data, loading, error } = useApi(UserAPI.search);
 * await execute({ gender: 'female', country: 'Nigeria' });
 */

import { useState, useCallback } from 'react';

export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        setData(result);
        return { success: true, data: result };
      } catch (err) {
        setError(err.message || 'Something went wrong');
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { execute, data, loading, error, reset };
}