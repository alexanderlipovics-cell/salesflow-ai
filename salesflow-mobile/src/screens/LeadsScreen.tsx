import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

export default function LeadsScreen() {
  const leads = [
    { id: 1, name: 'Max Mustermann', status: 'Neu', company: 'Muster GmbH' },
    { id: 2, name: 'Anna Schmidt', status: 'Kontaktiert', company: 'Schmidt AG' },
    { id: 3, name: 'Peter Weber', status: 'Interessiert', company: 'Weber GmbH' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Neu':
        return COLORS.secondary;
      case 'Kontaktiert':
        return COLORS.warning;
      case 'Interessiert':
        return COLORS.success;
      default:
        return COLORS.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lead Management</Text>
      </View>
      <ScrollView style={styles.content}>
        {leads.map((lead) => (
          <TouchableOpacity key={lead.id} activeOpacity={0.8}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{lead.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(lead.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{lead.status}</Text>
                </View>
              </View>
              <Text style={styles.cardCompany}>{lead.company}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  cardCompany: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

