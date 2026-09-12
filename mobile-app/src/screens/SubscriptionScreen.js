import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Image, ScrollView } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';

export default function SubscriptionScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [status, setStatus] = useState({ 
    isActive: false, 
    paymentPending: false, 
    expiryDate: null,
    purchaseDate: null,
    storeName: '',
    storePhone: '',
    storeAddress: '',
    history: [] 
  });
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
      Alert.alert(t('error'), t('Request nahi ja payi.')); 
    }
    setLoading(false);
  };

  if (fetchingStatus) {
    return (
      <ScreenWrapper scrollable={false}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} />
      
      {/* Store Header Details */}
      <View style={styles.storeHeaderBox}>
        <Text style={styles.storeNameText}>{status.storeName || 'Store Name'}</Text>
        <Text style={styles.storeSubText}>📞 {status.storePhone || 'N/A'} | 📍 {status.storeAddress || 'N/A'}</Text>
      </View>

      {/* Subscription Active / Status Card */}
      {status.isActive ? (
        <View style={styles.cardBox}>
          <Text style={styles.success}>{t('subActiveTitle')}</Text>
          {status.purchaseDate && (
            <Text style={styles.dateText}>Purchase Date: {new Date(status.purchaseDate).toLocaleDateString('en-IN')}</Text>
          )}
          <Text style={styles.dateText}>{t('validTillPrefix')} {new Date(status.expiryDate).toLocaleDateString('en-IN')}</Text>
        </View>
      ) : status.paymentPending ? (
        <View style={styles.cardBox}>
          <Text style={styles.pendingTitle}>{t('verificationPendingTitle')}</Text>
          <Text style={styles.desc}>{t('verificationPendingDesc')}</Text>

          <View style={styles.qrBox}>
            <Text style={styles.planAmountText}>{t('monthlyPlanPriceText')}</Text>
            <Image source={require('../assets/image.png')} style={styles.qrImage} />
            <Text style={styles.qrSubText}>{t('scanQrSubText')}</Text>
          </View>
          
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:+916263634900')}>
            <Text style={styles.callBtnText}>{t('callAdminBtn')}</Text>
          </TouchableOpacity>
          
          <Text style={styles.autoStartNote}>{t('autoUnlockNote')}</Text>
        </View>
      ) : (
        <View style={styles.cardBox}>
          <Text style={styles.title}>{t('purchaseMonthlyPlanTitle')}</Text>
          
          <View style={styles.qrBox}>
            <Image source={require('../assets/image.png')} style={styles.qrImage} />
            <Text style={styles.qrSubText}>{t('scanQrSubText')}</Text>
          </View>

          <TouchableOpacity onPress={handleNotify} disabled={loading} style={styles.btn}>
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.btnText}>{t('paymentDoneNotifyBtn')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable Purchase History Section */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyHeader}>📜 Subscription History</Text>
        {status.history && status.history.length > 0 ? (
          status.history.map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View>
                <Text style={styles.historyPlan}>{item.planName || 'Monthly Plan (₹600)'}</Text>
                <Text style={styles.historyDate}>Purchased: {new Date(item.purchaseDate).toLocaleDateString('en-IN')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.historyStatus, item.isActive ? { color: '#10b981' } : { color: '#ef4444' }]}>
                  {item.isActive ? 'ACTIVE' : 'EXPIRED'}
                </Text>
                <Text style={styles.historyExpiry}>Valid till: {new Date(item.expiryDate).toLocaleDateString('en-IN')}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noHistoryText}>No past subscription history found.</Text>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  storeHeaderBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  storeNameText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  storeSubText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  
  cardBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 16 },
  
  qrBox: { backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#10b981', padding: 12 },
  planAmountText: { color: '#10b981', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  qrImage: { width: 160, height: 160, resizeMode: 'contain' },
  qrSubText: { color: '#94a3b8', marginTop: 8, fontSize: 12 },

  btn: { backgroundColor: '#10b981', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  
  success: { color: '#10b981', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  dateText: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  
  pendingTitle: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  desc: { color: '#cbd5e1', textAlign: 'center', marginBottom: 12, fontSize: 13, lineHeight: 18 },
  
  callBtn: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  autoStartNote: { color: '#64748b', textAlign: 'center', marginTop: 14, fontSize: 11 },

  historyContainer: { marginTop: 10, marginBottom: 30 },
  historyHeader: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  historyItem: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  historyPlan: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  historyDate: { color: '#94a3b8', fontSize: 12 },
  historyStatus: { fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  historyExpiry: { color: '#94a3b8', fontSize: 11 },
  noHistoryText: { color: '#64748b', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }
});