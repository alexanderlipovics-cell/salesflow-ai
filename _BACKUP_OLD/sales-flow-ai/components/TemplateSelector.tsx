// components/TemplateSelector.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { MessagingService } from '../services/messagingService';
import { MessageTemplate } from '../types/messaging';

interface Props {
  onSelect: (content: string) => void;
  onClose: () => void;
}

const categories = ['all', 'greeting', 'follow_up', 'objection', 'close'];

export const TemplateSelector: React.FC<Props> = ({ onSelect, onClose }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const loadTemplates = async () => {
    const category = selectedCategory === 'all' ? undefined : selectedCategory;
    const data = await MessagingService.getTemplates(category);
    setTemplates(data);
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.content.toLowerCase().includes(search.toLowerCase())
  );

  const renderTemplate = ({ item }: { item: MessageTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => onSelect(item.content)}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.templateContent} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.templateStats}>
        <Text style={styles.statText}>📊 {item.usage_count} uses</Text>
        {item.success_rate && (
          <Text style={styles.statText}>
            ✓ {Math.round(item.success_rate * 100)}% success
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Message Templates</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.categories}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredTemplates}
          renderItem={renderTemplate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  searchInput: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#FF5722',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: '600',
  },
  templateContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
});


