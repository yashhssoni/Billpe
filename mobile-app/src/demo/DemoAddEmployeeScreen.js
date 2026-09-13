import React, { useState, useCallback, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, StyleSheet, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../../context/LanguageContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import BackButton from '../../components/BackButton';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const DEMO_EMP_LIMIT_KEY = 'billpe_demo_emp_action_count';
const DEMO_EMPLOYEES_KEY = 'billpe_demo_local_employees';

export default function DemoAddEmployeeScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [employees, setEmployees] = useState([
    { _id: 'emp_1', name: 'Ramesh (Staff)', email: 'ramesh@demo.com', phone: '9876543210' }
  ]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsLeft, setActionsLeft] = useState(5);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [updating, setUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
      fetchDemoEmployees();
    }, [])
  );

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_EMP_LIMIT_KEY);
      if (savedCount !== null) {
        const remaining = 5 - parseInt(savedCount, 10);
        setActionsLeft(remaining > 0 ? remaining : 0);
      } else {
        setActionsLeft(5);
      }
    } catch (e) {
      console.log('Error loading limit:', e);
    }
  };

  const handleDemoActionWrapper = async (callback) => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_EMP_LIMIT_KEY);
      const currentCount = savedCount ? parseInt(savedCount, 10) : 0;

      if (currentCount >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached / डेमो लिमिट समाप्त",
          t('demoLimitReachedMsg') || "आपने कर्मचारी प्रबंधन के 5 फ्री एक्शन्स पूरे कर लिए हैं। / You have used 5 free actions.",
          [{ text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }]
        );
        return;
      }

      const nextCount = currentCount + 1;
      await AsyncStorage.setItem(DEMO_EMP_LIMIT_KEY, nextCount.toString());
      
      const remaining = 5 - nextCount;
      setActionsLeft(remaining > 0 ? remaining : 0);

      callback();
    } catch (e) {
      console.log('Error updating limit:', e);
      callback();
    }
  };

  const fetchDemoEmployees = async () => {
    try {
      const localData = await AsyncStorage.getItem(DEMO_EMPLOYEES_KEY);
      if (localData) {
        setEmployees(JSON.parse(localData));
      }
    } catch (err) {
      console.log('Error fetching local employees:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    handleDemoActionWrapper(async () => {
      setLoading(true);
      try {
        const newEmp = {
          _id: 'emp_' + Date.now(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim()
        };

        const updatedList = [newEmp, ...employees];
        setEmployees(updatedList);
        await AsyncStorage.setItem(DEMO_EMPLOYEES_KEY, JSON.stringify(updatedList));

        setLoading(false);
        Alert.alert(t('success'), `${t('empCreatedSuccess')} (Demo)`);
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
      } catch (err) {
        setLoading(false);
        Alert.alert(t('error'), t('Failed to add employee.'));
      }
    });
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

    handleDemoActionWrapper(async () => {
      setUpdating(true);
      try {
        const updatedList = employees.map(e => {
          if (e._id === editingEmp.id) {
            return {
              ...e,
              name: editingEmp.name.trim(),
              email: editingEmp.email.trim().toLowerCase(),
              phone: editingEmp.phone.trim()
            };
          }
          return e;
        });

        setEmployees(updatedList);
        await AsyncStorage.setItem(DEMO_EMPLOYEES_KEY, JSON.stringify(updatedList));

        setUpdating(false);
        Alert.alert(t('success'), `${t('employeeUpdatedSuccess') || 'Employee updated successfully!'} (Demo)`);
        setEditModalVisible(false);
      } catch (err) {
        setUpdating(false);
        Alert.alert(t('error'), t('Failed to update employee.'));
      }
    });
  };

  const handleDeleteEmployee = (id, empName) => {
    Alert.alert(
      t('confirmDeleteTitle') || 'Confirm Delete / डिलीट कन्फर्म करें',
      `${t('areYouSureRemove') || 'Are you sure you want to remove'} ${empName}? (Demo)`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            handleDemoActionWrapper(async () => {
              try {
                const filtered = employees.filter(e => e._id !== id);
                setEmployees(filtered);
                await AsyncStorage.setItem(DEMO_EMPLOYEES_KEY, JSON.stringify(filtered));
                Alert.alert(t('success'), t('Employee removed successfully.'));
              } catch (err) {
                Alert.alert(t('error'), t('Failed to delete employee.'));
              }
            });
          }
        }
      ]
    );
  };

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      <View style={styles.topBarRow}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <Text style={styles.title}>{t('storeStaffTitle')} (Demo)</Text>
      <Text style={styles.subtitle}>{t('manageStaffSubtitle')}</Text>

      <View style={styles.card}>
        <TextInput style={styles.input} placeholder={t('empNamePlaceholder')} placeholderTextColor="#64748b" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder={t('empEmailPlaceholder')} placeholderTextColor="#64748b" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder={t('empPhonePlaceholder')} placeholderTextColor="#64748b" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} placeholder={t('empPasswordPlaceholder')} placeholderTextColor="#64748b" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity onPress={handleAddEmployee} disabled={loading} style={styles.btn}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('createEmpAccountBtn')} (Demo)</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.listHeader}>{t('registeredEmployeesHeader')} ({employees.length})</Text>
      
      <FlatList
        data={employees}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDemoEmployees(); }} tintColor="#10b981" />
        }
        renderItem={({ item }) => (
          <View style={styles.empCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.empName}>{item.name}</Text>
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
              <Text style={styles.modalTitle}>{t('Edit Employee Details') || 'Edit Employee Details'}</Text>

              <Text style={styles.inputLabel}>{t('Employee Name') || 'Employee Name'}</Text>
              <TextInput style={styles.input} value={editingEmp.name} onChangeText={(text) => setEditingEmp({ ...editingEmp, name: text })} placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>{t('Email Address') || 'Email Address'}</Text>
              <TextInput style={styles.input} value={editingEmp.email} onChangeText={(text) => setEditingEmp({ ...editingEmp, email: text })} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>{t('Phone Number') || 'Phone Number'}</Text>
              <TextInput style={styles.input} value={editingEmp.phone} onChangeText={(text) => setEditingEmp({ ...editingEmp, phone: text })} keyboardType="phone-pad" placeholderTextColor="#64748b" />

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleUpdateEmployee} disabled={updating}>
                {updating ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveModalBtnText}>{t('Update Employee') || 'Update Employee'}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelModalBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  topBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2, marginTop: 4 },
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
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20, marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  saveModalBtn: { backgroundColor: '#10b981', paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveModalBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  cancelModalBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelModalBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 }
});