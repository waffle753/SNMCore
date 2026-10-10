import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../constants/theme';
import { clearAuthSession, getAuthToken, getAuthUser, setAuthSession } from '../data/authSession';
import BottomNavigation from './BottomNavigation';

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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';
const roleDetails = {
  admin: { title: 'Admin Dashboard', subtitle: 'Manage users, events, and announcements.', icon: 'shield-checkmark-outline' },
  faculty: { title: 'Faculty Dashboard', subtitle: 'Manage your classes and school updates.', icon: 'school-outline' },
  student: { title: 'Student Dashboard', subtitle: 'Keep up with your school schedule and notices.', icon: 'person-outline' },
} as const;

export default function RoleDashboard({ role }: RoleDashboardProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileName, setProfileName] = useState(getAuthUser()?.name || '');
  const [profileEmail, setProfileEmail] = useState(getAuthUser()?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const details = roleDetails[role];
  const canManage = role === 'admin';
  const currentUser = getAuthUser();

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

  const saveProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) {
      Alert.alert('Missing information', 'Name and email are required.');
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getAuthToken() || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profileName.trim(),
          email: profileEmail.trim(),
          ...(profilePassword ? { password: profilePassword } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update profile.');
      setAuthSession({ token: getAuthToken() || '', user: result });
      setProfileName(result.name);
      setProfileEmail(result.email);
      setProfilePassword('');
      setProfileVisible(false);
      Alert.alert('Profile updated', 'Your account details have been saved.');
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Unable to connect to the backend.');
    } finally {
      setProfileSaving(false);
    }
  };

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

        <TouchableOpacity style={styles.profileCard} onPress={() => {
          setProfileName(currentUser?.name || '');
          setProfileEmail(currentUser?.email || '');
          setProfilePassword('');
          setProfileVisible(true);
        }}>
          <View style={styles.profileIcon}><Ionicons name="person-circle-outline" size={22} color={colors.RED} /></View>
          <View style={styles.profileBody}>
            <Text style={styles.profileTitle}>My profile</Text>
            <Text style={styles.profileText}>{currentUser?.email || 'Update your account details'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.TEXT_GRAY} />
        </TouchableOpacity>
      </ScrollView>

      <BottomNavigation
        activeTab="home"
        onHomePress={() => router.replace(role === 'faculty' ? '/faculty' : role === 'admin' ? '/admin' : '/student')}
        onCalendarPress={() => router.push('/calendar')}
        onAdminPress={() => router.push('/admin-control')}
        onNewsPress={() => router.push('/news')}
        onProfilePress={() => {
          setProfileName(currentUser?.name || '');
          setProfileEmail(currentUser?.email || '');
          setProfilePassword('');
          setProfileVisible(true);
        }}
      />

      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.profileModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update profile</Text>
              <TouchableOpacity onPress={() => setProfileVisible(false)}><Ionicons name="close" size={23} color={colors.TEXT_GRAY} /></TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput value={profileName} onChangeText={setProfileName} placeholder="Full name" placeholderTextColor={colors.TEXT_GRAY} style={styles.profileInput} />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput value={profileEmail} onChangeText={setProfileEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email" placeholderTextColor={colors.TEXT_GRAY} style={styles.profileInput} />
            <Text style={styles.fieldLabel}>New password (optional)</Text>
            <TextInput value={profilePassword} onChangeText={setProfilePassword} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={colors.TEXT_GRAY} style={styles.profileInput} />
            <TouchableOpacity style={styles.saveProfileButton} disabled={profileSaving} onPress={() => void saveProfile()}>
              {profileSaving ? <ActivityIndicator color={colors.WHITE} /> : <Text style={styles.saveProfileText}>Save profile</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  profileCard: { marginTop: 18, padding: 14, borderRadius: 15, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.SOFT_GOLD, alignItems: 'center', justifyContent: 'center' },
  profileBody: { flex: 1 },
  profileTitle: { color: colors.DARK, fontSize: 12, fontWeight: '900' },
  profileText: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 10 },
  modalBackdrop: { flex: 1, padding: 20, backgroundColor: 'rgba(23,20,20,0.45)', justifyContent: 'center' },
  profileModal: { padding: 18, borderRadius: 18, backgroundColor: colors.CREAM },
  modalHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.DARK, fontSize: 19, fontWeight: '900' },
  fieldLabel: { marginTop: 13, marginBottom: 6, color: colors.DARK, fontSize: 11, fontWeight: '900' },
  profileInput: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(143,23,40,0.12)', borderRadius: 11, backgroundColor: colors.WHITE, color: colors.DARK, fontSize: 12 },
  saveProfileButton: { minHeight: 45, marginTop: 18, borderRadius: 12, backgroundColor: colors.RED, alignItems: 'center', justifyContent: 'center' },
  saveProfileText: { color: colors.WHITE, fontSize: 12, fontWeight: '900' },
  logoutButton: { position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { color: colors.RED, fontSize: 12, fontWeight: '900' },
});
