import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet, Modal, ScrollView, TextInput, Button, Image } from 'react-native';
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/products');
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
      productName: item.productName || '',
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
    if (!editingProduct.productName || !editingProduct.lowestRate) {
      Alert.alert(t('error'), 'Product Name and Lowest Rate are required.');
      return;
    }

    setUpdating(true);
    try {
      const weightKgVal = Number(editingProduct.kg) || 0;
      const weightGramsVal = Number(editingProduct.grams) || 0;
      const totalWeightKg = weightKgVal + (weightGramsVal / 1000);

      const payload = {
        productName: editingProduct.productName.trim(),
        category: editingProduct.category.trim() || 'General',
        price: Number(editingProduct.lowestRate),
        lowestRate: Number(editingProduct.lowestRate),
        highestRate: Number(editingProduct.highestRate || editingProduct.lowestRate),
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
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.noThumb]}><Text style={{fontSize: 9, color: '#94a3b8'}}>{t('noPhoto')}</Text></View>
              )}

              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
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
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('noProductsFound')}</Text>}
        />
      )}

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

      {editingProduct && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('editProductDetailsTitle')}</Text>

              <Text style={styles.label}>{t('productNameReqLabel')}</Text>
              <TextInput style={styles.input} value={editingProduct.productName} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, productName: tVal })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>{t('categoryTypeLabel')}</Text>
              <TouchableOpacity 
                style={styles.dropdownTriggerInner}
                onPress={() => setEditCategoryDropdownVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={editingProduct.category ? styles.dropdownSelectedText : styles.dropdownPlaceholderText}>
                  {editingProduct.category ? editingProduct.category : t('selectCategoryPlaceholder')}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <TextInput style={styles.input} placeholder="Or type custom category..." value={editingProduct.category} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, category: tVal })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>{t('weightKgGramsLabel')}</Text>
              <View style={styles.weightRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="KG" keyboardType="numeric" value={editingProduct.kg} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, kg: tVal })} placeholderTextColor="#64748b" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Grams" keyboardType="numeric" value={editingProduct.grams} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, grams: tVal })} placeholderTextColor="#64748b" />
              </View>

              <Text style={styles.label}>{t('colorLabel')}</Text>
              <TextInput style={styles.input} value={editingProduct.color} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, color: tVal })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>{t('descriptionLabel')}</Text>
              <TextInput style={styles.input} value={editingProduct.description} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, description: tVal })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>{t('lowestRateSymbolLabel')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editingProduct.lowestRate} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, lowestRate: tVal })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>{t('highestRateSymbolLabel')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editingProduct.highestRate} onChangeText={(tVal) => setEditingProduct({ ...editingProduct, highestRate: tVal })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>{t('productPhotoLabel')}</Text>
              {editingProduct.imageUri ? (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: editingProduct.imageUri }} style={styles.preview} />
                  <Button title={t('removePhotoBtn')} onPress={() => setEditingProduct({ ...editingProduct, imageUri: '' })} color="#B71C1C" />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}><Button title="Click Photo" onPress={takePhoto} color="#2E7D32" /></View>
                  <View style={{ flex: 1 }}><Button title="Gallery" onPress={pickImage} color="#1E88E5" /></View>
                </View>
              )}

              <TouchableOpacity onPress={handleUpdateProduct} disabled={updating} style={styles.updateBtn}>
                {updating ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.updateBtnText}>{t('updateProductBtn')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelModalBtn}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{t('cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

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
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20, paddingTop: 40 },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { color: '#cbd5e1', fontWeight: '600', fontSize: 13, marginBottom: 5 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 12, fontSize: 14 },
  weightRow: { flexDirection: 'row', gap: 10 },
  preview: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8, resizeMode: 'cover' },
  updateBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  cancelModalBtn: { padding: 10, alignItems: 'center', marginTop: 5 },

  dropdownTriggerInner: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
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