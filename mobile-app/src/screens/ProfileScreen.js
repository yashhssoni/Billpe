import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, TextInput 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function ProfileScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/settings/profile');
      if (data.success) {
        setProfile(data.data);
        setOwnerName(data.data.ownerName || '');
        setEmail(data.data.email || '');
        setPhone(data.data.phone || '');
      }
    } catch (err) {
      Alert.alert(t('error'), 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!ownerName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    try {
      setUpdatingProfile(true);
      const { data } = await axiosInstance.put('/settings/profile', {
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim()
      });
      setUpdatingProfile(false);

      if (data.success) {
        Alert.alert(t('success'), data.message || t('profileUpdatedSuccess'));
        fetchProfile();
      }
    } catch (err) {
      setUpdatingProfile(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
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

    try {
      setUpdatingPassword(true);
      const { data } = await axiosInstance.post('/settings/change-password', {
        currentPassword,
        newPassword
      });
      setUpdatingPassword(false);

      if (data.success) {
        Alert.alert(t('success') + ' 🎉', data.message || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setUpdatingPassword(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update password.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('back')}</Text>
      </TouchableOpacity>

      <Text style={styles.mainTitle}>{t('storeOwnerProfileTitle')}</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>{t('storeDetailsSection')}</Text>
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>{t('lockedTag')}</Text>
          </View>
        </View>

        <Text style={styles.label}>{t('storeNameField')}</Text>
        <Text style={styles.valueHighlight}>{profile?.storeName || 'My Store'}</Text>

        <Text style={styles.label}>{t('storeIdPrefix')}</Text>
        <Text style={styles.valueText}>{profile?.storeId || 'N/A'}</Text>

        <Text style={styles.label}>{t('storeAddressField')}</Text>
        <Text style={styles.valueText}>{profile?.storeAddress || 'N/A'}</Text>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            {t('lockedStoreInfoBanner')}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.supportContactBtn} 
          onPress={() => navigation.navigate('SupportScreen')}
        >
          <Text style={styles.supportContactBtnText}>{t('contactSupportToEditBtn')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardHeader}>{t('ownerDetailsSection')}</Text>

        <Text style={styles.label}>{t('ownerNameField')}</Text>
        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>{t('registeredEmailField')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>{t('registeredMobileField')}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor="#64748b"
        />

        <TouchableOpacity 
          style={styles.updateProfileBtn} 
          onPress={handleUpdateProfile}
          disabled={updatingProfile}
        >
          {updatingProfile ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.updateProfileBtnText}>{t('saveProfileDetailsBtn')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardHeader}>{t('securityPasswordSection')}</Text>

        <Text style={styles.label}>{t('currentPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('currentPasswordPlaceholder')}
          placeholderTextColor="#64748b"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Text style={styles.label}>{t('newPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('newPasswordMinCharsPlaceholder')}
          placeholderTextColor="#64748b"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.label}>{t('confirmNewPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('confirmNewPasswordPlaceholder')}
          placeholderTextColor="#64748b"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity 
          style={styles.updatePasswordBtn} 
          onPress={handleChangePassword}
          disabled={updatingPassword}
        >
          {updatingPassword ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.updatePasswordBtnText}>{t('updatePasswordBtn')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#334155' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeader: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  lockedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  lockedText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },
  label: { color: '#94a3b8', fontSize: 12, marginTop: 10, fontWeight: '600' },
  valueText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  valueHighlight: { color: '#10b981', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  infoBanner: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#334155' },
  infoBannerText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },
  supportContactBtn: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: '#38bdf8', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  supportContactBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },
  input: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, fontSize: 14, marginTop: 6 },
  updateProfileBtn: { backgroundColor: '#38bdf8', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  updateProfileBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' },
  updatePasswordBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  updatePasswordBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' }
});