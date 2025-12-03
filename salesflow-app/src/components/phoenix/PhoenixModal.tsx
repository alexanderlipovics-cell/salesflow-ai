/**
 * 🔥 PhoenixModal
 * ===============
 * Modal für das Außendienst-Reaktivierungs-System
 *
 * Features:
 * - "Bin zu früh" Modus
 * - Leads in der Nähe
 * - Reaktivierungs-Vorschläge
 * - Session Management
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import * as phoenixApi from "../../api/phoenix";
import type {
  NearbyLead,
  ImEarlyResponse,
  ImEarlySuggestion,
  FieldSession,
  SessionType,
} from "../../api/types/phoenix";

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
  background: "#0A0A0A",
  card: "#1C1C1E",
  cardBorder: "#2C2C2E",
  phoenix: "#FF6B35", // Phoenix Orange
  phoenixDark: "#E55A2B",
  primary: "#34C759",
  secondary: "#007AFF",
  warning: "#FF9500",
  error: "#FF3B30",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
};

// =============================================================================
// PROPS
// =============================================================================

interface PhoenixModalProps {
  visible: boolean;
  onClose: () => void;
  onLeadSelected?: (leadId: string, action: string) => void;
  initialMode?: "im_early" | "nearby" | "reactivation" | "session";
  minutesAvailable?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function PhoenixModal({
  visible,
  onClose,
  onLeadSelected,
  initialMode = "im_early",
  minutesAvailable = 30,
}: PhoenixModalProps) {
  // State
  const [mode, setMode] = useState(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Data
  const [imEarlyData, setImEarlyData] = useState<ImEarlyResponse | null>(null);
  const [nearbyLeads, setNearbyLeads] = useState<NearbyLead[]>([]);
  const [activeSession, setActiveSession] = useState<FieldSession | null>(null);

  // Time selection
  const [selectedMinutes, setSelectedMinutes] = useState(minutesAvailable);

  // =============================================================================
  // LOCATION
  // =============================================================================

  const getLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Standort-Berechtigung benötigt");
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setLocation(coords);
      return coords;
    } catch (e) {
      setError("Standort konnte nicht ermittelt werden");
      return null;
    }
  }, []);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadImEarlyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loc = location || (await getLocation());
      if (!loc) return;

      const data = await phoenixApi.imEarlyForMeeting({
        latitude: loc.latitude,
        longitude: loc.longitude,
        minutes_available: selectedMinutes,
      });

      setImEarlyData(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden");
    } finally {
      setIsLoading(false);
    }
  }, [location, selectedMinutes, getLocation]);

  const loadNearbyLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loc = location || (await getLocation());
      if (!loc) return;

      const leads = await phoenixApi.findNearbyLeads({
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius_meters: 5000,
        min_days_since_contact: 14,
        limit: 20,
      });

      setNearbyLeads(leads);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden");
    } finally {
      setIsLoading(false);
    }
  }, [location, getLocation]);

  // Initial load
  useEffect(() => {
    if (visible) {
      if (mode === "im_early") {
        loadImEarlyData();
      } else if (mode === "nearby") {
        loadNearbyLeads();
      }
    }
  }, [visible, mode]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleNavigate = useCallback((address: string) => {
    const url = Platform.select({
      ios: `maps:?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  }, []);

  const handleSuggestionAction = useCallback(
    (suggestion: ImEarlySuggestion) => {
      if (suggestion.type === "call" && suggestion.phone) {
        handleCall(suggestion.phone);
      }
      onLeadSelected?.(suggestion.lead_id, suggestion.type);
    },
    [handleCall, onLeadSelected]
  );

  const handleStartSession = useCallback(
    async (sessionType: SessionType) => {
      try {
        const loc = location || (await getLocation());
        if (!loc) return;

        const session = await phoenixApi.startFieldSession({
          session_type: sessionType,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });

        setActiveSession(session);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("🔥 Session gestartet!", `${getSessionLabel(sessionType)} aktiv`);
      } catch (e: any) {
        Alert.alert("Fehler", e.message);
      }
    },
    [location, getLocation]
  );

  // =============================================================================
  // RENDER: IM EARLY MODE
  // =============================================================================

  const renderImEarlyMode = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.phoenix} />
          <Text style={styles.loadingText}>Suche Leads in der Nähe...</Text>
        </View>
      );
    }

    if (!imEarlyData) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Keine Daten geladen</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadImEarlyData}>
            <Text style={styles.retryButtonText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Selector */}
        <View style={styles.timeSelector}>
          <Text style={styles.timeSelectorLabel}>Verfügbare Zeit:</Text>
          <View style={styles.timeOptions}>
            {[15, 30, 45, 60].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[styles.timeChip, selectedMinutes === mins && styles.timeChipActive]}
                onPress={() => {
                  setSelectedMinutes(mins);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[styles.timeChipText, selectedMinutes === mins && styles.timeChipTextActive]}>
                  {mins} Min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={loadImEarlyData}>
            <Ionicons name="refresh" size={18} color={COLORS.phoenix} />
          </TouchableOpacity>
        </View>

        {/* Summary Message */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryEmoji}>🔥</Text>
          <Text style={styles.summaryText}>{imEarlyData.message}</Text>
        </View>

        {/* Suggestions */}
        {imEarlyData.suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionCard}
            onPress={() => handleSuggestionAction(suggestion)}
          >
            <View style={styles.suggestionHeader}>
              <View style={styles.suggestionIcon}>
                <Text style={styles.suggestionEmoji}>
                  {suggestion.type === "visit" ? "🚶" : "📞"}
                </Text>
              </View>
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(suggestion.priority) },
                ]}
              >
                <Text style={styles.priorityText}>{suggestion.priority.toUpperCase()}</Text>
              </View>
            </View>

            {suggestion.suggested_message && (
              <View style={styles.messagePreview}>
                <Text style={styles.messageLabel}>💡 Vorgeschlagene Nachricht:</Text>
                <Text style={styles.messageText}>{suggestion.suggested_message}</Text>
              </View>
            )}

            <View style={styles.suggestionActions}>
              {suggestion.type === "visit" && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onLeadSelected?.(suggestion.lead_id, "visit")}
                >
                  <Ionicons name="navigate" size={16} color={COLORS.phoenix} />
                  <Text style={styles.actionButtonText}>Navigieren</Text>
                </TouchableOpacity>
              )}
              {suggestion.phone && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCall(suggestion.phone!)}
                >
                  <Ionicons name="call" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Anrufen</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {imEarlyData.suggestions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Keine Leads gefunden</Text>
            <Text style={styles.emptyDescription}>
              Im Umkreis von {imEarlyData.search_radius_km}km wurden keine passenden Leads gefunden.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // =============================================================================
  // RENDER: NEARBY MODE
  // =============================================================================

  const renderNearbyMode = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.phoenix} />
          <Text style={styles.loadingText}>Suche Leads...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leads in der Nähe</Text>
          <TouchableOpacity onPress={loadNearbyLeads}>
            <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {nearbyLeads.map((lead) => (
          <View key={lead.lead_id} style={styles.leadCard}>
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{lead.name}</Text>
                <Text style={styles.leadMeta}>
                  {lead.distance_km}km • {lead.travel_time_minutes} Min • {lead.days_since_contact} Tage
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                <Text style={styles.statusText}>{lead.status}</Text>
              </View>
            </View>

            {lead.address && <Text style={styles.leadAddress}>📍 {lead.address}</Text>}

            <View style={styles.leadActions}>
              {lead.phone && (
                <TouchableOpacity
                  style={styles.leadActionButton}
                  onPress={() => handleCall(lead.phone!)}
                >
                  <Ionicons name="call" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.leadActionButton}
                onPress={() => onLeadSelected?.(lead.lead_id, "visit")}
              >
                <Ionicons name="navigate" size={18} color={COLORS.phoenix} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {nearbyLeads.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyTitle}>Keine Leads in der Nähe</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // =============================================================================
  // RENDER: SESSION MODE
  // =============================================================================

  const renderSessionMode = () => {
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phoenix Session starten</Text>
        </View>

        <Text style={styles.sessionDescription}>
          Starte eine Außendienst-Session um automatisch Vorschläge zu erhalten.
        </Text>

        {[
          { type: "field_day" as SessionType, icon: "🌞", label: "Außendienst-Tag", desc: "Normaler Arbeitstag im Feld" },
          { type: "territory_sweep" as SessionType, icon: "🗺️", label: "Gebietssweep", desc: "Gebiet systematisch abarbeiten" },
          { type: "reactivation_blitz" as SessionType, icon: "🔥", label: "Reaktivierungs-Blitz", desc: "Fokus auf alte Kontakte" },
        ].map((session) => (
          <TouchableOpacity
            key={session.type}
            style={styles.sessionCard}
            onPress={() => handleStartSession(session.type)}
          >
            <Text style={styles.sessionIcon}>{session.icon}</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLabel}>{session.label}</Text>
              <Text style={styles.sessionDesc}>{session.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>🔥</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Phoenix</Text>
            <Text style={styles.subtitle}>
              {mode === "im_early" && "Bin zu früh"}
              {mode === "nearby" && "Leads in der Nähe"}
              {mode === "session" && "Session starten"}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Mode Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === "im_early" && styles.tabActive]}
            onPress={() => setMode("im_early")}
          >
            <Text style={[styles.tabText, mode === "im_early" && styles.tabTextActive]}>⏰ Zu früh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === "nearby" && styles.tabActive]}
            onPress={() => setMode("nearby")}
          >
            <Text style={[styles.tabText, mode === "nearby" && styles.tabTextActive]}>📍 Nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === "session" && styles.tabActive]}
            onPress={() => setMode("session")}
          >
            <Text style={[styles.tabText, mode === "session" && styles.tabTextActive]}>🚀 Session</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Content */}
        {mode === "im_early" && renderImEarlyMode()}
        {mode === "nearby" && renderNearbyMode()}
        {mode === "session" && renderSessionMode()}
      </View>
    </Modal>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: COLORS.error,
    medium: COLORS.warning,
    low: COLORS.primary,
  };
  return colors[priority] || COLORS.textMuted;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    hot: COLORS.error,
    warm: COLORS.warning,
    cold: COLORS.secondary,
  };
  return colors[status] || COLORS.textMuted;
}

function getSessionLabel(type: SessionType): string {
  const labels: Record<SessionType, string> = {
    field_day: "Außendienst-Tag",
    territory_sweep: "Gebietssweep",
    appointment_buffer: "Termin-Puffer",
    reactivation_blitz: "Reaktivierungs-Blitz",
  };
  return labels[type] || type;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: COLORS.phoenix,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },

  // Time Selector
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  timeSelectorLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeOptions: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  timeChipActive: {
    backgroundColor: COLORS.phoenix,
    borderColor: COLORS.phoenix,
  },
  timeChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  timeChipTextActive: {
    color: COLORS.text,
    fontWeight: "600",
  },
  refreshButton: {
    padding: 8,
  },

  // Summary
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Suggestion Card
  suggestionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  suggestionEmoji: {
    fontSize: 20,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  suggestionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  },
  messagePreview: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  messageLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  suggestionActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.phoenix,
  },

  // Lead Card
  leadCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  leadHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  leadMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  leadAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
  },
  leadActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  leadActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  // Session
  sessionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sessionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  sessionDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.phoenix,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginTop: 0,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
  },
});

