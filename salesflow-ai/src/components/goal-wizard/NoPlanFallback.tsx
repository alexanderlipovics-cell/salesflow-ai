/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  NO PLAN FALLBACK                                                          ║
 * ║  Anzeige wenn kein Compensation Plan für eine Firma verfügbar ist          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { getExternalPlanUrl, getCompanyInfo } from '../../config/companies';

// ============================================
// PROPS
// ============================================

interface NoPlanFallbackProps {
  /** Company-Key (wird normalisiert) */
  companyKey: string;
  /** Optionaler Company-Name (wird automatisch ermittelt wenn nicht angegeben) */
  companyName?: string;
  /** Callback wenn User zurück will */
  onGoBack?: () => void;
  /** Kompakte Variante für inline-Nutzung */
  compact?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const NoPlanFallback: React.FC<NoPlanFallbackProps> = ({
  companyKey,
  companyName,
  onGoBack,
  compact = false,
}) => {
  // Company-Info holen
  const companyInfo = getCompanyInfo(companyKey);
  const displayName = companyName || companyInfo.name;
  const externalUrl = getExternalPlanUrl(companyKey);
  
  // Externe URL öffnen
  const handleOpenExternal = async () => {
    if (externalUrl) {
      try {
        await Linking.openURL(externalUrl);
      } catch (err) {
        console.error('Could not open URL:', err);
      }
    }
  };

  // Kompakte Variante
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactIcon}>📋</Text>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>Kein Plan verfügbar</Text>
          <Text style={styles.compactText}>
            Für {displayName} ist noch kein detaillierter Compensation Plan hinterlegt.
          </Text>
          {externalUrl && (
            <TouchableOpacity onPress={handleOpenExternal}>
              <Text style={styles.compactLink}>Plan auf Website ansehen →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Vollständige Variante
  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{companyInfo.emoji || '📋'}</Text>
      </View>
      
      {/* Titel */}
      <Text style={styles.title}>
        Compensation Plan nicht verfügbar
      </Text>
      
      {/* Beschreibung */}
      <Text style={styles.description}>
        Für <Text style={styles.companyName}>{displayName}</Text> ist aktuell noch kein 
        detaillierter Compensation Plan in SalesFlow hinterlegt.
      </Text>
      
      {/* Info-Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Was bedeutet das?</Text>
        <Text style={styles.infoText}>
          Der Goal Wizard benötigt Rang-Definitionen und Volumenvorgaben, um deine 
          Ziele berechnen zu können. Diese Daten werden aktuell für {displayName} noch 
          aufbereitet.
        </Text>
      </View>
      
      {/* Actions */}
      <View style={styles.actions}>
        {externalUrl && (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleOpenExternal}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              Plan auf {displayName} Website ansehen
            </Text>
          </TouchableOpacity>
        )}
        
        {onGoBack && (
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={onGoBack}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              Andere Firma wählen
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Hinweis */}
      <Text style={styles.hint}>
        Du kannst trotzdem alle anderen Features von SalesFlow nutzen – 
        Einwandbehandlung, Follow-ups, AI-Chat und mehr funktionieren 
        unabhängig vom Compensation Plan.
      </Text>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Vollständige Variante
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  companyName: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  
  // Info Box
  infoBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    width: '100%',
    maxWidth: 360,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  
  // Actions
  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#020617',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  
  // Hint
  hint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 320,
    lineHeight: 18,
  },
  
  // Kompakte Variante
  compactContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'flex-start',
  },
  compactIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  compactText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  compactLink: {
    fontSize: 13,
    color: '#06b6d4',
    fontWeight: '500',
    marginTop: 8,
  },
});

// ============================================
// EXPORTS
// ============================================

export default NoPlanFallback;

