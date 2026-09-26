import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../constants/theme';
import { getAuthToken } from '../data/authSession';

const RED = colors.RED;
const GOLD = colors.GOLD;
const WHITE = colors.WHITE;
const CREAM = colors.CREAM;
const SOFT_GOLD = colors.SOFT_GOLD;
const DARK = colors.DARK;
const TEXT_GRAY = colors.TEXT_GRAY;

const calendarDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const today = new Date();

type CalendarEvent = {
  event_id: number;
  event_name: string;
  start_datetime: string;
  end_datetime: string;
  location_name: string | null;
  status: string;
  facility_name?: string | null;
  area_name?: string | null;
  location_type?: string | null;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.1.235:4000';

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localDateKey = (value: string) => value.slice(0, 10);
const formatTime = (value: string) => {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
const eventLocation = (event: CalendarEvent) => event.location_type === 'indoor'
  ? `${event.facility_name || 'Facility'}${event.area_name ? ` - ${event.area_name}` : ' - Entire facility'}`
  : event.location_name || 'Location not set';

export default function CalendarScreen() {
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events`, {
        headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load events.');
      setEvents(result);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadEvents(); }, []);

  const monthLabel = visibleMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const monthPrefix = `${visibleMonth.getFullYear()}-${String(
    visibleMonth.getMonth() + 1
  ).padStart(2, '0')}`;
  const monthDates = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1
    ).getDay();
    const daysInMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      0
    ).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);
  const selectedEvents = events.filter((event) => localDateKey(event.start_datetime) === dateKey(selectedDate));
  const monthEvents = events.filter((event) => localDateKey(event.start_datetime).startsWith(monthPrefix));
  const isSelectedDateInVisibleMonth =
    selectedDate.getFullYear() === visibleMonth.getFullYear() &&
    selectedDate.getMonth() === visibleMonth.getMonth();
  const displayedEvents = isSelectedDateInVisibleMonth ? selectedEvents : monthEvents;

  const changeMonth = (amount: number) => {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1)
    );
  };

  const goToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.backgroundLayer}>
        <View style={styles.goldCircleLarge} />
        <View style={styles.redCircleLarge} />
        <View style={styles.goldCircleSmall} />
        <View style={styles.redCircleSmall} />
        <View style={styles.backgroundSoftOverlay} />
      </View>

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

        <TouchableOpacity activeOpacity={0.8} style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={22} color={RED} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Calendar</Text>
            <Text style={styles.sectionSubtitle}>{monthLabel}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={goToToday}>
            <Text style={styles.viewAllText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthNavigation}>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={16} color={RED} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={16} color={RED} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWeekRow}>
            {calendarDays.map((day, index) => (
              <Text
                key={day + index}
                style={[
                  styles.calendarWeekDay,
                  day === 'M' && styles.calendarWeekDayActive,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {monthDates.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const cellDate = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                day
              );
              const cellKey = dateKey(cellDate);
              const hasEvent = events.some((event) => localDateKey(event.start_datetime) === cellKey);
              const isSelected = cellKey === dateKey(selectedDate);

              return (
                <TouchableOpacity
                  key={cellKey}
                  activeOpacity={0.75}
                  onPress={() => setSelectedDate(cellDate)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellActive,
                    hasEvent && !isSelected && styles.dayCellEvent,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextActive,
                      hasEvent && !isSelected && styles.dayTextEvent,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasEvent && <View style={styles.eventIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Events</Text>
            <Text style={styles.sectionSubtitle}>
              {isSelectedDateInVisibleMonth
                ? `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'} on selected date`
                : `${monthEvents.length} event${monthEvents.length === 1 ? '' : 's'} this month`}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/admin-control')}>
            <Text style={styles.viewAllText}>Admin events</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsList}>
          {displayedEvents.map((item) => (
            <View key={item.event_id} style={styles.eventItem}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeMonth}>
                  {new Date(`${localDateKey(item.start_datetime)}T12:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                </Text>
                <Text style={styles.dateBadgeDay}>{localDateKey(item.start_datetime).slice(-2)}</Text>
              </View>

              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{item.event_name}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={GOLD} />
                  <Text style={styles.metaText}>{formatTime(item.start_datetime)} - {formatTime(item.end_datetime)}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={GOLD} />
                  <Text style={styles.metaText}>{eventLocation(item)}</Text>
                </View>
                <Text style={styles.eventStatus}>{item.status}</Text>
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={RED} style={styles.emptyState} />}
          {!loading && Boolean(loadError) && <Text style={styles.emptyStateText}>{loadError}</Text>}
          {!displayedEvents.length && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={24} color={GOLD} />
              <Text style={styles.emptyStateText}>{isSelectedDateInVisibleMonth ? 'No events on this date.' : 'No events for this month.'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNavigation
        activeTab="calendar"
        onHomePress={() => router.push('/dashboard')}
        onCalendarPress={() => router.push('/calendar')}
        onAdminPress={() => router.push('/admin-control')}
        onNewsPress={() => router.push('/news')}
      />
    </View>
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
  backgroundSoftOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
    shadowOffset: { width: 0, height: 2 },
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
    fontWeight: '800',
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 3,
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 30,
  },
  calendarCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: SOFT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: DARK,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarWeekDay: {
    width: 24,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    color: TEXT_GRAY,
  },
  calendarWeekDayActive: {
    color: RED,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayCell: {
    width: '12.5%',
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellActive: {
    backgroundColor: RED,
  },
  dayCellEvent: {
    backgroundColor: 'rgba(213, 169, 40, 0.15)',
  },
  dayText: {
    fontSize: 9,
    fontWeight: '700',
    color: DARK,
  },
  dayTextActive: {
    color: WHITE,
    fontWeight: '800',
  },
  dayTextEvent: {
    color: RED,
    fontWeight: '800',
  },
  eventIndicator: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    bottom: 3,
    backgroundColor: GOLD,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: DARK,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '900',
    color: RED,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_GRAY,
  },
  eventsList: {
    gap: 10,
  },
  emptyState: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_GRAY,
  },
  eventItem: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dateBadge: {
    width: 54,
    height: 63,
    borderRadius: 16,
    backgroundColor: SOFT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeMonth: {
    fontSize: 8,
    fontWeight: '900',
    color: RED,
    letterSpacing: 1,
  },
  dateBadgeDay: {
    fontSize: 23,
    fontWeight: '900',
    color: RED,
  },
  eventBody: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: DARK,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 9,
    fontWeight: '600',
    color: TEXT_GRAY,
  },
  eventStatus: {
    marginTop: 4,
    color: RED,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
});
