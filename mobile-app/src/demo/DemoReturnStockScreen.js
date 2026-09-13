import React, { useState, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Alert, TouchableOpacity, 
  ActivityIndicator, ScrollView, Image, SafeAreaView, Platform, Modal, FlatList
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../../context/LanguageContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import BackButton from '../../components/BackButton';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const DEMO_RETURN_LIMIT_KEY = 'billpe_demo_return_action_count';
const DEMO_PRODUCTS_KEY = 'billpe_demo_local_products';

export default function DemoReturnStockScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [invoiceDropdownVisible, setInvoiceDropdownVisible] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const [returnItemData, setReturnItemData] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [actionsLeft, setActionsLeft] = useState(5);

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
    }, [])
  );

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_RETURN_LIMIT_KEY);
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
      const savedCount = await AsyncStorage.getItem(DEMO_RETURN_LIMIT_KEY);
      const currentCount = savedCount ? parseInt(savedCount, 10) : 0;

      if (currentCount >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached / डेमो लिमिट समाप्त",
          t('demoLimitReachedMsg') || "आपने रिटर्न के 5 फ्री एक्शन्स पूरे कर लिए हैं। / You have used 5 free actions.",
          [{ text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }]
        );
        return;
      }

      const nextCount = currentCount + 1;
      await AsyncStorage.setItem(DEMO_RETURN_LIMIT_KEY, nextCount.toString());
      
      const remaining = 5 - nextCount;
      setActionsLeft(remaining > 0 ? remaining : 0);

      callback();
    } catch (e) {
      console.log('Error updating limit:', e);
      callback();
    }
  };

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

    setTimeout(async () => {
      try {
        const localData = await AsyncStorage.getItem(DEMO_PRODUCTS_KEY);
        const products = localData ? JSON.parse(localData) : [
          { _id: 'd1', productName: 'Parle-G Biscuit', price: 10, lowestRate: 8, highestRate: 10, stock: 45, barcode: '8901234' },
          { _id: 'd2', productName: 'Colgate MaxFresh', price: 95, lowestRate: 80, highestRate: 95, stock: 20, barcode: '8905678' }
        ];

        const foundProduct = products.find(p => p.barcode === data || p._id === data) || {
          _id: 'dyn_' + Date.now(),
          productName: `Demo Item (${data.slice(-4)})`,
          price: 50,
          stock: 10,
          barcode: data
        };

        const mockPastSale = {
          _id: 'sale_' + Date.now(),
          invoiceNo: `BP-DEMO-${Date.now().toString().slice(-4)}`,
          paymentMode: 'Cash',
          quantity: 5,
          returnedQuantity: 0,
          price: foundProduct.price,
          customerName: 'Demo Customer',
          customerPhone: '9876543210',
          soldByName: 'Demo Staff',
          createdAt: new Date().toISOString()
        };

        setLoading(false);
        setTargetProduct(foundProduct);
        setScannedBarcode(data);
        setAvailableInvoices([mockPastSale]);

        selectActiveInvoice(mockPastSale, foundProduct, data);
      } catch (err) {
        setLoading(false);
        Alert.alert(t('error'), t('Failed to fetch sales history.'));
      }
    }, 400);
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
      Alert.alert(t('error'), `${t('Please enter valid quantity (Max allowed:')} ${returnItemData.maxAllowed})`);
      return;
    }

    handleDemoActionWrapper(async () => {
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        const refundAmt = returnQty * returnItemData.sale.price;

        Alert.alert(
          "Return Processed (Demo) ✅",
          `Restocked: ${returnQty} unit(s)\nRefund to Customer: ₹${refundAmt.toFixed(2)}`,
          [
            { text: t('Return Another'), onPress: () => { setReturnItemData(null); setScanner(true); } },
            { text: t('Back to Dashboard'), onPress: () => navigation.goBack() }
          ]
        );
      }, 500);
    });
  };

  if (scanner) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["code128", "qr", "ean13"] }}
        />
        <SafeAreaView style={styles.uniformCameraOverlay}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 24 : 0 }}>
            <BackButton 
              onPress={() => navigation.goBack()} 
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)' }} 
            />
            <LanguageSwitcher />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={[styles.infoText, { marginTop: 12 }]}>{t('Verifying sale history...')}</Text>
      </View>
    );
  }

  if (!returnItemData) return null;

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <Text style={styles.header}>{t('Return Portal')} (Demo)</Text>

      <View style={styles.returnCard}>
        <View style={styles.cardHeader}>
          <View style={styles.invoiceDropdownPill}>
            <Text style={styles.invoicePillText}>#{returnItemData.sale.invoiceNo}</Text>
          </View>
          <View style={[styles.payBadge, styles.payCash]}>
            <Text style={styles.payBadgeText}>{returnItemData.sale.paymentMode}</Text>
          </View>
        </View>

        <View style={styles.productRow}>
          <View style={[styles.thumbnail, styles.noImg]}><Text style={{fontSize: 22}}>📦</Text></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.productTitle}>{returnItemData.product.productName}</Text>
            <Text style={styles.categoryText}>{t('Category:')} {returnItemData.product.category || 'General'}</Text>
            <Text style={styles.barcodeText}>{t('Barcode:')} #{returnItemData.barcode}</Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.boxHeading}>{t('Verification')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('Customer:')}</Text>
            <Text style={styles.infoValueHighlight}>{returnItemData.sale.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('Mobile:')}</Text>
            <Text style={styles.infoVal}>{returnItemData.sale.customerPhone}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>{t('Bought')}</Text>
            <Text style={styles.statVal}>{returnItemData.sale.quantity} {t('pcs')}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>{t('Already Returned')}</Text>
            <Text style={[styles.statVal, { color: '#f59e0b' }]}>{returnItemData.sale.returnedQuantity || 0} {t('pcs')}</Text>
          </View>
          <View style={[styles.statPill, { borderColor: '#10b981' }]}>
            <Text style={styles.statLabel}>{t('Max Returnable')}</Text>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{returnItemData.maxAllowed} {t('pcs')}</Text>
          </View>
        </View>

        <Text style={styles.selectorLabel}>{t('Return Qty:')}</Text>
        <View style={styles.qtyControlRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setReturnQty(prev => Math.max(1, prev - 1))}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <View style={styles.qtyDisplay}>
            <Text style={styles.qtyDisplayText}>{returnQty}</Text>
          </View>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setReturnQty(prev => Math.min(returnItemData.maxAllowed, prev + 1))}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.refundSummaryBox}>
          <Text style={styles.refundLabel}>{t('Total Refund:')}</Text>
          <Text style={styles.refundAmount}>₹{(returnQty * returnItemData.sale.price).toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmReturn} disabled={submitting} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator color="#0f172a" size="small" /> : <Text style={styles.confirmBtnText}>✓ {t('Confirm Return')} (Demo)</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanAnotherBtn} onPress={() => { setReturnItemData(null); setScanner(true); }}>
          <Text style={styles.scanAnotherText}>{t('Scan Another')}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 },
  infoText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold' },
  uniformCameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, zIndex: 10 },
  returnCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  invoiceDropdownPill: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' },
  invoicePillText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },
  payBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  payCash: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981' },
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