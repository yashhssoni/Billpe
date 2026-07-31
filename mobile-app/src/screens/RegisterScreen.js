import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axiosInstance from '../api/axiosInstance';

GoogleSignin.configure({
  webClientId: '24765415155-16ucb2jnk6v6pc66qovkj9kbvv52.apps.googleusercontent.com', 
});

export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState('admin');
  const [form, setForm] = useState({
    storeName: '', ownerName: '', phone: '', email: '', password: '', address: '', gstin: '', storeId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleEmailFieldPress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      console.log("FULL GOOGLE SIGNIN OBJECT:", JSON.stringify(response, null, 2));

      const user = response?.data?.user || response?.user || response?.data || response;
      const selectedEmail = user?.email;
      const selectedName = user?.name;

      console.log("EXTRACTED EMAIL:", selectedEmail);
      console.log("EXTRACTED NAME:", selectedName);

      if (selectedEmail) {
        setForm(prevForm => ({
          ...prevForm,
          email: selectedEmail,
          ownerName: prevForm.ownerName ? prevForm.ownerName : (selectedName || '')
        }));
      } else {
        Alert.alert("Notice", "Google account selected, but email was not found in response.");
      }
    } catch (error) {
      console.log("Google Sign-In Detailed Error:", JSON.stringify(error, null, 2));
      Alert.alert("Google Sign-In Error", error.message || "Failed to sign in with Google.");
    }
  };

  const handleRegister = async () => {
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
      Alert.alert('Error', 'Please fill all required fields and select a valid Google email.');
      return;
    }

    if (role === 'admin' && (!payload.storeName || !payload.address)) {
      Alert.alert('Error', 'Store Name and Address are required for Admin.');
      return;
    }

    if (role === 'employee' && !payload.storeId) {
      Alert.alert('Error', 'Please enter the Store ID provided by your Admin.');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/register', payload);
      setLoading(false);
      Alert.alert('Success', 'Registered successfully! Please log in.');
      navigation.navigate('Login');
    } catch (error) {
      setLoading(false);
      Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Select your role to register on BillPe</Text>

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, role === 'admin' && styles.activeTab]} 
              onPress={() => setRole('admin')}
            >
              <Text style={[styles.tabText, role === 'admin' && styles.activeTabText]}>Store Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, role === 'employee' && styles.activeTab]} 
              onPress={() => setRole('employee')}
            >
              <Text style={[styles.tabText, role === 'employee' && styles.activeTabText]}>Employee</Text>
            </TouchableOpacity>
          </View>

          <TextInput 
            style={styles.input} 
            placeholder={role === 'admin' ? "Owner Name" : "Employee Name"}
            placeholderTextColor="#64748b" 
            value={form.ownerName}
            onChangeText={(val) => setForm({ ...form, ownerName: val })} 
          />

          {role === 'admin' && (
            <>
              <TextInput 
                style={styles.input} 
                placeholder="Store Name" 
                placeholderTextColor="#64748b" 
                value={form.storeName}
                onChangeText={(val) => setForm({ ...form, storeName: val })} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Store Address" 
                placeholderTextColor="#64748b" 
                value={form.address}
                onChangeText={(val) => setForm({ ...form, address: val })} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="GSTIN (Optional)" 
                placeholderTextColor="#64748b" 
                value={form.gstin}
                onChangeText={(val) => setForm({ ...form, gstin: val })} 
              />
            </>
          )}

          {role === 'employee' && (
            <TextInput 
              style={styles.input} 
              placeholder="Store ID (Given by Admin)" 
              placeholderTextColor="#64748b" 
              value={form.storeId}
              onChangeText={(val) => setForm({ ...form, storeId: val })} 
            />
          )}

          <TextInput 
            style={styles.input} 
            placeholder="Phone Number" 
            placeholderTextColor="#64748b" 
            keyboardType="phone-pad" 
            value={form.phone}
            onChangeText={(val) => setForm({ ...form, phone: val })} 
          />

          {/* EMAIL FIELD: Clickable Google Picker Trigger */}
          <TouchableOpacity activeOpacity={0.8} onPress={handleEmailFieldPress}>
            <View pointerEvents="none">
              <TextInput 
                style={styles.input} 
                placeholder={form.email ? form.email : "Tap to select Google Email 📧"} 
                placeholderTextColor="#64748b" 
                value={form.email}
                editable={false}
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </TouchableOpacity>

          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            placeholderTextColor="#64748b" 
            secureTextEntry 
            value={form.password}
            onChangeText={(val) => setForm({ ...form, password: val })} 
            autoComplete="password-new"
            textContentType="newPassword"
            importantForAutofill="yes"
          />

          <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.btn}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>Register {role === 'admin' ? 'Store' : 'Employee'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkHighlight}>Login</Text></Text>
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
  linkHighlight: { color: '#10b981', fontWeight: 'bold' }
});