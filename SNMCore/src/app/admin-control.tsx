import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AdminEventManagement from '../components/AdminEventManagement';
import AdminAreaNewsManagement from '../components/AdminAreaNewsManagement';
import AdminManagement from '../components/AdminManagement';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../constants/theme';

type AdminSection = 'menu' | 'events' | 'students' | 'facilities' | 'areas' | 'news';

const adminTiles = [
  { key: 'events', label: 'Manage\nEvent', icon: 'calendar-outline' },
  { key: 'students', label: 'Manage\nUser', icon: 'people-outline' },
  { key: 'facilities', label: 'Manage\nFacility', icon: 'business-outline' },
  { key: 'areas', label: 'Manage\nArea', icon: 'grid-outline' },
  { key: 'news', label: 'Manage\nAnnouncement / News', icon: 'megaphone-outline' },
  { key: 'reports', label: 'Manage\nReport', icon: 'document-text-outline' },
] as const;

export default function AdminControlPanel() {
  const [section, setSection] = useState<AdminSection>('menu');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/images/school-logo.png')}
              style={styles.schoolLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandTextContainer}>
            <Text style={styles.appName}>SNMCore</Text>
            <Text style={styles.appSubtitle}>Every Date. Every Event. One Place.</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={styles.headerIcon} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={colors.RED} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === 'menu' ? (
          <>
            <Text style={styles.intro}>Choose what you want to manage.</Text>
            <View style={styles.tileGrid}>
              {adminTiles.map((tile) => (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tile}
                  activeOpacity={0.78}
                  onPress={tile.key === 'reports' ? undefined : () => setSection(tile.key)}
                >
                  <View style={styles.tileIcon}>
                    <Ionicons name={tile.icon} size={22} color={colors.RED} />
                  </View>
                  <Text style={styles.tileLabel}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : section === 'events' ? (
          <AdminEventManagement mode="events" />
        ) : section === 'facilities' ? (
          <AdminEventManagement mode="facilities" />
        ) : section === 'areas' ? (
          <AdminAreaNewsManagement mode="areas" />
        ) : section === 'news' ? (
          <AdminAreaNewsManagement mode="news" />
        ) : (
          <AdminManagement />
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <BottomNavigation
        activeTab="admin"
        onHomePress={() => router.push('/dashboard')}
        onCalendarPress={() => router.push('/calendar')}
        onAdminPress={() => setSection('menu')}
        onNewsPress={() => router.push('/news')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.CREAM },
  header: { height: 74, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.92)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(143,23,40,0.08)' },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  logoWrapper: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(143,23,40,0.08)', shadowColor: colors.RED, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  schoolLogo: { width: 30, height: 30 },
  brandTextContainer: { marginLeft: 11 },
  appName: { fontSize: 20, fontWeight: '900', color: colors.RED, letterSpacing: -0.5 },
  appSubtitle: { marginTop: 1, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color: colors.GOLD },
  headerIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center', shadowColor: colors.RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 7, elevation: 3 },
  notificationDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.GOLD, right: 8, top: 8 },
  content: { padding: 20, paddingBottom: 100 },
  intro: { color: colors.TEXT_GRAY, fontSize: 12, lineHeight: 18 },
  tileGrid: { marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  tile: { width: '48%', aspectRatio: 0.88, borderWidth: 1, borderColor: colors.DARK, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center', padding: 14 },
  tileIcon: { width: 50, height: 50, marginBottom: 12, borderRadius: 15, backgroundColor: colors.SOFT_GOLD, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: colors.DARK, fontSize: 16, fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  bottomSpace: { height: 30 },
});
