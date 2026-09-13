import React, { useState, useCallback, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

const DEMO_BARCODE_LIMIT_KEY = 'billpe_demo_barcode_generated_count';

export default function DemoBarcodeGenerator({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('unique'); 
  const [countInput, setCountInput] = useState('5');
  const [customBarcode, setCustomBarcode] = useState('');
  const [barcodesLeft, setBarcodesLeft] = useState(5);

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
    }, [])
  );

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_BARCODE_LIMIT_KEY);
      const used = savedCount ? parseInt(savedCount, 10) : 0;
      const remaining = 5 - used;
      setBarcodesLeft(remaining > 0 ? remaining : 0);
    } catch (e) {
      console.log('Error loading limit:', e);
    }
  };

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
    const base = '89012';
    const ids = [];
    for (let i = 0; i < count; i++) {
      const idx = (i + 1).toString().padStart(5, '0');
      ids.push(base + idx);
    }
    return ids;
  };

  const handleGeneratePrint = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_BARCODE_LIMIT_KEY);
      const used = savedCount ? parseInt(savedCount, 10) : 0;

      if (used >= 5) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached",
          t('demoLimitReachedMsg') || "आपने बारकोड जनरेशन की 5 की सीमा पूरी कर ली है।",
          [
            { text: t('cancel') || "Cancel", style: 'cancel' },
            { text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }
          ]
        );
        return;
      }

      const requestedCount = mode === 'unique' ? (parseInt(countInput, 10) || 1) : 5;
      const allowedCount = Math.min(requestedCount, 5 - used);

      if (allowedCount <= 0) {
        Alert.alert(
          t('demoLimitReachedTitle') || "🚀 Demo Limit Reached",
          t('demoLimitReachedMsg') || "आपने 5 बारकोड की सीमा पूरी कर ली है।",
          [
            { text: t('cancel') || "Cancel", style: 'cancel' },
            { text: t('registerNow') || "Register Now", onPress: () => navigation.replace('Register') }
          ]
        );
        return;
      }

      let ids = [];
      if (mode === 'unique') {
        ids = generateUniqueIds(allowedCount);
      } else {
        const singleCode = customBarcode.trim() || '89012345';
        ids = Array(allowedCount).fill(singleCode);
      }

      setLoading(true);
      const boxesHtml = ids.map((id) => `<div class="box">${generateBarcodeSVG(id)}</div>`).join('');

      const html = `<html>
        <head>
          <style>
            body { margin: 0; padding: 10px; font-family: sans-serif; }
            .header { text-align: center; margin-bottom: 10px; font-size: 14px; font-weight: bold; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .box { border: 1px solid #000; padding: 6px; text-align: center; break-inside: avoid; }
            .box svg { width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="header">BillPe Demo Barcode Stickers (${allowedCount} Barcodes Generated)</div>
          <div class="grid">${boxesHtml}</div>
        </body>
      </html>`;

      const nextUsed = used + allowedCount;
      await AsyncStorage.setItem(DEMO_BARCODE_LIMIT_KEY, nextUsed.toString());
      setBarcodesLeft(Math.max(0, 5 - nextUsed));

      setLoading(false);
      await Print.printAsync({ html });
    } catch (err) {
      setLoading(false);
      Alert.alert(t('error'), t('Failed to generate barcodes.'));
    }
  };

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 DEMO MODE | Barcodes Left / शेष बारकोड: {barcodesLeft}/5</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <View style={styles.centerWrapper}>
        <Text style={styles.title}>{t('generateBarcodeTitle')} (Demo)</Text>
        <Text style={styles.subtitle}>{t('generateBarcodeSubtitle')}</Text>

        <View style={styles.quotaCard}>
          <Text style={styles.quotaTitle}>{t('subscriptionStatus')}</Text>
          <Text style={[styles.quotaCount, { color: '#10b981' }]}>
            Demo Trial (Max 5 Barcodes Limit)
          </Text>
        </View>

        <View style={styles.modeToggleRow}>
          <TouchableOpacity 
            style={[styles.modeBtn, mode === 'unique' && styles.modeBtnActive]} 
            onPress={() => setMode('unique')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, mode === 'unique' && styles.modeBtnTextActive]}>{t('uniqueBarcodesModeText')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.modeBtn, mode === 'copies' && styles.modeBtnActive]} 
            onPress={() => setMode('copies')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, mode === 'copies' && styles.modeBtnTextActive]}>{t('similarCopiesModeText')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {mode === 'unique' ? (
            <>
              <Text style={styles.label}>Number of Barcodes to Generate (Max {barcodesLeft}):</Text>
              <TextInput
                style={styles.input}
                value={countInput}
                onChangeText={setCountInput}
                keyboardType="numeric"
                placeholder="e.g. 3"
                placeholderTextColor="#64748b"
              />
              <Text style={styles.infoLabel}>{t('uniqueBarcodesInfoText')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('barcodeIdBlankPromptText')}</Text>
              <TextInput
                style={styles.input}
                value={customBarcode}
                onChangeText={setCustomBarcode}
                placeholder={t('customBarcodePlaceholderText')}
                placeholderTextColor="#64748b"
              />
              <Text style={styles.infoLabel}>{t('similarCopiesInfoText')}</Text>
            </>
          )}

          <TouchableOpacity onPress={handleGeneratePrint} disabled={loading} style={styles.btn}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.btnText}>{t('printDemoBarcodesBtnText')}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  centerWrapper: { width: '100%', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 16, textAlign: 'center', paddingHorizontal: 10 },
  quotaCard: { width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  quotaTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  quotaCount: { fontSize: 14, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  modeToggleRow: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 14 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  modeBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  modeBtnTextActive: { color: '#0f172a' },
  card: { width: '100%', backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  infoLabel: { color: '#38bdf8', fontSize: 13, fontWeight: '600', marginBottom: 16, lineHeight: 18, textAlign: 'center' },
  input: { backgroundColor: '#0f172a', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', fontSize: 15, marginBottom: 14 },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});