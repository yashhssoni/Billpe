import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../api/axiosInstance';

export default function AdminScanner({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(true);
  const [loading, setLoading] = useState(false);

  const [p, setP] = useState({
    barcodeId: '',
    name: '',
    color: '',
    category: '', 
    description: '',
    kg: '',        
    grams: '',     
    lowestRate: '',
    highestRate: '',
    imageUri: ''
  });

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

  const handleBarCodeScanned = async ({ data }) => {
    setScanner(false);
    
    try {
      // Check subscription first via products fetch endpoint
      const { data: res } = await axiosInstance.get(`/products?includeSold=true`);
      if (res.success && res.products) {
        const found = res.products.find(item => item.barcode === data);
        
        if (found) {
          if (found.sold === true || found.stock <= 0) {
            Alert.alert(
              '🔒 Sold Item Details',
              `Product: ${found.productName}\n` +
              `Status: SOLD OUT\n` +
              `Sold Price: ₹${found.soldPrice || found.price}\n` +
              `Customer: ${found.soldCustomerName || 'Cash Sale'}\n` +
              `Mobile: ${found.soldCustomerPhone || 'N/A'}\n\n` +
              `Item already sold , Did you want to add this to Inventory?`,
              [
                { text: 'Scan Another', onPress: () => setScanner(true), style: 'cancel' },
                {
                  text: 'Restock',
                  pressable: true,
                  onPress: async () => {
                    try {
                      await axiosInstance.put(`/products/${found._id}`, { 
                        stock: 1, 
                        sold: false,
                        soldPrice: null,
                        soldCustomerName: '',
                        soldCustomerPhone: ''
                      });
                      Alert.alert('Success', 'Item added back to inventory!');
                      setScanner(true);
                    } catch (e) {
                      if (e.response && e.response.status === 403) {
                        Alert.alert('Subscription Expired 🔒', e.response.data.message || 'Please renew your subscription.', [
                          { text: 'Go to Subscription', onPress: () => navigation.navigate('SubscriptionScreen') }
                        ]);
                      } else {
                        Alert.alert('Error', 'Error in Restock.');
                      }
                      setScanner(true);
                    }
                  }
                }
              ]
            );
            return;
          }

          Alert.alert(
            '⚠️ Item Already in Inventory',
            `Product: ${found.productName}\n` +
            `Current Stock: ${found.stock}\n` +
            `Price: ₹${found.price}\n\n` +
            `Item already present in Inventory`,
            [
              { text: 'Scan Another', onPress: () => setScanner(true), style: 'cancel' },
              {
                text: 'Edit / Update Details',
                onPress: () => {
                  setP({
                    barcodeId: data,
                    name: found.productName || '',
                    color: found.color || '',
                    category: found.category || '',
                    description: found.description || '',
                    kg: found.weightKg !== undefined && found.weightKg !== null ? String(found.weightKg) : '',
                    grams: found.weightGrams !== undefined && found.weightGrams !== null ? String(found.weightGrams) : '',
                    lowestRate: String(found.lowestRate || found.price || ''),
                    highestRate: String(found.highestRate || found.price || ''),
                    imageUri: found.imageUri || ''
                  });
                }
              }
            ]
          );
          return;
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        Alert.alert('Subscription Required 🔒', err.response.data.message || 'Please renew your subscription.', [
          { text: 'Go to Subscription', onPress: () => navigation.navigate('SubscriptionScreen') }
        ]);
        setScanner(true);
        return;
      }
      console.log('Lookup error:', err.message);
    }

    // CASE 3: AGAR ITEM DATABASE ME BILKUL NAHI HAI (New Item)
    setP(prev => ({ ...prev, barcodeId: data }));
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Needed', 'Give permission to select photo from Gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setP(prev => ({ ...prev, imageUri: result.assets[0].uri }));
    }
  };

  const takePhoto = async () => {
    const camPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPermission.granted) {
      Alert.alert('Permission Needed', 'Give permission to click picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setP(prev => ({ ...prev, imageUri: result.assets[0].uri }));
    }
  };

  const removeImage = () => setP(prev => ({ ...prev, imageUri: '' }));

  const handleSaveProduct = async () => {
    if (!p.name || !p.lowestRate) {
      Alert.alert('Error', 'Please fill in Product Name and Lowest Rate.');
      return;
    }

    setLoading(true);
    try {
      const weightKgVal = Number(p.kg) || 0;
      const weightGramsVal = Number(p.grams) || 0;
      const totalWeightKg = weightKgVal + (weightGramsVal / 1000);

      const payload = {
        productName: p.name.trim(),
        barcode: p.barcodeId,
        price: Number(p.lowestRate),
        lowestRate: Number(p.lowestRate),
        highestRate: Number(p.highestRate || p.lowestRate),
        category: p.category.trim() || 'General',
        color: p.color.trim(),
        description: p.description.trim(),
        weightKg: weightKgVal,
        weightGrams: weightGramsVal,
        totalWeightKg: totalWeightKg,
        imageUri: p.imageUri,
        stock: 10
      };

      const { data } = await axiosInstance.post('/products', payload);
      setLoading(false);

      if (data.success || data.product) {
        Alert.alert('Success', data.message || 'Product saved successfully!', [
          { text: 'Scan Another', onPress: () => {
            setScanner(true);
            setP({ barcodeId: '', name: '', color: '', category: '', description: '', kg: '', grams: '', lowestRate: '', highestRate: '', imageUri: '' });
          }},
          { text: 'Dashboard', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.status === 403) {
        Alert.alert('Subscription Expired 🔒', err.response.data.message || 'Please renew subscription.');
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to save product.');
      }
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Product Entry Form</Text>

        <Text style={styles.label}>Barcode ID:</Text>
        <TextInput style={[styles.input, { backgroundColor: '#334155', color: '#94a3b8' }]} value={p.barcodeId} editable={false} />

        <Text style={styles.label}>Product Name *:</Text>
        <TextInput style={styles.input} placeholder="e.g. Patila, Shirt, Rice, etc." placeholderTextColor="#64748b" value={p.name} onChangeText={(t) => setP({ ...p, name: t })} />

        <Text style={styles.label}>Product Type:</Text>
        <TextInput style={styles.input} placeholder="e.g. Steel, Grocery, Apparel, etc." placeholderTextColor="#64748b" value={p.category} onChangeText={(t) => setP({ ...p, category: t })} />

        <Text style={styles.label}>Product Weight</Text>
        <View style={styles.weightRow}>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} placeholder="KG (e.g. 1)" placeholderTextColor="#64748b" keyboardType="numeric" value={p.kg} onChangeText={(t) => setP({ ...p, kg: t })} />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} placeholder="Grams (e.g. 200)" placeholderTextColor="#64748b" keyboardType="numeric" value={p.grams} onChangeText={(t) => setP({ ...p, grams: t })} />
          </View>
        </View>

        <Text style={styles.label}>Color:</Text>
        <TextInput style={styles.input} placeholder="Color" placeholderTextColor="#64748b" value={p.color} onChangeText={(t) => setP({ ...p, color: t })} />

        <Text style={styles.label}>Description:</Text>
        <TextInput style={styles.input} placeholder="Size, Quality, etc." placeholderTextColor="#64748b" value={p.description} onChangeText={(t) => setP({ ...p, description: t })} />

        <Text style={styles.label}>Lowest Rate *:</Text>
        <TextInput style={styles.input} placeholder="Lowest Price" placeholderTextColor="#64748b" value={String(p.lowestRate)} onChangeText={(t) => setP({ ...p, lowestRate: t })} keyboardType="numeric" />

        <Text style={styles.label}>Highest Rate *:</Text>
        <TextInput style={styles.input} placeholder="Highest Price" placeholderTextColor="#64748b" value={String(p.highestRate)} onChangeText={(t) => setP({ ...p, highestRate: t })} keyboardType="numeric" />

        <Text style={styles.label}>Product Photo :</Text>
        {p.imageUri ? (
          <View style={{ marginBottom: 15 }}>
            <Image source={{ uri: p.imageUri }} style={styles.preview} />
            <View style={{ marginTop: 8 }}>
              <Button title="Remove Photo" onPress={removeImage} color="#B71C1C" />
            </View>
          </View>
        ) : (
          <View style={styles.photoButtonsRow}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Button title="📸 Click Photo" onPress={takePhoto} color="#2E7D32" />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Button title="🖼️ Open Gallery" onPress={pickImage} color="#1E88E5" />
            </View>
          </View>
        )}

        <TouchableOpacity onPress={handleSaveProduct} disabled={loading} style={styles.saveBtn}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>Save / Update Product</Text>}
        </TouchableOpacity>

        <View style={{ marginTop: 10 }} />
        <Button title="Scan Another" onPress={() => setScanner(true)} color="orange" />
        <View style={{ marginTop: 10 }} />
        <Button title="Back" onPress={() => navigation.goBack()} color="red" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, backgroundColor: '#0f172a', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#cbd5e1' },
  input: { borderWidth: 1, padding: 12, marginBottom: 15, borderRadius: 8, borderColor: '#334155', backgroundColor: '#1e293b', color: '#fff' },
  weightRow: { flexDirection: 'row', gap: 10 },
  photoButtonsRow: { flexDirection: 'row', marginBottom: 15 },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8 },
  preview: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  saveBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  infoText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});