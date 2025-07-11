// hooks/useAsyncOperation.js
import { useState, useCallback, useRef } from 'react';

const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (asyncFunction, options = {}) => {
    const { abortable = false } = options;

    try {
      setLoading(true);
      setError(null);

      if (abortable) {
        abortControllerRef.current = new AbortController();
      }

      const result = await asyncFunction(abortControllerRef.current?.signal);
      return result;
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMessage = err.message || 'An unexpected error occurred';
        setError(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    abortControllerRef.current = null;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    loading,
    error,
    execute,
    clearError,
    reset,
    abort
  };
};

export default useAsyncOperation;
