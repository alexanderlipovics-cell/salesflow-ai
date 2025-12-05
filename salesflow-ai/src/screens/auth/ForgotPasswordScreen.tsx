/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - FORGOT PASSWORD SCREEN                                           ║
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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { AuraLogo, AURA_COLORS, AURA_SHADOWS } from '../../components/aura';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendLink = async () => {
    if (!email) {
      setError('Bitte gib deine E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(resetError.message || 'Konnte E-Mail nicht senden');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
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
          </View>

          {/* Glass Form Card */}
          <View style={styles.formCard}>
            {success ? (
              // Erfolgs-Ansicht
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.title}>E-Mail gesendet!</Text>
                <Text style={styles.subtitle}>
                  Wir haben dir einen Link zum Zurücksetzen deines Passworts an{' '}
                  <Text style={styles.emailHighlight}>{email}</Text> gesendet.
                </Text>
                <Text style={styles.hint}>
                  Prüfe auch deinen Spam-Ordner, falls die E-Mail nicht ankommt.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.buttonText}>Zurück zum Login</Text>
                </Pressable>
              </View>
            ) : (
              // Eingabe-Ansicht
              <>
                <Text style={styles.icon}>🔐</Text>
                <Text style={styles.title}>Passwort vergessen?</Text>
                <Text style={styles.subtitle}>
                  Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="E-Mail-Adresse"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  placeholderTextColor={AURA_COLORS.text.muted}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSendLink}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Link senden</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.linkText}>Zurück zum Login</Text>
                </Pressable>
              </>
            )}
          </View>
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
  formCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AURA_COLORS.text.primary,
    marginBottom: 16,
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
  error: {
    color: AURA_COLORS.neon.rose,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: AURA_COLORS.neon.roseSubtle,
    padding: 12,
    borderRadius: 8,
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: AURA_COLORS.text.subtle,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emailHighlight: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
  },
});

