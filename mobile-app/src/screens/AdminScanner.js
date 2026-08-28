import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, 
  Platform, Image, Button, Modal, FlatList 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

const DEFAULT_POPULAR_CATEGORIES = [
  'General',
  'Grocery / Kirana',
  'Apparel / Clothes',
  'Steel / Bartan',
  'Footwear / Shoes',
  'Electronics & Mobiles',
  'Stationery & Books',
  'Cosmetics & Beauty',
  'Snacks & Beverages',
  'Hardware & Electrical',
  'Medical & Pharma',
  'Toys & Gifts'
];

export default function AdminScanner({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState(DEFAULT_POPULAR_CATEGORIES);

  const [modalState, setModalState] = useState({
    visible: false,
    type: null,
    item: null,
    scannedBarcode: '',
    restocking: false
  });

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

  useEffect(() => {
    fetchExistingCategories();
  }, []);

  const fetchExistingCategories = async () => {
    try {
      const { data: res } = await axiosInstance.get('/products?includeSold=true');
      if (res.success && res.products) {
        const categorySet = new Set(DEFAULT_POPULAR_CATEGORIES);
        res.products.forEach(item => {
          if (item.category && item.category.trim()) {
            categorySet.add(item.category.trim());
          }
        });
        setDynamicCategories(Array.from(categorySet));
      }
    } catch (e) {
      console.log('Error fetching existing categories:', e);
    }
  };

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
            setModalState({
              visible: true,
              type: 'sold',
              item: found,
              scannedBarcode: data,
              restocking: false
            });
            return;
          }

          setModalState({
            visible: true,
            type: 'existing',
            item: found,
            scannedBarcode: data,
            restocking: false
          });
          return;
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        Alert.alert(t('subExpiredLocked'), err.response.data.message || 'Please renew your subscription.', [
          { text: 'Go to Subscription', onPress: () => navigation.navigate('SubscriptionScreen') }
        ]);
        setScanner(true);
        return;
      }
    }

    setP(prev => ({ ...prev, barcodeId: data }));
  };

  const handleRestock = async () => {
    const found = modalState.item;
    if (!found) return;

    setModalState(prev => ({ ...prev, restocking: true }));
    try {
      await axiosInstance.put(`/products/${found._id}`, { 
        stock: 1, 
        sold: false, 
        soldPrice: null,
        soldCustomerName: '',
        soldCustomerPhone: ''
      });
      setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });
      Alert.alert(t('success'), t('itemRestockedSuccess'));
      setScanner(true);
    } catch (e) {
      setModalState(prev => ({ ...prev, restocking: false, visible: false }));
      if (e.response && e.response.status === 403) {
        Alert.alert(t('subExpiredLocked'), e.response.data.message || 'Please renew your subscription.', [
          { text: 'Go to Subscription', onPress: () => navigation.navigate('SubscriptionScreen') }
        ]);
      } else {
        Alert.alert(t('error'), 'Error in Restock.');
      }
      setScanner(true);
    }
  };

  const handleEditDetails = () => {
    const found = modalState.item;
    const barcode = modalState.scannedBarcode;
    setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });

    setP({
      barcodeId: barcode,
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
      Alert.alert(t('error'), 'Please fill Product Name, Lowest Rate, and Highest Rate.');
      return;
    }

    const lowestVal = Number(p.lowestRate);
    const highestVal = Number(p.highestRate);

    if (lowestVal > highestVal) {
      Alert.alert(t('error'), t('pricingInvalidError'));
      return;
    }

    const finalCategory = p.category.trim() || 'General';

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
      formData.append('category', finalCategory);
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
        setDynamicCategories(prev => {
          if (!prev.some(cat => cat.toLowerCase() === finalCategory.toLowerCase())) {
            return [...prev, finalCategory];
          }
          return prev;
        });

        Alert.alert(t('success'), data.message || 'Product saved successfully!', [
          { 
            text: t('scanNextItem'), 
            onPress: () => {
              setP(initialFormState);
              setScanner(true);
            }
          },
          { text: t('dashboardBtn'), onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.status === 403) {
        Alert.alert(t('subExpiredLocked'), err.response.data.message || 'Please renew subscription.');
      } else {
        Alert.alert(t('error'), err.response?.data?.message || 'Failed to save product.');
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

  function renderCustomModal() {
    if (!modalState.visible || !modalState.item) return null;

    const item = modalState.item;
    const isSold = modalState.type === 'sold';

    return (
      <Modal transparent animationType="fade" visible={modalState.visible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isSold ? styles.modalCardAmber : styles.modalCardSky]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalTag, isSold ? styles.tagAmber : styles.tagSky]}>
                <Text style={[styles.modalTagText, isSold ? styles.tagTextAmber : styles.tagTextSky]}>
                  {isSold ? t('soldOutBadge') : t('inInventoryBadge')}
                </Text>
              </View>
              <Text style={styles.modalBarcode}>#{modalState.scannedBarcode}</Text>
            </View>

            <Text style={styles.modalProductName} numberOfLines={2}>
              {item.productName || 'Product'}
            </Text>

            <View style={styles.modalInfoBox}>
              {isSold ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('soldPriceModalLabel')}</Text>
                    <Text style={styles.infoValueHighlight}>₹{item.soldPrice || item.price || 0}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('customerModalLabel')}</Text>
                    <Text style={styles.infoValue}>{item.soldCustomerName || 'Walk-in Customer'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('mobileModalLabel')}</Text>
                    <Text style={styles.infoValue}>{item.soldCustomerPhone || 'N/A'}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('currentStockModalLabel')}</Text>
                    <Text style={styles.infoValueHighlight}>{item.stock} Units</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('basePriceModalLabel')}</Text>
                    <Text style={styles.infoValue}>₹{item.price || item.lowestRate || 0}</Text>
                  </View>
                  {item.category ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t('categoryModalLabel')}</Text>
                      <Text style={styles.infoValue}>{item.category}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            <Text style={styles.modalPrompt}>
              {isSold ? t('restockPrompt') : t('alreadyInDbPrompt')}
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });
                  setScanner(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>{t('scanAnotherBtn')}</Text>
              </TouchableOpacity>

              {isSold ? (
                <TouchableOpacity 
                  style={styles.modalPrimaryBtn}
                  onPress={handleRestock}
                  disabled={modalState.restocking}
                  activeOpacity={0.8}
                >
                  {modalState.restocking ? (
                    <ActivityIndicator color="#0f172a" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>{t('restockBtn')}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#38bdf8' }]}
                  onPress={handleEditDetails}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalPrimaryBtnText, { color: '#0f172a' }]}>{t('editUpdateBtn')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (scanner) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["code128"] }}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('back')}</Text>
        </TouchableOpacity>

        {renderCustomModal()}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('productEntryFormTitle')}</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>{t('mandatoryDetailsHeading')}</Text>

          <Text style={styles.label}>{t('barcodeIdLabel')}</Text>
          <TextInput 
            style={[styles.input, styles.readOnlyInput]} 
            value={p.barcodeId} 
            editable={false} 
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('productNameReqLabel')}</Text>
            {!p.name.trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
          </View>
          <TextInput 
            style={getRequiredInputStyle('name', p.name)} 
            placeholder={t('productNamePlaceholder')} 
            placeholderTextColor="#64748b" 
            value={p.name} 
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            onChangeText={(tVal) => setP({ ...p, name: tVal })} 
          />

          <View style={styles.rateRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('lowestRateReqLabel')}</Text>
                {!String(p.lowestRate).trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
              </View>
              <TextInput 
                style={getRequiredInputStyle('lowestRate', p.lowestRate)} 
                placeholder={t('lowestRatePlaceholder')} 
                placeholderTextColor="#64748b" 
                value={String(p.lowestRate)} 
                onFocus={() => setFocusedField('lowestRate')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(tVal) => setP({ ...p, lowestRate: tVal })} 
                keyboardType="numeric" 
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('highestRateReqLabel')}</Text>
                {!String(p.highestRate).trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
              </View>
              <TextInput 
                style={getRequiredInputStyle('highestRate', p.highestRate)} 
                placeholder={t('highestRatePlaceholder')} 
                placeholderTextColor="#64748b" 
                value={String(p.highestRate)} 
                onFocus={() => setFocusedField('highestRate')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(tVal) => setP({ ...p, highestRate: tVal })} 
                keyboardType="numeric" 
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { marginTop: 16 }]}>
          <Text style={styles.sectionHeadingOptional}>{t('additionalDetailsHeading')}</Text>

          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('productCategoryLabel')}</Text>
            {p.category ? (
              <TouchableOpacity onPress={() => setP({ ...p, category: '' })}>
                <Text style={styles.clearChipText}>{t('clearCategory')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setCategoryDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={p.category ? styles.dropdownSelectedText : styles.dropdownPlaceholderText}>
              {p.category ? p.category : t('selectCategoryPlaceholder')}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          <TextInput 
            style={styles.inputOptional} 
            placeholder={t('customCategoryPlaceholder')} 
            placeholderTextColor="#64748b" 
            value={p.category} 
            onChangeText={(tVal) => setP({ ...p, category: tVal })} 
          />

          <Text style={styles.label}>{t('productWeightLabel')}</Text>
          <View style={styles.weightRow}>
            <View style={{ flex: 1 }}>
              <TextInput 
                style={styles.inputOptional} 
                placeholder={t('weightKgPlaceholder')} 
                placeholderTextColor="#64748b" 
                keyboardType="numeric" 
                value={p.kg} 
                onChangeText={(tVal) => setP({ ...p, kg: tVal })} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput 
                style={styles.inputOptional} 
                placeholder={t('weightGramsPlaceholder')} 
                placeholderTextColor="#64748b" 
                keyboardType="numeric" 
                value={p.grams} 
                onChangeText={(tVal) => setP({ ...p, grams: tVal })} 
              />
            </View>
          </View>

          <Text style={styles.label}>{t('colorLabel')}</Text>
          <TextInput 
            style={styles.inputOptional} 
            placeholder={t('colorPlaceholder')} 
            placeholderTextColor="#64748b" 
            value={p.color} 
            onChangeText={(tVal) => setP({ ...p, color: tVal })} 
          />

          <Text style={styles.label}>{t('descriptionLabel')}</Text>
          <TextInput 
            style={styles.inputOptional} 
            placeholder={t('descriptionPlaceholder')} 
            placeholderTextColor="#64748b" 
            value={p.description} 
            onChangeText={(tVal) => setP({ ...p, description: tVal })} 
          />

          <Text style={styles.label}>{t('productPhotoLabel')}</Text>
          {p.imageUri ? (
            <View style={{ marginBottom: 12 }}>
              <Image source={{ uri: p.imageUri }} style={styles.preview} />
              <View style={{ marginTop: 8 }}>
                <Button title={t('removePhotoBtn')} onPress={removeImage} color="#B71C1C" />
              </View>
            </View>
          ) : (
            <View style={styles.photoButtonsRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Button title={t('clickPhotoBtn')} onPress={takePhoto} color="#2E7D32" />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Button title={t('openGalleryBtn')} onPress={pickImage} color="#1E88E5" />
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleSaveProduct} disabled={loading} style={styles.saveBtn} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>{t('saveUpdateProductBtn')}</Text>}
        </TouchableOpacity>

        <View style={{ marginTop: 12 }}>
          <Button 
            title={t('back')} 
            onPress={() => {
              if (hasUnsavedChanges()) {
                Alert.alert(t('discardChangesTitle'), t('discardChangesMsg'), [
                  { text: t('stay'), style: 'cancel' },
                  { text: t('discardAndGoBack'), style: 'destructive', onPress: () => navigation.goBack() }
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

      <Modal
        visible={categoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{t('selectCategoryModalTitle')}</Text>
              <TouchableOpacity onPress={() => setCategoryDropdownVisible(false)}>
                <Text style={styles.dropdownModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={dynamicCategories}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => {
                const isSelected = p.category.toLowerCase() === item.toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                    onPress={() => {
                      setP({ ...p, category: item });
                      setCategoryDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                      {item}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {renderCustomModal()}
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
  clearChipText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },

  dropdownTrigger: {
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  dropdownPlaceholderText: { color: '#64748b', fontSize: 14 },
  dropdownSelectedText: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  dropdownArrow: { color: '#38bdf8', fontSize: 12 },

  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  dropdownModalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dropdownModalClose: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold', padding: 4 },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  dropdownItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  dropdownItemText: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  dropdownItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  checkmark: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' },

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