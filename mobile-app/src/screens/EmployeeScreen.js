import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Button, TextInput, Alert, 
  TouchableOpacity, ActivityIndicator, ScrollView, Modal, Image, SafeAreaView 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useSales } from '../hooks/useSales';
import BackButton from '../components/BackButton';

export default function EmployeeScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { loading: salesLoading, processCheckout } = useSales();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(false);
  const [cart, setCart] = useState([]);
  const [currentScanned, setCurrentScanned] = useState(null);
  const [selectedQty, setSelectedQty] = useState('1');
  const [manualPrice, setManualPrice] = useState('');
  const [priceMode, setPriceMode] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState(user?.name || '');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [splitCash, setSplitCash] = useState('');
  const [splitOnline, setSplitOnline] = useState('');
  const [todayCashTotal, setTodayCashTotal] = useState(0);
  const [todayOnlineTotal, setTodayOnlineTotal] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editPriceMode, setEditPriceMode] = useState('manual');
  const [showEditLowestRate, setShowEditLowestRate] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [showLowestRate, setShowLowestRate] = useState(false);
  const [showGrandBaseRate, setShowGrandBaseRate] = useState(false);
  const revealTimerRef = useRef(null);
  const editRevealTimerRef = useRef(null);
  const grandBaseTimerRef = useRef(null);

  useEffect(() => {
    if (user?.name) {
      setEmployeeName(user.name);
    }
    fetchTodayLiveSales();
  }, [user]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (editRevealTimerRef.current) clearTimeout(editRevealTimerRef.current);
      if (grandBaseTimerRef.current) clearTimeout(grandBaseTimerRef.current);
    };
  }, []);

  const fetchTodayLiveSales = async () => {
    try {
      const { data } = await axiosInstance.get('/sales/history');
      if (data.success && data.sales) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        let cashSum = 0;
        let onlineSum = 0;

        data.sales.forEach(sale => {
          const saleTime = new Date(sale.createdAt).getTime();
          if (saleTime >= startOfDay) {
            const netAmount = Number(sale.totalAmount || sale.price || 0);

            if (sale.paymentMode === 'Split') {
              cashSum += Number(sale.cashAmount || 0);
              onlineSum += Number(sale.onlineAmount || 0);
            } else if (sale.paymentMode === 'Online') {
              onlineSum += netAmount;
            } else {
              cashSum += netAmount;
            }
          }
        });

        setTodayCashTotal(cashSum);
        setTodayOnlineTotal(onlineSum);
      }
    } catch (e) {
      console.log(t('Error fetching today sales:'), e.message);
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

  const handleLogoutPress = () => {
    if (typeof logout === 'function') logout();
  };

  const handleBarCodeScanned = async ({ data }) => {
    setScanner(false);
    setLoading(true);

    try {
      const { data: res } = await axiosInstance.get('/products?includeSold=true');
      setLoading(false);

      if (res.success && res.products) {
        const found = res.products.find(item => item.barcode === data);
        if (!found) {
          Alert.alert(t('error'), t('This product does not exist in the database.'));
          return;
        }

        if (found.stock <= 0 || found.sold === true) {
          Alert.alert(
            t('⚠️ Item Out of Stock'),
            `${found.productName} has 0 stock remaining.\nIf customer is returning this item, please use "Return / Exchange Stock".`,
            [
              { text: t('cancel'), style: 'cancel' },
              { text: 'Open Return Portal', onPress: () => navigation.navigate('ReturnStock') }
            ]
          );
          return;
        }

        const existingCartItem = cart.find(c => c.productId === found._id || c.barcode === data);
        const currentCartQty = existingCartItem ? existingCartItem.quantity : 0;
        const availableStock = found.stock - currentCartQty;

        if (availableStock <= 0) {
          Alert.alert(t('error'), `All available units (${found.stock}) are already in your cart.`);
          return;
        }

        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        setShowLowestRate(false);

        setCurrentScanned(found);
        setSelectedQty('1');
        setPriceMode('manual');
        setManualPrice('');
      }
    } catch (err) {
      setLoading(false);
      Alert.alert(t('error'), t('Failed to fetch product details.'));
    }
  };

  const handlePressLowest = () => {
    if (!currentScanned) return;
    setPriceMode('min');
    setManualPrice(String(currentScanned.lowestRate || currentScanned.price || 0));
  };

  const handleLongPressLowest = () => {
    if (!currentScanned) return;
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setShowLowestRate(true);
    revealTimerRef.current = setTimeout(() => {
      setShowLowestRate(false);
    }, 1000);
  };

  const handleLongPressGrandBase = () => {
    if (cart.length === 0) return;
    if (grandBaseTimerRef.current) clearTimeout(grandBaseTimerRef.current);
    setShowGrandBaseRate(true);
    grandBaseTimerRef.current = setTimeout(() => {
      setShowGrandBaseRate(false);
    }, 1000);
  };

  const selectHighest = () => {
    if (!currentScanned) return;
    setPriceMode('max');
    setManualPrice(String(currentScanned.highestRate || currentScanned.price || 0));
  };

  const selectManual = () => {
    setPriceMode('manual');
    setManualPrice('');
  };

  const handleAddToCart = () => {
    if (!manualPrice) {
      Alert.alert(t('error'), t('Please enter agreed selling price.'));
      return;
    }
    const enteredPrice = parseFloat(manualPrice);
    const minAllowed = parseFloat(currentScanned?.lowestRate ?? currentScanned?.price ?? 0);

    if (enteredPrice < minAllowed) {
      Alert.alert(t('error'), `Minimum allowed price is ₹${minAllowed}`);
      return;
    }

    const qtyToAdd = parseInt(selectedQty, 10);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      Alert.alert(t('error'), t('Please enter a valid quantity.'));
      return;
    }

    const existingIndex = cart.findIndex(item => item.productId === currentScanned._id || item.barcode === currentScanned.barcode);
    const currentInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;
    const totalDesired = currentInCart + qtyToAdd;

    if (totalDesired > currentScanned.stock) {
      Alert.alert(t('error'), `Only ${currentScanned.stock} units available in stock. You already have ${currentInCart} in cart.`);
      return;
    }

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity = totalDesired;
      updatedCart[existingIndex].agreedPrice = enteredPrice;
      updatedCart[existingIndex].price = enteredPrice;
      setCart(updatedCart);
    } else {
      const newItem = {
        ...currentScanned,
        productId: currentScanned._id,
        quantity: qtyToAdd,
        agreedPrice: enteredPrice,
        price: enteredPrice,
        cartKey: Date.now().toString() + Math.random().toString(36).slice(2)
      };
      setCart([...cart, newItem]);
    }

    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setCurrentScanned(null);
    setShowLowestRate(false);
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
    setEditPriceMode('manual');
    setShowEditLowestRate(false);
    setEditModalVisible(true);
  };

  const handleEditPressLowest = () => {
    if (!editingCartItem) return;
    setEditPriceMode('min');
    setEditPrice(String(editingCartItem.lowestRate || editingCartItem.price || 0));
  };

  const handleEditLongPressLowest = () => {
    if (!editingCartItem) return;
    if (editRevealTimerRef.current) clearTimeout(editRevealTimerRef.current);
    setShowEditLowestRate(true);
    editRevealTimerRef.current = setTimeout(() => {
      setShowEditLowestRate(false);
    }, 1000);
  };

  const handleSaveCartEdit = () => {
    if (!editPrice) {
      Alert.alert(t('error'), t('Price cannot be empty.'));
      return;
    }

    const newPrice = parseFloat(editPrice);
    const minAllowed = parseFloat(editingCartItem?.lowestRate ?? editingCartItem?.price ?? 0);

    if (newPrice < minAllowed) {
      Alert.alert(t('error'), `Minimum allowed price is ₹${minAllowed}`);
      return;
    }

    const newQuantity = parseInt(editQty, 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      Alert.alert(t('error'), t('Quantity must be at least 1.'));
      return;
    }

    if (newQuantity > editingCartItem.stock) {
      Alert.alert(t('error'), `Only ${editingCartItem.stock} units available in stock.`);
      return;
    }

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
  const totalBaseCostAmount = cart.reduce((sum, item) => {
    const base = Number(item.lowestRate || item.price || 0);
    return sum + (base * item.quantity);
  }, 0);

  const handleCompleteCheckout = async (shouldPrint = true) => {
    if (cart.length === 0) {
      Alert.alert(t('error'), t('Cart is empty.'));
      return;
    }

    let finalCash = 0;
    let finalOnline = 0;

    if (paymentMode === 'Cash') {
      finalCash = grandTotalAmount;
    } else if (paymentMode === 'Online') {
      finalOnline = grandTotalAmount;
    } else if (paymentMode === 'Split') {
      finalCash = parseFloat(splitCash) || 0;
      finalOnline = parseFloat(splitOnline) || 0;

      if (Math.round((finalCash + finalOnline) * 100) !== Math.round(grandTotalAmount * 100)) {
        Alert.alert(
          'Split Amount Mismatch', 
          `Cash (₹${finalCash}) + Online (₹${finalOnline}) = ₹${finalCash + finalOnline}.\nIt must equal Grand Total (₹${grandTotalAmount.toFixed(2)})`
        );
        return;
      }
    }

    const invoiceNo = `BP-${Date.now().toString().slice(-6)}`;

    const result = await processCheckout(
      cart, 
      grandTotalAmount, 
      paymentMode, 
      customerName, 
      customerPhone, 
      employeeName, 
      customerAddress, 
      invoiceNo,
      finalCash,
      finalOnline
    );
    
    if (result.success) {
      if (shouldPrint) {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const formattedTime = `${hours}:${minutes} ${ampm}`;
        const formattedDate = now.toLocaleDateString('en-IN');

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
            <body style="padding: 15px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; max-width: 350px; margin: auto;">
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase;">${result.storeInfo?.storeName || 'RETAIL STORE'}</h2>
                <p style="margin: 3px 0; font-size: 12px; color: #444;">${result.storeInfo?.address || ''}</p>
                <p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #222;">Contact: ${result.storeInfo?.phone || result.storeInfo?.ownerPhone || 'N/A'}</p>
              </div>

              <div style="font-size: 12px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span><strong>Invoice:</strong> ${invoiceNo}</span>
                  <span><strong>Pay Mode:</strong> <span style="background: #eee; padding: 2px 5px; border-radius: 3px; font-weight: bold;">${paymentMode.toUpperCase()}</span></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span><strong>Date:</strong> ${formattedDate}</span>
                  <span><strong>Time:</strong> ${formattedTime}</span>
                </div>
                <div style="margin-bottom: 6px;">
                  <strong>Billed By:</strong> ${employeeName || 'Staff'}
                </div>

                <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                  <div style="margin-bottom: 3px;"><strong>Customer:</strong> ${customerName ? customerName : 'N/A'}</div>
                  <div style="margin-bottom: 3px;"><strong>Phone:</strong> ${customerPhone ? customerPhone : 'N/A'}</div>
                  <div><strong>Address:</strong> ${customerAddress ? customerAddress : 'N/A'}</div>
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                <thead>
                  <tr style="border-bottom: 1.5px solid #000; text-align: left; font-size: 12px;">
                    <th style="padding-bottom: 4px; width: 65%;">Item</th>
                    <th style="padding-bottom: 4px; text-align: right; width: 35%;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <div style="border-top: 1.5px solid #000; padding-top: 8px; margin-bottom: 10px; text-align: right;">
                <div style="font-size: 13px; color: #555; margin-bottom: 2px;">Grand Total</div>
                <div style="font-size: 20px; font-weight: bold; color: #000;">₹${grandTotalAmount.toFixed(2)}</div>
                ${paymentMode === 'Split' ? `
                  <div style="font-size: 11px; color: #444; margin-top: 4px;">
                    Paid Cash: ₹${finalCash.toFixed(2)} | Paid Online: ₹${finalOnline.toFixed(2)}
                  </div>
                ` : ''}
              </div>

              <div style="text-align: center; font-size: 11px; color: #555; border-top: 1px dotted #ccc; padding-top: 8px;">
                <p style="margin: 2px 0; font-weight: bold;">Thank You for Shopping!</p>
                <p style="margin: 2px 0;">Please visit again.</p>
              </div>
            </body>
          </html>
        `;

        await Print.printAsync({ html: htmlContent });
      }

      Alert.alert(
        'Success ✅', 
        `Invoice: #${invoiceNo}\n${shouldPrint ? t('Bill printed & sold successfully!') : t('Sale saved successfully!')}`
      );
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setPaymentMode('Cash');
      setSplitCash('');
      setSplitOnline('');
      fetchTodayLiveSales();
    } else {
      Alert.alert('Checkout Failed 🔒', result.message || t('Error completing checkout.'));
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
          <BackButton onPress={() => setScanner(false)} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Text style={styles.header}>Employee Portal</Text>
        <View style={styles.headerActions}>
          <LanguageSwitcher />
          <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t('logoutBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.todayStatsCard}>
        <View style={styles.todayStatCol}>
          <Text style={styles.todayStatLabel}>{t('💵 TODAY CASH')}</Text>
          <Text style={styles.todayStatValCash}>₹{todayCashTotal.toFixed(0)}</Text>
        </View>
        <View style={styles.todayStatDivider} />
        <View style={styles.todayStatCol}>
          <Text style={styles.todayStatLabel}>{t('📲 TODAY ONLINE')}</Text>
          <Text style={styles.todayStatValOnline}>₹{todayOnlineTotal.toFixed(0)}</Text>
        </View>
      </View>

      {currentScanned ? (
        <ScrollView contentContainerStyle={styles.billingContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.productHeaderRow}>
            {currentScanned?.imageUri ? (
              <TouchableOpacity onPress={() => { setSelectedImageUri(currentScanned.imageUri); setImageModalVisible(true); }}>
                <Image source={{ uri: currentScanned.imageUri }} style={styles.thumbnailImg} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.thumbnailImg, styles.noImgBox]}><Text style={{fontSize: 9, color: '#94a3b8'}}>{t('noPhoto')}</Text></View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.productTitle}>{currentScanned?.productName}</Text>
              <Text style={styles.subText}>{t('categoryModalLabel')} {currentScanned?.category || 'General'}</Text>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>{t('In Stock:')} {currentScanned?.stock || 0}</Text>
            </View>
          </View>
          <View style={styles.priceOptionRow}>
            <TouchableOpacity 
              style={[styles.priceOptionBtn, priceMode === 'min' && styles.priceOptionBtnActive]} 
              onPress={handlePressLowest}
              onLongPress={handleLongPressLowest}
              delayLongPress={350}
              activeOpacity={0.8}
            >
              <Text style={[styles.priceOptionLabel, priceMode === 'min' && styles.priceOptionLabelActive]}>
                {showLowestRate ? t('basePriceLabel') : `🔒 ${t('basePriceLabel')}`}
              </Text>
              <Text style={[styles.priceOptionValue, priceMode === 'min' && styles.priceOptionLabelActive, !showLowestRate && styles.hintText]}>
                {showLowestRate ? `₹${currentScanned?.lowestRate ?? currentScanned?.price ?? '-'}` : t('holdToView')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.priceOptionBtn, priceMode === 'manual' && styles.priceOptionBtnActive]} 
              onPress={selectManual}
            >
              <Text style={[styles.priceOptionLabel, priceMode === 'manual' && styles.priceOptionLabelActive]}>
                {t('manualPrice')}
              </Text>
              <Text style={[styles.priceOptionValue, priceMode === 'manual' && styles.priceOptionLabelActive]}>
                {t('enterPriceAction')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.priceOptionBtn, priceMode === 'max' && styles.priceOptionBtnActive]} 
              onPress={selectHighest}
            >
              <Text style={[styles.priceOptionLabel, priceMode === 'max' && styles.priceOptionLabelActive]}>
                {t('storeMrpLabel')}
              </Text>
              <Text style={[styles.priceOptionValue, priceMode === 'max' && styles.priceOptionLabelActive]}>
                ₹{currentScanned?.highestRate ?? currentScanned?.price ?? '-'}
              </Text>
            </TouchableOpacity>
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

          <Text style={[styles.label, { marginTop: 8 }]}>Quantity (Max: {currentScanned?.stock})</Text>
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
              onPress={() => setSelectedQty(String(Math.min(currentScanned?.stock || 1, (parseInt(selectedQty, 10) || 1) + 1)))}
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
              if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
              setCurrentScanned(null); 
              setShowLowestRate(false); 
            }} 
            color="#64748b" 
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(loading || salesLoading) && <ActivityIndicator size="small" color="#10b981" style={{ marginBottom: 10 }} />}
          
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScanner(true)}>
            <Text style={styles.scanBtnText}>📸 {t('scanAddStockCard')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.returnNavBtn} 
            onPress={() => navigation.navigate('ReturnStock')}
            activeOpacity={0.8}
          >
            <Text style={styles.returnNavBtnText}>🔄{t(' Return / Exchange Stock')}</Text>
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

            {cart.length > 0 && (
              <TouchableOpacity 
                style={styles.grandBaseHoldBtn}
                onLongPress={handleLongPressGrandBase}
                delayLongPress={350}
                activeOpacity={0.8}
              >
                <Text style={styles.grandBaseHoldText}>
                  {showGrandBaseRate ? `Min Cost: ₹${totalBaseCostAmount}` : '🔒 Min Cost (Hold)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.list}>
            {cart.length === 0 ? (
              <Text style={{ textAlign: 'center', paddingVertical: 12, color: '#64748b' }}>
                Your cart is empty.
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
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payModeText, paymentMode === 'Cash' && styles.payModeTextActive]}>💵 {t('CASH')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.payModeBtn, paymentMode === 'Online' && styles.payModeBtnActive]} 
                  onPress={() => setPaymentMode('Online')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payModeText, paymentMode === 'Online' && styles.payModeTextActive]}>📲 {t('ONLINE')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.payModeBtn, paymentMode === 'Split' && styles.payModeBtnActive]} 
                  onPress={() => {
                    setPaymentMode('Split');
                    setSplitCash('');
                    setSplitOnline('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payModeText, paymentMode === 'Split' && styles.payModeTextActive]}>⚖️ {t('SPLIT')}</Text>
                </TouchableOpacity>
              </View>
              {paymentMode === 'Split' && (
                <View style={styles.splitBox}>
                  <Text style={styles.splitNote}>Total Bill: ₹{grandTotalAmount.toFixed(2)}</Text>
                  <View style={styles.splitInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.splitLabel}>{t('Cash (₹)')}:</Text>
                      <TextInput
                        style={styles.splitInput}
                        placeholder="e.g. 50"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={splitCash}
                        onChangeText={(val) => {
                          setSplitCash(val);
                          const num = parseFloat(val) || 0;
                          const rem = Math.max(0, grandTotalAmount - num);
                          setSplitOnline(rem > 0 ? String(rem) : '');
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.splitLabel}>Online (₹):</Text>
                      <TextInput
                        style={styles.splitInput}
                        placeholder="e.g. 100"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={splitOnline}
                        onChangeText={setSplitOnline}
                      />
                    </View>
                  </View>
                </View>
              )}
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
      <Modal visible={imageModalVisible} transparent={true} animationType="fade">
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.closeImageModal} onPress={() => setImageModalVisible(false)}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>✕ {t('cancel')}</Text>
          </TouchableOpacity>
          {selectedImageUri && (
            <Image source={{ uri: selectedImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
      {editingCartItem && (
        <Modal visible={editModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('editProductDetailsTitle')}</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
                {editingCartItem.productName}
              </Text>

              <View style={styles.priceOptionRow}>
                <TouchableOpacity 
                  style={[styles.priceOptionBtn, editPriceMode === 'min' && styles.priceOptionBtnActive]} 
                  onPress={handleEditPressLowest}
                  onLongPress={handleEditLongPressLowest}
                  delayLongPress={350}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.priceOptionLabel, editPriceMode === 'min' && styles.priceOptionLabelActive]}>
                    {showEditLowestRate ? t('basePriceLabel') : `🔒 ${t('basePriceLabel')}`}
                  </Text>
                  <Text style={[styles.priceOptionValue, editPriceMode === 'min' && styles.priceOptionLabelActive, !showEditLowestRate && styles.hintText]}>
                    {showEditLowestRate ? `₹${editingCartItem.lowestRate || editingCartItem.price || '-'}` : t('holdToView')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.priceOptionBtn, editPriceMode === 'manual' && styles.priceOptionBtnActive]} 
                  onPress={() => { setEditPriceMode('manual'); setEditPrice(''); }}
                >
                  <Text style={[styles.priceOptionLabel, editPriceMode === 'manual' && styles.priceOptionLabelActive]}>
                    {t('manualPrice')}
                  </Text>
                  <Text style={[styles.priceOptionValue, editPriceMode === 'manual' && styles.priceOptionLabelActive]}>
                    {t('enterPriceAction')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.priceOptionBtn, editPriceMode === 'max' && styles.priceOptionBtnActive]} 
                  onPress={() => {
                    setEditPriceMode('max');
                    setEditPrice(String(editingCartItem.highestRate || editingCartItem.price || 0));
                  }}
                >
                  <Text style={[styles.priceOptionLabel, editPriceMode === 'max' && styles.priceOptionLabelActive]}>
                    {t('storeMrpLabel')}
                  </Text>
                  <Text style={[styles.priceOptionValue, editPriceMode === 'max' && styles.priceOptionLabelActive]}>
                    ₹{editingCartItem.highestRate || editingCartItem.price || '-'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('Agreed Price (₹)')}</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={editPrice} 
                onChangeText={(v) => { setEditPrice(v); setEditPriceMode('manual'); }} 
                placeholderTextColor="#64748b" 
              />

              <Text style={[styles.label, { marginTop: 6 }]}>{t('Quantity ')}(Max: {editingCartItem.stock})</Text>
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

              <TouchableOpacity 
                onPress={() => {
                  if (editRevealTimerRef.current) clearTimeout(editRevealTimerRef.current);
                  setEditModalVisible(false);
                }} 
                style={{ padding: 10, alignItems: 'center', marginTop: 5 }}
              >
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
  container: { flex: 1, padding: 20, paddingTop: 40, backgroundColor: '#0f172a' },
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
  
  uniformCameraOverlay: { 
    position: 'absolute', 
    top: 40, 
    left: 20, 
    right: 20, 
    zIndex: 10 
  },

  todayStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  todayStatCol: { flex: 1, alignItems: 'center' },
  todayStatLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 3 },
  todayStatValCash: { color: '#10b981', fontSize: 18, fontWeight: 'bold' },
  todayStatValOnline: { color: '#38bdf8', fontSize: 18, fontWeight: 'bold' },
  todayStatDivider: { width: 1.5, height: 32, backgroundColor: '#334155' },

  paymentToggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  payModeBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center' },
  payModeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  payModeText: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  payModeTextActive: { color: '#0f172a' },

  splitBox: { marginTop: 12, backgroundColor: '#0f172a', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  splitNote: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  splitInputsRow: { flexDirection: 'row', gap: 10 },
  splitLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  splitInput: { backgroundColor: '#1e293b', color: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 14 },

  billingContainer: { backgroundColor: '#1e293b', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  productHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  thumbnailImg: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  noImgBox: { justifyContent: 'center', alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subText: { color: '#cbd5e1', fontSize: 12 },
  stockBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockBadgeText: { color: '#10b981', fontWeight: 'bold', fontSize: 11 },

  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  closeImageModal: { position: 'absolute', top: 40, right: 20, padding: 10, backgroundColor: '#334155', borderRadius: 8 },
  fullScreenImage: { width: '100%', height: '80%', resizeMode: 'contain' },

  scanBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  scanBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  returnNavBtn: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1.5, borderColor: '#f59e0b', padding: 13, borderRadius: 12, alignItems: 'center', marginBottom: 14 },
  returnNavBtnText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 15 },

  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  
  priceOptionRow: { flexDirection: 'row', marginVertical: 10, gap: 8 },
  priceOptionBtn: { flex: 1, minHeight: 52, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  priceOptionBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  priceOptionLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  priceOptionValue: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  priceOptionLabelActive: { color: '#0f172a' },
  hintText: { fontSize: 10, color: '#64748b', fontWeight: '600', letterSpacing: 0.2, marginTop: 3 },
  
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  qtyBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  qtyInput: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },

  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  grandBaseHoldBtn: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  grandBaseHoldText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },

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
  doneBtn: { flex: 1.2, backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  doneBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  printBtn: { flex: 1, backgroundColor: '#f59e0b', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  printBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});