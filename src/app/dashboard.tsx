import React, { useEffect, useRef, useState } from 'react';
import {
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../constants/theme';
import { quickAccessItems, schoolEvents, upcomingEvents } from '../data/dashboardData';

const RED = colors.RED;
const GOLD = colors.GOLD;
const LIGHT_GOLD = colors.LIGHT_GOLD;
const WHITE = colors.WHITE;
const CREAM = colors.CREAM;
const SOFT_GOLD = colors.SOFT_GOLD;
const DARK = colors.DARK;
const TEXT_GRAY = colors.TEXT_GRAY;

export default function DashboardScreen() {
  const [selectedEvent, setSelectedEvent] = useState(0);

  const event = schoolEvents[selectedEvent];

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
    const nextIndex =
      selectedEvent === schoolEvents.length - 1
        ? 0
        : selectedEvent + 1;

    animateToEvent(nextIndex, 'next');
  };

  const previousEvent = () => {
    const previousIndex =
      selectedEvent === 0
        ? schoolEvents.length - 1
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
  }, [selectedEvent]);

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

      <ScrollView
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
                SEPTEMBER 12, 2026
              </Text>

              <Text style={styles.greetingText}>
                Hi, Kent!
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
            School Events
          </Text>

          <TouchableOpacity activeOpacity={0.7}>

            <Text style={styles.viewAllText}>
              View all
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
                name="calendar-outline"
                size={13}
                color={RED}
              />

              <Text style={styles.featuredBadgeText}>
                SCHOOL EVENT
              </Text>

            </View>

            <View style={styles.eventCounter}>

              <Text style={styles.eventCounterText}>
                {selectedEvent + 1}/{schoolEvents.length}
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

            <View style={styles.featuredContent}>

              <View style={styles.featuredIcon}>

                <Ionicons
                  name={event.icon as any}
                  size={27}
                  color={RED}
                />

              </View>

              <View style={styles.featuredInfo}>

                <Text style={styles.featuredDate}>
                  {event.date}
                </Text>

                <Text
                  style={styles.featuredTitle}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>

                <View style={styles.featuredMeta}>

                  <View style={styles.metaItem}>

                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={GOLD}
                    />

                    <Text style={styles.metaText}>
                      {event.time}
                    </Text>

                  </View>

                  <View style={styles.metaItem}>

                    <Ionicons
                      name="location-outline"
                      size={13}
                      color={GOLD}
                    />

                    <Text
                      style={styles.metaText}
                      numberOfLines={1}
                    >
                      {event.location}
                    </Text>

                  </View>

                </View>

              </View>

            </View>

          </Animated.View>

          {/* BOTTOM */}

          <View style={styles.featuredBottom}>

            {/* DOTS */}

            <View style={styles.eventDots}>

              {schoolEvents.map((_, index) => (

                <TouchableOpacity
                  key={index}
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

          <TouchableOpacity activeOpacity={0.7}>

            <Text style={styles.viewAllText}>
              Calendar
            </Text>

          </TouchableOpacity>

        </View>

        <View style={styles.upcomingContainer}>

          {upcomingEvents.map((item, index) => (

            <TouchableOpacity
              key={index}
              activeOpacity={0.85}
              style={styles.upcomingRow}
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

      </ScrollView>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <BottomNavigation
        activeTab="home"
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