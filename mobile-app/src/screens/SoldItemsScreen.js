import React, { useState, useContext, useEffect, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, SectionList, Alert, ActivityIndicator, 
  StyleSheet, Modal, TextInput 
} from 'react-native';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import CustomDatePickerModal from '../components/CustomDatePickerModal'; 

export default function SoldItemsScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSplitIds, setExpandedSplitIds] = useState(new Set());

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [archiving, setArchiving] = useState(false);

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

  const [calendarTarget, setCalendarTarget] = useState(null); 
  const [calendarVisible, setCalendarVisible] = useState(false);

  const fetchSalesHistory = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/sales/history');
      if (data.success) {
        setSales(data.sales || []);
      }
    } catch (err) {
      Alert.alert(t('error'), t('Failed to load sales history.'));
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
        Alert.alert(t('success'), data.message || t('Records removed from history.'));
      }
    } catch (err) {
      setArchiving(false);
      Alert.alert(t('error'), err.response?.data?.message || t('Failed to remove records.'));
    }
  };

  const handleSingleDelete = (id, productName) => {
    Alert.alert(
      t('Remove from History?'),
      t('Remove') + ` "${productName}" ` + t('from sales history?'),
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
      Alert.alert(t('No Items Selected'), t('Please tap on items to select them first.'));
      return;
    }

    Alert.alert(
      t('Remove Selected?'),
      t('Remove') + ` ${selectedIds.size} ` + t('selected item(s) from history?'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: `${t('delete')} (${selectedIds.size})`, 
          style: 'destructive',
          onPress: () => executeSoftDelete(Array.from(selectedIds))
        }
      ]
    );
  };

  const validateDates = () => {
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert(t('error'), t('Please enter both Start Date and End Date.'));
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate.trim()) || !dateRegex.test(endDate.trim())) {
      Alert.alert(t('error'), t('Please use YYYY-MM-DD format.'));
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
        Alert.alert(t('No Records'), t('No sales found in this date range.'));
        return;
      }

      const totalQty = res.sales.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
      const totalReturnedQty = res.sales.reduce((acc, curr) => acc + Number(curr.returnedQuantity || 0), 0);
      const grandTotal = res.sales.reduce((acc, curr) => acc + Number(curr.totalAmount || curr.price || 0), 0);

      const rows = res.sales.map((item, idx) => {
        const qty = Number(item.quantity || 1);
        const rate = Number(item.price || 0);
        const total = Number(item.totalAmount || (rate * qty));
        const retQty = Number(item.returnedQuantity || 0);
        const retPrice = retQty * rate;

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
            <td>${item.invoiceNo || 'N/A'}</td>
            <td><strong>${item.productName}</strong></td>
            <td style="text-align: center;">${qty}</td>
            <td style="text-align: right;">₹${rate.toFixed(2)}</td>
            <td style="text-align: right;"><strong>₹${total.toFixed(2)}</strong></td>
            <td style="text-align: center; color: ${retQty > 0 ? '#d97706' : '#666'};">${retQty > 0 ? retQty : '-'}</td>
            <td style="text-align: right; color: ${retPrice > 0 ? '#d97706' : '#666'};">${retPrice > 0 ? '₹' + retPrice.toFixed(2) : '-'}</td>
            <td>${item.paymentMode || 'Cash'}</td>
            <td>${item.soldByName || 'Staff'}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 15px; color: #222; }
              .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 10px; }
              h2 { margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; }
              p { margin: 2px 0; font-size: 12px; color: #555; }
              .meta-box { font-size: 12px; margin-bottom: 12px; background: #f8f9fa; padding: 8px; border-radius: 4px; border: 1px solid #ddd; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
              th { background-color: #f1f5f9; padding: 6px; border: 1px solid #cbd5e1; text-align: left; }
              td { padding: 6px; border: 1px solid #cbd5e1; }
              .summary-box { margin-top: 15px; background: #f1f5f9; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px; }
              .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${res.storeInfo?.storeName || 'RETAIL STORE'}</h2>
              <p>${res.storeInfo?.address || ''}</p>
              <p><strong>Contact:</strong> ${res.storeInfo?.phone || res.storeInfo?.ownerPhone || 'N/A'}</p>
            </div>

            <div class="meta-box">
              <div><strong>${t('ReportPeriod:') || 'Report Period:'}</strong> ${startDate.trim()} to ${endDate.trim()}</div>
              <div><strong>${t('ExportedOn:') || 'Exported On:'}</strong> ${new Date().toLocaleString('en-IN')}</div>
            </div>

            <h3 style="text-align: center; font-size: 13px; margin: 8px 0; text-transform: uppercase;">${t('Detailed Sales & Return Report')}</h3>

            <table>
              <thead>
                <tr>
                  <th>${t('th_sr')}</th>
                  <th>${t('th_date')}</th>
                  <th>${t('th_invoice')}</th>
                  <th>${t('th_product')}</th>
                  <th>${t('th_qty')}</th>
                  <th>${t('th_rate')}</th>
                  <th>${t('th_total')}</th>
                  <th>${t('th_ret_qty')}</th>
                  <th>${t('th_ret_amt')}</th>
                  <th>${t('th_mode')}</th>
                  <th>${t('th_staff')}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="summary-box">
              <div class="summary-row"><span>${t('Total Records / Bills:')}</span> <strong>${res.sales.length}</strong></div>
              <div class="summary-row"><span>${t('Total Items Sold (Qty):')}</span> <strong>${totalQty} pcs</strong></div>
              <div class="summary-row"><span>${t('Total Items Returned:')}</span> <strong style="color: #d97706;">${totalReturnedQty} pcs</strong></div>
              <div class="summary-row" style="font-size: 14px; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px;">
                <span><strong>${t('Net Grand Total:')}</strong></span> 
                <strong style="color: #059669;">₹${grandTotal.toFixed(2)}</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (err) {
      setActionLoading(false);
      Alert.alert(t('error'), t('Failed to export backup sheet.'));
    }
  };

  const handlePermanentDelete = () => {
    if (!validateDates()) return;

    Alert.alert(
      t('Permanent Delete?'),
      `Are you sure you want to permanently delete records from ${startDate.trim()} to ${endDate.trim()}? This cannot be undone.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('Delete Permanently'),
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
                Alert.alert(t('success'), data.message || t('Records permanently deleted.'));
                setRangeModalVisible(false);
                fetchSalesHistory();
              }
            } catch (err) {
              setActionLoading(false);
              Alert.alert(t('error'), err.response?.data?.message || t('Permanent deletion failed.'));
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
      
      const itemAmount = Number(item.totalAmount || item.price) || 0;
      const isReturn = item.type === 'return' || item.isReturn === true || item.totalAmount < 0;

      if (isReturn) {
        groups[dateKey].totalAmount -= Math.abs(itemAmount);
      } else {
        groups[dateKey].totalAmount += itemAmount;
      }
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
              {isSelectMode ? t('cancel') : t('Select Entry')}
            </Text>
          </TouchableOpacity>

          {!isSelectMode && (
            <TouchableOpacity 
              style={styles.clearRangeTrigger}
              onPress={() => setRangeModalVisible(true)}
              activeOpacity={0.7}
            >
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
            {archiving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.multiDeleteText}>🗑️ {t('delete')} ({selectedIds.size})</Text>
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
                    Rate: ₹{item.price} × {item.quantity || 1} {t('pcs')}
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

      <Modal
        visible={rangeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRangeModalVisible(false)}
      >
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
              <TouchableOpacity style={styles.presetChip} onPress={() => setQuickPreset(29)}>
                <Text style={styles.presetText}>{t('Last 30 Days')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('Start Date:')}</Text>
            <TouchableOpacity 
              style={styles.datePickerTrigger}
              onPress={() => { setCalendarTarget('start'); setCalendarVisible(true); }}
            >
              <Text style={styles.datePickerTriggerText}>📅 {startDate}</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>{t('End Date:')}</Text>
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
                  <Text style={styles.downloadBtnText}>📥 {t('Download / Print Backup')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.permanentBtn}
                  onPress={handlePermanentDelete}
                  activeOpacity={0.8}
                >
                  <Text style={styles.permanentBtnText}>🗑️ {t('Permanent Delete Range')}</Text>
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