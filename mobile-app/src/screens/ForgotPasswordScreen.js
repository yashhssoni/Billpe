import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert(t('required'), t('emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/forgot-password', { email: email.trim() });
      setLoading(false);

      if (data.success) {
        Alert.alert(t('otpSentAlertTitle'), t('resetPasswordCodeSent'));
        navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
      }
    } catch (err) {
      setLoading(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Unable to send reset code.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('backToLogin')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>
        <Text style={styles.subtitle}>{t('forgotPasswordSubtitle')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('enterRegisteredEmail')}
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity onPress={handleSendOTP} disabled={loading} style={styles.btn} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('sendResetOtpBtn')}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#0f172a', borderRadius: 8, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 16 },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 16, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});