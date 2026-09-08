import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, 
  StyleSheet, Modal, ScrollView, TextInput, Button, Image, BackHandler, 
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';

const POPULAR_CATEGORIES = [
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

export default function ManageDatabase({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editCategoryDropdownVisible, setEditCategoryDropdownVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Hardware Back Button Handler for Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (editCategoryDropdownVisible) {
          setEditCategoryDropdownVisible(false);
          return true;
        }
        if (modalVisible) {
          setModalVisible(false);
          return true;
        }
        if (filterDropdownVisible) {
          setFilterDropdownVisible(false);
          return true;
        }
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [editCategoryDropdownVisible, modalVisible, filterDropdownVisible, navigation])
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/products?includeSold=true');
      if (data.success) setProducts(data.products || []);
    } catch (err) {
      console.log('Error fetching products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const availableCategories = useMemo(() => {
    const set = new Set(POPULAR_CATEGORIES);
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => (p.category || 'General').toLowerCase() === selectedCategory.toLowerCase());
  }, [products, selectedCategory]);

  const handleOpenEdit = (item) => {
    setEditingProduct({
      id: item._id,
      barcode: item.barcode || '',
      productName: item.productName || '',
      stock: String(item.stock !== undefined && item.stock !== null ? item.stock : 1),
      category: item.category || '',
      kg: item.weightKg !== undefined && item.weightKg !== null ? String(item.weightKg) : '',
      grams: item.weightGrams !== undefined && item.weightGrams !== null ? String(item.weightGrams) : '',
      color: item.color || '',
      description: item.description || '',
      lowestRate: String(item.lowestRate || item.price || ''),
      highestRate: String(item.highestRate || item.price || ''),
      imageUri: item.imageUri || ''
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditingProduct({ ...editingProduct, imageUri: result.assets[0].uri });
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditingProduct({ ...editingProduct, imageUri: result.assets[0].uri });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct.productName.trim() || !String(editingProduct.lowestRate).trim() || !String(editingProduct.highestRate).trim()) {
      Alert.alert(t('error'), 'Please fill Product Name, Lowest Rate, and Highest Rate.');
      return;
    }

    const lowestVal = Number(editingProduct.lowestRate);
    const highestVal = Number(editingProduct.highestRate);

    if (lowestVal > highestVal) {
      Alert.alert(t('error'), t('pricingInvalidError'));
      return;
    }

    setUpdating(true);
    try {
      const weightKgVal = Number(editingProduct.kg) || 0;
      const weightGramsVal = Number(editingProduct.grams) || 0;
      const totalWeightKg = weightKgVal + (weightGramsVal / 1000);
      const stockVal = Math.max(0, parseInt(editingProduct.stock, 10) || 0);

      const payload = {
        productName: editingProduct.productName.trim(),
        stock: stockVal,
        category: editingProduct.category.trim() || 'General',
        price: lowestVal,
        lowestRate: lowestVal,
        highestRate: highestVal,
        color: editingProduct.color ? editingProduct.color.trim() : '',
        description: editingProduct.description ? editingProduct.description.trim() : '',
        weightKg: weightKgVal,
        weightGrams: weightGramsVal,
        totalWeightKg: totalWeightKg,
        imageUri: editingProduct.imageUri
      };

      const { data } = await axiosInstance.put(`/products/${editingProduct.id}`, payload);
      setUpdating(false);

      if (data.success) {
        Alert.alert(t('success'), t('productUpdatedSuccess'));
        setModalVisible(false);
        fetchProducts();
      }
    } catch (err) {
      setUpdating(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update product.');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(t('confirmDeleteTitle'), t('confirmDeleteMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { 
        text: t('delete'), 
        style: 'destructive', 
        onPress: async () => {
          try {
            const { data } = await axiosInstance.delete(`/products/${id}`);
            if (data.success) {
              setProducts(products.filter(p => p._id !== id));
            }
          } catch (err) {
            Alert.alert(t('error'), 'Failed to delete product.');
          }
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Text style={styles.backText}>{t('backToDashboard')}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t('manageDbTitle')}</Text>
      <Text style={styles.subtitle}>{t('totalItemsCount')} {products.length}</Text>

      <TouchableOpacity
        style={styles.filterDropdownTrigger}
        onPress={() => setFilterDropdownVisible(true)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.filterDropdownLabel}>Category:</Text>
          <Text style={styles.filterDropdownValue}>{selectedCategory} ({filteredProducts.length})</Text>
        </View>
        <Text style={styles.filterDropdownArrow}>▼</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const currentStock = Number(item.stock !== undefined && item.stock !== null ? item.stock : (item.sold ? 0 : 1));

            return (
              <View style={styles.itemCard}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.noThumb]}><Text style={{fontSize: 9, color: '#94a3b8'}}>{t('noPhoto')}</Text></View>
                )}

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                    
                    <View style={[
                      styles.stockTag, 
                      currentStock <= 0 ? styles.outOfStockTag : (currentStock === 1 ? styles.uniqueTag : styles.bulkTag)
                    ]}>
                      <Text style={[
                        styles.stockTagText, 
                        currentStock <= 0 ? styles.outOfStockText : (currentStock === 1 ? styles.uniqueTagText : styles.bulkTagText)
                      ]}>
                        {currentStock <= 0 
                          ? 'Sold Out' 
                          : (currentStock === 1 ? 'Unique (1 pc)' : `${currentStock} pcs in stock`)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemDetails}>₹{item.lowestRate || item.price} {item.highestRate ? `- ₹${item.highestRate}` : ''}</Text>
                  <Text style={styles.itemCategory}>Cat: {item.category || 'General'}</Text>
                  
                  {(item.weightKg > 0 || item.weightGrams > 0) && (
                    <Text style={styles.itemExtraInfo}>{t('weightLabel')} {item.weightKg ? `${item.weightKg}kg ` : ''}{item.weightGrams ? `${item.weightGrams}g` : ''}</Text>
                  )}
                  {item.color ? <Text style={styles.itemExtraInfo}>{t('colorInfoLabel')} {item.color}</Text> : null}
                  {item.description ? <Text style={styles.itemExtraInfo} numberOfLines={1}>{t('infoLabel')} {item.description}</Text> : null}
                  
                  <Text style={styles.itemBarcode}>{t('barcodeLabel')} {item.barcode}</Text>
                </View>

                <View style={styles.actionBtns}>
                  <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.editBtn}>
                    <Text style={styles.editText}>{t('edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>{t('del')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('noProductsFound')}</Text>}
        />
      )}

      {/* Filter Category Modal */}
      <Modal
        visible={filterDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterDropdownVisible(false)}
      >
        <View style={styles.modalOverlayDark}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setFilterDropdownVisible(false)}>
                <Text style={styles.dropdownModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableCategories}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => {
                const isSelected = selectedCategory.toLowerCase() === item.toLowerCase();
                const count = item === 'All' ? products.length : products.filter(p => (p.category || 'General').toLowerCase() === item.toLowerCase()).length;
                return (
                  <TouchableOpacity
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedCategory(item);
                      setFilterDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                      {item} ({count})
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Uniform Edit Product Modal (Matches AdminScanner Structure) */}
      {editingProduct && (
        <Modal 
          visible={modalVisible} 
          animationType="slide" 
          transparent={false}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, backgroundColor: '#0f172a' }}
          >
            <ScrollView 
              contentContainerStyle={styles.editModalContainer} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.editScreenTitle}>{t('editProductDetailsTitle')}</Text>

              {/* Mandatory Details Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>{t('mandatoryDetailsHeading')}</Text>

                <Text style={styles.formLabel}>{t('barcodeIdLabel')}</Text>
                <TextInput 
                  style={[styles.inputField, styles.readOnlyInput]} 
                  value={editingProduct.barcode} 
                  editable={false} 
                />

                <View style={styles.labelRow}>
                  <Text style={styles.formLabel}>{t('productNameReqLabel')}</Text>
                  {!editingProduct.productName.trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
                </View>
                <TextInput 
                  style={styles.inputField} 
                  placeholder={t('productNamePlaceholder')}
                  placeholderTextColor="#64748b" 
                  value={editingProduct.productName} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, productName: tVal })} 
                />

                <View style={styles.labelRow}>
                  <Text style={styles.formLabel}>Quantity / Stock Units *</Text>
                  {!String(editingProduct.stock).trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
                </View>
                <TextInput 
                  style={styles.inputField} 
                  placeholder="e.g. 1 or 50" 
                  placeholderTextColor="#64748b" 
                  keyboardType="numeric" 
                  value={editingProduct.stock} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, stock: tVal })} 
                />

                <View style={styles.rateRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.labelRow}>
                      <Text style={styles.formLabel}>{t('lowestRateReqLabel')}</Text>
                      {!String(editingProduct.lowestRate).trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
                    </View>
                    <TextInput 
                      style={styles.inputField} 
                      placeholder={t('lowestRatePlaceholder')} 
                      placeholderTextColor="#64748b" 
                      keyboardType="numeric" 
                      value={editingProduct.lowestRate} 
                      onChangeText={(tVal) => setEditingProduct({ ...editingProduct, lowestRate: tVal })} 
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.labelRow}>
                      <Text style={styles.formLabel}>{t('highestRateReqLabel')}</Text>
                      {!String(editingProduct.highestRate).trim() && <Text style={styles.requiredTag}>{t('required')}</Text>}
                    </View>
                    <TextInput 
                      style={styles.inputField} 
                      placeholder={t('highestRatePlaceholder')} 
                      placeholderTextColor="#64748b" 
                      keyboardType="numeric" 
                      value={editingProduct.highestRate} 
                      onChangeText={(tVal) => setEditingProduct({ ...editingProduct, highestRate: tVal })} 
                    />
                  </View>
                </View>
              </View>

              {/* Additional Details Section */}
              <View style={[styles.sectionCard, { marginTop: 16 }]}>
                <Text style={styles.sectionHeadingOptional}>{t('additionalDetailsHeading')}</Text>

                <View style={styles.labelRow}>
                  <Text style={styles.formLabel}>{t('productCategoryLabel')}</Text>
                  {editingProduct.category ? (
                    <TouchableOpacity onPress={() => setEditingProduct({ ...editingProduct, category: '' })}>
                      <Text style={styles.clearChipText}>{t('clearCategory')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity 
                  style={styles.dropdownTrigger}
                  onPress={() => setEditCategoryDropdownVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={editingProduct.category ? styles.dropdownSelectedText : styles.dropdownPlaceholderText}>
                    {editingProduct.category ? editingProduct.category : t('selectCategoryPlaceholder')}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                <TextInput 
                  style={styles.inputOptional} 
                  placeholder={t('customCategoryPlaceholder')} 
                  placeholderTextColor="#64748b" 
                  value={editingProduct.category} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, category: tVal })} 
                />

                <Text style={styles.formLabel}>{t('productWeightLabel')}</Text>
                <View style={styles.weightRow}>
                  <View style={{ flex: 1 }}>
                    <TextInput 
                      style={styles.inputOptional} 
                      placeholder={t('weightKgPlaceholder')} 
                      placeholderTextColor="#64748b" 
                      keyboardType="numeric" 
                      value={editingProduct.kg} 
                      onChangeText={(tVal) => setEditingProduct({ ...editingProduct, kg: tVal })} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput 
                      style={styles.inputOptional} 
                      placeholder={t('weightGramsPlaceholder')} 
                      placeholderTextColor="#64748b" 
                      keyboardType="numeric" 
                      value={editingProduct.grams} 
                      onChangeText={(tVal) => setEditingProduct({ ...editingProduct, grams: tVal })} 
                    />
                  </View>
                </View>

                <Text style={styles.formLabel}>{t('colorLabel')}</Text>
                <TextInput 
                  style={styles.inputOptional} 
                  placeholder={t('colorPlaceholder')} 
                  placeholderTextColor="#64748b" 
                  value={editingProduct.color} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, color: tVal })} 
                />

                <Text style={styles.formLabel}>{t('descriptionLabel')}</Text>
                <TextInput 
                  style={styles.inputOptional} 
                  placeholder={t('descriptionPlaceholder')} 
                  placeholderTextColor="#64748b" 
                  value={editingProduct.description} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, description: tVal })} 
                />

                <Text style={styles.formLabel}>{t('productPhotoLabel')}</Text>
                {editingProduct.imageUri ? (
                  <View style={{ marginBottom: 12 }}>
                    <Image source={{ uri: editingProduct.imageUri }} style={styles.preview} />
                    <View style={{ marginTop: 8 }}>
                      <Button title={t('removePhotoBtn')} onPress={() => setEditingProduct({ ...editingProduct, imageUri: '' })} color="#B71C1C" />
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

              <TouchableOpacity 
                onPress={handleUpdateProduct} 
                disabled={updating} 
                style={styles.saveBtn} 
                activeOpacity={0.8}
              >
                {updating ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('updateProductBtn')}</Text>
                )}
              </TouchableOpacity>

              <View style={{ marginTop: 12 }}>
                <Button 
                  title={t('cancel')} 
                  onPress={() => setModalVisible(false)} 
                  color="#ef4444" 
                />
              </View>

              <View style={{ height: 45 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Edit Category Selection Dropdown Modal */}
      <Modal
        visible={editCategoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditCategoryDropdownVisible(false)}
      >
        <View style={styles.modalOverlayDark}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{t('selectCategoryModalTitle')}</Text>
              <TouchableOpacity onPress={() => setEditCategoryDropdownVisible(false)}>
                <Text style={styles.dropdownModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={POPULAR_CATEGORIES}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => {
                const isSelected = editingProduct && editingProduct.category.toLowerCase() === item.toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                    onPress={() => {
                      setEditingProduct({ ...editingProduct, category: item });
                      setEditCategoryDropdownVisible(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },

  filterDropdownTrigger: {
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  filterDropdownLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterDropdownValue: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  filterDropdownArrow: { color: '#38bdf8', fontSize: 12 },

  itemCard: { backgroundColor: '#1e293b', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#334155' },
  noThumb: { justifyContent: 'center', alignItems: 'center' },
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 2, flex: 1 },
  
  stockTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginLeft: 6 },
  uniqueTag: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8' },
  uniqueTagText: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
  bulkTag: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10b981' },
  bulkTagText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  outOfStockTag: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444' },
  outOfStockText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },

  itemDetails: { color: '#10b981', fontWeight: '600', fontSize: 13, marginBottom: 1 },
  itemCategory: { color: '#cbd5e1', fontSize: 12, marginBottom: 1 },
  itemExtraInfo: { color: '#94a3b8', fontSize: 11, marginBottom: 1 },
  itemBarcode: { color: '#64748b', fontSize: 11, marginTop: 4 },
  actionBtns: { gap: 8 },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteText: { color: '#ef4444', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },

  // Edit Modal Uniform Styling (Matching AdminScanner)
  editModalContainer: { padding: 18, paddingTop: 35, backgroundColor: '#0f172a', flexGrow: 1 },
  editScreenTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 },
  sectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeading: { fontSize: 13, fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  sectionHeadingOptional: { fontSize: 13, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  formLabel: { fontWeight: 'bold', marginBottom: 5, color: '#cbd5e1', fontSize: 13 },
  requiredTag: { fontSize: 10, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase' },
  clearChipText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },

  inputField: { 
    borderWidth: 1.5, 
    padding: 12, 
    marginBottom: 14, 
    borderRadius: 12, 
    backgroundColor: '#0f172a', 
    borderColor: '#334155',
    color: '#fff', 
    fontSize: 14 
  },
  readOnlyInput: { backgroundColor: '#334155', color: '#94a3b8', borderColor: '#475569' },
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

  saveBtn: { 
    backgroundColor: '#10b981', 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 18, 
    shadowColor: '#10b981', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 6, 
    elevation: 4 
  },
  saveBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },

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

  modalOverlayDark: {
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
  checkmark: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' }
});