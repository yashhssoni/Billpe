import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, SectionList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

export default function SoldItemsScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesHistory = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/sales/history');
      if (data.success) {
        setSales(data.sales || []);
      }
    } catch (err) {
      Alert.alert(t('error'), 'Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  const groupedSales = useMemo(() => {
    const groups = {};

    sales.forEach((item) => {
      const dateObj = new Date(item.createdAt);
      const dateKey = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Unknown Date';

      if (!groups[dateKey]) {
        groups[dateKey] = {
          title: dateKey,
          totalAmount: 0,
          data: []
        };
      }

      groups[dateKey].data.push(item);
      groups[dateKey].totalAmount += Number(item.totalAmount || item.price) || 0;
    });

    return Object.values(groups);
  }, [sales]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Text style={styles.backText}>{t('backToDashboard')}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t('soldItemsTitle')}</Text>
      <Text style={styles.subtitle}>{t('totalSalesRecords')} {sales.length}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={groupedSales}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section: { title, data, totalAmount } }) => (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionHeaderDate}>📅 {title}</Text>
                <Text style={styles.sectionHeaderCount}>({data.length} records)</Text>
              </View>
              <Text style={styles.sectionHeaderTotal}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                {/* Header Row: Invoice + Pay Mode */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.invoiceBadge}>
                    <Text style={styles.invoiceText}>#{item.invoiceNo || 'N/A'}</Text>
                  </View>
                  <View style={[styles.paymentBadge, item.paymentMode === 'Online' ? styles.onlineBadge : styles.cashBadge]}>
                    <Text style={styles.paymentBadgeText}>
                      {item.paymentMode === 'Online' ? t('paymentOnline') : t('paymentCash')}
                    </Text>
                  </View>
                </View>

                {/* Product & Qty */}
                <View style={styles.productRow}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemTotal}>₹{(item.totalAmount || (item.price * (item.quantity || 1))).toFixed(2)}</Text>
                </View>

                <Text style={styles.itemSubDetail}>
                  Rate: ₹{item.price} × {item.quantity || 1} pcs
                  {item.returnedQuantity > 0 ? (
                    <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}> ({item.returnedQuantity} Returned)</Text>
                  ) : null}
                </Text>

                {/* Customer Details Box */}
                <View style={styles.customerBox}>
                  <Text style={styles.itemMeta}>
                    {t('customerHistoryLabel')} <Text style={styles.metaHighlight}>{item.customerName || 'Walk-in Customer'}</Text>
                    {item.customerPhone && item.customerPhone !== 'N/A' ? ` • 📞 ${item.customerPhone}` : ''}
                  </Text>
                  {item.customerAddress && item.customerAddress !== 'N/A' ? (
                    <Text style={styles.addressMeta}>📍 {item.customerAddress}</Text>
                  ) : null}
                </View>

                {/* Footer Staff & Time */}
                <View style={styles.footerRow}>
                  <Text style={styles.staffMeta}>
                    {t('billedByLabel')} {item.soldByName || item.soldBy?.name || 'Staff'}
                  </Text>
                  <Text style={styles.itemDate}>
                    🕒 {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('noSalesHistory')}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },

  sectionHeader: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeaderDate: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  sectionHeaderCount: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  sectionHeaderTotal: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },

  itemCard: { backgroundColor: '#1e293b', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceBadge: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  invoiceText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },

  paymentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cashBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981' },
  onlineBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: '#3b82f6' },
  paymentBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },

  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1, marginRight: 8 },
  itemTotal: { color: '#10b981', fontWeight: 'bold', fontSize: 16 },
  itemSubDetail: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },

  customerBox: { backgroundColor: '#0f172a', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 6 },
  itemMeta: { color: '#cbd5e1', fontSize: 12 },
  metaHighlight: { color: '#fff', fontWeight: 'bold' },
  addressMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  staffMeta: { color: '#64748b', fontSize: 11 },
  itemDate: { color: '#64748b', fontSize: 11 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 }
});