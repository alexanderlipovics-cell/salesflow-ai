/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useApi HOOK                                                               ║
 * ║  React Hook für typsichere API-Calls mit Loading/Error States              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api, ApiResponse, ApiError, clearCache } from '../utils/api';

// =============================================================================
// TYPES
// =============================================================================

export interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseApiOptions {
  immediate?: boolean;
  cache?: boolean;
  cacheTime?: number;
  retries?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export interface UseApiReturn<T, P = void> extends UseApiState<T> {
  execute: P extends void ? () => Promise<T | null> : (params: P) => Promise<T | null>;
  reset: () => void;
  refetch: () => Promise<T | null>;
}

// =============================================================================
// HOOK: useApi
// =============================================================================

export function useApi<T, P = void>(
  endpoint: string | ((params: P) => string),
  options: UseApiOptions = {}
): UseApiReturn<T, P> {
  const {
    immediate = false,
    cache = true,
    cacheTime,
    retries = 2,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
    isSuccess: false,
    isError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const lastParamsRef = useRef<P | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (params?: P): Promise<T | null> => {
    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const url = typeof endpoint === 'function' ? endpoint(params as P) : endpoint;
    lastParamsRef.current = params ?? null;

    if (mountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    const response: ApiResponse<T> = await api.get<T>(url, {
      cache,
      cacheTime,
      retries,
    });

    if (!mountedRef.current) return null;

    if (response.error) {
      setState({
        data: null,
        error: response.error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });
      onError?.(response.error);
      return null;
    }

    setState({
      data: response.data,
      error: null,
      isLoading: false,
      isSuccess: true,
      isError: false,
    });
    onSuccess?.(response.data);
    return response.data;
  }, [endpoint, cache, cacheTime, retries, onSuccess, onError]);

  const refetch = useCallback(async (): Promise<T | null> => {
    // Clear cache for this endpoint
    const url = typeof endpoint === 'function' 
      ? endpoint(lastParamsRef.current as P) 
      : endpoint;
    clearCache(url);
    return execute(lastParamsRef.current as P);
  }, [execute, endpoint]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  // Immediate execution
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return {
    ...state,
    execute: execute as any,
    reset,
    refetch,
  };
}

// =============================================================================
// HOOK: useMutation
// =============================================================================

export interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  invalidateCache?: string[];
}

export function useMutation<T, P = void>(
  method: 'post' | 'put' | 'patch' | 'delete',
  endpoint: string | ((params: P) => string),
  options: UseMutationOptions<T> = {}
) {
  const { onSuccess, onError, invalidateCache } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutate = useCallback(async (body?: any, params?: P): Promise<T | null> => {
    const url = typeof endpoint === 'function' ? endpoint(params as P) : endpoint;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const response = await api[method]<T>(url, body);

    if (response.error) {
      setState({
        data: null,
        error: response.error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });
      onError?.(response.error);
      return null;
    }

    // Invalidate related caches
    if (invalidateCache) {
      invalidateCache.forEach(pattern => clearCache(pattern));
    }

    setState({
      data: response.data,
      error: null,
      isLoading: false,
      isSuccess: true,
      isError: false,
    });
    onSuccess?.(response.data as T);
    return response.data;
  }, [method, endpoint, onSuccess, onError, invalidateCache]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

export const useGet = <T>(endpoint: string, options?: UseApiOptions) =>
  useApi<T>(endpoint, options);

export const usePost = <T, P = void>(endpoint: string, options?: UseMutationOptions<T>) =>
  useMutation<T, P>('post', endpoint, options);

export const usePut = <T, P = void>(endpoint: string, options?: UseMutationOptions<T>) =>
  useMutation<T, P>('put', endpoint, options);

export const usePatch = <T, P = void>(endpoint: string, options?: UseMutationOptions<T>) =>
  useMutation<T, P>('patch', endpoint, options);

export const useDelete = <T, P = void>(endpoint: string, options?: UseMutationOptions<T>) =>
  useMutation<T, P>('delete', endpoint, options);

export default useApi;

