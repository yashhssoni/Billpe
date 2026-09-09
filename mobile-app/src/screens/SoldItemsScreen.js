import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, SectionList, Alert, ActivityIndicator, 
  StyleSheet, Modal, TextInput 
} from 'react-native';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import CustomDatePickerModal from '../components/CustomDatePickerModal'; // Apna Custom Calendar Modal

export default function SoldItemsScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSplitIds, setExpandedSplitIds] = useState(new Set());

  // Multi-Select States (File Manager Style)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [archiving, setArchiving] = useState(false);

  // Date Range & Calendar Modal States
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  
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

  // States to control active calendar selection picker modal
  const [calendarTarget, setCalendarTarget] = useState(null); // 'start' or 'end'
  const [calendarVisible, setCalendarVisible] = useState(false);

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

  const setQuickPreset = (daysBack) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    setStartDate(formatDateString(start));
    setEndDate(formatDateString(end));
  };

  const toggleSplitExpand = (id) => {
    setExpandedSplitIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

    setArchiving(true);
    try {
      const { data } = await axiosInstance.post('/sales/history/archive', { ids: idsArray });
      setArchiving(false);

      if (data.success) {
        setSales(prev => prev.filter(item => !idsArray.includes(item._id)));
        exitSelectMode();
        Alert.alert(t('success'), data.message || 'Records removed from history.');
      }
    } catch (err) {
      setArchiving(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to remove records.');
    }
  };

  const handleSingleDelete = (id, productName) => {
    Alert.alert(
      'Remove from History?',
      `Remove "${productName}" from sales history?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: () => executeSoftDelete([id])
        }
      ]
    );
  };

  const handleBulkDeleteSelected = () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Items Selected', 'Please tap on items to select them first.');
      return;
    }

    Alert.alert(
      'Remove Selected?',
      `Remove ${selectedIds.size} selected item(s) from history?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: `Delete (${selectedIds.size})`, 
          style: 'destructive',
          onPress: () => executeSoftDelete(Array.from(selectedIds))
        }
      ]
    );
  };

  const validateDates = () => {
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert(t('error'), 'Please enter both Start Date and End Date.');
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate.trim()) || !dateRegex.test(endDate.trim())) {
      Alert.alert(t('error'), 'Please use YYYY-MM-DD format.');
      return false;
    }
    return true;
  };

  const handleDownloadBackup = async () => {
    if (!validateDates()) return;

    setActionLoading(true);
    try {
      const { data: res } = await axiosInstance.post('/sales/history/export-range', {
        startDate: startDate.trim(),
        endDate: endDate.trim()
      });
      setActionLoading(false);

      if (!res.success || !res.sales || res.sales.length === 0) {
        Alert.alert('No Records', 'No sales found in this date range.');
        return;
      }

      const rows = res.sales.map((item, idx) => `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.invoiceNo}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.productName}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₹${item.price}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;"><strong>₹${item.totalAmount}</strong></td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.customerName || 'N/A'}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${item.paymentMode}</td>
        </tr>
      `).join('');

      const grandTotal = res.sales.reduce((acc, curr) => acc + Number(curr.totalAmount || curr.price || 0), 0);

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 15px; color: #222; }
              h2 { margin-bottom: 4px; text-align: center; }
              p { margin: 2px 0; font-size: 13px; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
              th { background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
            </style>
          </head>
          <body>
            <h2>BILLPE STORE SALES REPORT</h2>
            <p><strong>Period:</strong> ${startDate.trim()} to ${endDate.trim()}</p>
            <p><strong>Export Date:</strong> ${new Date().toLocaleString('en-IN')}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>Invoice</th><th>Product</th><th>Qty</th><th>Rate</th><th>Total</th><th>Customer</th><th>Mode</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top: 15px; text-align: right; font-size: 14px;">
              <strong>Total Sales: ₹${grandTotal.toFixed(2)}</strong>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (err) {
      setActionLoading(false);
      Alert.alert(t('error'), 'Failed to export backup sheet.');
    }
  };

  const handlePermanentDelete = () => {
    if (!validateDates()) return;

    Alert.alert(
      'Permanent Delete?',
      `Are you sure you want to permanently delete records from ${startDate.trim()} to ${endDate.trim()}? This cannot be undone.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data } = await axiosInstance.post('/sales/history/permanent-delete-range', {
                startDate: startDate.trim(),
                endDate: endDate.trim()
              });
              setActionLoading(false);

              if (data.success) {
                Alert.alert(t('success'), data.message || 'Records permanently deleted.');
                setRangeModalVisible(false);
                fetchSalesHistory();
              }
            } catch (err) {
              setActionLoading(false);
              Alert.alert(t('error'), err.response?.data?.message || 'Permanent deletion failed.');
            }
          }
        }
      ]
    );
  };

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
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} />

      <Text style={styles.title}>{t('soldItemsTitle')}</Text>

      <View style={styles.controlsBarRow}>
        <Text style={styles.subtitle}>
          {t('totalSalesRecords')} {sales.length}
        </Text>

        <View style={styles.controlsActions}>
          <TouchableOpacity 
            style={[styles.selectModeBtn, isSelectMode && styles.selectModeBtnActive]}
            onPress={() => {
              if (isSelectMode) exitSelectMode();
              else setIsSelectMode(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectModeBtnText, isSelectMode && styles.selectModeBtnTextActive]}>
              {isSelectMode ? 'Cancel' : 'Select Entry'}
            </Text>
          </TouchableOpacity>

          {!isSelectMode && (
            <TouchableOpacity 
              style={styles.clearRangeTrigger}
              onPress={() => setRangeModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.clearRangeTriggerText}>Date Range / Export</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSelectMode && (
        <View style={styles.multiSelectBar}>
          <TouchableOpacity onPress={handleSelectAll} style={styles.multiSelectActionBtn}>
            <Text style={styles.multiSelectActionText}>
              {selectedIds.size === sales.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleBulkDeleteSelected} 
            disabled={archiving || selectedIds.size === 0}
            style={[styles.multiDeleteBtn, selectedIds.size === 0 && { opacity: 0.5 }]}
          >
            {archiving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.multiDeleteText}>🗑️ Delete ({selectedIds.size})</Text>
            )}
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
            const isSplit = item.paymentMode === 'Split';
            const isExpanded = expandedSplitIds.has(item._id);
            const isSelected = selectedIds.has(item._id);

            return (
              <TouchableOpacity 
                activeOpacity={isSelectMode ? 0.7 : 1}
                onPress={() => {
                  if (isSelectMode) toggleSelectItem(item._id);
                }}
                style={[
                  styles.itemCard, 
                  isSelectMode && isSelected && styles.itemCardSelected
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                      {isSelectMode && (
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      )}

                      <View style={styles.invoiceBadge}>
                        <Text style={styles.invoiceText}>#{item.invoiceNo || 'N/A'}</Text>
                      </View>

                      {isSplit ? (
                        <TouchableOpacity 
                          style={[styles.paymentBadge, styles.splitBadge]} 
                          onPress={() => toggleSplitExpand(item._id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.splitBadgeText}>
                            {isExpanded 
                              ? `💵 ₹${item.cashAmount || 0}  |  📲 ₹${item.onlineAmount || 0}`
                              : '⚖️ SPLIT (Tap)'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.paymentBadge, item.paymentMode === 'Online' ? styles.onlineBadge : styles.cashBadge]}>
                          <Text style={styles.paymentBadgeText}>
                            {item.paymentMode === 'Online' ? t('paymentOnline') : t('paymentCash')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isSelectMode && (
                      <TouchableOpacity 
                        style={styles.singleDeleteBtn}
                        onPress={() => handleSingleDelete(item._id, item.productName)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.singleDeleteText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>

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

                  <View style={styles.customerBox}>
                    <Text style={styles.itemMeta}>
                      {t('customerHistoryLabel')} <Text style={styles.metaHighlight}>{item.customerName || 'Walk-in Customer'}</Text>
                      {item.customerPhone && item.customerPhone !== 'N/A' ? ` • 📞 ${item.customerPhone}` : ''}
                    </Text>
                    {item.customerAddress && item.customerAddress !== 'N/A' ? (
                      <Text style={styles.addressMeta}>📍 {item.customerAddress}</Text>
                    ) : null}
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.staffMeta}>
                      {t('billedByLabel')} {item.soldByName || item.soldBy?.name || 'Staff'}
                    </Text>
                    <Text style={styles.itemDate}>
                      🕒 {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('noSalesHistory')}</Text>}
        />
      )}

      {/* Date Range Options Modal */}
      <Modal
        visible={rangeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRangeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Date Range Options</Text>
              <TouchableOpacity onPress={() => setRangeModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Preset Chips */}
            <View style={styles.presetsRow}>
              <TouchableOpacity style={styles.presetChip} onPress={() => setQuickPreset(0)}>
                <Text style={styles.presetText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setQuickPreset(6)}>
                <Text style={styles.presetText}>Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setQuickPreset(29)}>
                <Text style={styles.presetText}>Last 30 Days</Text>
              </TouchableOpacity>
            </View>

            {/* Start Date Picker Trigger */}
            <Text style={styles.inputLabel}>Start Date:</Text>
            <TouchableOpacity 
              style={styles.datePickerTrigger}
              onPress={() => { setCalendarTarget('start'); setCalendarVisible(true); }}
            >
              <Text style={styles.datePickerTriggerText}>📅 {startDate}</Text>
            </TouchableOpacity>

            {/* End Date Picker Trigger */}
            <Text style={styles.inputLabel}>End Date:</Text>
            <TouchableOpacity 
              style={styles.datePickerTrigger}
              onPress={() => { setCalendarTarget('end'); setCalendarVisible(true); }}
            >
              <Text style={styles.datePickerTriggerText}>📅 {endDate}</Text>
            </TouchableOpacity>

            {actionLoading ? (
              <ActivityIndicator color="#38bdf8" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ gap: 10, marginTop: 14 }}>
                <TouchableOpacity 
                  style={styles.downloadBtn}
                  onPress={handleDownloadBackup}
                  activeOpacity={0.8}
                >
                  <Text style={styles.downloadBtnText}>📥 Download / Print Backup</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.permanentBtn}
                  onPress={handlePermanentDelete}
                  activeOpacity={0.8}
                >
                  <Text style={styles.permanentBtnText}>🗑️ Permanent Delete Range</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelBtn}
                  onPress={() => setRangeModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Integration of CustomDatePickerModal Component */}
      <CustomDatePickerModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={calendarTarget === 'start' ? startDate : endDate}
        onSelectDate={(pickedDate) => {
          if (calendarTarget === 'start') {
            setStartDate(pickedDate);
          } else {
            setEndDate(pickedDate);
          }
        }}
        title={calendarTarget === 'start' ? "Select Start Date" : "Select End Date"}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6 },

  controlsBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  subtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  controlsActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  selectModeBtn: { 
    backgroundColor: '#1e293b', 
    borderWidth: 1.5, 
    borderColor: '#38bdf8', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  selectModeBtnActive: { backgroundColor: '#38bdf8' },
  selectModeBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  selectModeBtnTextActive: { color: '#0f172a' },

  clearRangeTrigger: { 
    backgroundColor: 'rgba(56, 189, 248, 0.15)', 
    borderWidth: 1.5, 
    borderColor: '#38bdf8', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  clearRangeTriggerText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },

  multiSelectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 12
  },
  multiSelectActionBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0f172a', borderRadius: 8 },
  multiSelectActionText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  multiDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  multiDeleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  sectionHeader: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    marginTop: 6,
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
  splitBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#f59e0b' },
  paymentBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  splitBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#f59e0b' },

  singleDeleteBtn: { padding: 4 },
  singleDeleteText: { fontSize: 15 },

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
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, marginBottom: 40 },

  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#38bdf8'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCloseText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold', padding: 4 },

  presetsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  presetChip: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  presetText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },

  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 4, marginTop: 6 },
  datePickerTrigger: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6
  },
  datePickerTriggerText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  downloadBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center'
  },
  downloadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  permanentBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center'
  },
  permanentBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 2
  },
  cancelBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 }
});