import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, SectionList, Alert, ActivityIndicator, 
  StyleSheet, Modal, BackHandler 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import CustomDatePickerModal from '../components/CustomDatePickerModal';
import BackButton from '../components/BackButton';
import ScreenWrapper from '../components/ScreenWrapper';

export default function SoldItemsScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSplitIds, setExpandedSplitIds] = useState(new Set());

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [archiving, setArchiving] = useState(false);

  const getTodayFormatted = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(getTodayFormatted());
  const [endDate, setEndDate] = useState(getTodayFormatted());
  const [activePicker, setActivePicker] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (activePicker) {
          setActivePicker(null);
          return true;
        }
        if (rangeModalVisible) {
          setRangeModalVisible(false);
          return true;
        }
        if (isSelectMode) {
          exitSelectMode();
          return true;
        }
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [activePicker, rangeModalVisible, isSelectMode, navigation])
  );

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
    if (!startDate || !endDate) {
      Alert.alert(t('error'), 'Please select both Start Date and End Date.');
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert(t('error'), 'Start Date cannot be greater than End Date.');
      return false;
    }
    return true;
  };

  const handleDownloadBackup = async () => {
    if (!validateDates()) return;

    setActionLoading(true);
    try {
      const { data: res } = await axiosInstance.post('/sales/history/export-range', {
        startDate,
        endDate
      });
      setActionLoading(false);

      if (!res.success || !res.sales || res.sales.length === 0) {
        Alert.alert('No Records', 'No sales found in this date range.');
        return;
      }

      let totalGrossSales = 0;
      let totalReturnedAmount = 0;
      let totalCashCollected = 0;
      let totalOnlineCollected = 0;

      const rows = res.sales.map((item, idx) => {
        const soldQty = Number(item.quantity || 1);
        const returnedQty = Number(item.returnedQuantity || 0);
        const unitPrice = Number(item.price || 0);
        const grossItemTotal = Number(item.totalAmount || (unitPrice * soldQty));
        const returnedValue = returnedQty * unitPrice;

        totalGrossSales += grossItemTotal;
        totalReturnedAmount += returnedValue;

        let payModeDisplay = item.paymentMode || 'Cash';
        if (item.paymentMode === 'Split') {
          const cAmt = Number(item.cashAmount || 0);
          const oAmt = Number(item.onlineAmount || 0);
          totalCashCollected += cAmt;
          totalOnlineCollected += oAmt;
          payModeDisplay = `Split (Cash: ₹${cAmt} | Online: ₹${oAmt})`;
        } else if (item.paymentMode === 'Online') {
          totalOnlineCollected += grossItemTotal;
        } else {
          totalCashCollected += grossItemTotal;
        }

        const customerInfo = (item.customerName && item.customerName !== 'N/A')
          ? `${item.customerName}${item.customerPhone && item.customerPhone !== 'N/A' ? `<br/><span style="color:#64748b; font-size:10px;">📞 ${item.customerPhone}</span>` : ''}`
          : '<span style="color:#94a3b8;">Walk-in</span>';

        const saleDateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const saleTimeStr = new Date(item.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return `
          <tr>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; font-size: 10px;">${saleDateStr}<br/><span style="color:#64748b;">${saleTimeStr}</span></td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 11px;">${item.invoiceNo || 'N/A'}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; font-weight: 500;">${item.productName}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: right;">₹${unitPrice.toFixed(2)}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${soldQty}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${grossItemTotal.toFixed(2)}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; color: ${returnedQty > 0 ? '#dc2626' : '#94a3b8'};">
              ${returnedQty > 0 ? `<strong>${returnedQty}</strong><br/><span style="font-size:10px;">(-₹${returnedValue.toFixed(2)})</span>` : '-'}
            </td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1;">${customerInfo}</td>
            <td style="padding: 6px 4px; border: 1px solid #cbd5e1; font-size: 10px;">${payModeDisplay}</td>
          </tr>
        `;
      }).join('');

      const netSales = totalGrossSales - totalReturnedAmount;
      const storeName = res.storeInfo?.storeName || 'RETAIL POS STORE';
      const storeAddress = res.storeInfo?.address || '';
      const storePhone = res.storeInfo?.phone || res.storeInfo?.ownerPhone || '';
      const generatedAt = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 16px; color: #0f172a; margin: 0; }
              .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
              .store-title { font-size: 22px; font-weight: bold; text-transform: uppercase; margin: 0 0 2px 0; color: #0f172a; }
              .store-meta { font-size: 11px; color: #475569; margin: 2px 0; }
              .report-title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; }
              .report-badge { font-size: 13px; font-weight: bold; color: #0369a1; background: #e0f2fe; padding: 4px 8px; border-radius: 4px; }
              .period-box { font-size: 11px; color: #334155; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
              th { background-color: #f1f5f9; padding: 8px 4px; border: 1px solid #94a3b8; text-align: left; font-size: 10px; text-transform: uppercase; color: #1e293b; }
              .summary-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
              .summary-box { width: 300px; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
              .summary-line { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
              .summary-total { border-top: 2px solid #0f172a; padding-top: 6px; font-size: 14px; font-weight: bold; color: #0f172a; }
              .mode-split { font-size: 10px; color: #64748b; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
            </style>
          </head>
          <body>
            <div class="header-box">
              <h1 class="store-title">${storeName}</h1>
              ${storeAddress ? `<p class="store-meta">📍 ${storeAddress}</p>` : ''}
              ${storePhone ? `<p class="store-meta">📞 Tel: ${storePhone}</p>` : ''}
              
              <div class="report-title-row">
                <span class="report-badge">SALES & INVENTORY AUDIT REPORT</span>
                <span class="store-meta"><strong>Exported:</strong> ${generatedAt}</span>
              </div>
              <div class="period-box">
                <strong>Period:</strong> ${startDate} to ${endDate} &nbsp;|&nbsp; <strong>Total Records:</strong> ${res.sales.length}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: center; width: 25px;">#</th>
                  <th>Date & Time</th>
                  <th>Bill No</th>
                  <th>Item Name</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: center;">Sold</th>
                  <th style="text-align: right;">Total (₹)</th>
                  <th style="text-align: center;">Returned</th>
                  <th>Customer</th>
                  <th>Payment Mode</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="summary-wrapper">
              <div class="summary-box">
                <div class="summary-line">
                  <span>Gross Sales Amount:</span>
                  <strong>₹${totalGrossSales.toFixed(2)}</strong>
                </div>
                <div class="summary-line" style="color: #dc2626;">
                  <span>Return / Refund Deductions:</span>
                  <strong>- ₹${totalReturnedAmount.toFixed(2)}</strong>
                </div>
                <div class="summary-line summary-total">
                  <span>Net Revenue Realized:</span>
                  <span>₹${netSales.toFixed(2)}</span>
                </div>
                <div class="mode-split">
                  Realized Cash: <strong>₹${totalCashCollected.toFixed(2)}</strong> | Online / UPI: <strong>₹${totalOnlineCollected.toFixed(2)}</strong>
                </div>
              </div>
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
      `Are you sure you want to permanently delete records from ${startDate} to ${endDate}? This cannot be undone.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data } = await axiosInstance.post('/sales/history/permanent-delete-range', {
                startDate,
                endDate
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
    <ScreenWrapper scrollable={false}>
      <BackButton onPress={() => navigation.goBack()} title={t('backToDashboard')} />

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
              <Text style={styles.clearRangeTriggerText}>Delete by Date</Text>
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

            <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD):</Text>
            <TouchableOpacity 
              style={styles.formDateBox} 
              onPress={() => setActivePicker('start')}
              activeOpacity={0.8}
            >
              <Text style={styles.formDateText}>{startDate}</Text>
              <Text style={styles.formDateIcon}>📅</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>End Date (YYYY-MM-DD):</Text>
            <TouchableOpacity 
              style={styles.formDateBox} 
              onPress={() => setActivePicker('end')}
              activeOpacity={0.8}
            >
              <Text style={styles.formDateText}>{endDate}</Text>
              <Text style={styles.formDateIcon}>📅</Text>
            </TouchableOpacity>

            {actionLoading ? (
              <ActivityIndicator color="#38bdf8" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ gap: 10, marginTop: 12 }}>
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
                  <Text style={styles.permanentBtnText}>🗑️ Permanent Delete</Text>
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
        visible={!!activePicker}
        title={activePicker === 'start' ? "Select Start Date" : "Select End Date"}
        selectedDate={activePicker === 'start' ? startDate : endDate}
        onClose={() => setActivePicker(null)}
        onSelectDate={(pickedDate) => {
          if (activePicker === 'start') setStartDate(pickedDate);
          else setEndDate(pickedDate);
        }}
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)', 
    borderWidth: 1.5, 
    borderColor: '#ef4444', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  clearRangeTriggerText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
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
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },
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
    marginBottom: 12
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCloseText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold', padding: 4 },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  formDateBox: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  formDateText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  formDateIcon: { fontSize: 16 },
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