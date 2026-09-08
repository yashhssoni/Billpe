import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView, Modal, FlatList 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const SAVED_ACCOUNTS_KEY = 'billpe_saved_accounts_list';

export default function LoginScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { login } = useContext(AuthContext);

  useEffect(() => {
    loadSavedAccounts();
  }, []);

  const loadSavedAccounts = async () => {
    try {
      const data = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAccounts(parsed);
          // Default latest account load ho jayega
          setIdentifier(parsed[0].email);
          setPassword(parsed[0].pass);
        }
      }
    } catch (e) {
      console.log('Error reading saved accounts:', e);
    }
  };

  const handleSelectAccount = (acc) => {
    setIdentifier(acc.email);
    setPassword(acc.pass);
    setDropdownVisible(false);
  };

  const handleDeleteSavedAccount = async (emailToDelete) => {
    const updated = savedAccounts.filter(acc => acc.email !== emailToDelete);
    setSavedAccounts(updated);
    await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    if (identifier === emailToDelete) {
      setIdentifier('');
      setPassword('');
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert(t('error'), t('enterLoginCredentialsError'));
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);

    if (result.success) {
      try {
        const newEntry = { email: identifier.trim(), pass: password };
        // Purane duplicate ko hatakar latest ko top par add karenge
        const filtered = savedAccounts.filter(acc => acc.email.toLowerCase() !== newEntry.email.toLowerCase());
        const updatedList = [newEntry, ...filtered].slice(0, 8); // Max 8 accounts cache
        setSavedAccounts(updatedList);
        await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedList));
      } catch (e) {
        console.log('Error caching account:', e);
      }
    } else {
      Alert.alert(t('loginFailed'), result.message || 'Invalid credentials.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
            <LanguageSwitcher />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{t('welcome')}</Text>
            <Text style={styles.subtitle}>{t('subtitle')}</Text>
          </View>

          {/* Compact Dropdown Bar */}
          {savedAccounts.length > 0 && (
            <TouchableOpacity 
              style={styles.compactAccountBar} 
              onPress={() => setDropdownVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Text style={{ fontSize: 13 }}>⚡</Text>
                <Text style={styles.compactBarLabel}>Saved Accounts</Text>
                <View style={styles.accountCountBadge}>
                  <Text style={styles.accountCountText}>{savedAccounts.length}</Text>
                </View>
              </View>
              <Text style={styles.compactBarArrow}>▼</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>{t('emailOrPhone')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('emailOrPhonePlaceholder')}
            placeholderTextColor="#64748b"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>{t('password')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder={t('passwordPlaceholder')}
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.btn} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('signIn')}</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>{t('register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Saved Accounts Modal Dropdown */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ Select Saved Account</Text>
              <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={savedAccounts}
              keyExtractor={(item) => item.email}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => {
                const isCurrent = identifier.toLowerCase() === item.email.toLowerCase();
                return (
                  <View style={[styles.accountRow, isCurrent && styles.accountRowActive]}>
                    <TouchableOpacity 
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}
                      onPress={() => handleSelectAccount(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.accountEmail, isCurrent && styles.accountEmailActive]} numberOfLines={1}>
                        {item.email}
                      </Text>
                      <Text style={styles.accountPassHint}>••••••••</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.deleteAccountBtn}
                      onPress={() => handleDeleteSavedAccount(item.email)}
                    >
                      <Text style={styles.deleteAccountText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8' },

  compactAccountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14
  },
  compactBarLabel: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  accountCountBadge: { backgroundColor: 'rgba(56, 189, 248, 0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  accountCountText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  compactBarArrow: { color: '#38bdf8', fontSize: 10 },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase' },
  forgotText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 14, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#94a3b8', fontSize: 14 },
  registerText: { color: '#10b981', fontWeight: 'bold', fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalCloseText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold', padding: 4 },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  accountRowActive: { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  accountEmail: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  accountEmailActive: { color: '#10b981', fontWeight: 'bold' },
  accountPassHint: { color: '#64748b', fontSize: 11, marginTop: 1 },
  deleteAccountBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  deleteAccountText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold' }
});