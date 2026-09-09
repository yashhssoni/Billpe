import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function ResetPasswordScreen({ route, navigation }) {
  const { t } = useContext(LanguageContext);
  const { email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t('required'), t('fillAllFieldsError'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('error'), t('passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwordsMismatch'));
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
        Alert.alert('🎉 ' + t('success'), t('passwordResetSuccess'), [
          { text: t('loginNow'), onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (err) {
      setLoading(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Invalid or expired OTP code.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t('setNewPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('setNewPasswordSubtitle')} <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{email}</Text></Text>

          <Text style={styles.inputLabel}>{t('otpLabel')}</Text>
          <TextInput
            style={[styles.input, { letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
            placeholder="000000"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />

          <Text style={styles.inputLabel}>{t('newPasswordLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('newPasswordPlaceholder')}
            placeholderTextColor="#64748b"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.inputLabel}>{t('confirmNewPasswordLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('confirmNewPasswordPlaceholder')}
            placeholderTextColor="#64748b"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={styles.btn} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('updatePasswordAndLoginBtn')}</Text>}
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