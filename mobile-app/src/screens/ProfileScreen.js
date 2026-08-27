import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, TextInput 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
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
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please fill all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and Confirm password do not match.');
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
        Alert.alert('Success 🎉', data.message || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setUpdatingPassword(false);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password.');
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
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.mainTitle}>Store & Owner Profile</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>Store Details</Text>
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>🔒 Locked</Text>
          </View>
        </View>

        <Text style={styles.label}>Store Name</Text>
        <Text style={styles.valueHighlight}>{profile?.storeName || 'My Store'}</Text>

        <Text style={styles.label}>Store ID</Text>
        <Text style={styles.valueText}>{profile?.storeId || 'N/A'}</Text>

        <Text style={styles.label}>Store Address</Text>
        <Text style={styles.valueText}>{profile?.storeAddress || 'N/A'}</Text>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
           ℹ️ To edit your Store Name, please contact our Help Desk / Support team.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.supportContactBtn} 
          onPress={() => navigation.navigate('SupportScreen')}
        >
          <Text style={styles.supportContactBtnText}>Contact Support to Edit Store</Text>
        </TouchableOpacity>
      </View>

      {/* Owner Information Card */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardHeader}>Owner Details</Text>

        <Text style={styles.label}>Owner Name</Text>
        <Text style={styles.valueText}>{profile?.ownerName || 'N/A'}</Text>

        <Text style={styles.label}>Registered Email</Text>
        <Text style={styles.valueText}>{profile?.email || 'N/A'}</Text>

        <Text style={styles.label}>Registered Mobile</Text>
        <Text style={styles.valueText}>{profile?.phone || 'N/A'}</Text>
      </View>

      {/* Security & Change Password Card */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardHeader}>🔐 Security & Password</Text>

        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter current password"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new password (min 6 chars)"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
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
            <Text style={styles.updatePasswordBtnText}>Update Password</Text>
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
  updatePasswordBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  updatePasswordBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' }
});