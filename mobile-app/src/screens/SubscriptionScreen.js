import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Linking, Image } from 'react-native';
import axiosInstance from '../api/axiosInstance';

export default function SubscriptionScreen({ navigation }) {
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
      Alert.alert('Request Sent ⏳', 'If payment is done, please contact support.');
    } catch (e) { 
      Alert.alert('Error', 'Request nahi ja payi.'); 
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

  // 1. Subscription Active Screen
  if (status.isActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.success}>Subscription Active ✅</Text>
        <Text style={styles.sub}>Valid till: {new Date(status.expiryDate).toLocaleDateString('en-IN')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Pending Screen (Force Lock)
  if (status.paymentPending) {
    return (
      <View style={styles.container}>
        <Text style={styles.pendingTitle}>Verification Pending ⏳</Text>
        <Text style={styles.desc}>You had successfully send the approval request. Please call on below number to get fast approval.</Text>
        
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:+916263634900')}>
          <Text style={styles.callBtnText}>📞 Call Admin: 6263634900</Text>
        </TouchableOpacity>
        
        <Text style={{color: '#64748b', textAlign: 'center', marginTop: 20, fontSize: 12}}>APp will automatically start after approval from admin</Text>
      </View>
    );
  }

  // 3. Purchase Plan Screen (Default View with QR & Payment Done Button)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Purchase Monthly Plan (₹600)</Text>
      
      <View style={styles.qrBox}>
        <Image 
          source={require('../assets/image.png')} 
          style={styles.qrImage} 
        />
        <Text style={{color: '#94a3b8', marginTop: 10, fontSize: 13}}>San using GPay / PhonePe / Paytm </Text>
      </View>

      <TouchableOpacity onPress={handleNotify} disabled={loading} style={styles.btn}>
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.btnText}>Payment Done - Notify Admin</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20 },
  qrBox: { height: 280, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 20, borderWidth: 2, borderColor: '#10b981', padding: 15 },
  qrImage: { width: 180, height: 180, resizeMode: 'contain' },
  btn: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  success: { color: '#10b981', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  sub: { color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  pendingTitle: { color: '#f59e0b', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  desc: { color: '#cbd5e1', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 22 },
  callBtn: { backgroundColor: '#3b82f6', padding: 18, borderRadius: 12, alignItems: 'center' },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});