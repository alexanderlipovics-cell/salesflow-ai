/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - PROFILE SCREEN                                                   ║
 * ║  HIGH-END DARK GLASSMORPHISM DESIGN                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// Image Picker - optional, falls nicht installiert
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker nicht installiert');
}
import { useAuth } from '../../context/AuthContext';
import { AuraLogo, AURA_COLORS, AURA_SHADOWS } from '../../components/aura';
import { supabase } from '../../services/supabase';

const MLM_COMPANIES = [
  { value: 'zinzino', label: 'Zinzino' },
  { value: 'herbalife', label: 'Herbalife' },
  { value: 'doterra', label: 'doTERRA' },
  { value: 'pm-international', label: 'PM-International' },
  { value: 'other', label: 'Andere' },
];

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, profile, updateProfile, logout, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name || profile?.first_name || user?.user_metadata?.name || '');
  const [mlmCompany, setMlmCompany] = useState(profile?.mlm_company || '');
  const [language, setLanguage] = useState(profile?.language || 'de');
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled ?? true);
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMlmDropdown, setShowMlmDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Avatar Upload
  const handleAvatarUpload = async () => {
    if (!ImagePicker) {
      Alert.alert('Info', 'Avatar-Upload wird noch implementiert.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const imageUri = result.assets[0].uri;

        // Upload to Supabase Storage
        const fileExt = imageUri.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Convert to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = data.publicUrl;

        setAvatarUri(publicUrl);
        await updateProfile({ avatar_url: publicUrl });
        setUploading(false);
        Alert.alert('Erfolg', 'Avatar wurde erfolgreich hochgeladen.');
      }
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Fehler', error.message || 'Avatar konnte nicht hochgeladen werden.');
    }
  };

  // Save Profile
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: name,
        first_name: name.split(' ')[0],
        mlm_company: mlmCompany,
        language,
        notifications_enabled: notificationsEnabled,
        avatar_url: avatarUri,
      });

      if (error) {
        Alert.alert('Fehler', error.message || 'Profil konnte nicht gespeichert werden.');
      } else {
        Alert.alert('Erfolg', 'Profil wurde erfolgreich aktualisiert.');
        await refreshProfile();
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setSaving(false);
    }
  };

  // Logout
  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Delete Account
  const handleDeleteAccount = () => {
    Alert.alert(
      'Account löschen',
      'Möchtest du deinen Account wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement account deletion
              Alert.alert('Info', 'Account-Löschung wird noch implementiert.');
            } catch (error: any) {
              Alert.alert('Fehler', error.message || 'Account konnte nicht gelöscht werden.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.rootContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <AuraLogo size="md" />
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.avatarButtonPressed,
            ]}
            onPress={handleAvatarUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={AURA_COLORS.neon.cyan} />
            ) : (
              <Text style={styles.avatarButtonText}>Avatar ändern</Text>
            )}
          </Pressable>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Dein Name"
              placeholderTextColor={AURA_COLORS.text.muted}
            />
          </View>

          {/* Email (readonly) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputReadonly]}
              value={user?.email || ''}
              editable={false}
              placeholderTextColor={AURA_COLORS.text.muted}
            />
          </View>

          {/* MLM Unternehmen */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MLM Unternehmen</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowMlmDropdown(!showMlmDropdown)}
            >
              <Text style={styles.dropdownText}>
                {MLM_COMPANIES.find((c) => c.value === mlmCompany)?.label || 'Auswählen...'}
              </Text>
              <Text style={styles.dropdownArrow}>{showMlmDropdown ? '▲' : '▼'}</Text>
            </Pressable>
            {showMlmDropdown && (
              <View style={styles.dropdownMenu}>
                {MLM_COMPANIES.map((company) => (
                  <Pressable
                    key={company.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setMlmCompany(company.value);
                      setShowMlmDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        mlmCompany === company.value && styles.dropdownItemTextActive,
                      ]}
                    >
                      {company.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Sprache */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sprache</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <Text style={styles.dropdownText}>
                {LANGUAGES.find((l) => l.value === language)?.label || 'Deutsch'}
              </Text>
              <Text style={styles.dropdownArrow}>{showLanguageDropdown ? '▲' : '▼'}</Text>
            </Pressable>
            {showLanguageDropdown && (
              <View style={styles.dropdownMenu}>
                {LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setLanguage(lang.value);
                      setShowLanguageDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        language === lang.value && styles.dropdownItemTextActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Benachrichtigungen */}
          <View style={styles.inputGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Benachrichtigungen</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: AURA_COLORS.bg.secondary,
                  true: AURA_COLORS.neon.cyan,
                }}
                thumbColor={AURA_COLORS.bg.primary}
              />
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Speichern</Text>
            )}
          </Pressable>
        </View>

        {/* Actions Card */}
        <View style={styles.actionsCard}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => navigation.navigate('Pricing')}
          >
            <Text style={styles.actionButtonText}>💳 Abo verwalten</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={handleLogout}
          >
            <Text style={styles.actionButtonText}>🚪 Ausloggen</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonDanger,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
              🗑️ Account löschen
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: AURA_COLORS.neon.cyan,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AURA_COLORS.neon.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: AURA_COLORS.bg.primary,
  },
  avatarButton: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...AURA_SHADOWS.glass,
  },
  avatarButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  avatarButtonText: {
    color: AURA_COLORS.neon.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 24,
    ...AURA_SHADOWS.glass,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AURA_COLORS.text.primary,
  },
  inputReadonly: {
    opacity: 0.6,
  },
  dropdown: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: AURA_COLORS.text.primary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  dropdownMenu: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: AURA_COLORS.text.primary,
  },
  dropdownItemTextActive: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: AURA_COLORS.neon.cyan,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    ...AURA_SHADOWS.neonCyan,
  },
  saveButtonPressed: {
    backgroundColor: '#06b6d4',
    transform: [{ scale: 0.98 }],
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: AURA_COLORS.bg.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionsCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  actionButton: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonDanger: {
    borderColor: AURA_COLORS.neon.rose,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: AURA_COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextDanger: {
    color: AURA_COLORS.neon.rose,
  },
});

