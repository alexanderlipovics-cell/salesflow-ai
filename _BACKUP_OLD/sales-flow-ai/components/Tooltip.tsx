import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

interface TooltipProps {
  visible: boolean;
  text: string;
  onDismiss: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ visible, text, onDismiss, position = 'bottom' }: TooltipProps) {
  if (!visible) return null;

  return (
    <View style={[styles.container, position === 'top' && styles.containerTop]}>
      {position === 'bottom' && <View style={styles.arrowTop} />}
      
      <View style={styles.tooltip}>
        <Text style={styles.text}>{text}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {position === 'top' && <View style={styles.arrowBottom} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    alignItems: 'center',
  },
  containerTop: {
    bottom: 0,
  },
  tooltip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
  arrowTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#007AFF',
    marginBottom: -1,
  },
  arrowBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#007AFF',
    marginTop: -1,
  },
});

