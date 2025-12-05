/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - LOGIN SCREEN                                                    ║
 * ║  HIGH-END DARK GLASSMORPHISM DESIGN                                        ║
 * ║  Mit "Passwort vergessen?" Funktion                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { AuraLogo, AURA_COLORS, AURA_SHADOWS } from '../../components/aura';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) { setError('Bitte alle Felder ausfüllen'); return; }
    setLoading(true); setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Fehler', 'Bitte gib deine E-Mail-Adresse ein');
      return;
    }

    setResetLoading(true);
    try {
      // Für Development: localhost, für Production: deine echte Domain
      const redirectUrl = __DEV__ 
        ? 'http://localhost:19006/reset-password'
        : 'https://aura-os.app/reset-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetSuccess(true);
    } catch (err) {
      Alert.alert('Fehler', err.message || 'Konnte E-Mail nicht senden');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  return (
    <View style={styles.rootContainer}>
      {/* Ambient Background Blobs */}
      <View style={styles.ambientBackground}>
        <View style={styles.cyanBlob} />
        <View style={styles.purpleBlob} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <AuraLogo size="lg" />
            </View>
            <Text style={styles.subtitle}>Autonomous Enterprise System</Text>
          </View>

          {/* Glass Form Card */}
          <View style={styles.formCard}>
            <TextInput 
              style={styles.input} 
              placeholder="Email" 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address" 
              autoCapitalize="none" 
              placeholderTextColor={AURA_COLORS.text.muted}
            />
            <TextInput 
              style={styles.input} 
              placeholder="Passwort" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry 
              placeholderTextColor={AURA_COLORS.text.muted}
              onSubmitEditing={handleLogin} 
            />
            
            {error ? <Text style={styles.error}>{error}</Text> : null}
            
            {/* Passwort vergessen Link */}
            <Pressable 
              style={styles.forgotPasswordButton}
              onPress={() => {
                setResetEmail(email); // Vorausfüllen mit eingegebener E-Mail
                setShowForgotPassword(true);
              }}
            >
              <Text style={styles.forgotPasswordText}>Passwort vergessen?</Text>
            </Pressable>
            
            <Pressable 
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Anmelden</Text>
              )}
            </Pressable>

            <Pressable 
              style={styles.linkButton} 
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkText}>
                Noch kein Account? <Text style={styles.linkBold}>Registrieren</Text>
              </Text>
            </Pressable>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            {[
              { icon: '🔒', text: 'Locked Block™ Sicherheit' },
              { icon: '🧠', text: 'KI-gestützte Vertriebsassistenz' },
              { icon: '⚡', text: 'Autopilot Automatisierung' },
            ].map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════════
          PASSWORT VERGESSEN MODAL
          ═══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="fade"
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <Pressable 
              style={styles.modalCloseButton}
              onPress={closeForgotPasswordModal}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>

            {resetSuccess ? (
              // Erfolgs-Ansicht
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.modalTitle}>E-Mail gesendet!</Text>
                <Text style={styles.modalSubtitle}>
                  Wir haben dir einen Link zum Zurücksetzen deines Passworts an{' '}
                  <Text style={styles.emailHighlight}>{resetEmail}</Text> gesendet.
                </Text>
                <Text style={styles.modalHint}>
                  Prüfe auch deinen Spam-Ordner.
                </Text>
                <Pressable 
                  style={[styles.button, { marginTop: 24 }]}
                  onPress={closeForgotPasswordModal}
                >
                  <Text style={styles.buttonText}>Zurück zum Login</Text>
                </Pressable>
              </View>
            ) : (
              // Eingabe-Ansicht
              <>
                <Text style={styles.modalIcon}>🔐</Text>
                <Text style={styles.modalTitle}>Passwort vergessen?</Text>
                <Text style={styles.modalSubtitle}>
                  Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="E-Mail-Adresse"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={AURA_COLORS.text.muted}
                  autoFocus
                />

                <Pressable 
                  style={({ pressed }) => [
                    styles.button, 
                    pressed && styles.buttonPressed,
                    resetLoading && styles.buttonDisabled
                  ]}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Link senden</Text>
                  )}
                </Pressable>

                <Pressable 
                  style={styles.modalCancelButton}
                  onPress={closeForgotPasswordModal}
                >
                  <Text style={styles.modalCancelText}>Abbrechen</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { 
    flex: 1, 
    backgroundColor: AURA_COLORS.bg.primary,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  cyanBlob: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  purpleBlob: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  container: { 
    flex: 1,
  },
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    minHeight: '100%',
  },
  content: { 
    width: '100%', 
    maxWidth: 420, 
    alignSelf: 'center', 
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  header: { 
    alignItems: 'center', 
    paddingBottom: 40,
  },
  logoContainer: { 
    backgroundColor: AURA_COLORS.glass.surface, 
    paddingVertical: 28, 
    paddingHorizontal: 40, 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 20,
    ...AURA_SHADOWS.neonCyan,
  },
  subtitle: { 
    fontSize: 14, 
    color: AURA_COLORS.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  input: { 
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1, 
    borderColor: AURA_COLORS.glass.border, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 16, 
    color: AURA_COLORS.text.primary,
  },
  button: { 
    backgroundColor: AURA_COLORS.neon.cyan, 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 8,
    ...AURA_SHADOWS.neonCyan,
  },
  buttonPressed: { 
    backgroundColor: '#06b6d4',
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { 
    color: AURA_COLORS.bg.primary, 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkButton: { 
    marginTop: 24, 
    alignItems: 'center',
  },
  linkText: { 
    color: AURA_COLORS.text.muted, 
    fontSize: 14,
  },
  linkBold: { 
    color: AURA_COLORS.neon.cyan, 
    fontWeight: '600',
  },
  error: { 
    color: AURA_COLORS.neon.rose, 
    marginBottom: 16, 
    textAlign: 'center',
    backgroundColor: AURA_COLORS.neon.roseSubtle,
    padding: 12,
    borderRadius: 8,
  },
  featuresContainer: {
    marginTop: 40,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: AURA_COLORS.glass.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    color: AURA_COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSWORT VERGESSEN STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: AURA_COLORS.neon.cyan,
    fontSize: 13,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: AURA_COLORS.text.muted,
    fontSize: 16,
  },
  modalIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: AURA_COLORS.bg.primary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AURA_COLORS.text.primary,
    marginBottom: 16,
  },
  modalCancelButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    color: AURA_COLORS.text.muted,
    fontSize: 14,
  },
  modalHint: {
    fontSize: 12,
    color: AURA_COLORS.text.subtle,
    textAlign: 'center',
    marginTop: 8,
  },

  // Success State
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emailHighlight: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
  },
});
