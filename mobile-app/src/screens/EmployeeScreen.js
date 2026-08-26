import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Alert, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useSales } from '../hooks/useSales';

export default function EmployeeScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { loading: salesLoading, processCheckout } = useSales();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [scanner, setScanner] = useState(false);
  const [cart, setCart] = useState([]);
  const [currentScanned, setCurrentScanned] = useState(null);
  const [manualPrice, setManualPrice] = useState('');
  const [priceMode, setPriceMode] = useState('manual');
  const [loading, setLoading] = useState(false);

  // Employee & Payment Mode
  const [employeeName, setEmployeeName] = useState(user?.name || '');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Image Zoom Modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);

  // Edit Price Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  useEffect(() => {
    if (user?.name) {
      setEmployeeName(user.name);
    }
  }, [user]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Give permission to scan Bar code.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 15 }} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.btn, { backgroundColor: '#ef4444' }]}>
          <Text style={styles.btnText}>Back</Text>
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
          Alert.alert('Not Found', 'This product does not exist in the database.');
          return;
        }

        const alreadyInCart = cart.some(cartItem => cartItem.barcode === data || cartItem._id === found._id);
        if (alreadyInCart) {
          Alert.alert('Already in Cart', `${found.productName} pehle se cart me added hai.`);
          return;
        }

        if (found.sold === true || found.stock <= 0) {
          Alert.alert(
            '⚠️ Item Already Sold',
            `Product Name: ${found.productName}\n` +
            `Sold Price: ₹${found.soldPrice || found.price}\n` +
            `Sold To: ${found.soldCustomerName || 'N/A'}\n` +
            `Mobile: ${found.soldCustomerPhone || 'N/A'}\n\n` +
            `Return / Restock the item?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Mark as Returned',
                onPress: async () => {
                  try {
                    await axiosInstance.put(`/products/${found._id}`, { 
                      stock: 1, 
                      sold: false, 
                      soldPrice: null,
                      soldCustomerName: '',
                      soldCustomerPhone: ''
                    });
                    Alert.alert('Success', 'Item returned & added back to inventory!');
                  } catch (e) {
                    Alert.alert('Error', 'Stock update failed.');
                  }
                }
              }
            ]
          );
          return;
        }

        setCurrentScanned(found);
        setPriceMode('manual');
        setManualPrice(String(found.lowestRate || found.price || ''));
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Failed to fetch product details.');
    }
  };

  const selectLowest = () => {
    if (!currentScanned) return;
    setPriceMode('min');
    setManualPrice(String(currentScanned.lowestRate || currentScanned.price || 0));
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
      Alert.alert('Error', 'Please enter agreed selling price.');
      return;
    }
    const enteredPrice = parseFloat(manualPrice);
    const minAllowed = parseFloat(currentScanned?.lowestRate ?? currentScanned?.price ?? 0);

    if (enteredPrice < minAllowed) {
      Alert.alert('Price Too Low', `Minimum allowed price is ₹${minAllowed}`);
      return;
    }

    const newItem = {
      ...currentScanned,
      productId: currentScanned._id,
      agreedPrice: enteredPrice,
      price: enteredPrice,
      cartKey: Date.now().toString() + Math.random().toString(36).slice(2)
    };

    setCart([...cart, newItem]);
    setCurrentScanned(null);
    setManualPrice('');
    setPriceMode('manual');
  };

  const handleRemoveFromCart = (cartKey) => {
    setCart(cart.filter((item) => item.cartKey !== cartKey));
  };

  const handleOpenEditCartItem = (item) => {
    setEditingCartItem(item);
    setEditPrice(String(item.agreedPrice));
    setEditModalVisible(true);
  };

  const handleSaveCartEdit = () => {
    if (!editPrice) {
      Alert.alert('Error', 'Price cannot be empty.');
      return;
    }

    const newPrice = parseFloat(editPrice);
    const minAllowed = parseFloat(editingCartItem?.lowestRate ?? editingCartItem?.price ?? 0);

    if (newPrice < minAllowed) {
      Alert.alert('Price Too Low', `Minimum allowed price is ₹${minAllowed}`);
      return;
    }

    setCart(cart.map(item => {
      if (item.cartKey === editingCartItem.cartKey) {
        return { ...item, agreedPrice: newPrice, price: newPrice };
      }
      return item;
    }));

    setEditModalVisible(false);
    setEditingCartItem(null);
  };

  const handleCompleteCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty.');
      return;
    }

    let totalAmount = cart.reduce((sum, item) => sum + item.agreedPrice, 0);

    const result = await processCheckout(
      cart, 
      totalAmount, 
      paymentMode, 
      customerName, 
      customerPhone, 
      employeeName
    );
    
    if (result.success) {
      const invoiceNo = `BP-${Date.now().toString().slice(-6)}`;
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
            <span style="color: #555; font-size: 11px;">Color: ${item.color || 'N/A'} | Wt: ${item.weightKg || 0}kg ${item.weightGrams || 0}g</span>
          </td>
          <td style="text-align: right; border-bottom: 1px dotted #ccc; font-size: 13px; vertical-align: top;">₹${item.agreedPrice.toFixed(2)}</td>
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

            <div style="border-top: 1.5px solid #000; padding-top: 8px; margin-bottom: 15px; text-align: right;">
              <div style="font-size: 13px; color: #555; margin-bottom: 2px;">Grand Total (${paymentMode})</div>
              <div style="font-size: 20px; font-weight: bold; color: #000;">₹${totalAmount.toFixed(2)}</div>
            </div>

            <div style="text-align: center; font-size: 11px; color: #555; border-top: 1px dotted #ccc; padding-top: 8px;">
              <p style="margin: 2px 0; font-weight: bold;">Thank You for Shopping!</p>
              <p style="margin: 2px 0;">Please visit again.</p>
            </div>

          </body>
        </html>
      `;

      await Print.printAsync({ html: htmlContent });

      Alert.alert('Success', 'Bill generated & item marked as sold!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    } else {
      Alert.alert('Checkout Failed 🔒', result.message || 'Error completing checkout.');
    }
  };

  // Exact Admin Scanner Fullscreen View
  if (scanner) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["code128"] }}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => setScanner(false)}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>Employee portal</Text>
        <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {currentScanned ? (
        <ScrollView contentContainerStyle={styles.billingContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.productHeaderRow}>
            {currentScanned?.imageUri ? (
              <TouchableOpacity onPress={() => { setSelectedImageUri(currentScanned.imageUri); setImageModalVisible(true); }}>
                <Image source={{ uri: currentScanned.imageUri }} style={styles.thumbnailImg} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.thumbnailImg, styles.noImgBox]}><Text style={{fontSize: 9, color: '#94a3b8'}}>No Image</Text></View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.productTitle}>{currentScanned?.productName}</Text>
              <Text style={styles.subText}>Category: {currentScanned?.category || 'General'}</Text>
            </View>
          </View>

          <View style={styles.metaBadgeContainer}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Color:</Text>
              <Text style={styles.metaVal}>{currentScanned?.color || 'N/A'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Weight:</Text>
              <Text style={styles.metaVal}>{currentScanned?.weightKg || 0}kg {currentScanned?.weightGrams || 0}g</Text>
            </View>
          </View>

          {currentScanned?.description ? (
            <Text style={styles.descText} numberOfLines={2}>
              <Text style={{fontWeight: 'bold', color: '#cbd5e1'}}>Desc: </Text>
              {currentScanned.description}
            </Text>
          ) : null}

          <View style={styles.priceOptionRow}>
            <TouchableOpacity style={[styles.priceOptionBtn, priceMode === 'min' && styles.priceOptionBtnActive]} onPress={selectLowest}>
              <Text style={[styles.priceOptionLabel, priceMode === 'min' && styles.priceOptionLabelActive]}>Lowest</Text>
              <Text style={[styles.priceOptionValue, priceMode === 'min' && styles.priceOptionLabelActive]}>₹{currentScanned?.lowestRate ?? currentScanned?.price ?? '-'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.priceOptionBtn, priceMode === 'manual' && styles.priceOptionBtnActive]} onPress={selectManual}>
              <Text style={[styles.priceOptionLabel, priceMode === 'manual' && styles.priceOptionLabelActive]}>Manual</Text>
              <Text style={[styles.priceOptionValue, priceMode === 'manual' && styles.priceOptionLabelActive]}>Enter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.priceOptionBtn, priceMode === 'max' && styles.priceOptionBtnActive]} onPress={selectHighest}>
              <Text style={[styles.priceOptionLabel, priceMode === 'max' && styles.priceOptionLabelActive]}>Highest</Text>
              <Text style={[styles.priceOptionValue, priceMode === 'max' && styles.priceOptionLabelActive]}>₹{currentScanned?.highestRate ?? currentScanned?.price ?? '-'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Agreed Selling Price *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter price" 
            placeholderTextColor="#64748b" 
            value={manualPrice} 
            onChangeText={(t) => { setManualPrice(t); setPriceMode('manual'); }} 
            keyboardType="numeric" 
          />

          <View style={{ marginVertical: 10 }}>
            <Button title="Add to Cart" onPress={handleAddToCart} color="#10b981" />
          </View>
          <Button title="Cancel Item" onPress={() => setCurrentScanned(null)} color="#64748b" />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(loading || salesLoading) && <ActivityIndicator size="small" color="#10b981" style={{ marginBottom: 10 }} />}
          
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScanner(true)}>
            <Text style={styles.scanBtnText}>📸 Scan Item Barcode</Text>
          </TouchableOpacity>

          {/* Employee Name */}
          <View style={styles.cardBox}>
            <Text style={styles.fieldHeading}>Billed By (Employee Name)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Employee Name" 
              placeholderTextColor="#64748b" 
              value={employeeName} 
              onChangeText={setEmployeeName} 
            />

            {/* Payment Mode Selector */}
            <Text style={[styles.fieldHeading, { marginTop: 10 }]}>Payment Mode</Text>
            <View style={styles.paymentToggleRow}>
              <TouchableOpacity 
                style={[styles.payModeBtn, paymentMode === 'Cash' && styles.payModeBtnActive]}
                onPress={() => setPaymentMode('Cash')}
                activeOpacity={0.8}
              >
                <Text style={[styles.payModeText, paymentMode === 'Cash' && styles.payModeTextActive]}>💵 Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.payModeBtn, paymentMode === 'Online' && styles.payModeBtnActive]}
                onPress={() => setPaymentMode('Online')}
                activeOpacity={0.8}
              >
                <Text style={[styles.payModeText, paymentMode === 'Online' && styles.payModeTextActive]}>📲 Online / UPI</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Details */}
          <View style={[styles.cardBox, { marginTop: 12 }]}>
            <Text style={styles.fieldHeading}>Customer Details (Optional)</Text>
            <TextInput style={styles.input} placeholder="Customer Name" placeholderTextColor="#64748b" value={customerName} onChangeText={setCustomerName} />
            <TextInput style={styles.input} placeholder="Customer Phone" placeholderTextColor="#64748b" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Customer Address" placeholderTextColor="#64748b" value={customerAddress} onChangeText={setCustomerAddress} />
          </View>

          <Text style={styles.subHeader}>Current Cart ({cart.length} items)</Text>
          
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
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>₹{item.agreedPrice} {item.color ? `| ${item.color}` : ''}</Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#10b981', marginRight: 10 }}>₹{item.agreedPrice}</Text>
                  
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditCartItem(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFromCart(item.cartKey)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {cart.length > 0 && (
            <View style={{ marginTop: 15, marginBottom: 10 }}>
              <Button title={`Complete Bill (₹${cart.reduce((sum, item) => sum + item.agreedPrice, 0)}) & Print`} onPress={handleCompleteCheckout} color="#f59e0b" />
            </View>
          )}
        </ScrollView>
      )}

      {/* Full Screen Image Zoom Modal */}
      <Modal visible={imageModalVisible} transparent={true} animationType="fade">
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.closeImageModal} onPress={() => setImageModalVisible(false)}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>✕ Close</Text>
          </TouchableOpacity>
          {selectedImageUri && (
            <Image source={{ uri: selectedImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Edit Cart Item Modal */}
      {editingCartItem && (
        <Modal visible={editModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Cart Price</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>{editingCartItem.productName}</Text>

              <Text style={styles.label}>Agreed Price (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editPrice} onChangeText={setEditPrice} placeholderTextColor="#64748b" />

              <TouchableOpacity onPress={handleSaveCartEdit} style={styles.updateBtn}>
                <Text style={styles.updateBtnText}>Save Price</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ padding: 10, alignItems: 'center', marginTop: 5 }}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Cancel</Text>
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subHeader: { fontSize: 15, fontWeight: 'bold', marginVertical: 8, color: '#cbd5e1' },
  infoText: { textAlign: 'center', color: '#cbd5e1', marginBottom: 15, fontSize: 15 },
  label: { color: '#cbd5e1', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginVertical: 4, fontSize: 14 },
  cardBox: { backgroundColor: '#1e293b', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  fieldHeading: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  
  paymentToggleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  payModeBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center' },
  payModeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  payModeText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  payModeTextActive: { color: '#0f172a' },

  billingContainer: { backgroundColor: '#1e293b', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  productHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  thumbnailImg: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  noImgBox: { justifyContent: 'center', alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subText: { color: '#cbd5e1', fontSize: 12 },

  metaBadgeContainer: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  metaBadge: { flexDirection: 'row', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  metaLabel: { color: '#94a3b8', fontSize: 11, marginRight: 4 },
  metaVal: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  descText: { color: '#94a3b8', fontSize: 12, marginBottom: 10, backgroundColor: '#0f172a', padding: 8, borderRadius: 6 },

  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  closeImageModal: { position: 'absolute', top: 40, right: 20, padding: 10, backgroundColor: '#334155', borderRadius: 8 },
  fullScreenImage: { width: '100%', height: '80%', resizeMode: 'contain' },

  scanBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  scanBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  priceOptionRow: { flexDirection: 'row', marginVertical: 10, gap: 8 },
  priceOptionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center' },
  priceOptionBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  priceOptionLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  priceOptionValue: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  priceOptionLabelActive: { color: '#0f172a' },
  
  backButton: { position: 'absolute', top: 50, left: 20, padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8 },

  list: { backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center' },
  updateBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});