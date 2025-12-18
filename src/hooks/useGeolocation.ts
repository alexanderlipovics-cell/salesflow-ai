/**
 * SALES FLOW AI - GEOLOCATION HOOK
 * 
 * Production-grade hook for browser geolocation with permission handling
 * Version: 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeolocationState, GeolocationOptions, GeoCoordinates } from '@/types/geolocation';

export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    isLoading: true,
    error: null,
    isSupported: typeof window !== 'undefined' && 'geolocation' in navigator,
  });

  const watchIdRef = useRef<number | null>(null);

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        source: 'gps',
      },
      isLoading: false,
      error: null,
      isSupported: true,
    });
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    let errorMessage: string;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Standortzugriff wurde verweigert. Bitte Berechtigung in den Einstellungen aktivieren.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Standort konnte nicht ermittelt werden. GPS-Signal möglicherweise zu schwach.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Standortermittlung dauerte zu lange. Bitte erneut versuchen.';
        break;
      default:
        errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: errorMessage,
    }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      // Modern browsers: Check permission state
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'denied') {
          setState((prev) => ({
            ...prev,
            error: 'Standortzugriff wurde dauerhaft blockiert. Bitte in den Browser-Einstellungen aktivieren.',
          }));
          return false;
        }
      }

      // Request location (this will prompt if needed)
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        { enableHighAccuracy, timeout, maximumAge }
      );

      return true;
    } catch (err) {
      console.error('Geolocation permission error:', err);
      return false;
    }
  }, [state.isSupported, enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  const refresh = useCallback(() => {
    if (!state.isSupported) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [state.isSupported, enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  useEffect(() => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Geolocation wird von diesem Browser nicht unterstützt.',
      }));
      return;
    }

    if (watch) {
      // Watch position (continuous updates)
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        { enableHighAccuracy, timeout, maximumAge }
      );

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    } else {
      // Get position once
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        { enableHighAccuracy, timeout, maximumAge }
      );
    }
  }, [state.isSupported, watch, enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  return {
    ...state,
    refresh,
    requestPermission,
  };
}

