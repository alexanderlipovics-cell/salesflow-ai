/**
 * AutopilotWidget - Zeigt Autopilot-Status und ermöglicht Steuerung
 * 
 * Features:
 * - Autonomie-Level Toggle
 * - Pending Decisions Counter
 * - Quick Stats
 * - One-Click Aktivierung
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../../services/apiConfig';
import { useAuth } from '../../context/AuthContext';

// Auth Type
interface AuthUser {
  access_token?: string;
  id?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type AutonomyMode = 'passive' | 'advisory' | 'supervised' | 'autonomous' | 'full_auto';

interface AutopilotStats {
  mode: AutonomyMode;
  confidence_threshold: number;
  decisions_today: number;
  executed_today: number;
  pending_approvals: number;
  agents_available: string[];
}

interface ModeConfig {
  labelKey: string;
  emoji: string;
  descKey: string;
  color: string;
  gradient: [string, string];
}

const MODE_CONFIGS: Record<AutonomyMode, ModeConfig> = {
  passive: {
    labelKey: 'autopilot.modes.passive',
    emoji: '👁️',
    descKey: 'autopilot.mode_desc.passive',
    color: '#94A3B8',
    gradient: ['#94A3B8', '#64748B'],
  },
  advisory: {
    labelKey: 'autopilot.modes.advisory',
    emoji: '💡',
    descKey: 'autopilot.mode_desc.advisory',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
  },
  supervised: {
    labelKey: 'autopilot.modes.supervised',
    emoji: '👀',
    descKey: 'autopilot.mode_desc.supervised',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  autonomous: {
    labelKey: 'autopilot.modes.autonomous',
    emoji: '🤖',
    descKey: 'autopilot.mode_desc.autonomous',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  full_auto: {
    labelKey: 'autopilot.modes.full_auto',
    emoji: '🚀',
    descKey: 'autopilot.mode_desc.full_auto',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  onPress?: () => void;
  compact?: boolean;
}

export default function AutopilotWidget({ onPress, compact = false }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<AutopilotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Pulse animation für aktive Modi
  useEffect(() => {
    if (stats?.mode && ['autonomous', 'full_auto'].includes(stats.mode)) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [stats?.mode]);
  
  // Demo-Daten als Fallback
  const demoStats: AutopilotStats = {
    mode: 'autonomous',  // 🚀 AKTIVIERT
    confidence_threshold: 0.75,
    decisions_today: 8,
    executed_today: 6,
    pending_approvals: 2,
    agents_available: ['hunter', 'closer', 'communicator', 'analyst'],
  };

  // Stats laden
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/autonomous/brain/stats`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Fallback für Demo/wenn Backend nicht läuft - kein console.error
        setStats(demoStats);
      }
    } catch {
      // Fehler still abfangen - Demo-Daten zeigen (keine console.error)
      setStats(demoStats);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchStats();
    // Auto-refresh alle 30 Sekunden
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);
  
  // Modus wechseln
  const cycleMode = async () => {
    if (!stats || updating) return;
    
    const modes: AutonomyMode[] = ['passive', 'advisory', 'supervised', 'autonomous', 'full_auto'];
    const currentIndex = modes.indexOf(stats.mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    setUpdating(true);
    
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/autonomous/brain/mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: nextMode,
          confidence_threshold: stats.confidence_threshold,
        }),
      });
      
      if (response.ok) {
        setStats(prev => prev ? { ...prev, mode: nextMode } : null);
      }
    } catch (error) {
      // Lokales Update für Demo
      setStats(prev => prev ? { ...prev, mode: nextMode } : null);
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }
  
  if (!stats) return null;
  
  const config = MODE_CONFIGS[stats.mode];
  const isActive = ['autonomous', 'full_auto'].includes(stats.mode);
  
  // Kompakte Version für Dashboard
  if (compact) {
    return (
      <Pressable onPress={onPress || cycleMode}>
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactContainer}
        >
          <View style={styles.compactContent}>
            <Text style={styles.compactEmoji}>{config.emoji}</Text>
            <View>
              <Text style={styles.compactLabel}>{t('autopilot.title')}</Text>
              <Text style={styles.compactMode}>{t(config.labelKey)}</Text>
            </View>
          </View>
          
          {stats.pending_approvals > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pending_approvals}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }
  
  // Volle Version
  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.emoji}>{config.emoji}</Text>
              <View>
                <Text style={styles.title}>{t('autopilot.title')}</Text>
                <Text style={styles.subtitle}>{t(config.descKey)}</Text>
              </View>
            </View>
            
            <Pressable 
              onPress={cycleMode} 
              style={styles.modeButton}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.modeButtonText}>{t(config.labelKey)} ▼</Text>
              )}
            </Pressable>
          </View>
          
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.decisions_today}</Text>
              <Text style={styles.statLabel}>{t('autopilot.decisions')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.executed_today}</Text>
              <Text style={styles.statLabel}>{t('autopilot.executed')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[
                styles.statValue,
                stats.pending_approvals > 0 && styles.statValueAlert
              ]}>
                {stats.pending_approvals}
              </Text>
              <Text style={styles.statLabel}>{t('autopilot.waiting')}</Text>
            </View>
          </View>
          
          {/* Agents */}
          <View style={styles.agentsRow}>
            <Text style={styles.agentsLabel}>{t('autopilot.active_agents')}</Text>
            <View style={styles.agentChips}>
              {stats.agents_available.map((agent) => (
                <View key={agent} style={styles.agentChip}>
                  <Text style={styles.agentChipText}>
                    {agent === 'hunter' && '🎯'}
                    {agent === 'closer' && '🤝'}
                    {agent === 'communicator' && '💬'}
                    {agent === 'analyst' && '📊'}
                    {' '}{t(`autopilot.modes.${agent}`, agent.charAt(0).toUpperCase() + agent.slice(1))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Status Indicator */}
          {isActive && (
            <View style={styles.activeIndicator}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>
                {t('autopilot.active_background')}
              </Text>
            </View>
          )}
          
          {/* Pending Alert */}
          {stats.pending_approvals > 0 && (
            <View style={styles.pendingAlert}>
              <Text style={styles.pendingAlertText}>
                ⚠️ {t('autopilot.pending_actions', { count: stats.pending_approvals })}
              </Text>
            </View>
          )}
          
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  containerCompact: {
    padding: 12,
    borderRadius: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  
  // Compact Version
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    minHeight: 70,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactEmoji: {
    fontSize: 28,
  },
  compactLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  compactMode: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Full Version
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  modeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  modeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  statValueAlert: {
    color: '#FEF08A',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // Agents
  agentsRow: {
    marginBottom: 12,
  },
  agentsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  agentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  agentChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Active Indicator
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  activeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  
  // Pending Alert
  pendingAlert: {
    backgroundColor: 'rgba(234,179,8,0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  pendingAlertText: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
  },
});

