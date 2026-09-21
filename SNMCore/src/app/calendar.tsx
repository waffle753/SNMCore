import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../constants/theme';

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
  title: string;
  date: string;
  time: string;
  location: string;
};

const initialEvents: CalendarEvent[] = [
  {
    title: 'Student Orientation',
    date: '2026-09-15',
    time: '8:00 AM',
    location: 'School Auditorium',
  },
  {
    title: 'Midterm Examination',
    date: '2026-09-20',
    time: '8:00 AM',
    location: 'Assigned Classrooms',
  },
];

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export default function CalendarScreen() {
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState(initialEvents);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('8:00 AM');
  const [newEventLocation, setNewEventLocation] = useState('');

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
  const selectedEvents = events.filter((event) => event.date === dateKey(selectedDate));
  const monthEvents = events.filter((event) => event.date.startsWith(monthPrefix));

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

  const addEvent = () => {
    if (!newEventTitle.trim()) {
      return;
    }

    setEvents((currentEvents) => [
      ...currentEvents,
      {
        title: newEventTitle.trim(),
        date: dateKey(selectedDate),
        time: newEventTime.trim() || '8:00 AM',
        location: newEventLocation.trim() || 'School Campus',
      },
    ]);
    setNewEventTitle('');
    setNewEventTime('8:00 AM');
    setNewEventLocation('');
    setAddModalVisible(false);
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
              const hasEvent = events.some((event) => event.date === cellKey);
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
              {selectedEvents.length
                ? `Selected date, ${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}`
                : `${monthEvents.length} event${monthEvents.length === 1 ? '' : 's'} this month`}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.viewAllText}>Add event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsList}>
          {(selectedEvents.length ? selectedEvents : monthEvents).map((item) => (
            <View key={`${item.date}-${item.title}`} style={styles.eventItem}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeMonth}>
                  {new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                </Text>
                <Text style={styles.dateBadgeDay}>{item.date.slice(-2)}</Text>
              </View>

              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{item.title}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={GOLD} />
                  <Text style={styles.metaText}>{item.time}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={GOLD} />
                  <Text style={styles.metaText}>{item.location}</Text>
                </View>
              </View>
            </View>
          ))}
          {!selectedEvents.length && !monthEvents.length && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={24} color={GOLD} />
              <Text style={styles.emptyStateText}>No events for this month.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add event</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={TEXT_GRAY} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDate}>
              {selectedDate.toLocaleDateString('en-US', { dateStyle: 'full' })}
            </Text>
            <TextInput
              value={newEventTitle}
              onChangeText={setNewEventTitle}
              placeholder="Event title"
              placeholderTextColor={TEXT_GRAY}
              style={styles.input}
            />
            <TextInput
              value={newEventTime}
              onChangeText={setNewEventTime}
              placeholder="Time"
              placeholderTextColor={TEXT_GRAY}
              style={styles.input}
            />
            <TextInput
              value={newEventLocation}
              onChangeText={setNewEventLocation}
              placeholder="Location"
              placeholderTextColor={TEXT_GRAY}
              style={styles.input}
            />
            <TouchableOpacity style={styles.saveButton} onPress={addEvent}>
              <Text style={styles.saveButtonText}>Save event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavigation
        activeTab="calendar"
        onHomePress={() => router.push('/dashboard')}
        onCalendarPress={() => router.push('/calendar')}
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(36, 22, 25, 0.35)',
  },
  modalCard: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: DARK,
  },
  modalDate: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_GRAY,
  },
  input: {
    height: 46,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: WHITE,
    color: DARK,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    height: 48,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: WHITE, 
    fontSize: 13,
    fontWeight: '900',
  },
});
