import React, { useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, Alert, TouchableOpacity, 
  ActivityIndicator, ScrollView, Image, SafeAreaView, Platform
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
          { text: 'Back to Dashboard', style: 'cancel', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      const { data: saleRes } = await axiosInstance.get('/sales/history');
      const pastSales = (saleRes.sales || []).filter(s => s.barcode === data || (s.productId && s.productId._id === foundProduct._id));

      setLoading(false);

      if (pastSales.length === 0) {
        Alert.alert(
          'No Sales Record', 
          `Product "${foundProduct.productName}" exists, but has zero sales history in this store.`,
          [
            { text: 'Scan Again', onPress: () => setScanner(true) },
            { text: 'Back to Dashboard', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }

      const latestSale = pastSales[0];
      const maxAllowed = Math.max(0, latestSale.quantity - (latestSale.returnedQuantity || 0));

      if (maxAllowed <= 0) {
        Alert.alert(
          'Already Returned', 
          `All units of Invoice #${latestSale.invoiceNo} have already been returned!`,
          [
            { text: 'Scan Again', onPress: () => setScanner(true) },
            { text: 'Back to Dashboard', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }

      setReturnItemData({
        product: foundProduct,
        sale: latestSale,
        barcode: data,
        maxAllowed
      });
      setReturnQty(1);
    } catch (err) {
      setLoading(false);
      Alert.alert(t('error'), 'Failed to fetch sales history for verification.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnItemData) return;

    if (returnQty <= 0 || returnQty > returnItemData.maxAllowed) {
      Alert.alert(t('error'), `Invalid quantity! Max return allowed is ${returnItemData.maxAllowed}.`);
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
          { text: 'Back to Portal', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      Alert.alert(t('error'), res.message || 'Failed to process return.');
    }
  };

  // Jab scanner active ho toh absolute camera render hoga, par padding/wrapper uniform rakhenge
  if (scanner) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["code128"] }}
        />
        {/* Uniform Back Button container placed just like ScreenWrapper */}
        <SafeAreaView style={styles.uniformCameraOverlay}>
          <View style={{ paddingTop: Platform.OS === 'android' ? 24 : 0 }}>
            <BackButton 
              onPress={() => navigation.goBack()} 
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)' }} // Thoda dark background clarity ke liye
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
    navigation.goBack();
    return null;
  }

  return (
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.header}>Return & Restock Portal</Text>

      <View style={styles.returnCard}>
        <View style={styles.cardHeader}>
          <View style={styles.invoicePill}>
            <Text style={styles.invoicePillText}>#{returnItemData.sale.invoiceNo}</Text>
          </View>
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
          <Text style={styles.boxHeading}>SALE VERIFICATION</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer:</Text>
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
            <Text style={styles.statLabel}>Bought</Text>
            <Text style={styles.statVal}>{returnItemData.sale.quantity} pcs</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Already Returned</Text>
            <Text style={[styles.statVal, { color: '#f59e0b' }]}>{returnItemData.sale.returnedQuantity || 0} pcs</Text>
          </View>
          <View style={[styles.statPill, { borderColor: '#10b981' }]}>
            <Text style={styles.statLabel}>Max Returnable</Text>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{returnItemData.maxAllowed} pcs</Text>
          </View>
        </View>

        <Text style={styles.selectorLabel}>Select Return Quantity:</Text>
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
          <Text style={styles.refundLabel}>Total Refund to Customer:</Text>
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
            <Text style={styles.confirmBtnText}>✓ Confirm Return & Restock</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.scanAnotherBtn}
          onPress={() => { setReturnItemData(null); setScanner(true); }}
        >
          <Text style={styles.scanAnotherText}>Scan Another Item</Text>
        </TouchableOpacity>
      </View>
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

  returnCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  invoicePill: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' },
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