import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Linking, Image, ScrollView } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function SubscriptionScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [status, setStatus] = useState({ isActive: false, paymentPending: false, expiryDate: null });
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await axiosInstance.get('/payment/quota-status');
      setStatus(data);
    } catch (err) { 
      console.log('Error fetching status:', err); 
    } finally {
      setFetchingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); 
    return () => clearInterval(interval);
  }, []);

  const handleNotify = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/payment/request-activation');
      setStatus(prev => ({ ...prev, paymentPending: true }));
      Alert.alert(t('requestSentTitle'), t('requestSentMsg'));
    } catch (e) { 
      Alert.alert(t('error'), 'Request nahi ja payi.'); 
    }
    setLoading(false);
  };

  if (fetchingStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }
  if (status.isActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.success}>{t('subActiveTitle')}</Text>
        <Text style={styles.sub}>{t('validTillPrefix')} {new Date(status.expiryDate).toLocaleDateString('en-IN')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{t('backToDashboard')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status.paymentPending) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pendingTitle}>{t('verificationPendingTitle')}</Text>
        <Text style={styles.desc}>
          {t('verificationPendingDesc')}
        </Text>

        <View style={styles.qrBox}>
          <Text style={styles.planAmountText}>{t('monthlyPlanPriceText')}</Text>
          <Image 
            source={require('../assets/image.png')} 
            style={styles.qrImage} 
          />
          <Text style={styles.qrSubText}>{t('scanQrSubText')}</Text>
        </View>
        
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:+916263634900')}>
          <Text style={styles.callBtnText}>{t('callAdminBtn')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.autoStartNote}>
          {t('autoUnlockNote')}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('purchaseMonthlyPlanTitle')}</Text>
      
      <View style={styles.qrBox}>
        <Image 
          source={require('../assets/image.png')} 
          style={styles.qrImage} 
        />
        <Text style={styles.qrSubText}>{t('scanQrSubText')}</Text>
      </View>

      <TouchableOpacity onPress={handleNotify} disabled={loading} style={styles.btn}>
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.btnText}>{t('paymentDoneNotifyBtn')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20 },
  
  qrBox: { 
    backgroundColor: '#1e293b', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 20, 
    marginBottom: 20, 
    borderWidth: 2, 
    borderColor: '#10b981', 
    padding: 16 
  },
  planAmountText: { color: '#10b981', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  qrImage: { width: 180, height: 180, resizeMode: 'contain' },
  qrSubText: { color: '#94a3b8', marginTop: 10, fontSize: 13 },

  btn: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  
  success: { color: '#10b981', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  sub: { color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  
  pendingTitle: { color: '#f59e0b', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  desc: { color: '#cbd5e1', textAlign: 'center', marginBottom: 16, fontSize: 14, lineHeight: 20 },
  
  callBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  
  autoStartNote: { color: '#64748b', textAlign: 'center', marginTop: 18, fontSize: 12 }
});