import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AdminTools from '../components/AdminTools';
import AdminManagement from '../components/AdminManagement';
import { colors } from '../constants/theme';

export default function AdminControlPanel() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.RED} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ADMIN AREA</Text>
          <Text style={styles.title}>Control Panel</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="settings-outline" size={21} color={colors.WHITE} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Manage students, events, announcements, and faculty requests.</Text>
        <AdminTools />
        <AdminManagement />
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.CREAM },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20, backgroundColor: colors.RED, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.SOFT_GOLD, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: 12 },
  eyebrow: { color: colors.LIGHT_GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { marginTop: 4, color: colors.WHITE, fontSize: 23, fontWeight: '900' },
  headerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 30 },
  intro: { color: colors.TEXT_GRAY, fontSize: 12, lineHeight: 18 },
  bottomSpace: { height: 30 },
});
