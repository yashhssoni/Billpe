import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function VerifyOtpScreen({ route, navigation }) {
  const { t } = useContext(LanguageContext);
  const { email, password } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert(t('error'), t('invalidOtpLength'));
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
        if (email) await AsyncStorage.setItem('billpe_saved_login_email', email.trim());
        if (password) await AsyncStorage.setItem('billpe_saved_login_password', password);

        Alert.alert(
          t('verificationSuccessTitle'),
          t('verificationSuccessMsg'),
          [
            {
              text: t('goToLogin'),
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
      Alert.alert(t('error'), err.response?.data?.message || 'Invalid or expired OTP.');
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await axiosInstance.post('/auth/send-register-otp', { email });
      setResending(false);
      Alert.alert(t('otpResentTitle'), t('otpResentMsg'));
    } catch (err) {
      setResending(false);
      Alert.alert(t('error'), 'Failed to resend OTP.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('emailVerificationTitle')}</Text>
        <Text style={styles.subtitle}>{t('enterOtpSubtitle')}</Text>
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
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('verifyAndProceedBtn')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          {resending ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <Text style={styles.resendText}>{t('didntReceiveOtp')} <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{t('resendOtp')}</Text></Text>
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