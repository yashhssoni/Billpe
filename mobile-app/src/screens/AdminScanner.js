import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, 
  Platform, Image, Button 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axiosInstance from '../api/axiosInstance';

export default function AdminScanner({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const initialFormState = {
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
  };

  const [p, setP] = useState(initialFormState);

  const compressImage = async (uri) => {
    if (!uri) return null;
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { 
          compress: 0.7, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      return manipResult.uri;
    } catch (error) {
      console.log('Image compression error:', error);
      return uri; 
    }
  };

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

  const hasUnsavedChanges = () => {
    return (
      p.name.trim() !== '' ||
      p.lowestRate.trim() !== '' ||
      p.highestRate.trim() !== '' ||
      p.category.trim() !== '' ||
      p.color.trim() !== '' ||
      p.kg.trim() !== '' ||
      p.grams.trim() !== '' ||
      p.description.trim() !== '' ||
      p.imageUri !== ''
    );
  };

  const handleBarCodeScanned = async ({ data }) => {
    setScanner(false);
    
    try {
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
              `Customer: ${found.soldCustomerName || 'N/A'}\n` +
              `Mobile: ${found.soldCustomerPhone || 'N/A'}\n\n` +
              `Item already sold, do you want to restock this to Inventory?`,
              [
                { text: 'Scan Another', onPress: () => setScanner(true), style: 'cancel' },
                {
                  text: 'Restock',
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
    }

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
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const rawUri = result.assets[0].uri;
      const optimizedUri = await compressImage(rawUri);
      setP(prev => ({ ...prev, imageUri: optimizedUri }));
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
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const rawUri = result.assets[0].uri;
      const optimizedUri = await compressImage(rawUri);
      setP(prev => ({ ...prev, imageUri: optimizedUri }));
    }
  };

  const removeImage = () => setP(prev => ({ ...prev, imageUri: '' }));

  const handleSaveProduct = async () => {
    if (!p.name.trim() || !String(p.lowestRate).trim() || !String(p.highestRate).trim()) {
      Alert.alert('Incomplete Required Fields ⚠️', 'Please fill Product Name, Lowest Rate, and Highest Rate.');
      return;
    }

    const lowestVal = Number(p.lowestRate);
    const highestVal = Number(p.highestRate);

    if (lowestVal > highestVal) {
      Alert.alert('Invalid Pricing ⚠️', 'Lowest Rate cannot be higher than Highest Rate.');
      return;
    }

    setLoading(true);
    try {
      const weightKgVal = Number(p.kg) || 0;
      const weightGramsVal = Number(p.grams) || 0;
      const totalWeightKg = weightKgVal + (weightGramsVal / 1000);

      const formData = new FormData();
      formData.append('productName', p.name.trim());
      formData.append('barcode', p.barcodeId);
      formData.append('price', lowestVal);
      formData.append('lowestRate', lowestVal);
      formData.append('highestRate', highestVal);
      formData.append('category', p.category.trim() || 'General');
      formData.append('color', p.color.trim());
      formData.append('description', p.description.trim());
      formData.append('weightKg', weightKgVal);
      formData.append('weightGrams', weightGramsVal);
      formData.append('totalWeightKg', totalWeightKg);
      formData.append('stock', 10);

      if (p.imageUri && p.imageUri.startsWith('file://')) {
        const filename = p.imageUri.split('/').pop() || 'product.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('imageFile', {
          uri: p.imageUri,
          name: filename,
          type,
        });
      } else if (p.imageUri) {
        formData.append('imageUri', p.imageUri);
      }

      const { data } = await axiosInstance.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setLoading(false);

      if (data.success || data.product) {
        Alert.alert('Success', data.message || 'Product saved successfully!', [
          { 
            text: 'Scan Next Item', 
            onPress: () => {
              setP(initialFormState);
              setScanner(true);
            }
          },
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

  const getRequiredInputStyle = (fieldName, value) => {
    const isFilled = Boolean(value && String(value).trim().length > 0);
    const isFocused = focusedField === fieldName;

    if (!isFilled) {
      return isFocused ? [styles.input, styles.inputRedActive] : [styles.input, styles.inputRedIdle];
    } else {
      return isFocused ? [styles.input, styles.inputGreenActive] : [styles.input, styles.inputFilledClean];
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Product Entry Form</Text>

        {/* ================= REQUIRED SECTION (ON TOP) ================= */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Mandatory Details (Required *)</Text>

          {/* 1. Barcode ID */}
          <Text style={styles.label}>Barcode ID:</Text>
          <TextInput 
            style={[styles.input, styles.readOnlyInput]} 
            value={p.barcodeId} 
            editable={false} 
          />

          {/* 2. Product Name */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Product Name *</Text>
            {!p.name.trim() && <Text style={styles.requiredTag}>Required</Text>}
          </View>
          <TextInput 
            style={getRequiredInputStyle('name', p.name)} 
            placeholder="e.g. Steel Patila, Formal Shirt, Basmati Rice" 
            placeholderTextColor="#64748b" 
            value={p.name} 
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            onChangeText={(t) => setP({ ...p, name: t })} 
          />

          <View style={styles.rateRow}>
            {/* Lowest Rate */}
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Lowest Rate *</Text>
                {!String(p.lowestRate).trim() && <Text style={styles.requiredTag}>Required</Text>}
              </View>
              <TextInput 
                style={getRequiredInputStyle('lowestRate', p.lowestRate)} 
                placeholder="Min Price (e.g. 400)" 
                placeholderTextColor="#64748b" 
                value={String(p.lowestRate)} 
                onFocus={() => setFocusedField('lowestRate')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => setP({ ...p, lowestRate: t })} 
                keyboardType="numeric" 
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Highest Rate *</Text>
                {!String(p.highestRate).trim() && <Text style={styles.requiredTag}>Required</Text>}
              </View>
              <TextInput 
                style={getRequiredInputStyle('highestRate', p.highestRate)} 
                placeholder="Max Price (e.g. 550)" 
                placeholderTextColor="#64748b" 
                value={String(p.highestRate)} 
                onFocus={() => setFocusedField('highestRate')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => setP({ ...p, highestRate: t })} 
                keyboardType="numeric" 
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { marginTop: 16 }]}>
          <Text style={styles.sectionHeadingOptional}>Additional Details (Optional)</Text>

          <Text style={styles.label}>Product Type / Category:</Text>
          <TextInput 
            style={styles.inputOptional} 
            placeholder="e.g. Steel, Grocery, Apparel, etc." 
            placeholderTextColor="#64748b" 
            value={p.category} 
            onChangeText={(t) => setP({ ...p, category: t })} 
          />

          <Text style={styles.label}>Product Weight:</Text>
          <View style={styles.weightRow}>
            <View style={{ flex: 1 }}>
              <TextInput 
                style={styles.inputOptional} 
                placeholder="KG (e.g. 1)" 
                placeholderTextColor="#64748b" 
                keyboardType="numeric" 
                value={p.kg} 
                onChangeText={(t) => setP({ ...p, kg: t })} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput 
                style={styles.inputOptional} 
                placeholder="Grams (e.g. 200)" 
                placeholderTextColor="#64748b" 
                keyboardType="numeric" 
                value={p.grams} 
                onChangeText={(t) => setP({ ...p, grams: t })} 
              />
            </View>
          </View>

          <Text style={styles.label}>Color:</Text>
          <TextInput 
            style={styles.inputOptional} 
            placeholder="Color" 
            placeholderTextColor="#64748b" 
            value={p.color} 
            onChangeText={(t) => setP({ ...p, color: t })} 
          />

          <Text style={styles.label}>Description:</Text>
          <TextInput 
            style={styles.inputOptional} 
            placeholder="Size, Quality, etc." 
            placeholderTextColor="#64748b" 
            value={p.description} 
            onChangeText={(t) => setP({ ...p, description: t })} 
          />

          <Text style={styles.label}>Product Photo:</Text>
          {p.imageUri ? (
            <View style={{ marginBottom: 12 }}>
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
        </View>

        <TouchableOpacity onPress={handleSaveProduct} disabled={loading} style={styles.saveBtn} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>Save / Update Product</Text>}
        </TouchableOpacity>

        <View style={{ marginTop: 12 }}>
          <Button 
            title="Back" 
            onPress={() => {
              if (hasUnsavedChanges()) {
                Alert.alert('Discard Changes?', 'You have unsaved details. Are you sure you want to go back?', [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Discard & Go Back', style: 'destructive', onPress: () => navigation.goBack() }
                ]);
              } else {
                navigation.goBack();
              }
            }} 
            color="#ef4444" 
          />
        </View>
        <View style={styles.androidNavSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingTop: 35, backgroundColor: '#0f172a', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 },

  sectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeading: { fontSize: 13, fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  sectionHeadingOptional: { fontSize: 13, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#cbd5e1', fontSize: 13 },
  requiredTag: { fontSize: 10, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase' },

  input: { 
    borderWidth: 1.5, 
    padding: 12, 
    marginBottom: 14, 
    borderRadius: 12, 
    backgroundColor: '#0f172a', 
    color: '#fff', 
    fontSize: 14 
  },
  readOnlyInput: { backgroundColor: '#334155', color: '#94a3b8', borderColor: '#475569' },

  inputRedIdle: { 
    borderColor: 'rgba(239, 68, 68, 0.7)', 
    shadowColor: '#ef4444', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.35, 
    shadowRadius: 4, 
    elevation: 2 
  },
  inputRedActive: { 
    borderColor: '#ef4444', 
    borderWidth: 2, 
    shadowColor: '#ef4444', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 8, 
    elevation: 4 
  },

  inputGreenActive: { 
    borderColor: '#10b981', 
    borderWidth: 2, 
    shadowColor: '#10b981', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 8, 
    elevation: 4 
  },

  inputFilledClean: { 
    borderColor: '#334155', 
    borderWidth: 1.5 
  },

  inputOptional: { 
    borderWidth: 1, 
    padding: 12, 
    marginBottom: 14, 
    borderRadius: 12, 
    borderColor: '#334155', 
    backgroundColor: '#0f172a', 
    color: '#fff', 
    fontSize: 14 
  },

  rateRow: { flexDirection: 'row', gap: 10 },
  weightRow: { flexDirection: 'row', gap: 10 },
  photoButtonsRow: { flexDirection: 'row', marginBottom: 12 },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8 },
  preview: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover' },

  saveBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 18, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },

  androidNavSpace: { height: 45 },
  infoText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});