/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - REGISTER SCREEN                                                  ║
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

// Passwort-Stärke berechnen
const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  if (!password) {
    return { strength: 0, label: '', color: AURA_COLORS.text.muted };
  }

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  if (strength <= 2) {
    return { strength, label: 'Schwach', color: AURA_COLORS.neon.rose };
  } else if (strength === 3) {
    return { strength, label: 'Mittel', color: AURA_COLORS.neon.amber };
  } else {
    return { strength, label: 'Stark', color: AURA_COLORS.neon.green };
  }
};

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben');
      return;
    }

    if (!acceptedTerms) {
      setError('Bitte akzeptiere die AGB & Datenschutz');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: registerError } = await register(name, email, password);
      if (registerError) {
        setError(registerError.message || 'Registrierung fehlgeschlagen');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.rootContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Registrierung erfolgreich!</Text>
            <Text style={styles.successText}>
              Bitte prüfe deine E-Mail und bestätige dein Konto.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Zum Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

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
            <Text style={styles.subtitle}>Account erstellen</Text>
          </View>

          {/* Glass Form Card */}
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholderTextColor={AURA_COLORS.text.muted}
            />
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
              autoComplete="password-new"
              placeholderTextColor={AURA_COLORS.text.muted}
            />

            {/* Passwort-Stärke-Indikator */}
            {password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View
                    style={[
                      styles.passwordStrengthFill,
                      {
                        width: `${(passwordStrength.strength / 5) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Passwort bestätigen"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
              placeholderTextColor={AURA_COLORS.text.muted}
              onSubmitEditing={handleRegister}
            />

            {/* AGB Checkbox */}
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                Ich akzeptiere die{' '}
                <Text style={styles.checkboxLink}>AGB & Datenschutz</Text>
              </Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (!acceptedTerms || loading) && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading || !acceptedTerms}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Registrieren</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Bereits Account? <Text style={styles.linkBold}>Anmelden</Text>
              </Text>
            </Pressable>
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
    fontSize: 18,
    color: AURA_COLORS.text.primary,
    fontWeight: '600',
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
  passwordStrengthContainer: {
    marginTop: -8,
    marginBottom: 16,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: AURA_COLORS.glass.border,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AURA_COLORS.bg.secondary,
  },
  checkboxChecked: {
    backgroundColor: AURA_COLORS.neon.cyan,
    borderColor: AURA_COLORS.neon.cyan,
  },
  checkboxCheck: {
    color: AURA_COLORS.bg.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    color: AURA_COLORS.text.secondary,
    fontSize: 14,
  },
  checkboxLink: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
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
    opacity: 0.5,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 420,
    alignSelf: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: AURA_COLORS.text.primary,
  },
  successText: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
    marginBottom: 32,
    textAlign: 'center',
  },
});

