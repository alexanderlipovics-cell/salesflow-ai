/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  QUICK TEMPLATES MODAL                                                     ║
 * ║  Schneller Zugriff auf Marketing Templates & Content                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Clipboard,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { knowledgeApi, KnowledgeItem } from '../../api/knowledge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// TYPES
// =============================================================================

interface QuickTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onSendToChief?: (content: string) => void;
}

interface CategoryConfig {
  id: string;
  title: string;
  icon: string;
  color: string;
  topics: string[];
}

// =============================================================================
// CATEGORIES CONFIG
// =============================================================================

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'pitches',
    title: 'Pitches & Messaging',
    icon: '🎯',
    color: '#3b82f6',
    topics: ['Brand Positioning', 'Core Messaging'],
  },
  {
    id: 'pricing',
    title: 'Pricing & Pakete',
    icon: '💰',
    color: '#10b981',
    topics: ['Pricing', 'Paketstruktur'],
  },
  {
    id: 'landing',
    title: 'Landing Page Copy',
    icon: '🖥️',
    color: '#8b5cf6',
    topics: ['Landingpage Copy', 'Hero Section'],
  },
  {
    id: 'social',
    title: 'Social Media',
    icon: '📱',
    color: '#f59e0b',
    topics: ['Social Media', 'LinkedIn Post Templates'],
  },
  {
    id: 'email',
    title: 'Email Sequences',
    icon: '📧',
    color: '#ef4444',
    topics: ['Email Sequences', 'Outbound Sequence'],
  },
  {
    id: 'investor',
    title: 'Investor Materials',
    icon: '📊',
    color: '#6366f1',
    topics: ['Investor Materials', 'Pitch Deck Narrative'],
  },
  {
    id: 'testimonials',
    title: 'Testimonials',
    icon: '⭐',
    color: '#eab308',
    topics: ['Testimonial Requests', 'Testimonial'],
  },
  {
    id: 'casestudy',
    title: 'Case Studies',
    icon: '📝',
    color: '#14b8a6',
    topics: ['Case Study Framework', 'Case Study'],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function QuickTemplatesModal({ 
  visible, 
  onClose, 
  onSendToChief 
}: QuickTemplatesModalProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  // Load items
  useEffect(() => {
    if (visible) {
      loadItems();
      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Reset
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load marketing items
      const data = await knowledgeApi.listItems({
        domain: 'company',
        limit: 50,
      });
      setItems(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Templates konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  // Filter items by category
  const getItemsForCategory = useCallback((category: CategoryConfig) => {
    return items.filter(item => 
      category.topics.some(topic => 
        item.topic?.toLowerCase().includes(topic.toLowerCase()) ||
        item.title?.toLowerCase().includes(topic.toLowerCase())
      )
    );
  }, [items]);

  // Copy to clipboard
  const handleCopy = async (item: KnowledgeItem) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(item.content);
      } else {
        Clipboard.setString(item.content);
      }
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Send to CHIEF
  const handleSendToChief = (item: KnowledgeItem) => {
    if (onSendToChief) {
      onSendToChief(`Erkläre mir das Template "${item.title}" und wie ich es am besten einsetze.`);
      onClose();
    }
  };

  // Close handler
  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setSelectedCategory(null);
      setExpandedItem(null);
    });
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  const renderCategoryCard = (category: CategoryConfig) => {
    const categoryItems = getItemsForCategory(category);
    const itemCount = categoryItems.length;
    
    if (itemCount === 0) return null;

    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryCard, { borderLeftColor: category.color }]}
        onPress={() => setSelectedCategory(category.id)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryCount}>{itemCount} Template{itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderTemplateItem = (item: KnowledgeItem) => {
    const isExpanded = expandedItem === item.id;
    const isCopied = copiedId === item.id;

    return (
      <View key={item.id} style={styles.templateItem}>
        <TouchableOpacity
          style={styles.templateHeader}
          onPress={() => setExpandedItem(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.templateTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#64748b" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.templateContent}>
            <ScrollView 
              style={styles.contentScroll}
              nestedScrollEnabled={true}
            >
              <Text style={styles.contentText}>{item.content}</Text>
            </ScrollView>

            <View style={styles.templateActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.copyButton, isCopied && styles.copiedButton]}
                onPress={() => handleCopy(item)}
              >
                <Ionicons 
                  name={isCopied ? "checkmark" : "copy-outline"} 
                  size={18} 
                  color={isCopied ? "#fff" : "#3b82f6"} 
                />
                <Text style={[styles.actionText, isCopied && styles.copiedText]}>
                  {isCopied ? 'Kopiert!' : 'Kopieren'}
                </Text>
              </TouchableOpacity>

              {onSendToChief && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.chiefButton]}
                  onPress={() => handleSendToChief(item)}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#8b5cf6" />
                  <Text style={[styles.actionText, { color: '#8b5cf6' }]}>
                    An CHIEF
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCategoryDetail = () => {
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return null;

    const categoryItems = getItemsForCategory(category);

    return (
      <View style={styles.categoryDetail}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCategory(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Zurück</Text>
        </TouchableOpacity>

        <View style={styles.detailHeader}>
          <Text style={styles.detailIcon}>{category.icon}</Text>
          <Text style={styles.detailTitle}>{category.title}</Text>
        </View>

        <ScrollView style={styles.templatesList}>
          {categoryItems.map(renderTemplateItem)}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerContent}>
              <Text style={styles.headerIcon}>📚</Text>
              <Text style={styles.headerTitle}>Quick Templates</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              Marketing Content & Templates zum Kopieren
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Lade Templates...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadItems}>
                  <Text style={styles.retryText}>Erneut versuchen</Text>
                </TouchableOpacity>
              </View>
            ) : selectedCategory ? (
              renderCategoryDetail()
            ) : (
              <ScrollView style={styles.categoriesList}>
                {CATEGORIES.map(renderCategoryCard)}
                
                {items.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyText}>Keine Templates verfügbar</Text>
                    <Text style={styles.emptySubtext}>
                      Marketing Intelligence muss zuerst importiert werden
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  categoriesList: {
    flex: 1,
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoryCount: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  categoryDetail: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  detailIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  templatesList: {
    flex: 1,
    padding: 16,
  },
  templateItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  templateContent: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  contentScroll: {
    maxHeight: 200,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  contentText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  templateActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyButton: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  copiedButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  chiefButton: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    color: '#3b82f6',
  },
  copiedText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default QuickTemplatesModal;

