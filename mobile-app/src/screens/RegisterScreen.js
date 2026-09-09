import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

GoogleSignin.configure({
  webClientId: '1088550340494-3jopngg56fcc6e8b6r2mmm1ov88832a5.apps.googleusercontent.com',
  offlineAccess: false,
});

export default function RegisterScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [role, setRole] = useState('admin');
  const [form, setForm] = useState({
    storeName: '', ownerName: '', phone: '', email: '', password: '', address: '', gstin: '', storeId: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchingGoogleUser, setFetchingGoogleUser] = useState(false);

  const handleGoogleSignIn = async () => {
    setFetchingGoogleUser(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'success') {
        const { user } = response.data;
        setForm((prev) => ({
          ...prev,
          email: user.email,
          ownerName: prev.ownerName || user.name || '',
        }));
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(t('error'), 'Google Play Services not available on this device.');
      } else {
        Alert.alert(t('error'), 'Google Sign-In Failed. Please try again.');
      }
    } finally {
      setFetchingGoogleUser(false);
    }
  };

  const handleSendOTP = async () => {
    const payload = {
      ...form,
      role,
      storeName: form.storeName.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
    };

    if (!payload.email || !payload.password || !payload.phone || !payload.ownerName) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    if (role === 'admin' && (!payload.storeName || !payload.address)) {
      Alert.alert(t('error'), t('adminStoreAddressRequired'));
      return;
    }

    if (role === 'employee' && !payload.storeId) {
      Alert.alert(t('error'), t('empStoreIdRequired'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/send-register-otp', payload);
      setLoading(false);

      if (data.success) {
        Alert.alert(t('otpSentAlertTitle'), t('otpSentAlertMsg'));
        navigation.navigate('VerifyOtpScreen', { email: payload.email, password: payload.password });
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(t('error'), error.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t('createAccount')}</Text>
          <Text style={styles.subtitle}>{t('registerSubtitle')}</Text>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, role === 'admin' && styles.activeTab]}
              onPress={() => setRole('admin')}
            >
              <Text style={[styles.tabText, role === 'admin' && styles.activeTabText]}>{t('roleAdmin')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, role === 'employee' && styles.activeTab]}
              onPress={() => setRole('employee')}
            >
              <Text style={[styles.tabText, role === 'employee' && styles.activeTabText]}>{t('roleEmployee')}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder={role === 'admin' ? t('ownerNameAdmin') : t('ownerNameEmp')}
            placeholderTextColor="#64748b"
            value={form.ownerName}
            onChangeText={(val) => setForm({ ...form, ownerName: val })}
            autoComplete="name"
          />

          {role === 'admin' && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t('storeNameReq')}
                placeholderTextColor="#64748b"
                value={form.storeName}
                onChangeText={(val) => setForm({ ...form, storeName: val })}
              />
              <TextInput
                style={styles.input}
                placeholder={t('storeAddressReq')}
                placeholderTextColor="#64748b"
                value={form.address}
                onChangeText={(val) => setForm({ ...form, address: val })}
              />
              <TextInput
                style={styles.input}
                placeholder={t('gstinOptional')}
                placeholderTextColor="#64748b"
                value={form.gstin}
                onChangeText={(val) => setForm({ ...form, gstin: val })}
              />
            </>
          )}

          {role === 'employee' && (
            <TextInput
              style={styles.input}
              placeholder={t('storeIdReqEmp')}
              placeholderTextColor="#64748b"
              value={form.storeId}
              onChangeText={(val) => setForm({ ...form, storeId: val })}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder={t('phoneNumberReq')}
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(val) => setForm({ ...form, phone: val })}
            autoComplete="tel"
          />

          <TextInput
            style={styles.input}
            placeholder={t('emailAddressReq')}
            placeholderTextColor="#64748b"
            value={form.email}
            onChangeText={(val) => setForm({ ...form, email: val })}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={fetchingGoogleUser}
          >
            {fetchingGoogleUser ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.googleBtnText}>{t('googleFillEmail')}</Text>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={t('passwordReq')}
            placeholderTextColor="#64748b"
            secureTextEntry
            value={form.password}
            onChangeText={(val) => setForm({ ...form, password: val })}
            autoComplete="password-new"
            textContentType="newPassword"
          />

          <TouchableOpacity onPress={handleSendOTP} disabled={loading} style={styles.btn}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('verifyAndRegisterBtn')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
            <Text style={styles.linkText}>{t('alreadyHaveAccount')} <Text style={styles.linkHighlight}>{t('loginHighlight')}</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 4, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: '#10b981' },
  tabText: { fontWeight: 'bold', color: '#94a3b8' },
  activeTabText: { color: '#0f172a' },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  linkContainer: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#94a3b8', fontSize: 14 },
  linkHighlight: { color: '#10b981', fontWeight: 'bold' },
  googleBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  googleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});