import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../constants/theme';
import { getAuthToken } from '../data/authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';

type Announcement = {
  announcement_id: number;
  title: string;
  message: string;
  external_url: string | null;
  audience: 'all' | 'faculty' | 'student';
  published_at: string | null;
};

export default function NewsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
      });
      const body = await response.text();
      let result: Announcement[] | { message?: string };
      try {
        result = JSON.parse(body);
      } catch {
        throw new Error(`Server returned an invalid response (${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(!Array.isArray(result) ? result.message || 'Unable to load announcements.' : 'Unable to load announcements.');
      }
      setAnnouncements(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.WHITE} />
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.logoWrapper}>
            <Image source={require('../../assets/images/school-logo.png')} style={styles.schoolLogo} resizeMode="contain" />
          </View>
          <View style={styles.brandTextContainer}>
            <Text style={styles.appName}>SNMCore</Text>
            <Text style={styles.appSubtitle}>Every Date. Every Event. One Place.</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={styles.notificationButton} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={colors.RED} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>ANNOUNCEMENT</Text>

        {loading ? (
          <ActivityIndicator color={colors.RED} style={styles.state} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadAnnouncements()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : announcements.length ? (
          announcements.map((announcement) => (
            <TouchableOpacity
              key={announcement.announcement_id}
              style={styles.announcementRow}
              activeOpacity={announcement.external_url ? 0.75 : 1}
              disabled={!announcement.external_url}
              accessibilityRole={announcement.external_url ? 'link' : undefined}
              accessibilityLabel={announcement.external_url ? `Open link for ${announcement.title}` : announcement.title}
              onPress={() => announcement.external_url && void WebBrowser.openBrowserAsync(announcement.external_url)}
            >
              <View style={styles.announcementIcon}>
                <Ionicons name="megaphone-outline" size={20} color={colors.RED} />
              </View>
              <View style={styles.announcementBody}>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementMessage} numberOfLines={3}>{announcement.message}</Text>
                {announcement.published_at ? (
                  <Text style={styles.announcementDate}>
                    {new Date(announcement.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                ) : null}
              </View>
              {announcement.external_url ? <Ionicons name="open-outline" size={18} color={colors.RED} /> : null}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.state}>
            <Ionicons name="newspaper-outline" size={28} color={colors.GOLD} />
            <Text style={styles.stateText}>No announcements yet.</Text>
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <BottomNavigation
        activeTab="news"
        onHomePress={() => router.push('/dashboard')}
        onCalendarPress={() => router.push('/calendar')}
        onAdminPress={() => router.push('/admin-control')}
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
  appName: { fontSize: 20, fontWeight: '900', color: colors.RED },
  appSubtitle: { marginTop: 1, fontSize: 8, fontWeight: '800', color: colors.GOLD },
  notificationButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.WHITE, alignItems: 'center', justifyContent: 'center', shadowColor: colors.RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 7, elevation: 3 },
  notificationDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.GOLD, right: 8, top: 8 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 76 },
  sectionTitle: { marginBottom: 14, color: colors.DARK, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  announcementRow: { minHeight: 76, marginBottom: 8, padding: 8, borderWidth: 1, borderColor: colors.DARK, borderRadius: 9, backgroundColor: colors.WHITE, flexDirection: 'row', alignItems: 'center' },
  announcementIcon: { width: 42, height: 42, borderRadius: 9, borderWidth: 1, borderColor: colors.DARK, backgroundColor: colors.CREAM, alignItems: 'center', justifyContent: 'center' },
  announcementBody: { flex: 1, marginLeft: 14 },
  announcementTitle: { color: colors.DARK, fontSize: 12, fontWeight: '900' },
  announcementMessage: { marginTop: 3, color: colors.TEXT_GRAY, fontSize: 11, lineHeight: 15 },
  announcementDate: { marginTop: 4, color: colors.GOLD, fontSize: 9, fontWeight: '800' },
  state: { minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 10 },
  stateText: { color: colors.TEXT_GRAY, fontSize: 12, textAlign: 'center' },
  retryButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.RED },
  retryText: { color: colors.WHITE, fontSize: 11, fontWeight: '900' },
  bottomSpace: { height: 20 },
});
