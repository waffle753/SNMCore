import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

export default function SplashScreen() {
  // =====================================================
  // ANIMATION VALUES
  // =====================================================

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(12)).current;

  const decorationOpacity = useRef(new Animated.Value(0)).current;

  const goldLineWidth = useRef(new Animated.Value(0)).current;

  // =====================================================
  // SPLASH ANIMATION
  // =====================================================

  useEffect(() => {
    Animated.sequence([
      // -----------------------------------------------
      // Background decorations
      // -----------------------------------------------

      Animated.timing(decorationOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // -----------------------------------------------
      // Logo animation
      // -----------------------------------------------

      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 75,
          useNativeDriver: true,
        }),
      ]),

      // -----------------------------------------------
      // Text animation
      // -----------------------------------------------

      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // -----------------------------------------------
      // Gold line animation
      // -----------------------------------------------

      Animated.timing(goldLineWidth, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // -----------------------------------------------
    // Navigate to login
    // -----------------------------------------------

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2800);

    return () => clearTimeout(timer);
  }, [
    logoOpacity,
    logoScale,
    textOpacity,
    textTranslate,
    decorationOpacity,
    goldLineWidth,
  ]);

  // =====================================================
  // GOLD LINE WIDTH
  // =====================================================

  const animatedLineWidth = goldLineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  // =====================================================
  // SCREEN
  // =====================================================

  return (
    <View style={styles.container}>

      {/* ================================================= */}
      {/* BACKGROUND GRID */}
      {/* ================================================= */}

      <View
        pointerEvents="none"
        style={styles.grid}
      >

        {/* Vertical grid lines */}
        {Array.from({ length: 40 }).map((_, index) => (
          <View
            key={`vertical-${index}`}
            style={[
              styles.gridVertical,
              {
                left: index * 20,
              },
            ]}
          />
        ))}

        {/* Horizontal grid lines */}
        {Array.from({ length: 60 }).map((_, index) => (
          <View
            key={`horizontal-${index}`}
            style={[
              styles.gridHorizontal,
              {
                top: index * 20,
              },
            ]}
          />
        ))}

      </View>

      {/* ================================================= */}
      {/* RED BACKGROUND ACCENTS */}
      {/* ================================================= */}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.redCircleTop,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.redCircleRight,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      {/* ================================================= */}
      {/* GOLD CIRCLES */}
      {/* ================================================= */}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldCircleTop,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldCircleBottom,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      {/* ================================================= */}
      {/* GOLD DECORATIVE LINES */}
      {/* ================================================= */}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldLineTop,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldLineBottom,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      {/* ================================================= */}
      {/* GOLD DOTS */}
      {/* ================================================= */}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldDotOne,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldDotTwo,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldDotThree,
          {
            opacity: decorationOpacity,
          },
        ]}
      />

      {/* ================================================= */}
      {/* CENTERED BRAND GROUP */}
      {/* ================================================= */}

      <View style={styles.content}>

        <Animated.View
          style={[
            styles.brandGroup,
            {
              opacity: logoOpacity,
            },
          ]}
        >

          {/* ============================================= */}
          {/* SCHOOL LOGO */}
          {/* ============================================= */}

          <Animated.View
            style={{
              transform: [
                {
                  scale: logoScale,
                },
              ],
            }}
          >

            <View style={styles.logoGlow}>

              <Image
                source={require('../../assets/images/school-logo.png')}
                style={styles.schoolLogo}
                resizeMode="contain"
                accessibilityLabel="Sto. Nino Mactan College logo"
              />

            </View>

          </Animated.View>

          {/* ============================================= */}
          {/* BRAND TEXT */}
          {/* ============================================= */}

          <Animated.View
            style={[
              styles.brandContainer,
              {
                opacity: textOpacity,
                transform: [
                  {
                    translateY: textTranslate,
                  },
                ],
              },
            ]}
          >

            {/* SNMCore */}
            <Text style={styles.brandName}>
              SNMCore
            </Text>

            {/* Tagline */}
            <Text style={styles.phrase}>
              Every Date. Every Event. One Place.
            </Text>

            {/* Gold Accent */}
            <Animated.View
              style={[
                styles.brandLine,
                {
                  width: animatedLineWidth,
                },
              ]}
            />

          </Animated.View>

        </Animated.View>

      </View>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: textOpacity,
          },
        ]}
      >

        <Text style={styles.footerTitle}>
          STO. NIÑO MACTAN COLLEGE
        </Text>

        <Text style={styles.footerSubtitle}>
          SCHOOL CALENDAR SYSTEM
        </Text>

      </Animated.View>

    </View>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({

  // =====================================================
  // MAIN SCREEN
  // =====================================================

  container: {
    flex: 1,

    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',
  },

  // =====================================================
  // BACKGROUND GRID
  // =====================================================

  grid: {
    ...StyleSheet.absoluteFill,

    opacity: 0.32,
  },

  gridVertical: {
    position: 'absolute',

    top: 0,
    bottom: 0,

    width: 1,

    backgroundColor: '#E9E9E9',
  },

  gridHorizontal: {
    position: 'absolute',

    left: 0,
    right: 0,

    height: 1,

    backgroundColor: '#E9E9E9',
  },

  // =====================================================
  // RED TOP CIRCLE
  // =====================================================

  redCircleTop: {
    position: 'absolute',

    width: 330,
    height: 330,

    borderRadius: 165,

    backgroundColor: '#7A0C0C',

    top: -230,
    right: -175,

    opacity: 0.055,
  },

  // =====================================================
  // RED RIGHT CIRCLE
  // =====================================================

  redCircleRight: {
    position: 'absolute',

    width: 200,
    height: 200,

    borderRadius: 100,

    backgroundColor: '#7A0C0C',

    right: -130,
    bottom: 75,

    opacity: 0.035,
  },

  // =====================================================
  // GOLD TOP CIRCLE
  // =====================================================

  goldCircleTop: {
    position: 'absolute',

    width: 245,
    height: 245,

    borderRadius: 122.5,

    borderWidth: 2,

    borderColor: '#D4AF37',

    top: -155,
    right: -122,

    opacity: 0.35,
  },

  // =====================================================
  // GOLD BOTTOM CIRCLE
  // =====================================================

  goldCircleBottom: {
    position: 'absolute',

    width: 310,
    height: 310,

    borderRadius: 155,

    borderWidth: 2,

    borderColor: '#D4AF37',

    bottom: -195,
    left: -155,

    opacity: 0.28,
  },

  // =====================================================
  // GOLD TOP LINE
  // =====================================================

  goldLineTop: {
    position: 'absolute',

    width: 175,
    height: 2,

    backgroundColor: '#D4AF37',

    top: 175,
    right: -45,

    transform: [
      {
        rotate: '-35deg',
      },
    ],

    opacity: 0.5,
  },

  // =====================================================
  // GOLD BOTTOM LINE
  // =====================================================

  goldLineBottom: {
    position: 'absolute',

    width: 155,
    height: 2,

    backgroundColor: '#D4AF37',

    bottom: 180,
    left: -48,

    transform: [
      {
        rotate: '-35deg',
      },
    ],

    opacity: 0.4,
  },

  // =====================================================
  // GOLD DOT ONE
  // =====================================================

  goldDotOne: {
    position: 'absolute',

    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor: '#D4AF37',

    top: 135,
    left: 42,

    opacity: 0.7,
  },

  // =====================================================
  // GOLD DOT TWO
  // =====================================================

  goldDotTwo: {
    position: 'absolute',

    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: '#7A0C0C',

    top: 230,
    right: 42,

    opacity: 0.5,
  },

  // =====================================================
  // GOLD DOT THREE
  // =====================================================

  goldDotThree: {
    position: 'absolute',

    width: 8,
    height: 8,

    borderRadius: 4,

    backgroundColor: '#D4AF37',

    bottom: 145,
    right: 48,

    opacity: 0.6,
  },

  // =====================================================
  // FULL CENTER AREA
  // =====================================================

  content: {
    position: 'absolute',

    top: 0,
    bottom: 0,

    left: 0,
    right: 0,

    alignItems: 'center',
    justifyContent: 'center',
  },

  // =====================================================
  // COMPLETE LOGO + TEXT GROUP
  // =====================================================

  brandGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // =====================================================
  // LOGO WRAPPER
  // =====================================================

  logoGlow: {
    width: 145,
    height: 145,

    borderRadius: 72.5,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#FFFDF5',

    borderWidth: 2,

    borderColor: '#D4AF37',

    shadowColor: '#7A0C0C',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.14,

    shadowRadius: 14,

    elevation: 7,
  },

  // =====================================================
  // SCHOOL LOGO
  // =====================================================

  schoolLogo: {
    width: 130,
    height: 130,

    borderRadius: 65,
  },

  // =====================================================
  // BRAND TEXT CONTAINER
  // =====================================================

  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    // Balanced gap between logo and SNMCore
    marginTop: 10,
  },

  // =====================================================
  // SNMCORE
  // =====================================================

  brandName: {
    color: '#7A0C0C',

    fontSize: 34,

    fontWeight: '900',

    textAlign: 'center',

    letterSpacing: 0.3,
  },

  // =====================================================
  // TAGLINE
  // =====================================================

  phrase: { 
    marginTop: 5,

    color: '#6C6258',

    fontSize: 12,

    fontWeight: '600',

    textAlign: 'center',

    letterSpacing: 0.1,
  },

  // =====================================================
  // GOLD ACCENT
  // =====================================================

  brandLine: {
    height: 2,

    marginTop: 12,

    borderRadius: 2,

    backgroundColor: '#D4AF37',
  },

  // =====================================================
  // FOOTER
  // =====================================================

  footer: {
    position: 'absolute',

    bottom: 24,

    alignItems: 'center',
  },

  footerTitle: {
    color: '#7A0C0C',

    fontSize: 7.5,

    fontWeight: '800',

    letterSpacing: 1.1,

    textAlign: 'center',
  },

  footerSubtitle: {
    marginTop: 3,

    color: '#9B8B72',

    fontSize: 7,

    fontWeight: '500',

    letterSpacing: 0.7,

    textAlign: 'center',
  },

});