import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { getAuthUser } from '../data/authSession';

type BottomNavigationProps = {
  activeTab?: 'home' | 'calendar' | 'admin' | 'news' | 'profile';
  onHomePress?: () => void;
  onCalendarPress?: () => void;
  onAdminPress?: () => void;
  onNewsPress?: () => void;
  onProfilePress?: () => void;
};

export default function BottomNavigation({
  activeTab = 'home',
  onHomePress,
  onCalendarPress,
  onAdminPress,
  onNewsPress,
  onProfilePress,
}: BottomNavigationProps) {
  const isHome = activeTab === 'home';
  const isCalendar = activeTab === 'calendar';
  const isActiveAdmin = activeTab === 'admin';
  const isNews = activeTab === 'news';
  const isProfile = activeTab === 'profile';
  const isAdmin = getAuthUser()?.role === 'admin';

  return (
    <View style={styles.bottomNavigation}>
      <TouchableOpacity activeOpacity={0.8} style={styles.navItem} onPress={onHomePress}>
        <View style={[styles.navIcon, isHome && styles.navIconActive]}>
          <Ionicons
            name="home"
            size={20}
            color={isHome ? colors.WHITE : colors.TEXT_GRAY}
          />
        </View>
        <Text style={isHome ? styles.navTextActive : styles.navText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.navItem}
        onPress={onCalendarPress}
      >
        <View style={[styles.navIcon, isCalendar && styles.navIconActive]}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={isCalendar ? colors.WHITE : colors.TEXT_GRAY}
          />
        </View>
        <Text style={isCalendar ? styles.navTextActive : styles.navText}>Calendar</Text>
      </TouchableOpacity>

      {isAdmin && (
        <TouchableOpacity activeOpacity={0.8} style={[styles.navItem, styles.adminNavItem]} onPress={onAdminPress}>
          <View style={[styles.navIcon, styles.adminNavIcon, isActiveAdmin && styles.navIconActive]}>
            <Ionicons name="settings-outline" size={23} color={isActiveAdmin ? colors.WHITE : colors.TEXT_GRAY} />
          </View>
          <Text style={isActiveAdmin ? styles.navTextActive : styles.navText}>Admin</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity activeOpacity={0.8} style={styles.navItem} onPress={onNewsPress}>
        <View style={[styles.navIcon, isNews && styles.navIconActive]}>
          <Ionicons
            name="megaphone-outline"
            size={20}
            color={isNews ? colors.WHITE : colors.TEXT_GRAY}
          />
        </View>
        <Text style={isNews ? styles.navTextActive : styles.navText}>News</Text>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.8} style={styles.navItem} onPress={onProfilePress}>
        <View style={[styles.navIcon, isProfile && styles.navIconActive]}>
          <Ionicons
            name="person-outline"
            size={20}
            color={isProfile ? colors.WHITE : colors.TEXT_GRAY}
          />
        </View>
        <Text style={isProfile ? styles.navTextActive : styles.navText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: colors.RED,
    shadowOffset: { width: 0, height: -3 },
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
  adminNavItem: {
    width: 78,
  },
  adminNavIcon: {
    width: 46,
    height: 40,
    borderRadius: 15,
  },
  navIcon: {
    width: 39,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: colors.RED,
  },
  navText: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: colors.TEXT_GRAY,
  },
  navTextActive: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '900',
    color: colors.RED,
  },
});
