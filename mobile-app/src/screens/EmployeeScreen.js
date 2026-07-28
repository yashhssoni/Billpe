import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Alert, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useSales } from '../hooks/useSales';

export default function EmployeeScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const { loading: salesLoading, processCheckout } = useSales();
  const [permission, requestPermission] = useCameraPermissions();
  const [cart, setCart] = useState([]);
  const [currentScanned, setCurrentScanned] = useState(null);
  const [manualPrice, setManualPrice] = useState('');
  const [priceMode, setPriceMode] = useState('manual');
  const [quantity, setQuantity] = useState('1');
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Camera permission is required to scan barcodes.</Text>
        <View style={{ marginTop: 10 }}>
          <Button onPress={requestPermission} title="Grant Camera Permission" color="#10b981" />
        </View>
      </View>
    );
  }

  const handleLogoutPress = () => {
    if (typeof logout === 'function') logout();
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (!scannerActive) return;
    setScannerActive(false);
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
            `Refund Amount: ₹${found.soldPrice || found.price}\n` +
            `Sold To Customer: ${found.soldCustomerName || 'N/A'}\n` +
            `Customer Mobile: ${found.soldCustomerPhone || 'N/A'}\n\n` +
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
                    Alert.alert('Success', 'Item marked as returned and added back to inventory!');
                  } catch (e) {
                    if (e.response && e.response.status === 403) {
                      Alert.alert('Subscription Expired 🔒', e.response.data.message || 'Store subscription has expired.');
                    } else {
                      Alert.alert('Error', 'Stock update failed.');
                    }
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
      if (err.response && err.response.status === 403) {
        Alert.alert('Subscription Expired 🔒', err.response.data.message || 'Store subscription has expired.');
      } else {
        Alert.alert('Error', 'Failed to fetch product details.');
      }
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
    if (!manualPrice || !quantity) {
      Alert.alert('Error', 'Please enter price and quantity.');
      return;
    }
    const enteredPrice = parseFloat(manualPrice);
    const minAllowed = parseFloat(currentScanned?.lowestRate ?? currentScanned?.price ?? 0);
    const qtyInt = parseInt(quantity);

    if (enteredPrice < minAllowed) {
      Alert.alert('Price Too Low', `Minimum allowed price is ₹${minAllowed}`);
      return;
    }

    if (qtyInt > currentScanned.stock) {
      Alert.alert('Stock Exceeded', `Available stock is only ${currentScanned.stock}`);
      return;
    }

    const newItem = {
      ...currentScanned,
      productId: currentScanned._id,
      agreedPrice: enteredPrice,
      price: enteredPrice,
      qty: qtyInt,
      quantity: qtyInt,
      cartKey: Date.now().toString() + Math.random().toString(36).slice(2)
    };

    setCart([...cart, newItem]);
    setCurrentScanned(null);
    setManualPrice('');
    setPriceMode('manual');
    setQuantity('1');
  };

  const handleRemoveFromCart = (cartKey) => {
    setCart(cart.filter((item) => item.cartKey !== cartKey));
  };

  const handleOpenEditCartItem = (item) => {
    setEditingCartItem(item);
    setEditPrice(String(item.agreedPrice));
    setEditQty(String(item.qty));
    setEditModalVisible(true);
  };

  const handleSaveCartEdit = () => {
    if (!editPrice || !editQty) {
      Alert.alert('Error', 'Price and Quantity cannot be empty.');
      return;
    }

    const newPrice = parseFloat(editPrice);
    const newQty = parseInt(editQty);
    const minAllowed = parseFloat(editingCartItem?.lowestRate ?? editingCartItem?.price ?? 0);

    if (newPrice < minAllowed) {
      Alert.alert('Price Too Low', `Minimum allowed price is ₹${minAllowed}`);
      return;
    }

    setCart(cart.map(item => {
      if (item.cartKey === editingCartItem.cartKey) {
        return { ...item, agreedPrice: newPrice, price: newPrice, qty: newQty, quantity: newQty };
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

    let totalAmount = cart.reduce((sum, item) => sum + (item.agreedPrice * item.qty), 0);

    const payloadCart = cart.map(item => ({
      ...item,
      quantity: item.qty
    }));

    const result = await processCheckout(payloadCart, totalAmount, 'Cash', customerName, customerPhone);
    
    if (result.success) {
      const now = new Date();
      let rowsHtml = cart.map(item => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px dashed #ccc; text-align: left;">
            <strong>${item.productName}</strong><br>
            <small style="color: #555;">Color: ${item.color || 'N/A'}</small>
          </td>
          <td style="text-align: center; border-bottom: 1px dashed #ccc;">${item.qty}</td>
          <td style="text-align: left; border-bottom: 1px dashed #ccc;">₹${(item.agreedPrice * item.qty).toFixed(2)}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <body style="padding: 20px; font-family: sans-serif; color: #000;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
              <h1 style="margin: 0; font-size: 24px;">${result.storeInfo?.storeName || 'BILLPE RETAIL'}</h1>
              <p style="margin: 2px 0;">${result.storeInfo?.address || ''}</p>
              <p style="text-align: right; margin: 5px 0;">Date: ${now.toLocaleDateString('en-IN')}</p>
            </div>
            <div style="margin-bottom: 10px;">
              <p><strong>Customer:</strong> ${customerName || 'Cash Sale'} (${customerPhone || 'N/A'})</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr style="border-bottom: 2px solid #000;">
                <th style="text-align: left; padding-bottom: 5px;">Item</th>
                <th style="text-align: center; padding-bottom: 5px;">Qty</th>
                <th style="text-align: left; padding-bottom: 5px;">Amount</th>
              </tr>
              ${rowsHtml}
            </table>
            <h2 style="text-align: left; margin-top: 20px; font-size: 20px; color: #10b981;">Grand Total: ₹${totalAmount.toFixed(2)}</h2>
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
      Alert.alert('Checkout Failed 🔒', result.message || 'Store subscription has expired. Please contact Admin.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>Point of Sale (POS)</Text>
        <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {scannerActive ? (
        <View style={styles.cameraContainer}>
          <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarcodeScanned} />
          <View style={styles.cameraOverlay}>
            <Button title="Close Scanner" onPress={() => setScannerActive(false)} color="#ef4444" />
          </View>
        </View>
      ) : currentScanned ? (
        <ScrollView contentContainerStyle={styles.billingContainer}>
          <Text style={styles.productTitle}>Scanned: {currentScanned?.productName}</Text>
          <Text style={styles.subText}>Available Stock: {currentScanned?.stock}</Text>
          <Text style={styles.subText}>Category: {currentScanned?.category || 'General'}</Text>

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

          <Text style={styles.label}>Agreed Price Per Item *</Text>
          <TextInput style={styles.input} placeholder="Enter price" placeholderTextColor="#64748b" value={manualPrice} onChangeText={(t) => { setManualPrice(t); setPriceMode('manual'); }} keyboardType="numeric" />

          <Text style={styles.label}>Quantity *</Text>
          <TextInput style={styles.input} placeholder="1" placeholderTextColor="#64748b" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />

          <View style={{ marginVertical: 10 }}>
            <Button title="Add to Cart" onPress={handleAddToCart} color="#10b981" />
          </View>
          <Button title="Cancel Item" onPress={() => setCurrentScanned(null)} color="#64748b" />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {(loading || salesLoading) && <ActivityIndicator size="small" color="#10b981" style={{ marginBottom: 10 }} />}
          
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerActive(true)}>
            <Text style={styles.scanBtnText}>📸 Scan Item Barcode</Text>
          </TouchableOpacity>

          <TextInput style={styles.input} placeholder="Customer Name" placeholderTextColor="#64748b" value={customerName} onChangeText={setCustomerName} />
          <TextInput style={styles.input} placeholder="Customer Phone" placeholderTextColor="#64748b" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Customer Address" placeholderTextColor="#64748b" value={customerAddress} onChangeText={setCustomerAddress} />

          <Text style={styles.subHeader}>Current Cart ({cart.length} items)</Text>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.cartKey}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#fff' }}>{item.productName}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Qty: {item.qty}  |  ₹{item.agreedPrice} each</Text>
                </View>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#10b981', marginRight: 10 }}>₹{item.agreedPrice * item.qty}</Text>
                
                <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditCartItem(item)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFromCart(item.cartKey)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>Your cart is empty.</Text>}
          />

          {cart.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Button title="Complete Bill & Print" onPress={handleCompleteCheckout} color="#f59e0b" />
            </View>
          )}
        </View>
      )}

      {/* Edit Cart Item Modal */}
      {editingCartItem && (
        <Modal visible={editModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Cart Item</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>{editingCartItem.productName}</Text>

              <Text style={styles.label}>Agreed Price (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editPrice} onChangeText={setEditPrice} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Quantity</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editQty} onChangeText={setEditQty} placeholderTextColor="#64748b" />

              <TouchableOpacity onPress={handleSaveCartEdit} style={styles.updateBtn}>
                <Text style={styles.updateBtnText}>Save Changes</Text>
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
  subHeader: { fontSize: 15, fontWeight: 'bold', marginVertical: 10, color: '#cbd5e1' },
  infoText: { textAlign: 'center', color: '#cbd5e1', marginBottom: 15, fontSize: 15 },
  label: { color: '#cbd5e1', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginVertical: 6, fontSize: 14 },
  billingContainer: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  productTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subText: { color: '#cbd5e1', fontSize: 13, marginBottom: 2 },
  scanBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  scanBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  priceOptionRow: { flexDirection: 'row', marginVertical: 15, gap: 8 },
  priceOptionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center' },
  priceOptionBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  priceOptionLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  priceOptionValue: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  priceOptionLabelActive: { color: '#0f172a' },
  cameraContainer: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  cameraOverlay: { position: 'absolute', bottom: 20, alignSelf: 'center' },
  list: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center' },
  updateBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});