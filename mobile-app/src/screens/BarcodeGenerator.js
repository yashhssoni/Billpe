import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import axiosInstance from '../api/axiosInstance';

export default function BarcodeGenerator({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [fetchingQuota, setFetchingQuota] = useState(true);
  const [countInput, setCountInput] = useState('50'); 
  const [subActive, setSubActive] = useState(false);

  const fetchStatus = async () => {
    try {
      setFetchingQuota(true);
      const { data } = await axiosInstance.get('/payment/quota-status');
      if (data.success) {
        setSubActive(data.isActive);
      }
    } catch (err) {
      console.log('Failed to fetch status:', err.message);
    } finally {
      setFetchingQuota(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [])
  );

  const CODE128_PATTERNS = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
    [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
    [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
    [2,1,1,2,3,2],[2,3,3,1,1,1,2]
  ];
  const START_C = 105;
  const STOP = 106;

  const generateBarcodeSVG = (text, opts = {}) => {
    const barHeight = opts.height || 40;
    const moduleWidth = opts.width || 1.6;
    const fontSize = opts.fontSize || 11;

    let code = text;
    if (code.length % 2 !== 0) code = '0' + code;

    const symbols = [START_C];
    let checksum = START_C;
    for (let i = 0; i < code.length; i += 2) {
      const pairVal = parseInt(code.substr(i, 2), 10);
      symbols.push(pairVal);
      checksum += pairVal * (i / 2 + 1);
    }
    checksum = checksum % 103;
    symbols.push(checksum);
    symbols.push(STOP);

    let x = 0;
    let isBar = true;
    let rects = '';
    symbols.forEach((sym) => {
      const widths = CODE128_PATTERNS[sym];
      widths.forEach((w) => {
        const mw = w * moduleWidth;
        if (isBar) {
          rects += `<rect x="${x.toFixed(2)}" y="0" width="${mw.toFixed(2)}" height="${barHeight}" fill="#000"/>`;
        }
        x += mw;
        isBar = !isBar;
      });
    });

    const totalWidth = x;
    const svgHeight = barHeight + fontSize + 6;
    return `<svg width="${totalWidth.toFixed(2)}" height="${svgHeight}" viewBox="0 0 ${totalWidth.toFixed(2)} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${totalWidth.toFixed(2)}" height="${svgHeight}" fill="#ffffff"/>
      ${rects}
      <text x="${(totalWidth / 2).toFixed(2)}" y="${barHeight + fontSize}" font-family="monospace" font-size="${fontSize}" text-anchor="middle">${text}</text>
    </svg>`;
  };

  const generateUniqueIds = (count) => {
    const base = Date.now().toString().slice(-6);
    const ids = [];
    for (let i = 0; i < count; i++) {
      const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const idx = i.toString().padStart(4, '0');
      let id = (base + idx).slice(0, 10);
      if (id.length < 10) id = id.padEnd(10, rand);
      ids.push(id);
    }
    return ids;
  };

  const handleGeneratePrint = async () => {
    if (!subActive) {
      Alert.alert('Subscription Expired 🔒', 'Please renew your ₹600 monthly plan to generate barcodes.');
      return;
    }

    const requestedCount = parseInt(countInput, 10);
    if (isNaN(requestedCount) || requestedCount <= 0 || requestedCount > 500) {
      Alert.alert('Invalid Count', 'Please enter a valid number (1 - 500).');
      return;
    }

    setLoading(true);
    try {
      const ids = generateUniqueIds(requestedCount);
      const boxesHtml = ids.map((id) => `<div class="box">${generateBarcodeSVG(id)}</div>`).join('');

      const html = `<html>
        <head>
          <style>
            body { margin: 0; padding: 10px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .box { border: 1px solid #000; padding: 6px; text-align: center; break-inside: avoid; }
            .box svg { width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="grid">${boxesHtml}</div>
        </body>
      </html>`;

      setLoading(false);
      await Print.printAsync({ html });
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Failed to generate barcodes.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centerWrapper}>
          <Text style={styles.title}>Generate Barcode</Text>
          <Text style={styles.subtitle}>Unlimited Barcode Generation for Active Stores</Text>

          <View style={styles.quotaCard}>
            {fetchingQuota ? (
              <ActivityIndicator color="#10b981" size="small" />
            ) : (
              <>
                <Text style={styles.quotaTitle}>Subscription Status</Text>
                <Text style={[styles.quotaCount, { color: subActive ? '#10b981' : '#ef4444' }]}>
                  {subActive ? 'ACTIVE (Unlimited)' : 'EXPIRED 🔒'}
                </Text>
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Number of Barcodes (Max 500):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={countInput}
              onChangeText={setCountInput}
              placeholder="Enter quantity"
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity onPress={handleGeneratePrint} disabled={loading || !subActive} style={[styles.btn, !subActive && { backgroundColor: '#475569' }]}>
              {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>Print Barcode Stickers</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 24, paddingTop: 40, backgroundColor: '#0f172a' },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerWrapper: { width: '100%', maxWidth: 400, alignItems: 'center' },
  backText: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20, textAlign: 'center', paddingHorizontal: 10 },
  quotaCard: { width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  quotaTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  quotaCount: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  card: { width: '100%', backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', fontSize: 16, marginBottom: 16 },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});