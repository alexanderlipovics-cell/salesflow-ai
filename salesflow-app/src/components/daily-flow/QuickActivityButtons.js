/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - QUICK ACTIVITY BUTTONS                                   ║
 * ║  Schnell-Aktions-Buttons für Activity Logging                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useActivityLog } from '../../hooks/useDailyFlowStatus';

/**
 * Quick Activity Buttons Row
 * Ermöglicht schnelles Loggen von Aktivitäten mit einem Tap
 * 
 * @param {Object} props
 * @param {string} [props.companyId='default'] - Company ID
 * @param {Function} [props.onActivityLogged] - Callback nach erfolgreichen Log
 * @param {string} [props.variant='horizontal'] - Layout-Variante (horizontal, vertical, grid)
 */
const QuickActivityButtons = ({
  companyId = 'default',
  onActivityLogged,
  variant = 'horizontal',
}) => {
  const { logContact, logFollowUp, logReactivate, isLogging } = useActivityLog(companyId);
  const [loggingType, setLoggingType] = useState(null);

  const handleLog = async (type, logFn) => {
    setLoggingType(type);
    try {
      await logFn();
      if (onActivityLogged) {
        onActivityLogged(type);
      }
    } catch (error) {
      console.error(`Failed to log ${type}:`, error);
    } finally {
      setLoggingType(null);
    }
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'vertical':
        return styles.containerVertical;
      case 'grid':
        return styles.containerGrid;
      default:
        return styles.containerHorizontal;
    }
  };

  return (
    <View style={[styles.container, getContainerStyle()]}>
      <QuickButton
        emoji="👋"
        label="Neuer Kontakt"
        color="#10B981"
        bgColor="rgba(16, 185, 129, 0.1)"
        borderColor="rgba(16, 185, 129, 0.3)"
        onPress={() => handleLog('contact', logContact)}
        isLoading={loggingType === 'contact'}
        disabled={isLogging}
        variant={variant}
      />
      <QuickButton
        emoji="📞"
        label="Follow-up"
        color="#06B6D4"
        bgColor="rgba(6, 182, 212, 0.1)"
        borderColor="rgba(6, 182, 212, 0.3)"
        onPress={() => handleLog('followup', logFollowUp)}
        isLoading={loggingType === 'followup'}
        disabled={isLogging}
        variant={variant}
      />
      <QuickButton
        emoji="🔄"
        label="Reaktivierung"
        color="#8B5CF6"
        bgColor="rgba(139, 92, 246, 0.1)"
        borderColor="rgba(139, 92, 246, 0.3)"
        onPress={() => handleLog('reactivation', logReactivate)}
        isLoading={loggingType === 'reactivation'}
        disabled={isLogging}
        variant={variant}
      />
    </View>
  );
};

/**
 * Single Quick Button Component
 */
const QuickButton = ({
  emoji,
  label,
  color,
  bgColor,
  borderColor,
  onPress,
  isLoading,
  disabled,
  variant,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      { backgroundColor: bgColor, borderColor },
    ];
    
    if (variant === 'horizontal') {
      baseStyle.push(styles.buttonHorizontal);
    } else if (variant === 'vertical') {
      baseStyle.push(styles.buttonVertical);
    } else if (variant === 'grid') {
      baseStyle.push(styles.buttonGrid);
    }
    
    if (disabled && !isLoading) {
      baseStyle.push(styles.buttonDisabled);
    }
    
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          <Text style={styles.buttonEmoji}>{emoji}</Text>
          <Text style={[styles.buttonLabel, variant === 'vertical' && styles.buttonLabelVertical]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

/**
 * Floating Quick Action Button
 * Schwebendes Action-Button für schnellen Zugriff
 */
export const FloatingQuickAction = ({
  companyId = 'default',
  onActivityLogged,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { logContact, logFollowUp, logReactivate, isLogging } = useActivityLog(companyId);

  const handleLog = async (type, logFn) => {
    try {
      await logFn();
      setIsExpanded(false);
      if (onActivityLogged) {
        onActivityLogged(type);
      }
    } catch (error) {
      console.error(`Failed to log ${type}:`, error);
    }
  };

  return (
    <View style={styles.floatingContainer}>
      {isExpanded && (
        <View style={styles.floatingMenu}>
          <TouchableOpacity
            style={[styles.floatingOption, { backgroundColor: 'rgba(16, 185, 129, 0.9)' }]}
            onPress={() => handleLog('contact', logContact)}
            disabled={isLogging}
          >
            <Text style={styles.floatingEmoji}>👋</Text>
            <Text style={styles.floatingLabel}>Kontakt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingOption, { backgroundColor: 'rgba(6, 182, 212, 0.9)' }]}
            onPress={() => handleLog('followup', logFollowUp)}
            disabled={isLogging}
          >
            <Text style={styles.floatingEmoji}>📞</Text>
            <Text style={styles.floatingLabel}>Follow-up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingOption, { backgroundColor: 'rgba(139, 92, 246, 0.9)' }]}
            onPress={() => handleLog('reactivation', logReactivate)}
            disabled={isLogging}
          >
            <Text style={styles.floatingEmoji}>🔄</Text>
            <Text style={styles.floatingLabel}>Reaktiv.</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[styles.floatingButton, isExpanded && styles.floatingButtonActive]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.floatingButtonIcon}>{isExpanded ? '✕' : '+'}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Container Styles
  container: {
    gap: 10,
  },
  containerHorizontal: {
    flexDirection: 'row',
  },
  containerVertical: {
    flexDirection: 'column',
  },
  containerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Button Styles
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonHorizontal: {
    flex: 1,
    paddingVertical: 14,
    minHeight: 70,
  },
  buttonVertical: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  buttonGrid: {
    width: '48%',
    paddingVertical: 16,
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonEmoji: {
    fontSize: 20,
  },
  buttonLabel: {
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '500',
    marginTop: 4,
  },
  buttonLabelVertical: {
    marginTop: 0,
    fontSize: 14,
  },
  
  // Floating Button Styles
  floatingContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    alignItems: 'flex-end',
  },
  floatingMenu: {
    marginBottom: 12,
    gap: 8,
  },
  floatingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingEmoji: {
    fontSize: 16,
  },
  floatingLabel: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonActive: {
    backgroundColor: '#ef4444',
  },
  floatingButtonIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '300',
  },
});

export default QuickActivityButtons;

