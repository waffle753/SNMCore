import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Animated,
  Easing,
  PanResponder,
  TextInput,
  Platform,
  Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import BottomNavigation from '../components/BottomNavigation';
import FacultyDashboard from '../components/FacultyDashboard';
import { colors } from '../constants/theme';
import { quickAccessItems } from '../data/dashboardData';
import { clearAuthSession, getAuthToken, getAuthUser, setAuthSession } from '../data/authSession';

const RED = colors.RED;
const GOLD = colors.GOLD;
const LIGHT_GOLD = colors.LIGHT_GOLD;
const WHITE = colors.WHITE;
const CREAM = colors.CREAM;
const SOFT_GOLD = colors.SOFT_GOLD;
const DARK = colors.DARK;
const TEXT_GRAY = colors.TEXT_GRAY;

type DashboardEvent = {
  event_id: number;
  event_name: string;
  start_datetime: string;
  end_datetime: string;
  location_type: 'indoor' | 'outdoor' | 'off_campus' | null;
  facility_name: string | null;
  area_name: string | null;
  space_type: 'specific_area' | 'entire_facility' | null;
  location_name: string | null;
};
type DashboardAnnouncement = {
  announcement_id: number;
  title: string;
  message: string;
  external_url: string | null;
  published_at: string | null;
};
type CarouselItem = {
  id: string;
  kind: 'event' | 'announcement';
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  icon: string;
  externalUrl: string | null;
};
type UpcomingEvent = CarouselItem & { month: string; day: string };
type StudentInformation = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  gender: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  course: string;
  department: string;
  yearLevel: string;
  section: string;
  schoolYear: string;
  semester: string;
};
const emptyStudentInformation = (): StudentInformation => ({
  firstName: '', middleName: '', lastName: '', suffix: '', dateOfBirth: '', gender: '',
  street: '', barangay: '', city: '', province: '', postalCode: '', course: '',
  department: '', yearLevel: '', section: '', schoolYear: '', semester: '',
});
const studentInformationFields: { key: keyof StudentInformation; label: string; required?: boolean }[] = [
  { key: 'firstName', label: 'First name', required: true },
  { key: 'middleName', label: 'Middle name' },
  { key: 'lastName', label: 'Last name', required: true },
  { key: 'suffix', label: 'Suffix' },
  { key: 'dateOfBirth', label: 'Date of birth', required: true },
  { key: 'gender', label: 'Gender', required: true },
  { key: 'street', label: 'Street' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'course', label: 'Course', required: true },
  { key: 'department', label: 'Department' },
  { key: 'yearLevel', label: 'Year level', required: true },
  { key: 'section', label: 'Section' },
  { key: 'schoolYear', label: 'School year', required: true },
  { key: 'semester', label: 'Semester', required: true },
];

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';
const dateOfBirthValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};
const formatDateOfBirth = (value: string) => {
  if (!value) return 'Select date of birth';
  const date = dateOfBirthValue(value);
  return Number.isNaN(date.getTime())
    ? 'Select date of birth'
    : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const dateOfBirthString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseApiResponse = async <T,>(response: Response, fallback: string): Promise<T> => {
  const body = await response.text();
  let data: T & { message?: string };
  try {
    data = JSON.parse(body) as T & { message?: string };
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}; invalid server response).`);
  }
  if (!response.ok) throw new Error(data.message || `${fallback} (HTTP ${response.status}).`);
  return data;
};
const parseDate = (value: string) => new Date(value.replace(' ', 'T'));
const formatEventDate = (value: string) => {
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const formatEventTime = (value: string) => {
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
const formatAnnouncementDate = (value: string | null) => {
  if (!value) return 'Announcement';
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? 'Announcement'
    : `Posted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export default function DashboardScreen() {
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [eventLoadError, setEventLoadError] = useState('');
  const [announcementLoadError, setAnnouncementLoadError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const currentUser = getAuthUser();
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [studentInformation, setStudentInformation] = useState<StudentInformation>(emptyStudentInformation);
  const [studentInformationLoading, setStudentInformationLoading] = useState(false);
  const [dateOfBirthPickerVisible, setDateOfBirthPickerVisible] = useState(false);
  const [studentDropdown, setStudentDropdown] = useState<'yearLevel' | 'semester' | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showFacultyRequests, setShowFacultyRequests] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const carouselItem = carouselItems[selectedEvent] || null;
  const homeFirstName = currentUser?.role === 'student' && studentInformation.firstName.trim()
    ? studentInformation.firstName.trim()
    : (profileName || currentUser?.name || '').trim().split(/\s+/)[0] || 'there';
  const handleDateOfBirthChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setStudentInformation((current) => ({ ...current, dateOfBirth: dateOfBirthString(selectedDate) }));
    }
    if (Platform.OS === 'android' || event.type === 'dismissed') setDateOfBirthPickerVisible(false);
  };

  useEffect(() => {
    let active = true;
    const loadDashboardContent = async () => {
      const headers = { Authorization: `Bearer ${getAuthToken() || ''}` };
      const [eventsResult, announcementsResult] = await Promise.allSettled([
        fetch(`${API_URL}/api/events`, { headers }).then((response) =>
          parseApiResponse<DashboardEvent[]>(response, 'Unable to load events.')
        ),
        fetch(`${API_URL}/api/announcements`, { headers }).then((response) =>
          parseApiResponse<DashboardAnnouncement[]>(response, 'Unable to load announcements.')
        ),
      ]);
      if (!active) return;

      const now = Date.now();
      let events: DashboardEvent[] = [];
      let announcements: DashboardAnnouncement[] = [];
      if (eventsResult.status === 'fulfilled') {
        events = eventsResult.value;
        setEventLoadError('');
      } else {
        setEventLoadError(eventsResult.reason instanceof Error ? eventsResult.reason.message : 'Unable to load events.');
      }
      if (announcementsResult.status === 'fulfilled') {
        announcements = announcementsResult.value;
        setAnnouncementLoadError('');
      } else {
        setAnnouncementLoadError(announcementsResult.reason instanceof Error ? announcementsResult.reason.message : 'Unable to load announcements.');
      }

      if (currentUser?.role === 'student') {
        try {
          const response = await fetch(`${API_URL}/api/profile`, { headers });
          const profile = await parseApiResponse<{
            name: string;
            email?: string;
            studentInformation?: Partial<StudentInformation> | null;
            settings?: {
              theme?: string;
              pushNotifications?: boolean;
              emailNotifications?: boolean;
              language?: string;
            };
          }>(response, 'Unable to load student information.');
          if (!active) return;
          setStudentInformation({ ...emptyStudentInformation(), ...profile.studentInformation });
          setProfileName(profile.name);
          setProfileEmail(profile.email || currentUser?.email || '');
          setDarkMode(profile.settings?.theme === 'dark');
          setNotificationsEnabled(profile.settings?.pushNotifications ?? true);
          setSecurityEnabled(profile.settings?.emailNotifications ?? false);
        } catch (error) {
          if (active) console.error('Unable to load student name for dashboard greeting:', error);
        }
      }

      const upcoming = events
        .filter((item) => {
          const start = parseDate(item.start_datetime).getTime();
          return Number.isFinite(start) && start >= now;
        })
        .sort((a, b) => parseDate(a.start_datetime).getTime() - parseDate(b.start_datetime).getTime())
        .map((item): UpcomingEvent => {
          const date = parseDate(item.start_datetime);
          const location = item.location_type === 'indoor'
            ? [item.facility_name, item.space_type === 'entire_facility' ? 'Entire facility' : item.area_name]
              .filter(Boolean).join(' • ') || 'Location not set'
            : item.location_name || 'Location not set';
          return {
            id: `event-${item.event_id}`,
            kind: 'event',
            title: item.event_name,
            date: formatEventDate(item.start_datetime),
            time: formatEventTime(item.start_datetime),
            location,
            description: '',
            icon: 'calendar-outline',
            externalUrl: null,
            month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            day: date.toLocaleDateString('en-US', { day: '2-digit' }),
          };
        });
      const announcementItems = announcements.map((item): CarouselItem => ({
        id: `announcement-${item.announcement_id}`,
        kind: 'announcement',
        title: item.title,
        date: formatAnnouncementDate(item.published_at),
        time: '',
        location: '',
        description: item.message,
        icon: 'megaphone-outline',
        externalUrl: item.external_url,
      }));

      setUpcomingEvents(upcoming.slice(0, 3));
      setCarouselItems([...upcoming, ...announcementItems]);
      setSelectedEvent(0);
      setDashboardLoading(false);
    };
    void loadDashboardContent();
    return () => { active = false; };
  }, []);

  const slideAnimation = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  /*
  ============================================================
  EVENT CAROUSEL
  ============================================================
  */

  const animateToEvent = (
    nextIndex: number,
    direction: 'next' | 'previous'
  ) => {
    if (isAnimating.current) {
      return;
    }

    isAnimating.current = true;

    slideAnimation.setValue(
      direction === 'next' ? 1 : -1
    );

    setSelectedEvent(nextIndex);

    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const nextEvent = () => {
    if (carouselItems.length < 2) return;
    const nextIndex =
      selectedEvent === carouselItems.length - 1
        ? 0
        : selectedEvent + 1;

    animateToEvent(nextIndex, 'next');
  };

  const previousEvent = () => {
    if (carouselItems.length < 2) return;
    const previousIndex =
      selectedEvent === 0
        ? carouselItems.length - 1
        : selectedEvent - 1;

    animateToEvent(previousIndex, 'previous');
  };

  /*
  ============================================================
  SWIPE GESTURE
  ============================================================
  */

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15;
      },

      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = 50;

        if (gestureState.dx < -swipeThreshold) {
          // Swipe LEFT
          nextEvent();
        } else if (gestureState.dx > swipeThreshold) {
          // Swipe RIGHT
          previousEvent();
        }
      },
    })
  ).current;

  /*
  ============================================================
  AUTO SLIDE
  ============================================================
  */

  useEffect(() => {
    const interval = setInterval(() => {
      nextEvent();
    }, 4000);

    return () => clearInterval(interval);
  }, [carouselItems, selectedEvent]);

  /*
  ============================================================
  ANIMATION
  ============================================================
  */

  const animatedTranslateX =
    slideAnimation.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-45, 0, 45],
    });

  const animatedOpacity =
    slideAnimation.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    });

  const saveProfile = async () => {
    const isStudent = currentUser?.role === 'student';
    if ((!isStudent && !profileName.trim()) || !profileEmail.trim()) {
      Alert.alert('Missing information', 'Name and email are required.');
      return;
    }
    if (isStudent && studentInformationFields.some((field) => field.required && !studentInformation[field.key].trim())) {
      Alert.alert('Missing information', 'Complete all required personal and academic information.');
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${getAuthToken() || ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(!isStudent ? { fullName: profileName.trim() } : { studentInformation }),
            email: profileEmail.trim(),
            ...(profilePassword ? { password: profilePassword } : {}),
          }),
        }
      );
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

  const openProfileEditor = () => {
    setProfileName(currentUser?.name || '');
    setProfileEmail(currentUser?.email || '');
    setProfilePassword('');
    setProfileVisible(true);
    if (currentUser?.role === 'student') {
      setStudentInformationLoading(true);
      void fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
      }).then(async (response) => {
        const result = await parseApiResponse<{
          studentInformation?: Partial<StudentInformation> | null;
          name: string;
          email: string;
        }>(response, 'Unable to load personal information.');
        setProfileName(result.name);
        setProfileEmail(result.email);
        setStudentInformation({ ...emptyStudentInformation(), ...result.studentInformation });
      }).catch((error: unknown) => {
        Alert.alert('Profile load failed', error instanceof Error ? error.message : 'Unable to load personal information.');
      }).finally(() => setStudentInformationLoading(false));
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getAuthToken() || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            theme: darkMode ? 'dark' : 'light',
            pushNotifications: notificationsEnabled,
            emailNotifications: securityEnabled,
            language: 'en',
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save settings.');
      setSettingsVisible(false);
      Alert.alert('Settings updated', 'Your preferences have been saved.');
    } catch (error) {
      Alert.alert('Settings failed', error instanceof Error ? error.message : 'Unable to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const openProfileMenuAction = (action: 'settings' | 'report' | 'about') => {
    if (action === 'settings') {
      setSettingsVisible(true);
    } else if (action === 'report') {
      Alert.alert('Report a Problem', 'Please contact your school administrator to report an issue with SNMCore.');
    } else {
      Alert.alert('About SNMCore', 'SNMCore keeps school events and announcements in one place.');
    }
  };

  return (
    <View style={styles.container}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <View style={styles.backgroundLayer}>

        <View style={styles.goldCircleLarge} />

        <View style={styles.redCircleLarge} />

        <View style={styles.goldCircleSmall} />

        <View style={styles.redCircleSmall} />

        <View style={styles.bottomGoldShape} />

        <View style={styles.backgroundSoftOverlay} />

      </View>

      {/* =====================================================
          HEADER
      ===================================================== */}

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
            <Text style={styles.appSubtitle}>
              Every Date. Every Event. One Place.
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={22} color={RED} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* =====================================================
          MAIN SCROLL
      ===================================================== */}

      {showProfileMenu ? (
        <ScrollView
          contentContainerStyle={styles.profileMenuContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileMenuCard}>
            <View style={styles.profileMenuHero}>
              <Text style={styles.profileMenuHeading}>My Profile</Text>
              <View style={styles.profileMenuIdentity}>
                <View style={styles.profileMenuAvatar}>
                  <Ionicons name="person-outline" size={25} color={RED} />
                </View>
                <View style={styles.profileMenuIdentityText}>
                  <Text style={styles.profileMenuName}>{profileName || currentUser?.name || 'SNMCore User'}</Text>
                  <Text style={styles.profileMenuRole}>
                    {currentUser?.role ? `${currentUser.role.charAt(0).toUpperCase()}${currentUser.role.slice(1)} Account` : 'Account'}
                  </Text>
                  <TouchableOpacity onPress={openProfileEditor} accessibilityRole="button">
                    <Text style={styles.profileMenuEdit}>Edit Profile →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.profileMenuSection}>ACCOUNT</Text>
            <ProfileMenuRow
              icon="person-outline"
              title="Personal Information"
              subtitle={currentUser?.role === 'student' ? 'Personal, address, and academic details' : 'Name and email address'}
              tone="red"
              onPress={openProfileEditor}
            />

            <Text style={styles.profileMenuSection}>PREFERENCES & SUPPORT</Text>
            <ProfileMenuRow
              icon="options-outline"
              title="Settings"
              subtitle="Theme, notifications, and security"
              tone="gold"
              onPress={() => openProfileMenuAction('settings')}
            />
            <ProfileMenuRow
              icon="chatbox-ellipses-outline"
              title="Report a Problem"
              subtitle="Report bugs, errors, or app issues"
              tone="blue"
              onPress={() => openProfileMenuAction('report')}
            />
            <ProfileMenuRow
              icon="information-circle-outline"
              title="About SNMCore"
              subtitle="App information and version"
              tone="neutral"
              onPress={() => openProfileMenuAction('about')}
            />
            <ProfileMenuRow
              icon="log-out-outline"
              title="Log Out"
              tone="red"
              last
              onPress={() => {
                setShowProfileMenu(false);
                clearAuthSession();
                router.replace('/login');
              }}
            />
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      ) : showFacultyRequests ? (
        <FacultyDashboard />
      ) : <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ===================================================
            GREETING CARD
        =================================================== */}

        <View style={styles.greetingCard}>

          <Image
            source={require('../../assets/images/building.png')}
            style={styles.greetingBackground}
            resizeMode="cover"
          />

          <View style={styles.greetingOverlay} />

          <View style={styles.greetingAccent} />

          <View style={styles.greetingContent}>

            <View style={styles.profileCircle}>

              <Ionicons
                name="person"
                size={25}
                color={WHITE}
              />

            </View>

            <View style={styles.greetingTextContainer}>

              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </Text>

              <Text style={styles.greetingText}>
                Hi, {homeFirstName}!
              </Text>

              <Text style={styles.greetingSubtitle}>
                Welcome back
              </Text>

            </View>

          </View>

        </View>

        {/* ===================================================
            SCHOOL EVENTS TITLE
        =================================================== */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            Events & Announcements
          </Text>

          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/news')}>

            <Text style={styles.viewAllText}>
              News
            </Text>

          </TouchableOpacity>

        </View>

        {/* ===================================================
            SCHOOL EVENT CAROUSEL
        =================================================== */}

        <View
          style={styles.schoolEventCard}
          {...panResponder.panHandlers}
        >

          <View style={styles.eventDecorCircle} />

          {/* TOP */}

          <View style={styles.featuredTop}>

            <View style={styles.featuredBadge}>

              <Ionicons
                name={carouselItem?.kind === 'announcement' ? 'megaphone-outline' : 'calendar-outline'}
                size={13}
                color={RED}
              />

              <Text style={styles.featuredBadgeText}>
                {carouselItem?.kind === 'announcement' ? 'ANNOUNCEMENT' : carouselItem?.kind === 'event' ? 'SCHOOL EVENT' : 'UPDATES'}
              </Text>

            </View>

            <View style={styles.eventCounter}>

              <Text style={styles.eventCounterText}>
                {carouselItems.length ? `${selectedEvent + 1}/${carouselItems.length}` : '0/0'}
              </Text>

            </View>

          </View>

          {/* EVENT CONTENT */}

          <Animated.View
            style={[
              styles.animatedEventContent,
              {
                transform: [
                  {
                    translateX: animatedTranslateX,
                  },
                ],
                opacity: animatedOpacity,
              },
            ]}
          >

            <TouchableOpacity
              style={styles.featuredContent}
              activeOpacity={carouselItem?.externalUrl ? 0.75 : 1}
              disabled={!carouselItem?.externalUrl}
              accessibilityRole={carouselItem?.externalUrl ? 'link' : undefined}
              accessibilityLabel={carouselItem?.externalUrl ? `Open link for ${carouselItem.title}` : undefined}
              onPress={() => {
                if (carouselItem?.externalUrl) void WebBrowser.openBrowserAsync(carouselItem.externalUrl);
              }}
            >

              <View style={styles.featuredIcon}>

                <Ionicons
                  name={(carouselItem?.icon || 'calendar-outline') as any}
                  size={27}
                  color={RED}
                />

              </View>

              <View style={styles.featuredInfo}>

                <Text style={styles.featuredDate}>
                  {carouselItem?.date || (dashboardLoading ? 'Loading updates...' : 'No upcoming items')}
                </Text>

                <Text
                  style={styles.featuredTitle}
                  numberOfLines={1}
                >
                  {carouselItem?.title || (dashboardLoading ? 'Loading events and announcements' : 'Nothing to show yet')}
                </Text>

                {carouselItem?.kind === 'announcement' ? (
                  <Text style={styles.metaText} numberOfLines={2}>
                    {carouselItem.description}
                  </Text>
                ) : carouselItem?.kind === 'event' ? (
                  <View style={styles.featuredMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={GOLD} />
                      <Text style={styles.metaText}>{carouselItem.time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={13} color={GOLD} />
                      <Text style={styles.metaText} numberOfLines={1}>{carouselItem.location}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.metaText}>
                    {dashboardLoading ? '' : eventLoadError || announcementLoadError || 'New events and announcements will appear here.'}
                  </Text>
                )}

                </View>

            </TouchableOpacity>

          </Animated.View>

          {/* BOTTOM */}

          <View style={styles.featuredBottom}>

            {/* DOTS */}

            <View style={styles.eventDots}>

              {carouselItems.map((item, index) => (

                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => {

                    if (index === selectedEvent) {
                      return;
                    }

                    const direction =
                      index > selectedEvent
                        ? 'next'
                        : 'previous';

                    animateToEvent(
                      index,
                      direction
                    );

                  }}
                >

                  <View
                    style={[
                      styles.eventDot,
                      index === selectedEvent &&
                        styles.eventDotActive,
                    ]}
                  />

                </TouchableOpacity>

              ))}

            </View>

            {/* ARROWS */}

            <View style={styles.eventArrows}>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={previousEvent}
                style={styles.eventArrow}
                disabled={carouselItems.length < 2}
              >

                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={RED}
                />

              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={nextEvent}
                style={styles.eventArrow}
                disabled={carouselItems.length < 2}
              >

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={RED}
                />

              </TouchableOpacity>

            </View>

          </View>

        </View>

        {/* ===================================================
            UPCOMING EVENTS
        =================================================== */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            Upcoming Events
          </Text>

          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/calendar')}>

            <Text style={styles.viewAllText}>
              Calendar
            </Text>

          </TouchableOpacity>

        </View>

        <View style={styles.upcomingContainer}>

          {upcomingEvents.map((item) => (

            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={styles.upcomingRow}
              onPress={() => router.push('/calendar')}
            >

              <View style={styles.dateBox}>

                <Text style={styles.eventMonth}>
                  {item.month}
                </Text>

                <Text style={styles.eventDay}>
                  {item.day}
                </Text>

              </View>

              <View style={styles.upcomingInfo}>

                <Text style={styles.upcomingTitle}>
                  {item.title}
                </Text>

                <View style={styles.eventMetaRow}>

                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={GOLD}
                  />

                  <Text style={styles.eventMetaText}>
                    {item.time}
                  </Text>

                </View>

                <View style={styles.eventMetaRow}>

                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={GOLD}
                  />

                  <Text style={styles.eventMetaText}>
                    {item.location}
                  </Text>

                </View>

              </View>

              <View style={styles.upcomingIcon}>

                <Ionicons
                  name={item.icon as any}
                  size={19}
                  color={RED}
                />

              </View>

            </TouchableOpacity>

          ))}

          {!dashboardLoading && upcomingEvents.length === 0 ? (
            <Text style={styles.eventMetaText}>
              {eventLoadError || 'No upcoming events have been added.'}
            </Text>
          ) : null}

        </View>

        {/* ===================================================
            QUICK ACCESS
        =================================================== */}

        <View style={styles.sectionHeader}>

          <View>

            <Text style={styles.sectionTitle}>
              Quick Access
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your student tools
            </Text>

          </View>

        </View>

        <View style={styles.quickAccessContainer}>

          {quickAccessItems.map((item, index) => (

            <TouchableOpacity
              key={index}
              activeOpacity={0.75}
              style={styles.quickItem}
            >

              <View style={styles.quickIconOuter}>

                <View style={styles.quickIconInner}>

                  <Ionicons
                    name={item.icon as any}
                    size={21}
                    color={RED}
                  />

                </View>

              </View>

              <Text style={styles.quickItemText}>
                {item.title}
              </Text>

            </TouchableOpacity>

          ))}

        </View>

        <View style={{ height: 115 }} />

      </ScrollView>}

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <BottomNavigation
        activeTab={showProfileMenu ? 'profile' : showFacultyRequests ? 'request' : 'home'}
        onHomePress={() => {
          setShowFacultyRequests(false);
          setShowProfileMenu(false);
          router.replace('/dashboard');
        }}
        onCalendarPress={() => router.push('/calendar')}
        onAdminPress={() => router.push('/admin-control')}
        onRequestPress={() => setShowFacultyRequests(true)}
        onNewsPress={() => router.push('/news')}
        onProfilePress={() => { setShowFacultyRequests(false); setShowProfileMenu(true); }}
      />

      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.profileBackdrop}>
          <View style={styles.profileModal}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.profileModalHeader}>
                <Text style={styles.profileModalTitle}>{currentUser?.role === 'student' ? 'Personal Information' : 'Update profile'}</Text>
                <TouchableOpacity onPress={() => setProfileVisible(false)}>
                  <Ionicons name="close" size={23} color={TEXT_GRAY} />
                </TouchableOpacity>
              </View>
              {currentUser?.role === 'student' ? <>
                {studentInformationLoading ? <ActivityIndicator color={RED} style={styles.studentInfoLoader} /> : null}
                <Text style={styles.studentInfoSection}>Personal information</Text>
                {studentInformationFields.slice(0, 6).map((field) => (
                  <View key={field.key} style={styles.studentInfoField}>
                    <Text style={styles.studentInfoFieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
                    {field.key === 'dateOfBirth' ? <>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.profileSelect}
                        onPress={() => setDateOfBirthPickerVisible((visible) => !visible)}
                      >
                        <Text style={studentInformation.dateOfBirth ? styles.profileSelectValue : styles.profileSelectPlaceholder}>
                          {formatDateOfBirth(studentInformation.dateOfBirth)}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color={RED} />
                      </TouchableOpacity>
                      {dateOfBirthPickerVisible ? <View style={styles.profilePicker}>
                        <DateTimePicker
                          value={dateOfBirthValue(studentInformation.dateOfBirth)}
                          mode="date"
                          maximumDate={new Date()}
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDateOfBirthChange}
                        />
                        {Platform.OS === 'ios' ? (
                          <TouchableOpacity style={styles.profilePickerDone} onPress={() => setDateOfBirthPickerVisible(false)}>
                            <Text style={styles.profilePickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View> : null}
                    </> : (
                      <TextInput
                        value={studentInformation[field.key]}
                        onChangeText={(value) => setStudentInformation((current) => ({ ...current, [field.key]: value }))}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        placeholderTextColor={TEXT_GRAY}
                        autoCapitalize="words"
                        style={styles.profileInput}
                      />
                    )}
                  </View>
                ))}
                <Text style={styles.studentInfoSection}>Address information</Text>
                {studentInformationFields.slice(6, 11).map((field) => (
                  <View key={field.key} style={styles.studentInfoField}>
                    <Text style={styles.studentInfoFieldLabel}>{field.label}</Text>
                    <TextInput
                      value={studentInformation[field.key]}
                      onChangeText={(value) => setStudentInformation((current) => ({ ...current, [field.key]: value }))}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor={TEXT_GRAY}
                      style={styles.profileInput}
                    />
                  </View>
                ))}
                <Text style={styles.studentInfoSection}>Academic information</Text>
                {studentInformationFields.slice(11).map((field) => {
                  const fieldName = field.key as 'yearLevel' | 'semester';
                  return (
                    <View key={field.key} style={styles.studentInfoField}>
                      <Text style={styles.studentInfoFieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
                      {field.key === 'yearLevel' || field.key === 'semester' ? (() => {
                        const options = fieldName === 'yearLevel'
                          ? ['1', '2', '3', '4']
                          : ['1st Semester', '2nd Semester', '3rd Semester', 'Summer'];
                        const isOpen = studentDropdown === fieldName;
                        return <>
                          <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.profileSelect}
                            onPress={() => setStudentDropdown(isOpen ? null : fieldName)}
                          >
                            <Text style={studentInformation[fieldName] ? styles.profileSelectValue : styles.profileSelectPlaceholder}>
                              {studentInformation[fieldName] || `Select ${field.label.toLowerCase()}`}
                            </Text>
                            <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={RED} />
                          </TouchableOpacity>
                          {isOpen ? <View style={styles.profileDropdown}>
                            {options.map((option) => (
                              <TouchableOpacity
                                key={option}
                                style={styles.profileDropdownOption}
                                onPress={() => {
                                  setStudentInformation((current) => ({ ...current, [fieldName]: option }));
                                  setStudentDropdown(null);
                                }}
                              >
                                <Text style={styles.profileDropdownOptionText}>{option}</Text>
                                {studentInformation[fieldName] === option ? <Ionicons name="checkmark" size={17} color={RED} /> : null}
                              </TouchableOpacity>
                            ))}
                          </View> : null}
                        </>;
                      })() : (
                        <TextInput
                          value={studentInformation[field.key]}
                          onChangeText={(value) => setStudentInformation((current) => ({ ...current, [field.key]: value }))}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          placeholderTextColor={TEXT_GRAY}
                          style={styles.profileInput}
                        />
                      )}
                    </View>
                  );
                })}
              </> : <>
                <Text style={styles.profileFieldLabel}>Full name</Text>
                <TextInput value={profileName} onChangeText={setProfileName} placeholder="Full name" placeholderTextColor={TEXT_GRAY} style={styles.profileInput} />
              </>}
              <Text style={styles.profileFieldLabel}>Email</Text>
              <TextInput value={profileEmail} onChangeText={setProfileEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email" placeholderTextColor={TEXT_GRAY} style={styles.profileInput} />
              <Text style={styles.profileFieldLabel}>New password (optional)</Text>
              <TextInput value={profilePassword} onChangeText={setProfilePassword} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={TEXT_GRAY} style={styles.profileInput} />
              <TouchableOpacity style={styles.profileSaveButton} disabled={profileSaving || studentInformationLoading} onPress={() => void saveProfile()}>
                {profileSaving ? <ActivityIndicator color={WHITE} /> : <Text style={styles.profileSaveText}>Save profile</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.settingsBackdrop}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={22} color={TEXT_GRAY} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsItem}>
              <View style={styles.settingsItemText}>
                <Text style={styles.settingsItemTitle}>Theme</Text>
                <Text style={styles.settingsItemSubtitle}>Dark mode appearance</Text>
              </View>
              <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: '#D9D9D9', true: RED }} thumbColor={WHITE} />
            </View>

            <View style={styles.settingsItem}>
              <View style={styles.settingsItemText}>
                <Text style={styles.settingsItemTitle}>Notifications</Text>
                <Text style={styles.settingsItemSubtitle}>Receive school alerts and updates</Text>
              </View>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#D9D9D9', true: RED }} thumbColor={WHITE} />
            </View>

            <View style={styles.settingsItem}>
              <View style={styles.settingsItemText}>
                <Text style={styles.settingsItemTitle}>Security</Text>
                <Text style={styles.settingsItemSubtitle}>Enable sign-in protection</Text>
              </View>
              <Switch value={securityEnabled} onValueChange={setSecurityEnabled} trackColor={{ false: '#D9D9D9', true: RED }} thumbColor={WHITE} />
            </View>

            <TouchableOpacity style={styles.settingsSaveButton} disabled={settingsSaving} onPress={() => void saveSettings()}>
              {settingsSaving ? <ActivityIndicator color={WHITE} /> : <Text style={styles.settingsSaveText}>Save settings</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function ProfileMenuRow({
  icon,
  title,
  subtitle,
  tone,
  last = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  tone: 'red' | 'gold' | 'blue' | 'neutral';
  last?: boolean;
  onPress: () => void;
}) {
  const iconColor = tone === 'gold' ? '#9A7412' : tone === 'blue' ? '#2563B8' : tone === 'neutral' ? DARK : RED;
  const iconBackground = tone === 'gold' ? '#FFF5D8' : tone === 'blue' ? '#EAF2FF' : tone === 'neutral' ? WHITE : '#FCE9EC';
  return (
    <TouchableOpacity
      style={[styles.profileMenuRow, last && styles.profileMenuLastRow]}
      activeOpacity={0.72}
      onPress={onPress}
    >
      <View style={[styles.profileMenuRowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.profileMenuRowText}>
        <Text style={[styles.profileMenuRowTitle, last && styles.profileMenuLogoutTitle]}>{title}</Text>
        {subtitle ? <Text style={styles.profileMenuRowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={last ? RED : '#747474'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: CREAM,
  },

  backgroundLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: CREAM,
  },

  goldCircleLarge: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -130,
    right: -150,
    backgroundColor: 'rgba(244, 200, 74, 0.20)',
  },

  redCircleLarge: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: 180,
    left: -190,
    backgroundColor: 'rgba(143, 23, 40, 0.08)',
  },

  goldCircleSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: 80,
    right: -90,
    backgroundColor: 'rgba(213, 169, 40, 0.13)',
  },

  redCircleSmall: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -30,
    left: -45,
    backgroundColor: 'rgba(143, 23, 40, 0.07)',
  },

  bottomGoldShape: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -180,
    right: 90,
    backgroundColor: 'rgba(244, 200, 74, 0.10)',
  },

  backgroundSoftOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 25,
  },

  header: {
    height: 74,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143, 23, 40, 0.08)',
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(143, 23, 40, 0.08)',

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },

  schoolLogo: {
    width: 30,
    height: 30,
  },

  brandTextContainer: {
    marginLeft: 11,
  },

  appName: {
    fontSize: 20,
    fontWeight: '900',
    color: RED,
    letterSpacing: -0.5,
  },

  appSubtitle: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: GOLD,
  },

  notificationButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 3,
  },

  profileMenuContent: {
    paddingHorizontal: 7,
    paddingTop: 10,
    paddingBottom: 15,
  },

  profileMenuCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(36, 36, 36, 0.12)',
    borderRadius: 13,
    backgroundColor: '#FCFCFC',
  },

  profileMenuHero: {
    minHeight: 117,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 12,
    backgroundColor: RED,
  },

  profileMenuHeading: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },

  profileMenuIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  profileMenuAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileMenuIdentityText: {
    flex: 1,
    marginLeft: 10,
  },

  profileMenuName: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '800',
  },

  profileMenuRole: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },

  profileMenuEdit: {
    marginTop: 5,
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
  },

  profileMenuSection: {
    paddingHorizontal: 11,
    paddingTop: 13,
    paddingBottom: 2,
    color: '#555555',
    fontSize: 9,
    fontWeight: '500',
  },

  profileMenuRow: {
    minHeight: 81,
    marginHorizontal: 9,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(36,36,36,0.14)',
  },

  profileMenuLastRow: {
    minHeight: 63,
    marginTop: 2,
    borderBottomWidth: 0,
  },

  profileMenuRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileMenuRowText: {
    flex: 1,
    marginLeft: 10,
  },

  profileMenuRowTitle: {
    color: DARK,
    fontSize: 13,
    fontWeight: '500',
  },

  profileMenuLogoutTitle: {
    color: RED,
  },

  profileMenuRowSubtitle: {
    marginTop: 3,
    color: TEXT_GRAY,
    fontSize: 10,
  },

  profileBackdrop: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(23, 20, 20, 0.45)',
    justifyContent: 'center',
  },

  profileModal: {
    maxHeight: '90%',
    padding: 18,
    borderRadius: 18,
    backgroundColor: CREAM,
  },

  profileModalHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profileModalTitle: {
    color: DARK,
    fontSize: 19,
    fontWeight: '900',
  },

  profileFieldLabel: {
    marginTop: 13,
    marginBottom: 6,
    color: DARK,
    fontSize: 11,
    fontWeight: '900',
  },

  studentInfoSection: {
    marginTop: 12,
    marginBottom: 7,
    color: RED,
    fontSize: 11,
    fontWeight: '900',
  },

  studentInfoField: {
    marginBottom: 9,
  },

  studentInfoFieldLabel: {
    marginBottom: 5,
    color: DARK,
    fontSize: 11,
    fontWeight: '700',
  },

  studentInfoLoader: {
    marginVertical: 10,
  },

  profileInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(143, 23, 40, 0.12)',
    borderRadius: 11,
    backgroundColor: WHITE,
    color: DARK,
    fontSize: 12,
  },

  profileSelect: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(143, 23, 40, 0.12)',
    borderRadius: 11,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profileSelectValue: {
    color: DARK,
    fontSize: 12,
  },

  profileSelectPlaceholder: {
    color: TEXT_GRAY,
    fontSize: 12,
  },

  profilePicker: {
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: WHITE,
  },

  profilePickerDone: {
    minHeight: 36,
    borderRadius: 9,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profilePickerDoneText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '800',
  },

  profileDropdown: {
    marginTop: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(143, 23, 40, 0.12)',
    borderRadius: 11,
    backgroundColor: WHITE,
  },

  profileDropdownOption: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143, 23, 40, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profileDropdownOptionText: {
    color: DARK,
    fontSize: 12,
  },

  settingsBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 20, 20, 0.42)',
  },

  settingsSheet: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
  },

  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  settingsTitle: {
    color: DARK,
    fontSize: 18,
    fontWeight: '900',
  },

  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 66,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143, 23, 40, 0.08)',
  },

  settingsItemText: {
    flex: 1,
    marginRight: 14,
  },

  settingsItemTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: '800',
  },

  settingsItemSubtitle: {
    marginTop: 2,
    color: TEXT_GRAY,
    fontSize: 10,
    fontWeight: '600',
  },

  settingsSaveButton: {
    minHeight: 45,
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsSaveText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '900',
  },

  profileSaveButton: {
    minHeight: 45,
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileSaveText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '900',
  },

  notificationDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GOLD,
    right: 8,
    top: 8,
  },

  /* ==========================================================
     GREETING CARD
     ========================================================== */

  greetingCard: {
    minHeight: 104,
    borderRadius: 14,
    backgroundColor: 'transparent',
    paddingHorizontal: 13,
    paddingVertical: 11,
    overflow: 'hidden',
    position: 'relative',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },

  greetingBackground: {
    position: 'absolute',
    top: -35,
    left: -20,
    right: -20,
    bottom: -10,
    width: '140%',
    height: '160%',
    borderRadius: 14,
    opacity: 1,
    zIndex: 0,
  },

  greetingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(70, 8, 18, 0.32)',
    zIndex: 1,
  },

  greetingAccent: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -30,
    top: -40,
    zIndex: 2,
  },

  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 3,
    gap: 14,
  },

  greetingTextContainer: {
    flex: 1,
    marginLeft: 4,
  },

  dateText: {
    fontSize: 6,
    fontWeight: '900',
    color: LIGHT_GOLD,
    letterSpacing: 0.7,
    marginBottom: 1,
  },

  greetingText: {
    fontSize: 23,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -0.5,
  },

  greetingSubtitle: {
    marginTop: 0,
    fontSize: 8,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
  },

  profileCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  /* ==========================================================
     SECTIONS
     ========================================================== */

  sectionHeader: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  adminMenuCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 3,
  },

  adminMenuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SOFT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminMenuText: {
    flex: 1,
    marginLeft: 11,
  },

  adminMenuTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: '900',
  },

  adminMenuSubtitle: {
    marginTop: 3,
    color: TEXT_GRAY,
    fontSize: 10,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: DARK,
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '500',
    color: TEXT_GRAY,
  },

  viewAllText: {
    fontSize: 11,
    fontWeight: '900',
    color: RED,
  },

  /* ==========================================================
     SCHOOL EVENT CARD
     ========================================================== */

  schoolEventCard: {
    minHeight: 184,
    borderRadius: 25,
    backgroundColor: 'rgba(112, 16, 31, 0.94)',
    padding: 18,
    overflow: 'hidden',

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },

  eventDecorCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -65,
    top: -70,
    backgroundColor: 'rgba(244, 200, 74, 0.12)',
  },

  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: GOLD,
  },

  featuredBadgeText: {
    marginLeft: 5,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: RED,
  },

  eventCounter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  eventCounterText: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
  },

  animatedEventContent: {
    flex: 1,
  },

  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },

  featuredIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featuredInfo: {
    flex: 1,
    marginLeft: 13,
  },

  featuredDate: {
    fontSize: 8,
    fontWeight: '900',
    color: LIGHT_GOLD,
    letterSpacing: 0.9,
  },

  featuredTitle: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -0.3,
  },

  featuredMeta: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },

  metaText: {
    marginLeft: 4,
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },

  featuredBottom: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  eventDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  eventDotActive: {
    width: 19,
    backgroundColor: LIGHT_GOLD,
  },

  eventArrows: {
    flexDirection: 'row',
    gap: 7,
  },

  eventArrow: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ==========================================================
     UPCOMING EVENTS
     ========================================================== */

  upcomingContainer: {
    gap: 8,
  },

  upcomingRow: {
    minHeight: 88,
    padding: 11,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  dateBox: {
    width: 54,
    height: 63,
    borderRadius: 16,
    backgroundColor: SOFT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventMonth: {
    fontSize: 8,
    fontWeight: '900',
    color: RED,
    letterSpacing: 1,
  },

  eventDay: {
    marginTop: 1,
    fontSize: 23,
    fontWeight: '900',
    color: RED,
  },

  upcomingInfo: {
    flex: 1,
    marginLeft: 11,
  },

  upcomingTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: DARK,
    marginBottom: 4,
  },

  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  eventMetaText: {
    marginLeft: 4,
    fontSize: 9,
    fontWeight: '600',
    color: TEXT_GRAY,
  },

  upcomingIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#FFF7DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  /* ==========================================================
     QUICK ACCESS
     ========================================================== */

  quickAccessContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',

    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 25,

    paddingVertical: 15,
    paddingHorizontal: 8,

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  quickItem: {
    width: '25%',
    alignItems: 'center',
    marginVertical: 8,
  },

  quickIconOuter: {
    width: 51,
    height: 51,
    borderRadius: 18,
    backgroundColor: '#FFF8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIconInner: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: GOLD,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.13,
    shadowRadius: 5,
    elevation: 2,
  },

  quickItemText: {
    marginTop: 7,
    fontSize: 9,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
  },

  /* ==========================================================
     BOTTOM NAVIGATION
     ========================================================== */

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 76,

    backgroundColor: 'rgba(255, 255, 255, 0.96)',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    borderTopWidth: 1,
    borderTopColor: 'rgba(143, 23, 40, 0.06)',

    shadowColor: RED,
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },

  navItem: {
    width: 72,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIcon: {
    width: 39,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIconActive: {
    backgroundColor: RED,
  },

  navText: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: TEXT_GRAY,
  },

  navTextActive: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '900',
    color: RED,
  },

});