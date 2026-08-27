import React, { useState, useCallback, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function AddEmployeeScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmployees = async () => {
    try {
      const { data } = await axiosInstance.get('/auth/employees');
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.log('Error fetching employees:', err.response?.data || err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  const handleAddEmployee = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/add-employee', {
        name,
        email: email.trim().toLowerCase(),
        password,
        phone
      });
      setLoading(false);
      if (data.success) {
        Alert.alert(t('success'), t('empCreatedSuccess'));
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        fetchEmployees();
      }
    } catch (err) {
      setLoading(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to add employee.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Text style={styles.backText}>{t('backToDashboard')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('storeStaffTitle')}</Text>
      <Text style={styles.subtitle}>{t('manageStaffSubtitle')}</Text>

      <View style={styles.card}>
        <TextInput 
          style={styles.input} 
          placeholder={t('empNamePlaceholder')} 
          placeholderTextColor="#64748b" 
          value={name} 
          onChangeText={setName} 
        />
        <TextInput 
          style={styles.input} 
          placeholder={t('empEmailPlaceholder')} 
          placeholderTextColor="#64748b" 
          autoCapitalize="none" 
          keyboardType="email-address" 
          value={email} 
          onChangeText={setEmail} 
        />
        <TextInput 
          style={styles.input} 
          placeholder={t('empPhonePlaceholder')} 
          placeholderTextColor="#64748b" 
          keyboardType="phone-pad" 
          value={phone} 
          onChangeText={setPhone} 
        />
        <TextInput 
          style={styles.input} 
          placeholder={t('empPasswordPlaceholder')} 
          placeholderTextColor="#64748b" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
        />

        <TouchableOpacity onPress={handleAddEmployee} disabled={loading} style={styles.btn}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('createEmpAccountBtn')}</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.listHeader}>{t('registeredEmployeesHeader')} ({employees.length})</Text>
      
      <FlatList
        data={employees}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEmployees(); }} tintColor="#10b981" />
        }
        renderItem={({ item }) => (
          <View style={styles.empCard}>
            <View>
              <Text style={styles.empName}>{item.name || 'Unnamed Employee'}</Text>
              <Text style={styles.empEmail}>{item.email} {item.phone ? `• ${item.phone}` : ''}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noEmployeesYet')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 12, fontSize: 14 },
  btn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  listHeader: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
  empCard: { backgroundColor: '#1e293b', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  empName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  empEmail: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 }
});