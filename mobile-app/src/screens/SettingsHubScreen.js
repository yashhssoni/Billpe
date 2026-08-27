import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function SettingsHubScreen({ navigation }) {
  const { logout, user, storeInfo } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of BillPe?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() }
    ]);
  };

  const menuItems = [
    { title: 'Store Profile', subtitle: 'View store details & update credentials', screen: 'ProfileScreen', icon: '🏪' },
    { title: 'Help & Support Desk', subtitle: 'WhatsApp, Call, and Email assistance', screen: 'SupportScreen', icon: '💬' },
    { title: 'Community Wall & Reviews', subtitle: 'Read reviews from fellow retailers', screen: 'ReviewScreen', icon: '⭐' },
    { title: 'Frequently Asked Questions', subtitle: 'Quick answers for billing & printer setup', screen: 'FaqScreen', icon: '❓' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings & Support</Text>
        <Text style={styles.subtitle}>{storeInfo?.storeName || 'BillPe Store'}</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Log Out Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 50 },
  header: { marginBottom: 24 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, marginBottom: 12 },
  backText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  menuContainer: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  icon: { fontSize: 24, marginRight: 16 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 3 },
  cardSubtitle: { fontSize: 12, color: '#94a3b8' },
  arrow: { fontSize: 22, color: '#64748b', fontWeight: 'bold' },
  logoutBtn: { marginTop: 30, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444450', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 }
});