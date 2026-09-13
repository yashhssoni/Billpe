import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, 
  StyleSheet, Modal, ScrollView, TextInput, Button, Image, BackHandler, 
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

const DEMO_DB_LIMIT_KEY = 'billpe_demo_db_action_count';
const DEMO_PRODUCTS_KEY = 'billpe_demo_local_products';

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

export default function DemoManageDatabase({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [products, setProducts] = useState([
    { _id: 'd1', productName: 'Parle-G Biscuit', barcode: '8901234', price: 10, lowestRate: 8, highestRate: 10, stock: 45, category: 'Snacks & Beverages' },
    { _id: 'd2', productName: 'Colgate MaxFresh', barcode: '8905678', price: 95, lowestRate: 80, highestRate: 95, stock: 20, category: 'Cosmetics & Beauty' },
    { _id: 'd3', productName: 'Fortune Oil 1L', barcode: '8909876', price: 140, lowestRate: 130, highestRate: 140, stock: 12, category: 'Grocery / Kirana' }
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editCategoryDropdownVisible, setEditCategoryDropdownVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [stockFilterLimit, setStockFilterLimit] = useState('');
  const [actionsLeft, setActionsLeft] = useState(5);

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
      fetchDemoProducts();

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

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_DB_LIMIT_KEY);
      if (savedCount !== null) {
        const remaining = 5 - parseInt(savedCount, 10);
        setActionsLeft(remaining > 0 ? remaining : 0);
      } else {
        setActionsLeft(5);
      }
    } catch (e) {
      console.log('Error loading limit:', e);
    }
  };

  const handleDemoActionWrapper = async (callback) => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_DB_LIMIT_KEY);
      const currentCount = savedCount ? parseInt(savedCount, 10) : 0;

      if (currentCount >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached",
          t('demoLimitReachedMsg') || "आपने डेटाबेस एडिट/डिलीट के 5 फ्री एक्शन्स पूरे कर लिए हैं।",
          [
            { text: t('cancel') || "Cancel", style: 'cancel' },
            { text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }
          ]
        );
        return;
      }

      const nextCount = currentCount + 1;
      await AsyncStorage.setItem(DEMO_DB_LIMIT_KEY, nextCount.toString());
      
      const remaining = 5 - nextCount;
      setActionsLeft(remaining > 0 ? remaining : 0);

      callback();
    } catch (e) {
      console.log('Error updating limit:', e);
      callback();
    }
  };

  const fetchDemoProducts = async () => {
    try {
      const localData = await AsyncStorage.getItem(DEMO_PRODUCTS_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.length > 0) setProducts(parsed);
      }
    } catch (err) {
      console.log('Error fetching local products:', err);
    }
  };

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
    let result = products;

    if (selectedCategory !== 'All') {
      result = result.filter((p) => (p.category || 'General').toLowerCase() === selectedCategory.toLowerCase());
    }

    if (stockFilterLimit && stockFilterLimit.trim() !== '') {
      const limitNum = parseInt(stockFilterLimit, 10);
      if (!isNaN(limitNum)) {
        result = result.filter((p) => {
          const st = Number(p.stock !== undefined && p.stock !== null ? p.stock : 1);
          return st <= limitNum;
        });
      }
    }

    return result;
  }, [products, selectedCategory, stockFilterLimit]);

  const handleOpenEdit = (item) => {
    setEditingProduct({
      id: item._id,
      barcode: item.barcode || '',
      productName: item.productName || '',
      stock: String(item.stock !== undefined && item.stock !== null ? item.stock : 1),
      category: item.category || '',
      lowestRate: String(item.lowestRate || item.price || ''),
      highestRate: String(item.highestRate || item.price || ''),
      imageUri: item.imageUri || ''
    });
    setModalVisible(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct.productName.trim() || !String(editingProduct.lowestRate).trim() || !String(editingProduct.highestRate).trim()) {
      Alert.alert(t('error'), t('Please fill Product Name, Lowest Rate, and Highest Rate.'));
      return;
    }

    const lowestVal = Number(editingProduct.lowestRate);
    const highestVal = Number(editingProduct.highestRate);

    if (lowestVal > highestVal) {
      Alert.alert(t('error'), t('pricingInvalidError'));
      return;
    }

    handleDemoActionWrapper(async () => {
      setUpdating(true);
      try {
        const stockVal = Math.max(0, parseInt(editingProduct.stock, 10) || 0);

        const updatedList = products.map(p => {
          if (p._id === editingProduct.id) {
            return {
              ...p,
              productName: editingProduct.productName.trim(),
              stock: stockVal,
              category: editingProduct.category.trim() || 'General',
              price: lowestVal,
              lowestRate: lowestVal,
              highestRate: highestVal,
              imageUri: editingProduct.imageUri
            };
          }
          return p;
        });

        setProducts(updatedList);
        await AsyncStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify(updatedList));
        setUpdating(false);

        Alert.alert(t('success'), `${t('productUpdatedSuccess')} (Demo)`);
        setModalVisible(false);
      } catch (err) {
        setUpdating(false);
        Alert.alert(t('error'), t('Failed to update product.'));
      }
    });
  };

  const handleDelete = async (id) => {
    Alert.alert(t('confirmDeleteTitle'), `${t('confirmDeleteMsg')} (Demo)`, [
      { text: t('cancel'), style: 'cancel' },
      { 
        text: t('delete'), 
        style: 'destructive', 
        onPress: async () => {
          handleDemoActionWrapper(async () => {
            try {
              const filtered = products.filter(p => p._id !== id);
              setProducts(filtered);
              await AsyncStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify(filtered));
            } catch (err) {
              Alert.alert(t('error'), t('Failed to delete product.'));
            }
          });
        } 
      }
    ]);
  };

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <Text style={styles.title}>{t('manageDbTitle')} (Demo)</Text>
      <Text style={styles.subtitle}>{t('totalItemsCount')} {products.length}</Text>

      <TouchableOpacity
        style={styles.filterDropdownTrigger}
        onPress={() => setFilterDropdownVisible(true)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.filterDropdownLabel}>{t('Category:')}</Text>
          <Text style={styles.filterDropdownValue}>{selectedCategory} ({filteredProducts.length})</Text>
        </View>
        <Text style={styles.filterDropdownArrow}>▼</Text>
      </TouchableOpacity>

      <View style={styles.quantityFilterContainer}>
        <Text style={styles.quantityFilterLabel}>{t('⚠️ Filter by Max Stock Quantity:')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            style={styles.quantityFilterInput}
            placeholder="e.g. 5 or 10"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={stockFilterLimit}
            onChangeText={setStockFilterLimit}
          />
          {stockFilterLimit !== '' && (
            <TouchableOpacity style={styles.clearQtyBtn} onPress={() => setStockFilterLimit('')}>
              <Text style={styles.clearQtyText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const currentStock = Number(item.stock !== undefined && item.stock !== null ? item.stock : 1);

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
                        {currentStock <= 0 ? t('soldOutBadgeText') : `${currentStock} ${t('pcsInStockText')}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemDetails}>₹{item.lowestRate || item.price} {item.highestRate ? `- ₹${item.highestRate}` : ''}</Text>
                  <Text style={styles.itemCategory}>Cat: {item.category || 'General'}</Text>
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

      <Modal visible={filterDropdownVisible} transparent={true} animationType="fade" onRequestClose={() => setFilterDropdownVisible(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{t('filterByCategory')}</Text>
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
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>{item} ({count})</Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {editingProduct && (
        <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <ScrollView contentContainerStyle={styles.editModalContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.editScreenTitle}>{t('editProductDetailsTitle')} (Demo)</Text>
              
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>{t('mandatoryDetailsHeading')}</Text>

                <Text style={styles.formLabel}>{t('barcodeIdLabel')}</Text>
                <TextInput style={[styles.inputField, styles.readOnlyInput]} value={editingProduct.barcode} editable={false} />

                <Text style={styles.formLabel}>{t('productNameReqLabel')}</Text>
                <TextInput 
                  style={styles.inputField} 
                  placeholder={t('productNamePlaceholder')}
                  placeholderTextColor="#64748b" 
                  value={editingProduct.productName} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, productName: tVal })} 
                />

                <Text style={styles.formLabel}>{t('Quantity / Stock Units *') || 'Quantity / Stock Units *'}</Text>
                <TextInput 
                  style={styles.inputField} 
                  placeholder="e.g. 50" 
                  placeholderTextColor="#64748b" 
                  keyboardType="numeric" 
                  value={editingProduct.stock} 
                  onChangeText={(tVal) => setEditingProduct({ ...editingProduct, stock: tVal })} 
                />

                <View style={styles.rateRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>{t('lowestRateReqLabel')}</Text>
                    <TextInput 
                      style={styles.inputField} 
                      placeholder="₹ Min" 
                      placeholderTextColor="#64748b" 
                      keyboardType="numeric" 
                      value={editingProduct.lowestRate} 
                      onChangeText={(tVal) => setEditingProduct({ ...editingProduct, lowestRate: tVal })} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>{t('highestRateReqLabel')}</Text>
                    <TextInput 
                      style={styles.inputField} 
                      placeholder="₹ Max" 
                      placeholderTextColor="#64748b" 
                      keyboardType="numeric" 
                      value={editingProduct.highestRate} 
                      onChangeText={(tVal) => setEditingProduct({ ...editingProduct, highestRate: tVal })} 
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={handleUpdateProduct} disabled={updating} style={styles.saveBtn} activeOpacity={0.8}>
                {updating ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>{t('updateProductBtn')} (Demo)</Text>}
              </TouchableOpacity>

              <View style={{ marginTop: 12 }}>
                <Button title={t('cancel')} onPress={() => setModalVisible(false)} color="#ef4444" />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2, marginTop: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  filterDropdownTrigger: { backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterDropdownLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterDropdownValue: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  filterDropdownArrow: { color: '#38bdf8', fontSize: 12 },
  quantityFilterContainer: { backgroundColor: '#1e293b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 14 },
  quantityFilterLabel: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  quantityFilterInput: { flex: 1, backgroundColor: '#0f172a', color: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 14, fontWeight: 'bold' },
  clearQtyBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  clearQtyText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },
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
  itemBarcode: { color: '#64748b', fontSize: 11, marginTop: 4 },
  actionBtns: { gap: 8 },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editText: { color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteText: { color: '#ef4444', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, marginBottom: 40 },
  editModalContainer: { padding: 18, paddingTop: 35, backgroundColor: '#0f172a', flexGrow: 1 },
  editScreenTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 },
  sectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeading: { fontSize: 13, fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', marginBottom: 14 },
  formLabel: { fontWeight: 'bold', marginBottom: 5, color: '#cbd5e1', fontSize: 13 },
  inputField: { borderWidth: 1.5, padding: 12, marginBottom: 14, borderRadius: 12, backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 14 },
  readOnlyInput: { backgroundColor: '#334155', color: '#94a3b8', borderColor: '#475569' },
  rateRow: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalCard: { width: '100%', maxWidth: 360, backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#38bdf8' },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  dropdownModalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dropdownModalClose: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold', padding: 4 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dropdownItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  dropdownItemText: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  dropdownItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  checkmark: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' }
});