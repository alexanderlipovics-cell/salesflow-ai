/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MODULE SELECTOR COMPONENT                                                  ║
 * ║  Aktivierung/Deaktivierung von Modulen (Phoenix, DelayMaster, etc.)        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { AURA_COLORS, AURA_SHADOWS } from './aura';
import {
  ModuleId,
  getAvailableModules,
  getVerticalConfig,
  VerticalId,
} from '../config/verticals/VerticalContext';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface ModuleSelectorProps {
  vertical: VerticalId;
}

const MODULE_INFO: Record<ModuleId, { name: string; icon: string; description: string }> = {
  mentor: {
    name: 'MENTOR Chat',
    icon: '💬',
    description: 'KI-Sales-Coach für tägliche Unterstützung',
  },
  dmo_tracker: {
    name: 'DMO Tracker',
    icon: '📋',
    description: 'Daily Method of Operation Tracking',
  },
  phoenix: {
    name: 'Phoenix',
    icon: '🔥',
    description: 'Außendienst-Reaktivierung ("Bin zu früh")',
  },
  delay_master: {
    name: 'DelayMaster',
    icon: '⏰',
    description: 'Timing-Optimierung für Follow-ups',
  },
  ghostbuster: {
    name: 'Ghostbuster',
    icon: '👻',
    description: 'Ghosting-Erkennung & Reaktivierung',
  },
  team_dashboard: {
    name: 'Team Dashboard',
    icon: '👥',
    description: 'Team-Performance Übersicht',
  },
  scripts: {
    name: 'Scripts Library',
    icon: '📝',
    description: '52 fertige Einwand-Scripts',
  },
  cockpit: {
    name: 'Außendienst Cockpit',
    icon: '🗺️',
    description: 'Route & Planung für Außendienst',
  },
  route_planner: {
    name: 'Route Planner',
    icon: '📍',
    description: 'GPS-basierte Route-Optimierung',
  },
  industry_radar: {
    name: 'Industry Radar',
    icon: '📊',
    description: 'Branchen-Analyse & Go-to-Market',
  },
  contacts: {
    name: 'Kontakte',
    icon: '👤',
    description: 'Kontakt-Management',
  },
};

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ vertical }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAllModules, setShowAllModules] = useState(false);

  const verticalConfig = getVerticalConfig(vertical);
  const availableModules = getAvailableModules(vertical);
  
  // Alle Module für Beta-Tester
  const allModules: ModuleId[] = Object.keys(MODULE_INFO) as ModuleId[];
  const isBetaTester = profile?.is_beta_tester || false;

  useEffect(() => {
    // Lade aktuelle Module aus Profil
    if (profile?.enabled_modules) {
      setEnabledModules(profile.enabled_modules as ModuleId[]);
    } else {
      // Default: Alle verfügbaren Module aktivieren
      setEnabledModules(availableModules);
    }
  }, [profile, availableModules]);

  const toggleModule = async (moduleId: ModuleId) => {
    // Prüfe ob Modul verfügbar ist (außer im Beta-Modus)
    if (!showAllModules && !availableModules.includes(moduleId)) {
      return; // Modul nicht für dieses Vertical verfügbar
    }

    const newModules = enabledModules.includes(moduleId)
      ? enabledModules.filter((m) => m !== moduleId)
      : [...enabledModules, moduleId];

    setEnabledModules(newModules);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ enabled_modules: newModules })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile?.();
    } catch (error) {
      console.error('Error updating modules:', error);
      // Rollback
      setEnabledModules(enabledModules);
      alert('Fehler beim Speichern der Module');
    } finally {
      setSaving(false);
    }
  };

  // Module-Liste: Verfügbare Module + optional alle Module für Beta-Tester
  const modulesToShow = showAllModules && isBetaTester 
    ? allModules 
    : availableModules;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Aktivierte Module</Text>
          <Text style={styles.subtitle}>
            {showAllModules && isBetaTester 
              ? 'Alle Module (Beta-Modus)'
              : `Module für ${verticalConfig.name}`}
          </Text>
        </View>
        {isBetaTester && (
          <TouchableOpacity
            style={styles.betaToggle}
            onPress={() => setShowAllModules(!showAllModules)}
          >
            <Text style={styles.betaToggleText}>
              {showAllModules ? '🔒 Standard' : '🚀 Alle Module'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {modulesToShow.map((moduleId) => {
          const moduleInfo = MODULE_INFO[moduleId];
          const isEnabled = enabledModules.includes(moduleId);

          const isAvailableForVertical = availableModules.includes(moduleId);
          const isBetaModule = !isAvailableForVertical && showAllModules;

          return (
            <View key={moduleId} style={[
              styles.moduleItem,
              isBetaModule && styles.moduleItemBeta
            ]}>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleIcon}>{moduleInfo.icon}</Text>
                <View style={styles.moduleText}>
                  <View style={styles.moduleNameRow}>
                    <Text style={styles.moduleName}>{moduleInfo.name}</Text>
                    {isBetaModule && (
                      <Text style={styles.betaBadge}>BETA</Text>
                    )}
                  </View>
                  <Text style={styles.moduleDescription}>
                    {moduleInfo.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={() => toggleModule(moduleId)}
                disabled={saving}
                trackColor={{
                  false: AURA_COLORS.surface.secondary,
                  true: AURA_COLORS.accent.primary + '80',
                }}
                thumbColor={
                  isEnabled
                    ? AURA_COLORS.accent.primary
                    : AURA_COLORS.text.secondary
                }
              />
            </View>
          );
        })}

        {/* Nicht verfügbare Module (Info) - nur wenn nicht im Beta-Modus */}
        {!showAllModules && Object.keys(MODULE_INFO)
          .filter((m) => !availableModules.includes(m as ModuleId))
          .map((moduleId) => {
            const moduleInfo = MODULE_INFO[moduleId as ModuleId];
            return (
              <View key={moduleId} style={[styles.moduleItem, styles.moduleItemDisabled]}>
                <View style={styles.moduleContent}>
                  <Text style={[styles.moduleIcon, styles.moduleIconDisabled]}>
                    {moduleInfo.icon}
                  </Text>
                  <View style={styles.moduleText}>
                    <Text style={[styles.moduleName, styles.moduleNameDisabled]}>
                      {moduleInfo.name}
                    </Text>
                    <Text style={styles.moduleDescription}>
                      Nicht verfügbar für {verticalConfig.name}
                    </Text>
                  </View>
                </View>
                <Text style={styles.disabledBadge}>N/A</Text>
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AURA_COLORS.surface.primary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    ...AURA_SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
  },
  betaToggle: {
    backgroundColor: AURA_COLORS.accent.primary + '20',
    borderWidth: 1,
    borderColor: AURA_COLORS.accent.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  betaToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.accent.primary,
  },
  scrollView: {
    maxHeight: 400,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  moduleItemDisabled: {
    opacity: 0.5,
  },
  moduleItemBeta: {
    borderWidth: 1,
    borderColor: AURA_COLORS.accent.primary + '40',
    backgroundColor: AURA_COLORS.accent.primary + '10',
  },
  moduleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  betaBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: AURA_COLORS.accent.primary,
    backgroundColor: AURA_COLORS.accent.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  moduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  moduleIconDisabled: {
    opacity: 0.5,
  },
  moduleText: {
    flex: 1,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  moduleNameDisabled: {
    color: AURA_COLORS.text.secondary,
  },
  moduleDescription: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    lineHeight: 16,
  },
  disabledBadge: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: AURA_COLORS.surface.tertiary,
    borderRadius: 8,
  },
});

