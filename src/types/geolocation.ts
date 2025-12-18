/**
 * SALES FLOW AI - GEOLOCATION TYPES
 * 
 * Types for geolocation, distance calculation, and field operations
 * Version: 2.0.0
 */

// ============================================================================
// CORE GEOLOCATION TYPES
// ============================================================================

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  timestamp?: number;
  source?: 'gps' | 'ip' | 'manual' | 'geocoded' | 'import';
}

export interface GeolocationState {
  coordinates: GeoCoordinates | null;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

// ============================================================================
// FIELD OPS TYPES
// ============================================================================

export interface NearbyLead {
  contact_id: string;
  full_name: string;
  status: string;
  lead_score: number;
  distance_km: number;
  last_contact_at: string | null;
  last_action_type: string | null;
  latitude: number;
  longitude: number;
}

export interface FieldOpsRadarParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

// ============================================================================
// LOCATION ACCURACY TYPES
// ============================================================================

export type AccuracyLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface LocationAccuracy {
  level: AccuracyLevel;
  description: string;
  meters?: number;
}

// ============================================================================
// GEOCODING TYPES
// ============================================================================

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface GeocodeResult {
  coordinates: GeoCoordinates;
  address: Address;
  confidence: number; // 0-1
}

// ============================================================================
// CONTACT WITH LOCATION TYPES
// ============================================================================

export interface ContactLocation {
  contact_id: string;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  location_accuracy: number | null;
  location_updated_at: string | null;
}

