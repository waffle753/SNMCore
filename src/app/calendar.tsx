import React from 'react';
import {
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

const RED = '#8F1728';
const GOLD = '#D5A928';
const LIGHT_GOLD = '#F4C84A';
const WHITE = '#FFFFFF';
const CREAM = '#FFF8F0';
const SOFT_GOLD = '#FFF7D9';
const DARK = '#241619';
const TEXT_GRAY = '#756A6A';

const calendarDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthDates = [31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

const events = [
  {
    title: 'Student Orientation',
    date: 'Sep 15',
    time: '8:00 AM',
    location: 'School Auditorium',
  },
  {
    title: 'Midterm Examination',
    date: 'Sep 20',
    time: '8:00 AM',
    location: 'Assigned Classrooms',
  },
];

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={RED} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <View style={styles.brandContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/images/school-logo.png')}
                style={styles.schoolLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.brandTextContainer}>
              <Text style={styles.headerLabel}>Calendar</Text>
              <Text style={styles.headerTitle}>September 2026</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={22} color={WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      >
        <View style={styles.calendarCard}>
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
            {monthDates.map((day, index) => (
              <View
                key={index}
                style={[
                  styles.dayCell,
                  day === 12 && styles.dayCellActive,
                  day === 15 && styles.dayCellEvent,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    day === 12 && styles.dayTextActive,
                    day === 15 && styles.dayTextEvent,
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Events</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsList}>
          {events.map((item, index) => (
            <View key={index} style={styles.eventItem}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeMonth}>SEP</Text>
                <Text style={styles.dateBadgeDay}>{item.date.split(' ')[1]}</Text>
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
        </View>
      </ScrollView>

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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SOFT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
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
    marginLeft: 10,
    alignItems: 'flex-start',
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: RED,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: DARK,
    letterSpacing: -0.4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },
  calendarCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 16,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: DARK,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '900',
    color: RED,
  },
  eventsList: {
    gap: 10,
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
});
