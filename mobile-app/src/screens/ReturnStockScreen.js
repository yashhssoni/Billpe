import React, { useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, Alert, TouchableOpacity, 
  ActivityIndicator, ScrollView, Image, SafeAreaView, Platform, Modal, FlatList
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import { useSales } from '../hooks/useSales';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';

export default function ReturnStockScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const { processReturn } = useSales();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // States for multiple invoices management
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [invoiceDropdownVisible, setInvoiceDropdownVisible] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const [returnItemData, setReturnItemData] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>{t('cameraPermissionText')}</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>{t('grantPermissionBtn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    setScanner(false);
    setLoading(true);

    try {
      const { data: prodRes } = await axiosInstance.get('/products?includeSold=true');
      const foundProduct = (prodRes.products || []).find(p => p.barcode === data);

      if (!foundProduct) {
        setLoading(false);
        Alert.alert(t('error'), 'Product not found in store database.', [
          { text: 'Scan Again', onPress: () => setScanner(true) },
          { text: 'Back', style: 'cancel', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      const { data: saleRes } = await axiosInstance.get('/sales/history');
      // Saari returnable sales nikalo is barcode ki
      const pastSales = (saleRes.sales || []).filter(s => {
        const isMatch = s.barcode === data || (s.productId && s.productId._id === foundProduct._id);
        const maxAllowed = Number(s.quantity || 0) - Number(s.returnedQuantity || 0);
        return isMatch && maxAllowed > 0;
      });

      setLoading(false);

      if (pastSales.length === 0) {
        Alert.alert(
          'No Active Sales', 
          `No returnable items found for "${foundProduct.productName}". All units might have already been returned.`,
          [
            { text: 'Scan Again', onPress: () => setScanner(true) },
            { text: 'Dashboard', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }

      setTargetProduct(foundProduct);
      setScannedBarcode(data);
      setAvailableInvoices(pastSales);

      // By default sabse pehli/latest invoice select kar lo
      selectActiveInvoice(pastSales[0], foundProduct, data);
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Failed to fetch sales history for verification.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  const selectActiveInvoice = (saleRecord, product, barcode) => {
    const maxAllowed = Math.max(0, Number(saleRecord.quantity) - Number(saleRecord.returnedQuantity || 0));

    setReturnItemData({
      product: product || targetProduct,
      sale: saleRecord,
      barcode: barcode || scannedBarcode,
      maxAllowed
    });
    setReturnQty(1);
  };

  const handleConfirmReturn = async () => {
    if (!returnItemData) return;

    if (returnQty <= 0 || returnQty > returnItemData.maxAllowed) {
      Alert.alert('Error', `Please enter valid quantity (Max allowed: ${returnItemData.maxAllowed})`);
      return;
    }

    setSubmitting(true);
    const res = await processReturn(
      returnItemData.barcode,
      returnQty,
      returnItemData.sale.invoiceNo
    );
    setSubmitting(false);

    if (res.success) {
      Alert.alert(
        'Return Processed ✅',
        `Restocked: ${returnQty} unit(s)\nRefund to Customer: ₹${res.refundAmount?.toFixed(2)}\nCurrent Stock: ${res.currentStock} pcs`,
        [
          { text: 'Return Another', onPress: () => { setReturnItemData(null); setScanner(true); } },
          { text: 'Back to Dashboard', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      Alert.alert('Error', res.message || 'Failed to process return.');
    }
  };

  if (scanner) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["code128"] }}
        />
        <SafeAreaView style={styles.uniformCameraOverlay}>
          <View style={{ paddingTop: Platform.OS === 'android' ? 24 : 0 }}>
            <BackButton 
              onPress={() => navigation.goBack()} 
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)' }} 
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={[styles.infoText, { marginTop: 12 }]}>Verifying sale history...</Text>
      </View>
    );
  }

  if (!returnItemData) {
    return null;
  }

  return (
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.header}>वापसी पोर्टल (Return Portal)</Text>

      <View style={styles.returnCard}>
        <View style={styles.cardHeader}>
          {/* Invoice Dropdown Pill Button */}
          <TouchableOpacity 
            style={styles.invoiceDropdownPill}
            onPress={() => {
              if (availableInvoices.length > 1) {
                setInvoiceDropdownVisible(true);
              } else {
                Alert.alert('Info', 'Only 1 active invoice available for this item.');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.invoicePillText}>
              #{returnItemData.sale.invoiceNo} {availableInvoices.length > 1 ? '▼' : ''}
            </Text>
          </TouchableOpacity>

          <View style={[styles.payBadge, returnItemData.sale.paymentMode === 'Online' ? styles.payOnline : styles.payCash]}>
            <Text style={styles.payBadgeText}>{returnItemData.sale.paymentMode || 'CASH'}</Text>
          </View>
        </View>

        <View style={styles.productRow}>
          {returnItemData.product.imageUri ? (
            <Image source={{ uri: returnItemData.product.imageUri }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.noImg]}><Text style={{fontSize: 22}}>📦</Text></View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.productTitle}>{returnItemData.product.productName}</Text>
            <Text style={styles.categoryText}>Category: {returnItemData.product.category || 'General'}</Text>
            <Text style={styles.barcodeText}>Barcode: #{returnItemData.barcode}</Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.boxHeading}>सत्यापन (Verification)</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ग्राहक (Customer):</Text>
            <Text style={styles.infoValueHighlight}>{returnItemData.sale.customerName || 'Walk-in Customer'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile:</Text>
            <Text style={styles.infoVal}>{returnItemData.sale.customerPhone || 'N/A'}</Text>
          </View>
          {returnItemData.sale.customerAddress && returnItemData.sale.customerAddress !== 'N/A' ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{returnItemData.sale.customerAddress}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Billed By:</Text>
            <Text style={styles.infoVal}>{returnItemData.sale.soldByName || 'Staff'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sale Date:</Text>
            <Text style={styles.infoVal}>{new Date(returnItemData.sale.createdAt).toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>खरीदा (Bought)</Text>
            <Text style={styles.statVal}>{returnItemData.sale.quantity} पीस</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>पहले ही वापस (Returned)</Text>
            <Text style={[styles.statVal, { color: '#f59e0b' }]}>{returnItemData.sale.returnedQuantity || 0} पीस</Text>
          </View>
          <View style={[styles.statPill, { borderColor: '#10b981' }]}>
            <Text style={styles.statLabel}>अधिकतम वापसी (Max)</Text>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{returnItemData.maxAllowed} पीस</Text>
          </View>
        </View>

        <Text style={styles.selectorLabel}>वापसी मात्रा (Return Qty):</Text>
        <View style={styles.qtyControlRow}>
          <TouchableOpacity 
            style={styles.qtyBtn}
            onPress={() => setReturnQty(prev => Math.max(1, prev - 1))}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>

          <View style={styles.qtyDisplay}>
            <Text style={styles.qtyDisplayText}>{returnQty}</Text>
          </View>

          <TouchableOpacity 
            style={styles.qtyBtn}
            onPress={() => setReturnQty(prev => Math.min(returnItemData.maxAllowed, prev + 1))}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.refundSummaryBox}>
          <Text style={styles.refundLabel}>कुल रिफंड (Total Refund):</Text>
          <Text style={styles.refundAmount}>₹{(returnQty * returnItemData.sale.price).toFixed(2)}</Text>
        </View>

        <TouchableOpacity 
          style={styles.confirmBtn}
          onPress={handleConfirmReturn}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#0f172a" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>✓ पुष्टि करें (Confirm Return)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.scanAnotherBtn}
          onPress={() => { setReturnItemData(null); setScanner(true); }}
        >
          <Text style={styles.scanAnotherText}>दूसरा स्कैन (Scan Another)</Text>
        </TouchableOpacity>
      </View>

      {/* Invoice Switcher Modal */}
      <Modal visible={invoiceDropdownVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📄 Select Invoice Number</Text>
            <Text style={styles.modalSubTitle}>Multiple invoices found for this barcode. Choose customer bill:</Text>

            <FlatList
              data={availableInvoices}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 320, marginVertical: 10 }}
              renderItem={({ item }) => {
                const maxRet = Number(item.quantity) - Number(item.returnedQuantity || 0);
                const isSelected = returnItemData?.sale?._id === item._id;
                return (
                  <TouchableOpacity 
                    style={[styles.invoiceSelectItem, isSelected && styles.invoiceSelectItemActive]}
                    onPress={() => {
                      setInvoiceDropdownVisible(false);
                      selectActiveInvoice(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.selectInvoiceNo}>#{item.invoiceNo}</Text>
                      <Text style={styles.selectDate}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
                    </View>
                    <Text style={styles.selectCustomer}>👤 {item.customerName || 'Walk-in'} ({item.customerPhone || 'N/A'})</Text>
                    <Text style={styles.selectQty}>Returnable: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{maxRet} pcs</Text></Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setInvoiceDropdownVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 },
  infoText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold' },

  uniformCameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, zIndex: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: '#38bdf8' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 6, textAlign: 'center' },
  modalSubTitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 12 },
  invoiceSelectItem: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  invoiceSelectItemActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  selectInvoiceNo: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14 },
  selectDate: { color: '#94a3b8', fontSize: 12 },
  selectCustomer: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  selectQty: { color: '#cbd5e1', fontSize: 12 },
  modalCloseBtn: { backgroundColor: '#334155', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  modalCloseText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },

  returnCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  invoiceDropdownPill: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' },
  invoicePillText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },
  payBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  payCash: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981' },
  payOnline: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: '#3b82f6' },
  payBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#1e293b' },
  noImg: { justifyContent: 'center', alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  categoryText: { color: '#94a3b8', fontSize: 12 },
  barcodeText: { color: '#64748b', fontSize: 11, marginTop: 2 },

  detailsBox: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  boxHeading: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  infoLabel: { color: '#94a3b8', fontSize: 13 },
  infoVal: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  infoValueHighlight: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statPill: { flex: 1, backgroundColor: '#0f172a', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  statLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  statVal: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  selectorLabel: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  qtyControlRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 14 },
  qtyBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  qtyDisplay: { width: 80, height: 50, backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1.5, borderColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  qtyDisplayText: { color: '#f59e0b', fontSize: 22, fontWeight: 'bold' },

  refundSummaryBox: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: '#f59e0b', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  refundLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold' },
  refundAmount: { color: '#f59e0b', fontSize: 20, fontWeight: '900' },

  confirmBtn: { backgroundColor: '#f59e0b', paddingVertical: 15, borderRadius: 12, alignItems: 'center', elevation: 4 },
  confirmBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '900', textTransform: 'uppercase' },
  scanAnotherBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  scanAnotherText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' }
});