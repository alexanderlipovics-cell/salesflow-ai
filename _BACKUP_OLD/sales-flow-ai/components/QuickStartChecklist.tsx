import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: () => void;
}

interface QuickStartChecklistProps {
  navigation: any;
}

export default function QuickStartChecklist({ navigation }: QuickStartChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'add_lead',
      title: 'Füge deinen ersten Lead hinzu',
      description: 'Starte mit dem Aufbau deiner Pipeline',
      completed: false,
      action: () => navigation.navigate('LeadForm'),
    },
    {
      id: 'chat_ai',
      title: 'Chatte mit der KI',
      description: 'Probiere das intelligente Chat-Feature',
      completed: false,
      action: () => navigation.navigate('IntelligentChat'),
    },
    {
      id: 'create_squad',
      title: 'Erstelle ein Squad',
      description: 'Lade Teammitglieder ein',
      completed: false,
      action: () => navigation.navigate('SquadManagement'),
    },
    {
      id: 'connect_email',
      title: 'Verbinde deine E-Mail',
      description: 'Sync mit Gmail oder Outlook',
      completed: false,
      action: () => navigation.navigate('Email'),
    },
  ]);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const progress = await AsyncStorage.getItem('checklist_progress');
      if (progress) {
        const completed = JSON.parse(progress);
        setItems(prev => prev.map(item => ({
          ...item,
          completed: completed.includes(item.id),
        })));
      }
    } catch (error) {
      console.error('Failed to load checklist progress:', error);
    }
  };

  const markComplete = async (id: string) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, completed: true } : item
    );
    setItems(newItems);

    // Save progress
    const completed = newItems.filter(i => i.completed).map(i => i.id);
    await AsyncStorage.setItem('checklist_progress', JSON.stringify(completed));
  };

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = (completedCount / items.length) * 100;

  if (completedCount === items.length) {
    return null; // Hide when all complete
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Start</Text>
        <Text style={styles.progress}>
          {completedCount} / {items.length} erledigt
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      {items.map(item => (
        <View key={item.id} style={styles.item}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => markComplete(item.id)}
          >
            {item.completed ? (
              <CheckCircle size={24} color="#34C759" />
            ) : (
              <Circle size={24} color="#D1D1D6" />
            )}
          </TouchableOpacity>

          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, item.completed && styles.itemTitleCompleted]}>
              {item.title}
            </Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>

          {!item.completed && (
            <TouchableOpacity style={styles.actionButton} onPress={item.action}>
              <ArrowRight size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progress: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    padding: 8,
  },
});

