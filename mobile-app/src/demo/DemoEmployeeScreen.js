import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Button, TextInput, Alert, 
  TouchableOpacity, ActivityIndicator, ScrollView, Modal, SafeAreaView 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import BackButton from '../../components/BackButton';

const DEMO_BILLING_LIMIT_KEY = 'billpe_demo_billing_action_count';

export default function DemoEmployeeScreen({ navigation, route }) {
  const { t } = useContext(LanguageContext);
  const isAdminSwitch = route?.params?.isAdminSwitch || false;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(false);
  const [cart, setCart] = useState([]);
  const [currentScanned, setCurrentScanned] = useState(null);
  const [selectedQty, setSelectedQty] = useState('1');
  const [manualPrice, setManualPrice] = useState('');
  const [priceMode, setPriceMode] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState('Demo Staff');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [actionsLeft, setActionsLeft] = useState(5);
  
  const [todayTotalSold, setTodayTotalSold] = useState(0);
  const [todayTotalReturns, setTodayTotalReturns] = useState(0);
  const [todayNetTotal, setTodayNetTotal] = useState(0);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('1');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
      loadDemoSalesStats();
    }, [])
  );

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_BILLING_LIMIT_KEY);
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

  const loadDemoSalesStats = async () => {
    try {
      const savedSales = await AsyncStorage.getItem('demo_sales_total');
      const total = savedSales ? parseFloat(savedSales) : 1450;
      setTodayTotalSold(total);
      setTodayNetTotal(total - todayTotalReturns);
    } catch (e) {
      console.log('Error loading stats:', e);
    }
  };

  const handleDemoActionWrapper = async (callback) => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_BILLING_LIMIT_KEY);
      const currentCount = savedCount ? parseInt(savedCount, 10) : 0;

      if (currentCount >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached / डेमो लिमिट समाप्त",
          t('demoLimitReachedMsg') || "आपने बिलिंग के 5 फ्री एक्शन्स पूरे कर लिए हैं। / You have used 5 free actions.",
          [{ text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }]
        );
        return;
      }

      const nextCount = currentCount + 1;
      await AsyncStorage.setItem(DEMO_BILLING_LIMIT_KEY, nextCount.toString());
      
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
        <View style={{ marginTop: 15 }} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.btn, { backgroundColor: '#ef4444' }]}>
          <Text style={styles.btnText}>{t('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    setScanner(false);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const demoProductsList = [
        { _id: 'd1', productName: 'Parle-G Biscuit', price: 10, lowestRate: 8, highestRate: 10, stock: 45, barcode: '8901234' },
        { _id: 'd2', productName: 'Colgate MaxFresh', price: 95, lowestRate: 80, highestRate: 95, stock: 20, barcode: '8905678' },
        { _id: 'd3', productName: 'Fortune Oil 1L', price: 140, lowestRate: 130, highestRate: 140, stock: 12, barcode: '8909876' }
      ];

      const found = demoProductsList.find(item => item.barcode === data || item._id === data);
      if (!found) {
        setCurrentScanned({
          _id: 'dyn_' + Date.now(),
          productName: `Scanned Item (${data.slice(-4)})`,
          price: 50,
          lowestRate: 40,
          highestRate: 50,
          stock: 30,
          barcode: data
        });
      } else {
        setCurrentScanned(found);
      }

      setSelectedQty('1');
      setPriceMode('manual');
      setManualPrice(found ? String(found.price) : '50');
    }, 400);
  };

  const handleAddToCart = () => {
    if (!manualPrice) {
      Alert.alert(t('error'), t('Please enter agreed selling price.'));
      return;
    }
    const enteredPrice = parseFloat(manualPrice);
    const qtyToAdd = parseInt(selectedQty, 10);

    const newItem = {
      ...currentScanned,
      productId: currentScanned._id,
      quantity: qtyToAdd,
      agreedPrice: enteredPrice,
      price: enteredPrice,
      cartKey: Date.now().toString() + Math.random().toString(36).slice(2)
    };

    setCart([...cart, newItem]);
    setCurrentScanned(null);
    setManualPrice('');
    setSelectedQty('1');
    setPriceMode('manual');
  };

  const handleRemoveFromCart = (cartKey) => {
    setCart(cart.filter((item) => item.cartKey !== cartKey));
  };

  const handleOpenEditCartItem = (item) => {
    setEditingCartItem(item);
    setEditPrice(String(item.agreedPrice));
    setEditQty(String(item.quantity));
    setEditModalVisible(true);
  };

  const handleSaveCartEdit = () => {
    if (!editPrice) return;
    const newPrice = parseFloat(editPrice);
    const newQuantity = parseInt(editQty, 10);

    setCart(cart.map(item => {
      if (item.cartKey === editingCartItem.cartKey) {
        return { ...item, agreedPrice: newPrice, price: newPrice, quantity: newQuantity };
      }
      return item;
    }));

    setEditModalVisible(false);
    setEditingCartItem(null);
  };

  const grandTotalAmount = cart.reduce((sum, item) => sum + (item.agreedPrice * item.quantity), 0);

  const handleCompleteCheckout = async (shouldPrint = true) => {
    if (cart.length === 0) {
      Alert.alert(t('error'), t('Cart is empty.'));
      return;
    }

    handleDemoActionWrapper(async () => {
      const invoiceNo = `BP-DEMO-${Date.now().toString().slice(-4)}`;
      const newTotalSold = todayTotalSold + grandTotalAmount;
      
      setTodayTotalSold(newTotalSold);
      setTodayNetTotal(newTotalSold - todayTotalReturns);
      await AsyncStorage.setItem('demo_sales_total', newTotalSold.toString());

      if (shouldPrint) {
        try {
          let rowsHtml = cart.map(item => `
            <tr>
              <td style="padding: 6px 0; border-bottom: 1px dotted #ccc; text-align: left; font-size: 13px;">
                <strong>${item.productName}</strong><br>
                <span style="color: #555; font-size: 11px;">Qty: ${item.quantity} x ₹${item.agreedPrice}</span>
              </td>
              <td style="text-align: right; border-bottom: 1px dotted #ccc; font-size: 13px; vertical-align: top;">₹${(item.agreedPrice * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('');

          const htmlContent = `
            <html>
              <body style="padding: 15px; font-family: sans-serif; color: #111; max-width: 350px; margin: auto;">
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: bold;">BILLPE DEMO STORE</h2>
                  <p style="margin: 3px 0; font-size: 12px; color: #444;">Bhopal Market</p>
                </div>
                <div style="font-size: 12px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
                  <div><strong>Invoice:</strong> ${invoiceNo} (DEMO)</div>
                  <div><strong>Billed By:</strong> ${employeeName}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                  <tbody>${rowsHtml}</tbody>
                </table>
                <div style="border-top: 1.5px solid #000; padding-top: 8px; text-align: right;">
                  <div style="font-size: 20px; font-weight: bold;">₹${grandTotalAmount.toFixed(2)}</div>
                </div>
              </body>
            </html>
          `;
          await Print.printAsync({ html: htmlContent });
        } catch (printErr) {
          console.log('Print simulation note:', printErr);
        }
      }

      Alert.alert(
        "Success (Demo) ✅",
        `Invoice #${invoiceNo}\n${shouldPrint ? 'Demo bill printed & recorded!' : 'Demo sale saved!'}`
      );

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <BackButton onPress={() => setScanner(false)} />
            <LanguageSwitcher />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      {isAdminSwitch && (
        <View style={styles.adminBanner}>
          <Text style={styles.adminBannerText}>{t('Billing Mode')}</Text>
          <TouchableOpacity 
            style={styles.backToAdminBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backToAdminText}>{t('← Back to Admin')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.topBar}>
        <Text style={styles.header}>{t('Employee Portal')} (Demo)</Text>
        <View style={styles.headerActions}>
          <LanguageSwitcher />
          <TouchableOpacity onPress={() => navigation.replace('Register')} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t('exitDemo') || 'Exit Demo'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.todayStatsCard}>
        <View style={styles.todayStatCol}>
          <Text style={styles.todayStatLabel}>📦 {t('TOTAL SOLD') || 'TOTAL SOLD'}</Text>
          <Text style={styles.todayStatValSold}>₹{todayTotalSold.toFixed(0)}</Text>
        </View>
        <View style={styles.todayStatDivider} />
        <View style={styles.todayStatCol}>
          <Text style={styles.todayStatLabel}>🔄 {t('RETURNS') || 'RETURNS'}</Text>
          <Text style={styles.todayStatValReturn}>-₹{todayTotalReturns.toFixed(0)}</Text>
        </View>
        <View style={styles.todayStatDivider} />
        <View style={styles.todayStatCol}>
          <Text style={styles.todayStatLabel}>💰 {t('NET TOTAL') || 'NET TOTAL'}</Text>
          <Text style={[styles.todayStatValNet, { color: '#10b981' }]}>
            ₹{todayNetTotal.toFixed(0)}
          </Text>
        </View>
      </View>

      {currentScanned ? (
        <ScrollView contentContainerStyle={styles.billingContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.productHeaderRow}>
            <View style={[styles.thumbnailImg, styles.noImgBox]}>
              <Text style={{fontSize: 9, color: '#94a3b8'}}>{t('noPhoto')}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.productTitle}>{currentScanned?.productName}</Text>
              <Text style={styles.subText}>{t('categoryModalLabel')} General</Text>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>{t('In Stock:')} {currentScanned?.stock || 0}</Text>
            </View>
          </View>

          <Text style={styles.label}>{t('agreedSellingPriceLabel')}</Text>
          <TextInput 
            style={styles.input} 
            placeholder={t('enterPricePlaceholder')} 
            placeholderTextColor="#64748b" 
            value={manualPrice} 
            onChangeText={(tVal) => { setManualPrice(tVal); setPriceMode('manual'); }} 
            keyboardType="numeric" 
          />

          <Text style={[styles.label, { marginTop: 8 }]}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity 
              style={styles.qtyBtn}
              onPress={() => setSelectedQty(String(Math.max(1, (parseInt(selectedQty, 10) || 1) - 1)))}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>

            <TextInput 
              style={[styles.input, styles.qtyInput]} 
              value={selectedQty}
              onChangeText={setSelectedQty}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={styles.qtyBtn}
              onPress={() => setSelectedQty(String((parseInt(selectedQty, 10) || 1) + 1))}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginVertical: 10 }}>
            <Button title={t('addToCartBtn')} onPress={handleAddToCart} color="#10b981" />
          </View>
          <Button 
            title={t('cancel')} 
            onPress={() => { 
              setScanner(false);
              setCurrentScanned(null); 
              setManualPrice('');
            }} 
            color="#64748b" 
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {loading && <ActivityIndicator size="small" color="#10b981" style={{ marginBottom: 10 }} />}

          <TouchableOpacity style={styles.scanBtn} onPress={() => setScanner(true)}>
            <Text style={styles.scanBtnText}>📸 {t('scanAddStockCard')} (Demo Scan)</Text>
          </TouchableOpacity>

          <View style={styles.cardBox}>
            <Text style={styles.fieldHeading}>{t('billedByLabel')} ({t('roleEmployee')})</Text>
            <TextInput 
              style={styles.input} 
              placeholder={t('empNamePlaceholder')} 
              placeholderTextColor="#64748b" 
              value={employeeName} 
              onChangeText={setEmployeeName} 
            />
          </View>

          <View style={[styles.cardBox, { marginTop: 10 }]}>
            <Text style={styles.fieldHeading}>{t('customerHistoryLabel')} ({t('additionalDetailsHeading')})</Text>
            <TextInput style={styles.input} placeholder="Customer Name" placeholderTextColor="#64748b" value={customerName} onChangeText={setCustomerName} />
            <TextInput style={styles.input} placeholder="Customer Phone" placeholderTextColor="#64748b" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Customer Address" placeholderTextColor="#64748b" value={customerAddress} onChangeText={setCustomerAddress} />
          </View>

          <View style={styles.cartHeaderRow}>
            <Text style={styles.subHeader}>Current Cart ({cart.length} items)</Text>
          </View>

          <View style={styles.list}>
            {cart.length === 0 ? (
              <Text style={{ textAlign: 'center', paddingVertical: 12, color: '#64748b' }}>
                {t('Your cart is empty. Scan an item to test billing.')}
              </Text>
            ) : (
              cart.map((item) => (
                <View key={item.cartKey} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#fff' }}>{item.productName}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                      ₹{item.agreedPrice} × {item.quantity} pcs
                    </Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#10b981', marginRight: 10 }}>
                    ₹{(item.agreedPrice * item.quantity).toFixed(2)}
                  </Text>

                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditCartItem(item)}>
                    <Text style={styles.editText}>{t('edit')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFromCart(item.cartKey)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {cart.length > 0 && (
            <View style={[styles.cardBox, { marginTop: 14 }]}>
              <Text style={styles.fieldHeading}>{t('SELECT PAYMENT MODE')}</Text>
              <View style={styles.paymentToggleRow}>
                <TouchableOpacity 
                  style={[styles.payModeBtn, paymentMode === 'Cash' && styles.payModeBtnActive]} 
                  onPress={() => setPaymentMode('Cash')}
                >
                  <Text style={[styles.payModeText, paymentMode === 'Cash' && styles.payModeTextActive]}>💵 {t('CASH')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.payModeBtn, paymentMode === 'Online' && styles.payModeBtnActive]} 
                  onPress={() => setPaymentMode('Online')}
                >
                  <Text style={[styles.payModeText, paymentMode === 'Online' && styles.payModeTextActive]}>📲 {t('ONLINE')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {cart.length > 0 && (
            <View style={styles.checkoutActionRow}>
              <TouchableOpacity 
                style={styles.doneBtn} 
                onPress={() => handleCompleteCheckout(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>
                  ✓ {t('Done')} (₹{grandTotalAmount.toFixed(2)})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.printBtn} 
                onPress={() => handleCompleteCheckout(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.printBtnText}>🖨️ {t('Print Bill')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {editingCartItem && (
        <Modal visible={editModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('editProductDetailsTitle')}</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
                {editingCartItem.productName}
              </Text>

              <Text style={styles.label}>{t('Agreed Price (₹)')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={editPrice} 
                onChangeText={setEditPrice} 
                placeholderTextColor="#64748b" 
              />

              <Text style={[styles.label, { marginTop: 6 }]}>{t('Quantity ') || 'Quantity'}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={editQty} 
                onChangeText={setEditQty} 
                placeholderTextColor="#64748b" 
              />

              <TouchableOpacity onPress={handleSaveCartEdit} style={styles.updateBtn}>
                <Text style={styles.updateBtnText}>{t('updateProductBtn')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ padding: 10, alignItems: 'center', marginTop: 5 }}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 30, backgroundColor: '#0f172a' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subHeader: { fontSize: 15, fontWeight: 'bold', color: '#cbd5e1' },
  infoText: { textAlign: 'center', color: '#cbd5e1', marginBottom: 15, fontSize: 15 },
  label: { color: '#cbd5e1', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginVertical: 4, fontSize: 14 },
  cardBox: { backgroundColor: '#1e293b', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  fieldHeading: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 },
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  adminBannerText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },
  backToAdminBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  backToAdminText: { color: '#0f172a', fontSize: 11, fontWeight: 'bold' },
  uniformCameraOverlay: { position: 'absolute', top: 40, left: 20, right: 20, zIndex: 10 },
  todayStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  todayStatCol: { flex: 1, alignItems: 'center' },
  todayStatLabel: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold', marginBottom: 3, textAlign: 'center' },
  todayStatValSold: { color: '#38bdf8', fontSize: 15, fontWeight: 'bold' },
  todayStatValReturn: { color: '#f59e0b', fontSize: 15, fontWeight: 'bold' },
  todayStatValNet: { color: '#10b981', fontSize: 15, fontWeight: 'bold' },
  todayStatDivider: { width: 1.5, height: 32, backgroundColor: '#334155' },
  paymentToggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  payModeBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center' },
  payModeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  payModeText: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  payModeTextActive: { color: '#0f172a' },
  billingContainer: { backgroundColor: '#1e293b', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  productHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  thumbnailImg: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  noImgBox: { justifyContent: 'center', alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subText: { color: '#cbd5e1', fontSize: 12 },
  stockBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockBadgeText: { color: '#10b981', fontWeight: 'bold', fontSize: 11 },
  scanBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  scanBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  qtyBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  qtyInput: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  list: { backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  updateBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  updateBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  checkoutActionRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 10 },
  doneBtn: { flex: 1.2, backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  printBtn: { flex: 1, backgroundColor: '#f59e0b', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  printBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});