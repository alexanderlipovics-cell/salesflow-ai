/**
 * SALES FLOW AI - GEOLOCATION UTILITIES
 * 
 * Distance calculation, formatting, and validation utilities
 * Version: 2.0.0
 */

import type { GeoCoordinates, LocationAccuracy, AccuracyLevel } from '@/types/geolocation';

// ============================================================================
// DISTANCE CALCULATION
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimals
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 0.1) {
    return `${Math.round(km * 10000) / 10} m`;
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: GeoCoordinates): string {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}

// ============================================================================
// ACCURACY HELPERS
// ============================================================================

/**
 * Get accuracy level description
 */
export function getAccuracyLevel(accuracyMeters: number | undefined): LocationAccuracy {
  if (!accuracyMeters) {
    return { 
      level: 'poor', 
      description: 'Genauigkeit unbekannt',
      meters: undefined 
    };
  }

  if (accuracyMeters <= 10) {
    return { 
      level: 'excellent', 
      description: 'Sehr genau (± 10m)',
      meters: accuracyMeters 
    };
  }
  if (accuracyMeters <= 50) {
    return { 
      level: 'good', 
      description: 'Gut (± 50m)',
      meters: accuracyMeters 
    };
  }
  if (accuracyMeters <= 100) {
    return { 
      level: 'fair', 
      description: 'Akzeptabel (± 100m)',
      meters: accuracyMeters 
    };
  }
  return { 
    level: 'poor', 
    description: `Ungenau (± ${Math.round(accuracyMeters)}m)`,
    meters: accuracyMeters 
  };
}

/**
 * Get accuracy color class
 */
export function getAccuracyColorClass(level: AccuracyLevel): string {
  const colorMap: Record<AccuracyLevel, string> = {
    excellent: 'bg-green-500/10 text-green-400 border-green-500/20',
    good: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    fair: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    poor: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return colorMap[level];
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate coordinates
 */
export function isValidCoordinates(coords: Partial<GeoCoordinates>): boolean {
  if (!coords.latitude || !coords.longitude) return false;
  
  return (
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Validate radius (in km)
 */
export function isValidRadius(radius: number): boolean {
  return radius > 0 && radius <= 100; // Max 100km
}

// ============================================================================
// DISTANCE HELPERS
// ============================================================================

/**
 * Get distance color class based on distance
 */
export function getDistanceColorClass(distanceKm: number): string {
  if (distanceKm < 1) return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (distanceKm < 3) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (distanceKm < 5) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

/**
 * Sort leads by distance
 */
export function sortByDistance<T extends { distance_km: number }>(
  leads: T[],
  ascending = true
): T[] {
  return [...leads].sort((a, b) => 
    ascending 
      ? a.distance_km - b.distance_km 
      : b.distance_km - a.distance_km
  );
}

// ============================================================================
// BOUNDING BOX CALCULATION
// ============================================================================

/**
 * Calculate bounding box for a given center point and radius
 * Used for optimizing database queries
 */
export function calculateBoundingBox(
  center: GeoCoordinates,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos(toRad(center.latitude)));

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

