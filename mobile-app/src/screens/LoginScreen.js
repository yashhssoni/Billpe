import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Error', 'Please enter Email/Phone and Password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);
    if (!result.success) {
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

          <Text style={styles.inputLabel}>Email or Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543210 or user@gmail.com"
            placeholderTextColor="#64748b"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
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
            autoComplete="password"
            textContentType="password"
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
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8' },
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