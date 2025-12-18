/**
 * ProductCard Component
 * Zeigt ein Produkt aus dem Company Katalog
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

interface Product {
  id: string;
  name: string;
  slug: string;
  category?: string;
  tagline?: string;
  description_short?: string;
  description_full?: string;
  key_benefits?: string[];
  price_hint?: string;
  how_to_explain?: string;
  common_objections?: string[];
}

interface ProductCardProps {
  product: Product;
  onCopy?: (content: string) => void;
  compact?: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  supplements: { icon: '💊', label: 'Supplements', color: COLORS.success },
  nutrition: { icon: '🥗', label: 'Ernährung', color: COLORS.success },
  skincare: { icon: '✨', label: 'Hautpflege', color: '#ec4899' },
  sports: { icon: '🏋️', label: 'Sport', color: COLORS.warning },
  energy: { icon: '⚡', label: 'Energie', color: COLORS.accent },
  recovery: { icon: '💤', label: 'Regeneration', color: COLORS.secondary },
  tests: { icon: '🧪', label: 'Tests', color: COLORS.info },
  bundles: { icon: '📦', label: 'Pakete', color: COLORS.primary },
  essential_oils: { icon: '🌿', label: 'Ätherische Öle', color: '#22c55e' },
  blends: { icon: '🌸', label: 'Mischungen', color: '#a855f7' },
  parfum: { icon: '💐', label: 'Parfum', color: '#f472b6' },
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onCopy,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showObjections, setShowObjections] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[product.category || ''] || {
    icon: '📦',
    label: product.category || 'Produkt',
    color: COLORS.textSecondary,
  };

  const handleCopy = (content: string) => {
    Clipboard.setString(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(content);
  };

  const buildProductPitch = () => {
    let pitch = `**${product.name}**\n`;
    if (product.tagline) pitch += `${product.tagline}\n\n`;
    if (product.description_short) pitch += `${product.description_short}\n\n`;
    if (product.key_benefits && product.key_benefits.length > 0) {
      pitch += 'Vorteile:\n';
      product.key_benefits.forEach(b => {
        pitch += `• ${b}\n`;
      });
    }
    if (product.price_hint) pitch += `\n💰 ${product.price_hint}`;
    return pitch;
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactIcon}>{categoryConfig.icon}</Text>
          <View style={styles.compactInfo}>
            <Text style={styles.compactName}>{product.name}</Text>
            {product.tagline && (
              <Text style={styles.compactTagline} numberOfLines={1}>
                {product.tagline}
              </Text>
            )}
          </View>
          {product.price_hint && (
            <Text style={styles.compactPrice}>{product.price_hint}</Text>
          )}
        </View>
        
        {expanded && (
          <View style={styles.compactExpanded}>
            {product.description_short && (
              <Text style={styles.compactDescription}>
                {product.description_short}
              </Text>
            )}
            <TouchableOpacity
              style={styles.compactCopyButton}
              onPress={() => handleCopy(buildProductPitch())}
            >
              <Text style={styles.compactCopyText}>
                {copied ? '✅ Kopiert!' : '📋 Pitch kopieren'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
          <Text style={styles.categoryIcon}>{categoryConfig.icon}</Text>
          <Text style={[styles.categoryLabel, { color: categoryConfig.color }]}>
            {categoryConfig.label}
          </Text>
        </View>
        {product.price_hint && (
          <Text style={styles.priceHint}>{product.price_hint}</Text>
        )}
      </View>

      {/* Product Name */}
      <Text style={styles.productName}>{product.name}</Text>
      
      {/* Tagline */}
      {product.tagline && (
        <Text style={styles.tagline}>{product.tagline}</Text>
      )}

      {/* Short Description */}
      {product.description_short && (
        <Text style={styles.description}>{product.description_short}</Text>
      )}

      {/* Key Benefits */}
      {product.key_benefits && product.key_benefits.length > 0 && (
        <View style={styles.benefitsContainer}>
          <Text style={styles.sectionTitle}>✨ Vorteile:</Text>
          {product.key_benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      )}

      {/* How to Explain */}
      {product.how_to_explain && (
        <View style={styles.explainContainer}>
          <Text style={styles.sectionTitle}>💡 So erklären:</Text>
          <Text style={styles.explainText}>{product.how_to_explain}</Text>
        </View>
      )}

      {/* Common Objections */}
      {product.common_objections && product.common_objections.length > 0 && (
        <View style={styles.objectionsContainer}>
          <TouchableOpacity
            style={styles.objectionsHeader}
            onPress={() => setShowObjections(!showObjections)}
          >
            <Text style={styles.sectionTitle}>
              🛡️ Typische Einwände ({product.common_objections.length})
            </Text>
            <Text style={styles.expandIcon}>
              {showObjections ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          
          {showObjections && (
            <View style={styles.objectionsList}>
              {product.common_objections.map((objection, index) => (
                <View key={index} style={styles.objectionItem}>
                  <Text style={styles.objectionText}>"{objection}"</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.copyButton]}
          onPress={() => handleCopy(buildProductPitch())}
        >
          <Text style={styles.copyButtonText}>
            {copied ? '✅ Kopiert!' : '📋 Pitch kopieren'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  compactCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  compactIcon: {
    fontSize: 24,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
  },
  compactTagline: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  compactPrice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
  compactExpanded: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  compactDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  compactCopyButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  compactCopyText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceHint: {
    ...TYPOGRAPHY.label,
    color: COLORS.success,
  },
  productName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  benefitsContainer: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  benefitBullet: {
    color: COLORS.success,
    fontSize: 16,
    marginRight: SPACING.sm,
    fontWeight: 'bold',
  },
  benefitText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    flex: 1,
  },
  explainContainer: {
    backgroundColor: COLORS.infoBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  explainText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  objectionsContainer: {
    marginBottom: SPACING.md,
  },
  objectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  objectionsList: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  objectionItem: {
    backgroundColor: COLORS.warningBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  objectionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.warning,
    fontStyle: 'italic',
  },
  actions: {
    marginTop: SPACING.sm,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: COLORS.primary,
  },
  copyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
});

export default ProductCard;

