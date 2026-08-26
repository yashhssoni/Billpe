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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <View style={[styles.paymentBadge, item.paymentMode === 'Online' ? styles.onlineBadge : styles.cashBadge]}>
                    <Text style={styles.paymentBadgeText}>{item.paymentMode ? item.paymentMode.toUpperCase() : 'CASH'}</Text>
                  </View>
                </View>

                <Text style={styles.itemTotal}>Sold Price: ₹{item.price}</Text>
                
                <Text style={styles.itemMeta}>
                  👤 Billed By: <Text style={styles.metaHighlight}>{item.soldByName || item.soldBy?.name || 'Staff'}</Text>
                </Text>

                {item.customerName && item.customerName !== 'N/A' && (
                  <Text style={styles.itemMeta}>
                    🛍️ Customer: {item.customerName} {item.customerPhone !== 'N/A' ? `(${item.customerPhone})` : ''}
                  </Text>
                )}

                <Text style={styles.itemDate}>📅 Date: {new Date(item.createdAt).toLocaleString('en-IN')}</Text>
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
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  itemCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1, marginRight: 8 },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cashBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981' },
  onlineBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: '#3b82f6' },
  paymentBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  itemTotal: { color: '#10b981', fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  itemMeta: { color: '#cbd5e1', fontSize: 13, marginBottom: 3 },
  metaHighlight: { color: '#38bdf8', fontWeight: 'bold' },
  itemDate: { color: '#64748b', fontSize: 11, marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 }
});