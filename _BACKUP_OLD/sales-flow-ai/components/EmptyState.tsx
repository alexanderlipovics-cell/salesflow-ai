import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as LucideIcons from 'lucide-react-native';

interface EmptyStateProps {
  icon: keyof typeof LucideIcons;
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction
}: EmptyStateProps) {
  const IconComponent = LucideIcons[icon] as any;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconComponent size={80} color="#D1D1D6" />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      <TouchableOpacity style={styles.button} onPress={onAction}>
        <Text style={styles.buttonText}>{actionText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

