import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Easing,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const isCompact = windowHeight < 720;

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(35)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(20)).current;

  const buttonScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.sequence([
      // Login card
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(cardTranslate, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Form
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(formTranslate, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>

      <View pointerEvents="none" style={styles.backgroundDecor}>
        <View style={styles.redBackdrop} />
        <View style={styles.goldSweep} />
        <View style={styles.whiteSweep} />
        <View style={styles.goldRing} />
        <View style={styles.redAccent} />
        <View style={styles.goldAccent} />
      </View>

      {/* ================================================= */}
      {/* LOGIN CONTENT */}
      {/* ================================================= */}

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        <View style={[styles.content, isCompact && styles.contentCompact]}>

          <Animated.View
            style={[
              styles.card,
              isCompact && styles.cardCompact,
              {
                opacity: cardOpacity,
                transform: [
                  {
                    translateY: cardTranslate,
                  },
                ],
              },
            ]}
          >

            {/* =========================================== */}
            {/* TITLE */}
            {/* =========================================== */}

            <Image
              source={require('../../assets/images/school-logo.png')}
              style={[styles.schoolLogo, isCompact && styles.schoolLogoCompact]}
              resizeMode="contain"
              accessibilityLabel="Sto. Nino Mactan College logo"
            />

            <Animated.View
              style={{
                opacity: formOpacity,
                transform: [
                  {
                    translateY: formTranslate,
                  },
                ],
              }}
            >
              <Text style={styles.welcome}>
                Welcome Back!
              </Text>

              <Text style={styles.description}>
                Sign in to access your SNMCore account.
              </Text>
            </Animated.View>

            {/* =========================================== */}
            {/* FORM */}
            {/* =========================================== */}

            <Animated.View
              style={[
                styles.form,
                {
                  opacity: formOpacity,
                  transform: [
                    {
                      translateY: formTranslate,
                    },
                  ],
                },
              ]}
            >

              {/* Student ID */}

              <Text style={styles.label}>
                Student ID
              </Text>

              <View style={styles.inputContainer}>

                <Ionicons
                  name="id-card-outline"
                  size={21}
                  color="#8F1D2C"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your student ID"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

              </View>

              {/* Password */}

              <Text style={styles.label}>
                Password
              </Text>

              <View style={styles.inputContainer}>

                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color="#8F1D2C"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    setShowPassword(!showPassword)
                  }
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-outline'
                        : 'eye-off-outline'
                    }
                    size={21}
                    color="#8F1D2C"
                  />
                </TouchableOpacity>

              </View>

              {/* Forgot Password */}

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.forgotContainer}
              >
                <Text style={styles.forgot}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {/* Login Button */}

              <Animated.View
                style={{
                  transform: [
                    {
                      scale: buttonScale,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.loginButton}
                >
                  <Text style={styles.loginText}>
                    Login
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

            </Animated.View>

            {/* =========================================== */}
            {/* SECURITY */}
            {/* =========================================== */}

            <View style={styles.security}>

              <View style={styles.securityIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color="#C8A951"
                />
              </View>

              <Text style={styles.securityText}>
                Your data is protected with secure encryption
              </Text>

            </View>

          </Animated.View>

        </View>

      </KeyboardAvoidingView>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <Text style={styles.footer}>
        © 2026 SNMCore • School Management System
      </Text>

    </View>
  );
}

/* ======================================================= */
/* STYLES */
/* ======================================================= */

const styles = StyleSheet.create({

  /* ===================================================== */
  /* CONTAINER */
  /* ===================================================== */

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  backgroundDecor: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },

  redBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#8F1D2C',
  },

  goldSweep: {
    position: 'absolute',
    top: '31%',
    bottom: -70,
    left: -width * 0.18,
    width: width * 1.36,
    borderRadius: width * 0.7,
    backgroundColor: '#C8A951',
    opacity: 0.98,
  },

  whiteSweep: {
    position: 'absolute',
    top: '33%',
    bottom: -82,
    left: -width * 0.18,
    width: width * 1.36,
    borderRadius: width * 0.7,
    backgroundColor: '#FFFFFF',
  },

  redAccent: {
    position: 'absolute',
    bottom: -38,
    right: -45,
    width: 170,
    height: 100,
    borderRadius: 85,
    backgroundColor: '#8F1D2C',
    opacity: 0.08,
  },

  goldRing: {
    position: 'absolute',
    top: -92,
    right: -74,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: '#E7CF83',
    opacity: 0.32,
  },

  goldAccent: {
    position: 'absolute',
    bottom: 26,
    left: -22,
    width: 78,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A951',
    opacity: 0.68,
  },

  /* ===================================================== */
  /* RED HEADER */
  /* ===================================================== */

  redHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,

    backgroundColor: '#8F1D2C',

    zIndex: 1,
  },

  redHeaderCompact: {
    height: 220,
  },

  /* ===================================================== */
  /* GOLD DECORATIONS */
  /* ===================================================== */

  goldRingTop: {
    position: 'absolute',

    width: 260,
    height: 260,

    borderRadius: 130,

    borderWidth: 2,
    borderColor: '#C8A951',

    top: -170,
    right: -120,

    opacity: 0.35,
  },

  goldDotTop: {
    position: 'absolute',

    width: 8,
    height: 8,

    borderRadius: 4,

    backgroundColor: '#C8A951',

    top: 120,
    right: 35,

    opacity: 0.8,
  },

  /* ===================================================== */
  /* BRAND */
  /* ===================================================== */

  brandContainer: {
    alignItems: 'center',
    paddingTop: 42,
  },

  logo: {
    width: 58,
    height: 58,

    borderRadius: 29,

    backgroundColor: '#C8A951',

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 3,
    borderColor: '#F8F1DF',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,

    elevation: 8,
  },

  logoText: {
    color: '#5B111B',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  brandName: {
    marginTop: 9,

    color: '#FFFFFF',

    fontSize: 25,
    fontWeight: '900',

    letterSpacing: 0.5,
  },

  brandSubtitle: {
    marginTop: 3,

    color: '#F4E6B8',

    fontSize: 9,
    fontWeight: '700',

    letterSpacing: 1.5,
  },

  /* ===================================================== */
  /* WAVE TRANSITION */
  /* ===================================================== */

  waveContainer: {
    position: 'absolute',

    top: 150,
    left: 0,
    right: 0,

    height: 150,

    zIndex: 2,

    overflow: 'hidden',
  },

  waveContainerCompact: {
    top: 130,
  },

  /* Gold wave behind white */

  goldWave: {
    position: 'absolute',

    width: width * 1.5,
    height: 145,

    left: -width * 0.25,
    top: 18,

    backgroundColor: '#C8A951',

    borderRadius: width,
  },

  /* Main white wave */

  whiteWave: {
    position: 'absolute',

    width: width * 1.5,
    height: 145,

    left: -width * 0.25,
    top: 30,

    backgroundColor: '#FFFFFF',

    borderRadius: width,
  },

  /* ===================================================== */
  /* KEYBOARD */
  /* ===================================================== */

  keyboard: {
    flex: 1,

    zIndex: 5,
  },

  /* ===================================================== */
  /* SCROLL */
  /* ===================================================== */

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  contentCompact: {
    paddingVertical: 10,
  },

  /* ===================================================== */
  /* LOGIN CARD */
  /* ===================================================== */

  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',

    borderRadius: 24,

    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 23,

    shadowColor: '#5B111B',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.2,
    shadowRadius: 24,

    elevation: 12,

    borderWidth: 1,

    borderColor: '#E5D3A4',
    overflow: 'hidden',
  },

  cardCompact: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },

  schoolLogo: {
    width: 86,
    height: 86,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
  },

  schoolLogoCompact: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginBottom: 8,
  },

  /* ===================================================== */
  /* WELCOME */
  /* ===================================================== */

  welcome: {
    fontSize: 27,

    fontWeight: '900',

    textAlign: 'center',

    color: '#8F1D2C',

    letterSpacing: -0.5,
  },

  description: {
    marginTop: 6,

    textAlign: 'center',

    fontSize: 13,

    color: '#777',

    lineHeight: 19,
  },

  /* ===================================================== */
  /* FORM */
  /* ===================================================== */

  form: {
    marginTop: 14,
  },

  label: {
    marginTop: 13,
    marginBottom: 7,

    fontSize: 13,

    fontWeight: '700',

    color: '#5B111B',
  },

  /* ===================================================== */
  /* INPUT */
  /* ===================================================== */

  inputContainer: {
    height: 52,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: '#E3D5B2',

    backgroundColor: '#FFFEFA',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,

    height: '100%',

    fontSize: 14,

    color: '#333',
  },

  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 5,
  },

  /* ===================================================== */
  /* FORGOT PASSWORD */
  /* ===================================================== */

  forgotContainer: {
    alignItems: 'flex-end',

    marginTop: 13,
  },

  forgot: {
    color: '#A32235',

    fontSize: 12,

    fontWeight: '700',
  },

  /* ===================================================== */
  /* LOGIN BUTTON */
  /* ===================================================== */

  loginButton: {
    height: 53,

    borderRadius: 15,

    backgroundColor: '#8F1D2C',

    marginTop: 23,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 10,

    shadowColor: '#8F1D2C',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.25,

    shadowRadius: 9,

    elevation: 6,
  },

  loginText: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '900',

    letterSpacing: 0.3,
  },

  /* ===================================================== */
  /* SECURITY */
  /* ===================================================== */

  security: {
    marginTop: 16,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,
  },

  securityIcon: {
    width: 22,
    height: 22,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#F8F1DF',
  },

  securityText: {
    fontSize: 10.5,

    color: '#777',
  },

  /* ===================================================== */
  /* FOOTER */
  /* ===================================================== */

  footer: {
    position: 'absolute',

    bottom: 17,

    left: 0,
    right: 0,

    textAlign: 'center',

    fontSize: 9.5,

    color: '#8A6F3D',

    opacity: 0.8,

    zIndex: 10,
  },

});