import React, { useState, useCallback, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, StyleSheet, RefreshControl, Modal } from 'react-native';
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

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [updating, setUpdating] = useState(false);

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

  const handleOpenEdit = (emp) => {
    setEditingEmp({
      id: emp._id,
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || ''
    });
    setEditModalVisible(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmp.name.trim() || !editingEmp.email.trim() || !editingEmp.phone.trim()) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    setUpdating(true);
    try {
      const { data } = await axiosInstance.put(`/auth/employees/${editingEmp.id}`, {
        name: editingEmp.name.trim(),
        email: editingEmp.email.trim().toLowerCase(),
        phone: editingEmp.phone.trim()
      });
      setUpdating(false);

      if (data.success) {
        Alert.alert(t('success'), 'Employee updated successfully!');
        setEditModalVisible(false);
        fetchEmployees();
      }
    } catch (err) {
      setUpdating(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update employee.');
    }
  };

  const handleDeleteEmployee = (id, empName) => {
    Alert.alert(
      t('confirmDeleteTitle') || 'Confirm Delete',
      `Are you sure you want to remove ${empName}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await axiosInstance.delete(`/auth/employees/${id}`);
              if (data.success) {
                setEmployees(employees.filter(e => e._id !== id));
                Alert.alert(t('success'), 'Employee removed successfully.');
              }
            } catch (err) {
              Alert.alert(t('error'), err.response?.data?.message || 'Failed to delete employee.');
            }
          }
        }
      ]
    );
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
            <View style={{ flex: 1 }}>
              <Text style={styles.empName}>{item.name || 'Unnamed Employee'}</Text>
              <Text style={styles.empEmail}>{item.email}</Text>
              {item.phone ? <Text style={styles.empPhone}>📞 {item.phone}</Text> : null}
            </View>

            <View style={styles.actionBtns}>
              <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.editBtn}>
                <Text style={styles.editText}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteEmployee(item._id, item.name)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>{t('del')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noEmployeesYet')}</Text>}
      />

      {editingEmp && (
        <Modal visible={editModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Employee Details</Text>

              <Text style={styles.inputLabel}>Employee Name</Text>
              <TextInput
                style={styles.input}
                value={editingEmp.name}
                onChangeText={(text) => setEditingEmp({ ...editingEmp, name: text })}
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={editingEmp.email}
                onChangeText={(text) => setEditingEmp({ ...editingEmp, email: text })}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editingEmp.phone}
                onChangeText={(text) => setEditingEmp({ ...editingEmp, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity 
                style={styles.saveModalBtn} 
                onPress={handleUpdateEmployee}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Update Employee</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelModalBtn} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  empCard: { backgroundColor: '#1e293b', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  empEmail: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  empPhone: { color: '#38bdf8', fontSize: 12, marginTop: 2, fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteText: { color: '#ef4444', fontWeight: 'bold', fontSize: 11 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  saveModalBtn: { backgroundColor: '#10b981', paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveModalBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  cancelModalBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelModalBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 }
});