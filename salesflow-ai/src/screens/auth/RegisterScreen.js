import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) { setError('Bitte alle Felder ausfüllen'); return; }
    if (password !== confirmPassword) { setError('Passwörter stimmen nicht überein'); return; }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben'); return; }
    setLoading(true); setError('');
    const { error } = await signUp(email, password, { full_name: name });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Registrierung erfolgreich!</Text>
          <Text style={styles.successText}>Bitte prüfe deine E-Mail.</Text>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text style={styles.buttonText}>Zum Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>✦</Text>
          <Text style={styles.title}>Account erstellen</Text>
          <Text style={styles.subtitle}>Starte jetzt mit AURA OS</Text>
        </View>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Passwort" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Passwort bestätigen" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor="#94a3b8" onSubmitEditing={handleRegister} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={handleRegister} disabled={loading} accessibilityRole="button">
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Registrieren</Text>}
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Login')} accessibilityRole="link">
            <Text style={styles.linkText}>Bereits Account? <Text style={styles.linkBold}>Anmelden</Text></Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingVertical: 40 },
  header: { alignItems: 'center', paddingBottom: 30 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8 },
  form: { paddingHorizontal: 24 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#1e293b' },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, cursor: 'pointer' },
  buttonPressed: { backgroundColor: '#2563eb' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  linkButton: { marginTop: 24, alignItems: 'center', paddingBottom: 40, cursor: 'pointer' },
  linkText: { color: '#64748b', fontSize: 16 },
  linkBold: { color: '#3b82f6', fontWeight: '600' },
  error: { color: '#ef4444', marginBottom: 16, textAlign: 'center' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, maxWidth: 420, alignSelf: 'center' },
  successIcon: { fontSize: 64, marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  successText: { fontSize: 16, color: '#64748b', marginBottom: 32, textAlign: 'center' },
});