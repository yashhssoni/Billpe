import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function AdminDashboard({ navigation }) {
  const { storeInfo, logout } = useContext(AuthContext);

  const menuItems = [
    { title: 'Scan & Add Stock', icon: '📷', screen: 'AdminScanner' },
    { title: 'Barcode Generator', icon: '🏷️', screen: 'BarcodeGenerator' },
    { title: 'Manage Database', icon: '📊', screen: 'ManageDatabase' },
    { title: 'Sold Items History', icon: '💰', screen: 'SoldItemsScreen' }, // <-- Added here
    { title: 'Add Employee', icon: '👥', screen: 'AddEmployeeScreen' },
    { title: 'Subscription & BRs', icon: '💳', screen: 'SubscriptionScreen' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Admin Dashboard</Text>
          <Text style={styles.storeName}>{storeInfo?.storeName || 'My Store'}</Text>
          {storeInfo?._id && <Text style={styles.storeId}>Store ID: {storeInfo._id}</Text>}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigation.navigate(item.screen)}
            style={styles.card}
          >
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 24 },
  eyebrow: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  storeName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  storeId: { fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: '500' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#1e293b', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});