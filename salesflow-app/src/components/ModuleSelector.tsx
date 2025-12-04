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

  const verticalConfig = getVerticalConfig(vertical);
  const availableModules = getAvailableModules(vertical);

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
    if (!availableModules.includes(moduleId)) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aktivierte Module</Text>
      <Text style={styles.subtitle}>
        Wähle die Module, die für dein Vertical verfügbar sein sollen
      </Text>

      <ScrollView style={styles.scrollView}>
        {availableModules.map((moduleId) => {
          const moduleInfo = MODULE_INFO[moduleId];
          const isEnabled = enabledModules.includes(moduleId);

          return (
            <View key={moduleId} style={styles.moduleItem}>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleIcon}>{moduleInfo.icon}</Text>
                <View style={styles.moduleText}>
                  <Text style={styles.moduleName}>{moduleInfo.name}</Text>
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

        {/* Nicht verfügbare Module (Info) */}
        {Object.keys(MODULE_INFO)
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    marginBottom: 16,
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

