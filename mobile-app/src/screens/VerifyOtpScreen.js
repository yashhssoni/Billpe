import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

export default function VerifyOtpScreen({ route, navigation }) {
  const { email, password } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Error', 'Please enter the valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/verify-register-otp', {
        email,
        otp: otp.trim()
      });

      setLoading(false);
      if (data.success) {
        // Credentials ko permanently save karein (taaki logout ke baad bhi auto-fill kaam kare)
        if (email) await AsyncStorage.setItem('billpe_saved_login_email', email.trim());
        if (password) await AsyncStorage.setItem('billpe_saved_login_password', password);

        Alert.alert(
          '🎉 Verification Successful',
          'Your store account is verified. Please sign in to access your dashboard.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            }
          ]
        );
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid or expired OTP.');
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await axiosInstance.post('/auth/send-register-otp', { email });
      setResending(false);
      Alert.alert('OTP Resent', 'A new verification code has been sent to your email.');
    } catch (err) {
      setResending(false);
      Alert.alert('Error', 'Failed to resend OTP.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Email Verification</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP code sent to:</Text>
        <Text style={styles.emailHighlight}>{email}</Text>

        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />

        <TouchableOpacity onPress={handleVerify} disabled={loading} style={styles.btn} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>Verify & Proceed to Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          {resending ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <Text style={styles.resendText}>Didn't receive code? <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>Resend OTP</Text></Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  emailHighlight: { fontSize: 14, color: '#10b981', fontWeight: 'bold', marginVertical: 8 },
  otpInput: { backgroundColor: '#0f172a', color: '#fff', width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', textAlign: 'center', fontSize: 26, letterSpacing: 8, marginVertical: 16 },
  btn: { backgroundColor: '#10b981', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  resendBtn: { marginTop: 18 },
  resendText: { color: '#94a3b8', fontSize: 13 }
});