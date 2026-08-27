import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Required', 'Please fill all fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/reset-password', {
        email,
        otp: otp.trim(),
        newPassword
      });

      setLoading(false);
      if (data.success) {
        Alert.alert('🎉 Success', 'Password reset successfully! Please login with your new password.', [
          { text: 'Login Now', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Reset Failed', err.response?.data?.message || 'Invalid or expired OTP code.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Enter the 6-digit OTP received on <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{email}</Text></Text>

          <Text style={styles.inputLabel}>6-Digit OTP</Text>
          <TextInput
            style={[styles.input, { letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
            placeholder="000000"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={styles.btn} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>Update Password & Login</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 14, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});