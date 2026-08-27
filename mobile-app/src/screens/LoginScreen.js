import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccount, setSavedAccount] = useState(null);
  const { login } = useContext(AuthContext);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('billpe_saved_login_email');
      const savedPass = await AsyncStorage.getItem('billpe_saved_login_password');

      if (savedEmail && savedPass) {
        setSavedAccount({ email: savedEmail, pass: savedPass });
        setIdentifier(savedEmail);
        setPassword(savedPass);
      }
    } catch (e) {
      console.log('Error reading saved credentials:', e);
    }
  };

  const handleApplyAutofill = () => {
    if (savedAccount) {
      setIdentifier(savedAccount.email);
      setPassword(savedAccount.pass);
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Error', 'Please enter Email/Phone and Password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);

    if (result.success) {
      await AsyncStorage.setItem('billpe_saved_login_email', identifier.trim());
      await AsyncStorage.setItem('billpe_saved_login_password', password);
    } else {
      Alert.alert('Login Failed', result.message || 'Invalid credentials.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to BillPe</Text>
            <Text style={styles.subtitle}>Simple & Smart Billing System</Text>
          </View>

          {/* Persistent Auto-fill Action Box */}
          {savedAccount && (
            <TouchableOpacity style={styles.autofillBox} onPress={handleApplyAutofill} activeOpacity={0.8}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.autofillHeading}>⚡ Auto-fill Saved Account</Text>
                <Text style={styles.autofillEmail} numberOfLines={1}>{savedAccount.email}</Text>
              </View>
              <View style={styles.autofillAction}>
                <Text style={styles.autofillActionText}>Fill</Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>Email or Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543210 or user@gmail.com"
            placeholderTextColor="#64748b"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Password</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.btn} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have a store account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8' },

  autofillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  autofillHeading: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  autofillEmail: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginTop: 2 },
  autofillAction: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  autofillActionText: { color: '#0f172a', fontSize: 12, fontWeight: 'bold' },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase' },
  forgotText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 14, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#94a3b8', fontSize: 14 },
  registerText: { color: '#10b981', fontWeight: 'bold', fontSize: 14 }
});