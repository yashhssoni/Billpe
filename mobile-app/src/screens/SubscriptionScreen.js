import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

export default function SubscriptionScreen({ navigation }) {
  const { storeInfo } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const isSubActive = storeInfo?.isSubActive || false;

  const handleMonthlyRenewal = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.post('/payment/monthly/order');
      
      if (data.success) {
        const options = {
          description: "BillPe Monthly Store Subscription (₹500)",
          image: "https://i.imgur.com/3g7nmJC.png",
          currency: "INR",
          key: "rzp_test_Y7VpspdU1eaCY7", // Aapki .env wali Test Key ID
          amount: data.order.amount,
          order_id: data.order.id,
          name: "BillPe POS",
          prefill: {
            email: storeInfo?.email || "admin@billpe.com",
            contact: storeInfo?.phone || "9999999999",
            name: storeInfo?.ownerName || "Store Admin"
          },
          theme: { color: "#10B981" }
        };

        RazorpayCheckout.open(options).then(async (response) => {
          const verifyRes = await axiosInstance.post('/payment/monthly/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          setLoading(false);
          if (verifyRes.data.success) {
            Alert.alert(
              'Success 🎉', 
              'Monthly subscription activated successfully! Please re-login to update permissions.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        }).catch((error) => {
          setLoading(false);
          Alert.alert(`Payment Cancelled / Failed`, error.description || "User cancelled payment.");
        });
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.response?.data?.message || 'Failed to initiate monthly renewal.');
    }
  };

  const handleAddonPurchase = async () => {
    if (!isSubActive) {
      Alert.alert('Plan Required', 'Please activate your ₹500 monthly plan first before buying add-on packs.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axiosInstance.post('/payment/addon/order');
      
      if (data.success) {
        const options = {
          description: "BillPe Add-on BR Pack (+25 BRs)",
          image: "https://i.imgur.com/3g7nmJC.png",
          currency: "INR",
          key: "rzp_test_Y7VpspdU1eaCY7",
          amount: data.order.amount,
          order_id: data.order.id,
          name: "BillPe POS",
          prefill: {
            email: storeInfo?.email || "admin@billpe.com",
            contact: storeInfo?.phone || "9999999999",
            name: storeInfo?.ownerName || "Store Admin"
          },
          theme: { color: "#0284c7" }
        };

        RazorpayCheckout.open(options).then(async (response) => {
          const verifyRes = await axiosInstance.post('/payment/addon/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          setLoading(false);
          if (verifyRes.data.success) {
            Alert.alert('Success 🎉', 'Successfully added 25 extra barcode credits to your balance!');
          }
        }).catch((error) => {
          setLoading(false);
          Alert.alert(`Payment Cancelled / Failed`, error.description || "User cancelled payment.");
        });
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.response?.data?.message || 'Failed to initiate add-on purchase.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Subscription & Br Quota</Text>
      <Text style={styles.subtitle}>Manage store plan and add-on packs</Text>

      {loading && <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 20 }} />}

      {!isSubActive && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Plan (₹500 / month)</Text>
          <Text style={styles.cardDesc}>Includes 200 Base Barcode BRs per month + POS access for employees.</Text>
          <TouchableOpacity onPress={handleMonthlyRenewal} style={styles.btnGreen}>
            <Text style={styles.btnTextDark}>Renew Monthly Plan (₹500)</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitleSky}>Add-on BR Pack (₹100)</Text>
        <Text style={styles.cardDesc}>Get instant +25 extra barcode generation credits. (Requires Active Monthly Plan)</Text>
        <TouchableOpacity onPress={handleAddonPurchase} style={styles.btnSky}>
          <Text style={styles.btnTextWhite}>Buy 25 Extra BRs (₹100)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 24 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  cardTitle: { color: '#10b981', fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  cardTitleSky: { color: '#38bdf8', fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  cardDesc: { color: '#cbd5e1', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  btnGreen: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSky: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnTextDark: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});