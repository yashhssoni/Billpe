import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, 
  Platform, Image, Button, Modal, FlatList, BackHandler 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import BackButton from '../components/BackButton';

const DEFAULT_POPULAR_CATEGORIES = [
  'General', 'Grocery / Kirana', 'Apparel / Clothes', 'Steel / Bartan',
  'Footwear / Shoes', 'Electronics & Mobiles', 'Stationery & Books',
  'Cosmetics & Beauty', 'Snacks & Beverages', 'Hardware & Electrical',
  'Medical & Pharma', 'Toys & Gifts'
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
    stock: '1',
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

  const hasUnsavedChanges = () => {
    return (
      p.name.trim() !== '' ||
      p.stock.trim() !== '' ||
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

  const handleBackNavigation = () => {
    if (categoryDropdownVisible) {
      setCategoryDropdownVisible(false);
      return;
    }
    if (modalState.visible) {
      setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });
      setScanner(true);
      return;
    }
    if (!scanner) {
      if (hasUnsavedChanges()) {
        Alert.alert(t('discardChangesTitle'), t('discardChangesMsg'), [
          { text: t('stay'), style: 'cancel' },
          { text: t('discardAndGoBack'), style: 'destructive', onPress: () => { setP(initialFormState); setScanner(true); } }
        ]);
        return;
      }
      setScanner(true);
      return;
    }
    navigation.goBack();
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (categoryDropdownVisible) {
          setCategoryDropdownVisible(false);
          return true;
        }
        if (modalState.visible) {
          setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });
          setScanner(true);
          return true;
        }
        if (!scanner) {
          if (hasUnsavedChanges()) {
            Alert.alert(t('discardChangesTitle'), t('discardChangesMsg'), [
              { text: t('stay'), style: 'cancel' },
              { text: t('discardAndGoBack'), style: 'destructive', onPress: () => { setP(initialFormState); setScanner(true); } }
            ]);
            return true;
          }
          setScanner(true);
          return true;
        }
        navigation.goBack();
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [categoryDropdownVisible, modalState.visible, scanner, p, navigation])
  );

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
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
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
        <BackButton onPress={() => navigation.goBack()} title={t('back')} />
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (modalState.visible) return;

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
        return;
      }
    }

    setScanner(false);
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

    setScanner(false);
    setP({
      barcodeId: barcode,
      name: found.productName || '',
      stock: String(found.stock ?? 1),
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
    const stockVal = p.stock && !isNaN(Number(p.stock)) ? Math.max(1, parseInt(p.stock, 10)) : 1;

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
      formData.append('stock', stockVal);
      formData.append('category', finalCategory);
      formData.append('color', p.color.trim());
      formData.append('description', p.description.trim());
      formData.append('weightKg', weightKgVal);
      formData.append('weightGrams', weightGramsVal);
      formData.append('totalWeightKg', totalWeightKg);

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
        headers: { 'Content-Type': 'multipart/form-data' },
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
      <Modal 
        transparent={true} 
        animationType="fade" 
        visible={modalState.visible}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });
          setScanner(true);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isSold ? styles.modalCardAmber : styles.modalCardEmerald]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalTag, isSold ? styles.tagAmber : styles.tagEmerald]}>
                <Text style={[styles.modalTagText, isSold ? styles.tagTextAmber : styles.tagTextEmerald]}>
                  {isSold ? t('soldOutBadge') : t('inInventoryBadge')}
                </Text>
              </View>
              <Text style={styles.modalBarcode}>#{modalState.scannedBarcode}</Text>
            </View>

            <View style={styles.modalHeroRow}>
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.modalThumbnail} />
              ) : (
                <View style={styles.modalThumbnailPlaceholder}>
                  <Text style={{ fontSize: 24 }}>🛍️</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalProductName} numberOfLines={2}>
                  {item.productName || 'Product'}
                </Text>
                <Text style={styles.modalProductCategory}>
                  {item.category || 'General'} {item.color ? `• ${item.color}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.modalInfoBox}>
              {isSold ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('soldPriceModalLabel')}</Text>
                    <Text style={styles.infoValueHighlight}>₹{item.soldPrice || item.price || 0}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('customerModalLabel')}</Text>
                    <Text style={styles.infoValue}>{item.soldCustomerName || t('walkInCustomer')}</Text>
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
                    <Text style={styles.infoValueHighlight}>{item.stock ?? 1} Units</Text>
                  </View>

                  <View style={styles.pricingPillRow}>
                    <View style={styles.ratePill}>
                      <Text style={styles.ratePillLabel}>{t('lowestRateReqLabel').replace('*', '').trim()}</Text>
                      <Text style={styles.ratePillValue}>₹{item.lowestRate || item.price || 0}</Text>
                    </View>
                    <View style={styles.ratePill}>
                      <Text style={styles.ratePillLabel}>{t('highestRateReqLabel').replace('*', '').trim()}</Text>
                      <Text style={[styles.ratePillValue, { color: '#38bdf8' }]}>
                        ₹{item.highestRate || item.price || 0}
                      </Text>
                    </View>
                  </View>
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
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleEditDetails}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalPrimaryBtnText, { color: '#0f172a' }]}>
                    {t('editUpdateBtn')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {scanner ? (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["code128"] }}
          />
          <View style={styles.cameraBackOverlay}>
            <BackButton onPress={() => navigation.goBack()} title={t('back')} />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BackButton onPress={handleBackNavigation} title={t('back')} />

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

              <View style={styles.labelRow}>
                <Text style={styles.label}>Quantity / Stock Units *</Text>
                {!p.stock.trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
              </View>
              <TextInput 
                style={getRequiredInputStyle('stock', p.stock)} 
                placeholder="e.g. 1 (Unique item) or 50, 100 (Bulk copies)" 
                placeholderTextColor="#64748b" 
                value={p.stock} 
                keyboardType="numeric"
                onFocus={() => setFocusedField('stock')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(tVal) => setP({ ...p, stock: tVal })} 
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
                onPress={handleBackNavigation} 
                color="#ef4444" 
              />
            </View>
            <View style={styles.androidNavSpace} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingTop: 40, backgroundColor: '#0f172a', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 },
  cameraBackOverlay: { position: 'absolute', top: 50, left: 20 },
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
  inputRedIdle: { borderColor: 'rgba(239, 68, 68, 0.7)' },
  inputRedActive: { borderColor: '#ef4444', borderWidth: 2 },
  inputGreenActive: { borderColor: '#10b981', borderWidth: 2 },
  inputFilledClean: { borderColor: '#334155', borderWidth: 1.5 },
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
  preview: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover' },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    elevation: 12
  },
  modalCardEmerald: { borderColor: '#10b981' },
  modalCardAmber: { borderColor: '#f59e0b' },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  modalTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  tagEmerald: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  tagTextEmerald: { color: '#10b981', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  tagAmber: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' },
  tagTextAmber: { color: '#f59e0b', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  modalBarcode: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  modalHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  modalThumbnail: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#1e293b' },
  modalThumbnailPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalProductName: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 2 },
  modalProductCategory: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  modalInfoBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  infoValue: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  infoValueHighlight: { color: '#10b981', fontSize: 14, fontWeight: '900' },
  pricingPillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  ratePill: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  ratePillLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  ratePillValue: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  modalPrompt: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 8,
    lineHeight: 18
  },
  modalActionsRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 13 },
  modalPrimaryBtn: {
    flex: 1.3,
    backgroundColor: '#f59e0b',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalPrimaryBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 13 },
  androidNavSpace: { height: 45 },
  infoText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});