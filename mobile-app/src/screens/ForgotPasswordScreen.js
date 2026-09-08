import React, { useState, useContext, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet, BackHandler 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import BackButton from '../components/BackButton';
import ScreenWrapper from '../components/ScreenWrapper';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [navigation])
  );

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScreenWrapper scrollable={true}>
        <BackButton onPress={() => navigation.goBack()} title={t('backToLogin')} />

        <View style={styles.card}>
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
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 16 },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 16, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});