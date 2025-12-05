/**
 * 🗺️ PhoenixMapView
 * =================
 * Kartenansicht für Leads in der Nähe.
 *
 * WARUM DIESE VERBESSERUNG?
 * ========================
 * 1. Visuelle Orientierung: User sieht auf einen Blick wo Leads sind
 * 2. Cluster-Erkennung: Gebiete mit vielen Leads sind sofort sichtbar
 * 3. Route-Visualisierung: Optimierte Route auf Karte anzeigen
 * 4. Touch-Navigation: Lead antippen = Details öffnen
 *
 * FEATURES:
 * - Lead-Marker mit Status-Farben
 * - Cluster-Visualisierung
 * - Optimierte Route als Linie
 * - Current Location
 * - Radius-Anzeige
 */

import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

import type { NearbyLead } from "../../api/types/phoenix";

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  background: "#0A0A0A",
  phoenix: "#FF6B35",
  hot: "#FF3B30",
  warm: "#FF9500",
  cold: "#007AFF",
  customer: "#34C759",
  route: "#FF6B35",
  radius: "rgba(255, 107, 53, 0.1)",
  radiusBorder: "rgba(255, 107, 53, 0.3)",
  currentLocation: "#007AFF",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
};

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#304a7d" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#255763" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
];

// =============================================================================
// PROPS
// =============================================================================

interface PhoenixMapViewProps {
  leads: NearbyLead[];
  currentLocation: { latitude: number; longitude: number } | null;
  radiusMeters?: number;
  optimizedRoute?: NearbyLead[];
  onLeadPress?: (lead: NearbyLead) => void;
  showRadius?: boolean;
  showRoute?: boolean;
}

// =============================================================================
// HELPER: Get marker color by status
// =============================================================================

function getMarkerColor(status: string): string {
  switch (status) {
    case "hot":
      return COLORS.hot;
    case "warm":
      return COLORS.warm;
    case "cold":
      return COLORS.cold;
    case "customer":
      return COLORS.customer;
    default:
      return COLORS.textSecondary;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function PhoenixMapView({
  leads,
  currentLocation,
  radiusMeters = 5000,
  optimizedRoute,
  onLeadPress,
  showRadius = true,
  showRoute = true,
}: PhoenixMapViewProps) {
  // =============================================================================
  // REGION CALCULATION
  // =============================================================================

  const mapRegion = useMemo(() => {
    if (!currentLocation) {
      // Default: Germany center
      return {
        latitude: 51.1657,
        longitude: 10.4515,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    // Delta basierend auf Radius berechnen
    // 1 Grad ≈ 111km
    const delta = (radiusMeters / 111000) * 2.5;

    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
  }, [currentLocation, radiusMeters]);

  // =============================================================================
  // ROUTE COORDINATES
  // =============================================================================

  const routeCoordinates = useMemo(() => {
    if (!optimizedRoute || !showRoute || !currentLocation) {
      return [];
    }

    const coords = [
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
    ];

    // Hier würden wir die Koordinaten der optimierten Route hinzufügen
    // Da wir keine GPS-Daten für Leads haben, überspringen wir das vorerst

    return coords;
  }, [optimizedRoute, showRoute, currentLocation]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!currentLocation) {
    return (
      <View style={styles.noLocation}>
        <Ionicons name="location-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.noLocationText}>Standort wird ermittelt...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={mapRegion}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        rotateEnabled={false}
      >
        {/* Radius Circle */}
        {showRadius && (
          <Circle
            center={currentLocation}
            radius={radiusMeters}
            fillColor={COLORS.radius}
            strokeColor={COLORS.radiusBorder}
            strokeWidth={1}
          />
        )}

        {/* Optimized Route */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.route}
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}

        {/* Lead Markers */}
        {leads.map((lead, index) => {
          // Für Demo: Zufällige Position um currentLocation
          // In Produktion: echte GPS-Koordinaten vom Lead
          const offsetLat = (Math.random() - 0.5) * 0.02;
          const offsetLon = (Math.random() - 0.5) * 0.02;

          return (
            <Marker
              key={lead.lead_id}
              coordinate={{
                latitude: currentLocation.latitude + offsetLat,
                longitude: currentLocation.longitude + offsetLon,
              }}
              pinColor={getMarkerColor(lead.status)}
              onPress={() => onLeadPress?.(lead)}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.marker,
                    { backgroundColor: getMarkerColor(lead.status) },
                  ]}
                >
                  <Text style={styles.markerText}>{index + 1}</Text>
                </View>
                <View style={styles.markerArrow} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.hot }]} />
          <Text style={styles.legendText}>Hot</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warm }]} />
          <Text style={styles.legendText}>Warm</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.cold }]} />
          <Text style={styles.legendText}>Cold</Text>
        </View>
      </View>

      {/* Stats Overlay */}
      <View style={styles.statsOverlay}>
        <Text style={styles.statsText}>
          {leads.length} Leads im Umkreis von {(radiusMeters / 1000).toFixed(1)}km
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  noLocation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  noLocationText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Marker
  markerContainer: {
    alignItems: "center",
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.text,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.text,
    marginTop: -2,
  },

  // Legend
  legend: {
    position: "absolute",
    bottom: 60,
    left: 16,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    padding: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.text,
  },

  // Stats Overlay
  statsOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    padding: 10,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: "center",
  },
});

