import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import axiosInstance from '../api/axiosInstance';

export default function SoldItemsScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesHistory = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/sales/history');
      if (data.success) {
        setSales(data.sales);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Sold Items History</Text>
      <Text style={styles.subtitle}>Total Sales Records: {sales.length}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemDetails}>Sold Qty: {item.quantity}  |  Price: ₹{item.price} each</Text>
                <Text style={styles.itemTotal}>Total: ₹{item.price * item.quantity}</Text>
                <Text style={styles.itemMeta}>Sold By: {item.soldBy?.name || 'Employee'} ({item.soldBy?.email || ''})</Text>
                <Text style={styles.itemDate}>Date: {new Date(item.createdAt).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No sales history found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  itemCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  itemDetails: { color: '#cbd5e1', fontSize: 13, marginBottom: 2 },
  itemTotal: { color: '#10b981', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  itemMeta: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  itemDate: { color: '#64748b', fontSize: 11 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 }
});