import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../constants/theme';
import { clearAuthSession, getAuthToken } from '../data/authSession';

type Role = 'admin' | 'faculty' | 'student';

type RoleDashboardProps = {
  role: Role;
};

type Announcement = {
  announcement_id: number;
  title: string;
  message: string;
  published_at: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.181:4000';
const roleDetails = {
  admin: { title: 'Admin Dashboard', subtitle: 'Manage users, events, and announcements.', icon: 'shield-checkmark-outline' },
  faculty: { title: 'Faculty Dashboard', subtitle: 'Manage your classes and school updates.', icon: 'school-outline' },
  student: { title: 'Student Dashboard', subtitle: 'Keep up with your school schedule and notices.', icon: 'person-outline' },
} as const;

export default function RoleDashboard({ role }: RoleDashboardProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const details = roleDetails[role];
  const canManage = role === 'admin' || role === 'faculty';

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await fetch(`${API_URL}/api/announcements`, {
          headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
        });
        if (response.ok) {
          const responseText = await response.text();
          try {
            setAnnouncements(JSON.parse(responseText));
          } catch {
            throw new Error(`Backend returned a non-JSON response (${response.status}).`);
          }
        }
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };
    loadAnnouncements();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{role.toUpperCase()}</Text>
          <Text style={styles.title}>{details.title}</Text>
        </View>
        <View style={styles.roleIcon}>
          <Ionicons name={details.icon} size={22} color={colors.WHITE} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to SNMCore</Text>
          <Text style={styles.welcomeText}>{details.subtitle}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={24} color={colors.RED} />
            <Text style={styles.actionTitle}>Calendar</Text>
            <Text style={styles.actionText}>View school events</Text>
          </TouchableOpacity>
          {canManage && (
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="megaphone-outline" size={24} color={colors.RED} />
              <Text style={styles.actionTitle}>Create</Text>
              <Text style={styles.actionText}>Post an announcement</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          <Text style={styles.count}>{announcements.length}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.RED} />
        ) : announcements.length ? (
          announcements.map((announcement) => (
            <View key={announcement.announcement_id} style={styles.announcement}>
              <View style={styles.announcementIcon}>
                <Ionicons name="notifications-outline" size={18} color={colors.RED} />
              </View>
              <View style={styles.announcementBody}>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementMessage}>{announcement.message}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No announcements yet.</Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          clearAuthSession();
          router.replace('/login');
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.RED} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.CREAM },
  header: { paddingHorizontal: 22, paddingTop: 58, paddingBottom: 22, backgroundColor: colors.RED, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.LIGHT_GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 5, color: colors.WHITE, fontSize: 24, fontWeight: '900' },
  roleIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 100 },
  welcomeCard: { padding: 20, borderRadius: 18, backgroundColor: colors.WHITE, shadowColor: colors.RED, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  welcomeTitle: { color: colors.DARK, fontSize: 18, fontWeight: '900' },
  welcomeText: { marginTop: 5, color: colors.TEXT_GRAY, fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionCard: { flex: 1, minHeight: 112, padding: 15, borderRadius: 16, backgroundColor: colors.SOFT_GOLD },
  actionTitle: { marginTop: 10, color: colors.DARK, fontSize: 14, fontWeight: '900' },
  actionText: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 10 },
  sectionHeader: { marginTop: 24, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.DARK, fontSize: 18, fontWeight: '900' },
  count: { color: colors.RED, fontSize: 12, fontWeight: '900' },
  announcement: { marginBottom: 10, padding: 14, borderRadius: 16, backgroundColor: colors.WHITE, flexDirection: 'row', shadowColor: colors.RED, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  announcementIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.SOFT_GOLD, alignItems: 'center', justifyContent: 'center' },
  announcementBody: { flex: 1, marginLeft: 10 },
  announcementTitle: { color: colors.DARK, fontSize: 13, fontWeight: '900' },
  announcementMessage: { marginTop: 4, color: colors.TEXT_GRAY, fontSize: 11, lineHeight: 16 },
  emptyText: { color: colors.TEXT_GRAY, fontSize: 12 },
  logoutButton: { position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { color: colors.RED, fontSize: 12, fontWeight: '900' },
});
