import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet, Modal, ScrollView, TextInput, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../api/axiosInstance';

export default function ManageDatabase({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/products');
      if (data.success) setProducts(data.products);
    } catch (err) {
      console.log('Error fetching products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
      Alert.alert('Error', 'Product Name and Lowest Rate are required.');
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
        Alert.alert('Success', 'Product updated successfully!');
        setModalVisible(false);
        fetchProducts();
      }
    } catch (err) {
      setUpdating(false);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update product.');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const { data } = await axiosInstance.delete(`/products/${id}`);
            if (data.success) {
              setProducts(products.filter(p => p._id !== id));
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete product.');
          }
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Manage Store Database</Text>
      <Text style={styles.subtitle}>Total Items in Inventory: {products.length}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.noThumb]}><Text style={{fontSize: 9, color: '#94a3b8'}}>No Photo</Text></View>
              )}

              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                <Text style={styles.itemDetails}>₹{item.lowestRate || item.price} {item.highestRate ? `- ₹${item.highestRate}` : ''}</Text>
                <Text style={styles.itemCategory}>Cat: {item.category || 'General'}</Text>
                
                {(item.weightKg > 0 || item.weightGrams > 0) && (
                  <Text style={styles.itemExtraInfo}>Weight: {item.weightKg ? `${item.weightKg}kg ` : ''}{item.weightGrams ? `${item.weightGrams}g` : ''}</Text>
                )}
                {item.color ? <Text style={styles.itemExtraInfo}>Color: {item.color}</Text> : null}
                {item.description ? <Text style={styles.itemExtraInfo} numberOfLines={1}>Info: {item.description}</Text> : null}
                
                <Text style={styles.itemBarcode}>Barcode: {item.barcode}</Text>
              </View>

              <View style={styles.actionBtns}>
                <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.editBtn}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No products found in inventory.</Text>}
        />
      )}

      {editingProduct && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Product Details</Text>

              <Text style={styles.label}>Product Name *</Text>
              <TextInput style={styles.input} value={editingProduct.productName} onChangeText={(t) => setEditingProduct({ ...editingProduct, productName: t })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Category / Type</Text>
              <TextInput style={styles.input} value={editingProduct.category} onChangeText={(t) => setEditingProduct({ ...editingProduct, category: t })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Weight (KG & Grams)</Text>
              <View style={styles.weightRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="KG" keyboardType="numeric" value={editingProduct.kg} onChangeText={(t) => setEditingProduct({ ...editingProduct, kg: t })} placeholderTextColor="#64748b" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Grams" keyboardType="numeric" value={editingProduct.grams} onChangeText={(t) => setEditingProduct({ ...editingProduct, grams: t })} placeholderTextColor="#64748b" />
              </View>

              <Text style={styles.label}>Color</Text>
              <TextInput style={styles.input} value={editingProduct.color} onChangeText={(t) => setEditingProduct({ ...editingProduct, color: t })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={editingProduct.description} onChangeText={(t) => setEditingProduct({ ...editingProduct, description: t })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Lowest Rate (₹) *</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editingProduct.lowestRate} onChangeText={(t) => setEditingProduct({ ...editingProduct, lowestRate: t })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Highest Rate (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={editingProduct.highestRate} onChangeText={(t) => setEditingProduct({ ...editingProduct, highestRate: t })} placeholderTextColor="#64748b" />

              <Text style={styles.label}>Product Photo</Text>
              {editingProduct.imageUri ? (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: editingProduct.imageUri }} style={styles.preview} />
                  <Button title="Remove Photo" onPress={() => setEditingProduct({ ...editingProduct, imageUri: '' })} color="#B71C1C" />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}><Button title="Click Photo" onPress={takePhoto} color="#2E7D32" /></View>
                  <View style={{ flex: 1 }}><Button title="Gallery" onPress={pickImage} color="#1E88E5" /></View>
                </View>
              )}

              <TouchableOpacity onPress={handleUpdateProduct} disabled={updating} style={styles.updateBtn}>
                {updating ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.updateBtnText}>Update Product</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelModalBtn}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 40 },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
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
  cancelModalBtn: { padding: 10, alignItems: 'center', marginTop: 5 }
});