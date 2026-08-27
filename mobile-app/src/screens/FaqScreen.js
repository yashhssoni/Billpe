import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const FAQ_ITEMS = [
  {
    q: 'How to add and scan new stock?',
    a: 'Go to Admin Dashboard -> Tap "Scan & Add Stock" -> Point the camera at the barcode -> Enter Product Name, Lowest & Highest Rate -> Tap "Save / Update Product".'
  },
  {
    q: 'Can I edit my Store Name directly from the app?',
    a: 'For security and tax invoice consistency, Store Names are locked. Please reach out via the Help & Support screen to request a store name update.'
  },
  {
    q: 'How does thermal bill printing work?',
    a: 'When an employee generates a bill, standard Bluetooth / Wi-Fi print dialog opens automatically. Connect your thermal printer once and print receipts with 1-tap.'
  },
  {
    q: 'What happens if a product is scanned twice or already sold?',
    a: 'If a sold item is scanned, the app alerts the user showing past sale details (buyer name, rate, date) along with an option to Restock / Return the item.'
  }
];

export default function FaqScreen({ navigation }) {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Frequently Asked Questions</Text>
      <Text style={styles.subtitle}>Quick answers to common operational questions.</Text>

      {FAQ_ITEMS.map((item, index) => {
        const isOpen = activeIdx === index;
        return (
          <TouchableOpacity 
            key={index} 
            style={styles.card} 
            onPress={() => setActiveIdx(isOpen ? null : index)}
            activeOpacity={0.8}
          >
            <View style={styles.qRow}>
              <Text style={styles.qText}>{item.q}</Text>
              <Text style={styles.icon}>{isOpen ? '−' : '+'}</Text>
            </View>
            {isOpen && <Text style={styles.aText}>{item.a}</Text>}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 40 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, marginTop: 4 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qText: { color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1, paddingRight: 8 },
  icon: { color: '#10b981', fontSize: 22, fontWeight: 'bold' },
  aText: { color: '#cbd5e1', fontSize: 13, marginTop: 10, lineHeight: 20, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 }
});