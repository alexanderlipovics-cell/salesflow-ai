/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - LOGIN SCREEN                                                    ║
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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { AuraLogo, AURA_COLORS, AURA_SHADOWS } from '../../components/aura';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        setError(loginError.message || 'Anmeldung fehlgeschlagen');
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
              autoComplete="email"
              placeholderTextColor={AURA_COLORS.text.muted}
            />
            <TextInput
              style={styles.input}
              placeholder="Passwort"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholderTextColor={AURA_COLORS.text.muted}
              onSubmitEditing={handleLogin}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Passwort vergessen Link */}
            <Pressable
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ForgotPassword')}
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

            {/* Social Login Buttons (optional) */}
            <View style={styles.socialContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={() => Alert.alert('Info', 'Social Login wird bald verfügbar sein')}
              >
                <Text style={styles.socialButtonText}>🔵 Mit Google anmelden</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={() => Alert.alert('Info', 'Social Login wird bald verfügbar sein')}
              >
                <Text style={styles.socialButtonText}>⚫ Mit Apple anmelden</Text>
              </Pressable>
            </View>

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
  socialContainer: {
    marginTop: 16,
    gap: 12,
  },
  socialButton: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  socialButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  socialButtonText: {
    color: AURA_COLORS.text.primary,
    fontSize: 14,
    fontWeight: '500',
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
});

