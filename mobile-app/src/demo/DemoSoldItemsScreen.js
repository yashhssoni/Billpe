import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, SectionList, Alert, ActivityIndicator, 
  StyleSheet, Modal 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import CustomDatePickerModal from '../components/CustomDatePickerModal'; 
import LanguageSwitcher from '../components/LanguageSwitcher';

const DEMO_SOLD_LIMIT_KEY = 'billpe_demo_sold_action_count';
const DEMO_SALES_HISTORY_KEY = 'billpe_demo_sales_history';

export default function DemoSoldItemsScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [sales, setSales] = useState([
    {
      _id: 'sale_demo_1',
      invoiceNo: 'BP-DEMO-9911',
      productName: 'Parle-G Biscuit',
      price: 10,
      quantity: 5,
      returnedQuantity: 0,
      paymentMode: 'Cash',
      customerName: 'Rahul Sharma',
      customerPhone: '9876543210',
      soldByName: 'Demo Staff',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'sale_demo_2',
      invoiceNo: 'BP-DEMO-9912',
      productName: 'Colgate MaxFresh',
      price: 95,
      quantity: 2,
      returnedQuantity: 0,
      paymentMode: 'Online',
      customerName: 'Amit Verma',
      customerPhone: '9123456789',
      soldByName: 'Demo Staff',
      createdAt: new Date().toISOString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [archiving, setArchiving] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [actionsLeft, setActionsLeft] = useState(5);

  const formatDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDateString(new Date());
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [actionLoading, setActionLoading] = useState(false);

  const [calendarTarget, setCalendarTarget] = useState(null); 
  const [calendarVisible, setCalendarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
      fetchDemoSalesHistory();
    }, [])
  );

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_SOLD_LIMIT_KEY);
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
      const savedCount = await AsyncStorage.getItem(DEMO_SOLD_LIMIT_KEY);
      const currentCount = savedCount ? parseInt(savedCount, 10) : 0;

      if (currentCount >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached",
          t('demoLimitReachedMsg') || "आपने सोल्ड आइटम्स हटाने के 5 फ्री एक्शन्स पूरे कर लिए हैं।",
          [
            { text: t('cancel') || "Cancel", style: 'cancel' },
            { text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }
          ]
        );
        return;
      }

      const nextCount = currentCount + 1;
      await AsyncStorage.setItem(DEMO_SOLD_LIMIT_KEY, nextCount.toString());
      
      const remaining = 5 - nextCount;
      setActionsLeft(remaining > 0 ? remaining : 0);

      callback();
    } catch (e) {
      console.log('Error updating limit:', e);
      callback();
    }
  };

  const fetchDemoSalesHistory = async () => {
    try {
      const localData = await AsyncStorage.getItem(DEMO_SALES_HISTORY_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.length > 0) setSales(parsed);
      }
    } catch (err) {
      console.log('Error loading sales history:', err);
    }
  };

  const setQuickPreset = (daysBack) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    setStartDate(formatDateString(start));
    setEndDate(formatDateString(end));
  };

  const toggleSelectItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sales.map(s => s._id)));
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const executeSoftDelete = async (idsArray) => {
    if (!idsArray || idsArray.length === 0) return;

    handleDemoActionWrapper(async () => {
      setArchiving(true);
      try {
        const filtered = sales.filter(item => !idsArray.includes(item._id));
        setSales(filtered);
        await AsyncStorage.setItem(DEMO_SALES_HISTORY_KEY, JSON.stringify(filtered));
        setArchiving(false);
        exitSelectMode();
        Alert.alert(t('success'), `${t('recordsRemovedHistory') || 'Records removed from history.'} (Demo)`);
      } catch (err) {
        setArchiving(false);
        Alert.alert(t('error'), t('Failed to remove records.'));
      }
    });
  };

  const handleSingleDelete = (id, productName) => {
    Alert.alert(
      t('Remove from History?'),
      `Remove "${productName}" from sales history? (Demo)`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => executeSoftDelete([id]) }
      ]
    );
  };

  const handleBulkDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t('Remove Selected?'),
      `Remove ${selectedIds.size} selected item(s)? (Demo)`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: `${t('delete')} (${selectedIds.size})`, style: 'destructive', onPress: () => executeSoftDelete(Array.from(selectedIds)) }
      ]
    );
  };

  const validateDates = () => {
    if (!startDate.trim() || !endDate.trim()) return false;
    return true;
  };

  const handleDownloadBackup = async () => {
    if (!validateDates()) return;

    setActionLoading(true);
    try {
      const grandTotal = sales.reduce((acc, curr) => acc + (Number(curr.price || 0) * Number(curr.quantity || 1)), 0);

      const rows = sales.map((item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
          <td>${item.invoiceNo}</td>
          <td><strong>${item.productName}</strong></td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
          <td style="text-align: right;"><strong>₹${(item.price * item.quantity).toFixed(2)}</strong></td>
          <td>${item.paymentMode}</td>
          <td>${item.soldByName}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 15px;">
            <h2 style="text-align: center;">BILLPE DEMO STORE</h2>
            <h3 style="text-align: center;">Sales & Return Report (Demo)</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
              <thead>
                <tr style="background: #eee;">
                  <th style="border: 1px solid #ccc; padding: 6px;">Sr</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Date</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Invoice</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Product</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Qty</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Rate</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Total</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Mode</th>
                  <th style="border: 1px solid #ccc; padding: 6px;">Staff</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top: 15px; font-size: 13px; text-align: right;">
              <strong>Grand Total: ₹${grandTotal.toFixed(2)}</strong>
            </div>
          </body>
        </html>
      `;

      setActionLoading(false);
      await Print.printAsync({ html });
    } catch (err) {
      setActionLoading(false);
      Alert.alert(t('error'), t('Failed to export backup sheet.'));
    }
  };

  const groupedSales = useMemo(() => {
    const groups = {};
    sales.forEach((item) => {
      const dateKey = new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!groups[dateKey]) {
        groups[dateKey] = { title: dateKey, totalAmount: 0, data: [] };
      }
      groups[dateKey].data.push(item);
      groups[dateKey].totalAmount += Number(item.price || 0) * Number(item.quantity || 1);
    });
    return Object.values(groups);
  }, [sales]);

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <Text style={styles.title}>{t('soldItemsTitle')} (Demo)</Text>

      <View style={styles.controlsBarRow}>
        <Text style={styles.subtitle}>{t('totalSalesRecords')} {sales.length}</Text>
        <View style={styles.controlsActions}>
          <TouchableOpacity 
            style={[styles.selectModeBtn, isSelectMode && styles.selectModeBtnActive]}
            onPress={() => isSelectMode ? exitSelectMode() : setIsSelectMode(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectModeBtnText, isSelectMode && styles.selectModeBtnTextActive]}>
              {isSelectMode ? t('cancel') : t('Select Entry')}
            </Text>
          </TouchableOpacity>

          {!isSelectMode && (
            <TouchableOpacity style={styles.clearRangeTrigger} onPress={() => setRangeModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.clearRangeTriggerText}>{t('Date Range')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSelectMode && (
        <View style={styles.multiSelectBar}>
          <TouchableOpacity onPress={handleSelectAll} style={styles.multiSelectActionBtn}>
            <Text style={styles.multiSelectActionText}>
              {selectedIds.size === sales.length ? t('Deselect All') : t('Select All')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleBulkDeleteSelected} 
            disabled={archiving || selectedIds.size === 0}
            style={[styles.multiDeleteBtn, selectedIds.size === 0 && { opacity: 0.5 }]}
          >
            {archiving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.multiDeleteText}>🗑️ {t('delete')} ({selectedIds.size})</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={groupedSales}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
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
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item._id);
            const netItemAmount = Number(item.price || 0) * Number(item.quantity || 1);

            return (
              <TouchableOpacity 
                activeOpacity={isSelectMode ? 0.7 : 1}
                onPress={() => isSelectMode && toggleSelectItem(item._id)}
                style={[styles.itemCard, isSelectMode && isSelected && styles.itemCardSelected]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      {isSelectMode && (
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      )}
                      <View style={styles.invoiceBadge}>
                        <Text style={styles.invoiceText}>#{item.invoiceNo}</Text>
                      </View>
                      <View style={[styles.paymentBadge, item.paymentMode === 'Online' ? styles.onlineBadge : styles.cashBadge]}>
                        <Text style={styles.paymentBadgeText}>{item.paymentMode}</Text>
                      </View>
                    </View>

                    {!isSelectMode && (
                      <TouchableOpacity style={styles.singleDeleteBtn} onPress={() => handleSingleDelete(item._id, item.productName)}>
                        <Text style={styles.singleDeleteText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.productRow}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemTotal}>₹{netItemAmount.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.itemSubDetail}>Rate: ₹{item.price} × {item.quantity} pcs</Text>

                  <View style={styles.customerBox}>
                    <Text style={styles.itemMeta}>
                      {t('customerHistoryLabel')} <Text style={styles.metaHighlight}>{item.customerName}</Text> • 📞 {item.customerPhone}
                    </Text>
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.staffMeta}>{t('billedByLabel')} {item.soldByName}</Text>
                    <Text style={styles.itemDate}>🕒 Just now</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('noSalesHistory')}</Text>}
        />
      )}

      <Modal visible={rangeModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRangeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 {t('Date Range Options')}</Text>
              <TouchableOpacity onPress={() => setRangeModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetsRow}>
              <TouchableOpacity style={styles.presetChip} onPress={() => setQuickPreset(0)}>
                <Text style={styles.presetText}>{t('Today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setQuickPreset(6)}>
                <Text style={styles.presetText}>{t('Last 7 Days')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('Start Date:')}</Text>
            <TouchableOpacity style={styles.datePickerTrigger} onPress={() => { setCalendarTarget('start'); setCalendarVisible(true); }}>
              <Text style={styles.datePickerTriggerText}>📅 {startDate}</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>{t('End Date:')}</Text>
            <TouchableOpacity style={styles.datePickerTrigger} onPress={() => { setCalendarTarget('end'); setCalendarVisible(true); }}>
              <Text style={styles.datePickerTriggerText}>📅 {endDate}</Text>
            </TouchableOpacity>

            {actionLoading ? (
              <ActivityIndicator color="#38bdf8" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadBackup} activeOpacity={0.8}>
                  <Text style={styles.downloadBtnText}>📥 {t('Download / Print Backup')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRangeModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <CustomDatePickerModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={calendarTarget === 'start' ? startDate : endDate}
        onSelectDate={(pickedDate) => {
          if (calendarTarget === 'start') setStartDate(pickedDate);
          else setEndDate(pickedDate);
        }}
        title={calendarTarget === 'start' ? "Select Start Date" : "Select End Date"}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  controlsBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  controlsActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectModeBtn: { backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  selectModeBtnActive: { backgroundColor: '#38bdf8' },
  selectModeBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  selectModeBtnTextActive: { color: '#0f172a' },
  clearRangeTrigger: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1.5, borderColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearRangeTriggerText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  multiSelectBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#38bdf8', marginBottom: 12 },
  multiSelectActionBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0f172a', borderRadius: 8 },
  multiSelectActionText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  multiDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  multiDeleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  sectionHeader: { backgroundColor: '#0f172a', paddingVertical: 10, marginTop: 6, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeaderDate: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  sectionHeaderCount: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  sectionHeaderTotal: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
  itemCard: { backgroundColor: '#1e293b', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  itemCardSelected: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#94a3b8', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  checkmark: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
  invoiceBadge: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  invoiceText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cashBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981' },
  onlineBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: '#3b82f6' },
  paymentBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  singleDeleteBtn: { padding: 4 },
  singleDeleteText: { fontSize: 15 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1, marginRight: 8 },
  itemTotal: { color: '#10b981', fontWeight: 'bold', fontSize: 16 },
  itemSubDetail: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  customerBox: { backgroundColor: '#0f172a', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 6 },
  itemMeta: { color: '#cbd5e1', fontSize: 12 },
  metaHighlight: { color: '#fff', fontWeight: 'bold' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  staffMeta: { color: '#64748b', fontSize: 11 },
  itemDate: { color: '#64748b', fontSize: 11 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, marginBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#38bdf8' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCloseText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold', padding: 4 },
  presetsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  presetChip: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  presetText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 4, marginTop: 6 },
  datePickerTrigger: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 6 },
  datePickerTriggerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  downloadBtn: { backgroundColor: '#3b82f6', paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  downloadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cancelBtn: { alignItems: 'center', paddingVertical: 6, marginTop: 2 },
  cancelBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 }
});