import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, ScrollView, 
  Modal, FlatList, SafeAreaView 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

const DEMO_SCANNER_LIMIT_KEY = 'billpe_demo_scanner_action_count';
const DEMO_PRODUCTS_KEY = 'billpe_demo_local_products';

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

export default function DemoAdminScanner({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, setScanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState(DEFAULT_POPULAR_CATEGORIES);
  const [actionsLeft, setActionsLeft] = useState(5);

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
    lowestRate: '',
    highestRate: '',
    imageUri: ''
  };

  const [p, setP] = useState(initialFormState);

  useEffect(() => {
    loadDemoLimit();
    loadExistingLocalCategories();
  }, []);

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_SCANNER_LIMIT_KEY);
      if (savedCount !== null) {
        const remaining = 5 - parseInt(savedCount, 10);
        setActionsLeft(remaining > 0 ? remaining : 0);
      } else {
        setActionsLeft(5);
      }
    } catch (e) {
      console.log('Error loading demo limit:', e);
    }
  };

  const handleDemoActionWrapper = async (callback) => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_SCANNER_LIMIT_KEY);
      const currentCount = savedCount ? parseInt(savedCount, 10) : 0;

      if (currentCount >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached / डेमो लिमिट समाप्त",
          t('demoLimitReachedMsg') || "आपने स्टॉक एंट्री के 5 फ्री एक्शन्स पूरे कर लिए हैं। / You have used 5 free actions.",
          [{ text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }]
        );
        return;
      }

      const nextCount = currentCount + 1;
      await AsyncStorage.setItem(DEMO_SCANNER_LIMIT_KEY, nextCount.toString());
      
      const remaining = 5 - nextCount;
      setActionsLeft(remaining > 0 ? remaining : 0);

      callback();
    } catch (e) {
      console.log('Error updating demo limit:', e);
      callback();
    }
  };

  const loadExistingLocalCategories = async () => {
    try {
      const localData = await AsyncStorage.getItem(DEMO_PRODUCTS_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        const categorySet = new Set(DEFAULT_POPULAR_CATEGORIES);
        parsed.forEach(item => {
          if (item.category && item.category.trim()) {
            categorySet.add(item.category.trim());
          }
        });
        setDynamicCategories(Array.from(categorySet));
      }
    } catch (e) {
      console.log('Error loading categories:', e);
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
      p.stock.trim() !== '' ||
      p.lowestRate.trim() !== '' ||
      p.highestRate.trim() !== '' ||
      p.category.trim() !== '' ||
      p.color.trim() !== '' ||
      p.imageUri !== ''
    );
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (modalState.visible) return;

    try {
      const localData = await AsyncStorage.getItem(DEMO_PRODUCTS_KEY);
      const products = localData ? JSON.parse(localData) : [];
      const found = products.find(item => item.barcode === data);
        
      if (found) {
        setModalState({
          visible: true,
          type: 'existing',
          item: found,
          scannedBarcode: data,
          restocking: false
        });
        return;
      }
    } catch (err) {
      console.log('Scan check error:', err);
    }

    setScanner(false);
    setP(prev => ({ ...prev, barcodeId: data }));
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
      lowestRate: String(found.lowestRate || found.price || ''),
      highestRate: String(found.highestRate || found.price || ''),
      imageUri: found.imageUri || ''
    });
  };

  const pickImage = async () => {
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
      Alert.alert(t('error'), t('Please fill Product Name, Lowest Rate, and Highest Rate.'));
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

    handleDemoActionWrapper(async () => {
      setLoading(true);
      try {
        const newProduct = {
          _id: 'demo_prod_' + Date.now(),
          productName: p.name.trim(),
          barcode: p.barcodeId || 'BARCODE_' + Date.now().toString().slice(-4),
          price: lowestVal,
          lowestRate: lowestVal,
          highestRate: highestVal,
          stock: stockVal,
          category: finalCategory,
          color: p.color.trim(),
          description: p.description.trim(),
          imageUri: p.imageUri
        };

        const localData = await AsyncStorage.getItem(DEMO_PRODUCTS_KEY);
        const products = localData ? JSON.parse(localData) : [];
        products.unshift(newProduct);
        await AsyncStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify(products));

        setLoading(false);
        setDynamicCategories(prev => {
          if (!prev.some(cat => cat.toLowerCase() === finalCategory.toLowerCase())) {
            return [...prev, finalCategory];
          }
          return prev;
        });

        Alert.alert(t('success'), t('Product saved successfully! (Demo)'), [
          { 
            text: t('scanNextItem'), 
            onPress: () => {
              setP(initialFormState);
              setScanner(true);
            }
          },
          { text: t('dashboardBtn'), onPress: () => navigation.goBack() }
        ]);
      } catch (err) {
        setLoading(false);
        Alert.alert(t('error'), t('Failed to save product.'));
      }
    });
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

    return (
      <Modal transparent={true} animationType="fade" visible={modalState.visible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalCardEmerald]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalTag, styles.tagEmerald]}>
                <Text style={[styles.modalTagText, styles.tagTextEmerald]}>{t('inInventoryBadge')}</Text>
              </View>
              <Text style={styles.modalBarcode}>#{modalState.scannedBarcode}</Text>
            </View>

            <View style={styles.modalHeroRow}>
              <View style={styles.modalThumbnailPlaceholder}>
                <Text style={{ fontSize: 24 }}>🛍️</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalProductName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.modalProductCategory}>{item.category || 'General'}</Text>
              </View>
            </View>

            <View style={styles.modalInfoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('currentStockModalLabel')}</Text>
                <Text style={styles.infoValueHighlight}>{item.stock ?? 1} Units</Text>
              </View>
              <View style={styles.pricingPillRow}>
                <View style={styles.ratePill}>
                  <Text style={styles.ratePillLabel}>Lowest Rate</Text>
                  <Text style={styles.ratePillValue}>₹{item.lowestRate || item.price || 0}</Text>
                </View>
                <View style={styles.ratePill}>
                  <Text style={styles.ratePillLabel}>Highest Rate</Text>
                  <Text style={[styles.ratePillValue, { color: '#38bdf8' }]}>₹{item.highestRate || item.price || 0}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.modalPrompt}>{t('alreadyInDbPrompt')}</Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setModalState({ visible: false, type: null, item: null, scannedBarcode: '', restocking: false });
                  setScanner(true);
                }}
              >
                <Text style={styles.modalCancelBtnText}>{t('scanAnotherBtn')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalPrimaryBtn, { backgroundColor: '#10b981' }]}
                onPress={handleEditDetails}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: '#0f172a' }]}>{t('editUpdateBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      {scanner ? (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["code128", "qr", "ean13"] }}
          />
          <SafeAreaView style={styles.uniformCameraOverlay}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <BackButton onPress={() => navigation.goBack()} />
              <LanguageSwitcher />
            </View>
          </SafeAreaView>
        </View>
      ) : (
        <ScreenWrapper scrollable={true}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <BackButton onPress={() => {
              if (hasUnsavedChanges()) {
                Alert.alert(t('discardChangesTitle'), t('discardChangesMsg'), [
                  { text: t('stay'), style: 'cancel' },
                  { text: t('discardAndGoBack'), style: 'destructive', onPress: () => navigation.goBack() }
                ]);
              } else {
                navigation.goBack();
              }
            }} />
            <LanguageSwitcher />
          </View>

          <Text style={styles.title}>{t('productEntryFormTitle')} (Demo)</Text>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>{t('mandatoryDetailsHeading')}</Text>

            <Text style={styles.label}>{t('barcodeIdLabel')}</Text>
            <TextInput style={[styles.input, styles.readOnlyInput]} value={p.barcodeId || 'DEMO_BARCODE_123'} editable={false} />

            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('productNameReqLabel')}</Text>
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
              <Text style={styles.label}>{t('Quantity / Stock Units *') || 'Quantity / Stock Units *'}</Text>
            </View>
            <TextInput 
              style={getRequiredInputStyle('stock', p.stock)} 
              placeholder="e.g. 50" 
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
                </View>
                <TextInput 
                  style={getRequiredInputStyle('lowestRate', p.lowestRate)} 
                  placeholder="₹ Min" 
                  placeholderTextColor="#64748b" 
                  value={String(p.lowestRate)} 
                  onChangeText={(tVal) => setP({ ...p, lowestRate: tVal })} 
                  keyboardType="numeric" 
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{t('highestRateReqLabel')}</Text>
                </View>
                <TextInput 
                  style={getRequiredInputStyle('highestRate', p.highestRate)} 
                  placeholder="₹ Max" 
                  placeholderTextColor="#64748b" 
                  value={String(p.highestRate)} 
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

            <Text style={styles.label}>{t('colorLabel')}</Text>
            <TextInput 
              style={styles.inputOptional} 
              placeholder={t('colorPlaceholder')} 
              placeholderTextColor="#64748b" 
              value={p.color} 
              onChangeText={(tVal) => setP({ ...p, color: tVal })} 
            />

            <Text style={styles.label}>{t('productPhotoLabel')}</Text>
            {p.imageUri ? (
              <View style={{ marginBottom: 12 }}>
                <Image source={{ uri: p.imageUri }} style={styles.preview} />
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity style={styles.photoActionBtnRed} onPress={removeImage}>
                    <Text style={styles.photoActionBtnText}>{t('removePhotoBtn') || 'Remove Photo'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoButtonsRow}>
                <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#2E7D32', marginRight: 6 }]} onPress={takePhoto}>
                  <Text style={styles.photoActionBtnText}>{t('clickPhotoBtn') || 'Click Photo'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#1E88E5', marginLeft: 6 }]} onPress={pickImage}>
                  <Text style={styles.photoActionBtnText}>{t('openGalleryBtn') || 'Gallery'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleSaveProduct} disabled={loading} style={styles.saveBtn} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>{t('saveUpdateProductBtn')} (Demo)</Text>}
          </TouchableOpacity>

          <View style={{ height: 45 }} />
        </ScreenWrapper>
      )}

      <Modal visible={categoryDropdownVisible} transparent={true} animationType="fade">
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
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>{item}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 },
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, alignItems: 'center', zIndex: 20 },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  uniformCameraOverlay: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10 },
  sectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeading: { fontSize: 13, fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', marginBottom: 14 },
  sectionHeadingOptional: { fontSize: 13, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#cbd5e1', fontSize: 13 },
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
  dropdownModalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalCard: { width: '100%', maxWidth: 360, backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#38bdf8' },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  dropdownModalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dropdownModalClose: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold', padding: 4 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dropdownItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  dropdownItemText: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  dropdownItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  checkmark: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' },
  input: { borderWidth: 1.5, padding: 12, marginBottom: 14, borderRadius: 12, backgroundColor: '#0f172a', color: '#fff', fontSize: 14 },
  readOnlyInput: { backgroundColor: '#334155', color: '#94a3b8', borderColor: '#475569' },
  inputRedIdle: { borderColor: 'rgba(239, 68, 68, 0.7)' },
  inputRedActive: { borderColor: '#ef4444', borderWidth: 2 },
  inputGreenActive: { borderColor: '#10b981', borderWidth: 2 },
  inputFilledClean: { borderColor: '#334155', borderWidth: 1.5 },
  inputOptional: { borderWidth: 1, padding: 12, marginBottom: 14, borderRadius: 12, borderColor: '#334155', backgroundColor: '#0f172a', color: '#fff', fontSize: 14 },
  rateRow: { flexDirection: 'row', gap: 10 },
  photoButtonsRow: { flexDirection: 'row', marginBottom: 12 },
  photoActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  photoActionBtnRed: { backgroundColor: '#B71C1C', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  photoActionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  preview: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover' },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#1e293b', borderRadius: 22, padding: 20, borderWidth: 1.5 },
  modalCardEmerald: { borderColor: '#10b981' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  tagEmerald: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  tagTextEmerald: { color: '#10b981', fontWeight: '900', fontSize: 11 },
  modalBarcode: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  modalHeroRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  modalThumbnailPlaceholder: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  modalProductName: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 2 },
  modalProductCategory: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  modalInfoBox: { backgroundColor: '#0f172a', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  infoValueHighlight: { color: '#10b981', fontSize: 14, fontWeight: '900' },
  pricingPillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  ratePill: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center' },
  ratePillLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  ratePillValue: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  modalPrompt: { color: '#cbd5e1', fontSize: 13, textAlign: 'center', fontWeight: '600', marginBottom: 16, lineHeight: 18 },
  modalActionsRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#334155', paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 13 },
  modalPrimaryBtn: { flex: 1.3, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryBtnText: { fontWeight: '900', fontSize: 13 },
  infoText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});