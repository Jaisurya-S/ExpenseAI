import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Sparkles, Mail, Lock, LogIn, Zap, Sun, Moon } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, loginDemoUser, isLoading } = useAuthStore();
  const { colors, isDark, themeMode, setThemeMode } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatAuthError = (err: any) => {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Account not found or incorrect password. If you haven\'t created an account in this project, click "Sign Up" below.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address format.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network error. Please check your internet connection.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Access temporarily disabled due to many failed attempts. Try again later.';
    }
    return err.message || 'Login failed. Please check credentials.';
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    try {
      await loginWithEmail(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      setErrorMsg(formatAuthError(err));
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Firebase Google Error:', err);
      setErrorMsg(formatAuthError(err));
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg('');
    try {
      await loginDemoUser();
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Demo Login Error:', err);
      setErrorMsg(formatAuthError(err));
    }
  };

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Theme Toggle */}
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleTheme}
              style={[
                styles.themeToggleBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              {isDark ? (
                <>
                  <Sun size={15} color="#FEE440" />
                  <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>Light</Text>
                </>
              ) : (
                <>
                  <Moon size={15} color="#0D9488" />
                  <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>Dark</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Brand Header */}
          <View style={styles.brandSection}>
            <View
              style={[
                styles.logoCard,
                {
                  backgroundColor: isDark ? '#FFFFFF' : 'transparent',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'transparent',
                  paddingHorizontal: isDark ? 16 : 0,
                  paddingVertical: isDark ? 10 : 0,
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOpacity: isDark ? 0.25 : 0,
                  shadowRadius: 10,
                },
              ]}
            >
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Intelligent Expense Tracking & Auto-Categorization
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.cardHeader, { color: colors.text }]}>Sign In</Text>

            {errorMsg !== '' && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.dangerBg,
                    borderColor: colors.dangerBorder,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
              </View>
            )}

            {/* Google Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              style={[
                styles.googleBtn,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
                  borderColor: isDark ? '#E5E7EB' : '#CBD5E1',
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
            >
              <Text style={styles.googleGLogo}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR WITH EMAIL</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
            </View>

            {/* Email Field */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Mail size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="alex.morgan@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Field */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Lock size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="••••••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <>
                  <LogIn size={18} color={colors.primaryText} />
                  <Text style={[styles.loginBtnText, { color: colors.primaryText }]}>
                    Sign In with Email
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Instant Demo Access Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDemoLogin}
              disabled={isLoading}
              style={[
                styles.demoBtn,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Zap size={18} color={colors.primary} />
              <Text style={[styles.demoBtnText, { color: colors.primary }]}>
                Instant Demo Access (1-Tap)
              </Text>
            </TouchableOpacity>

            {/* Register Footer */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.registerLink, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 220,
    height: 70,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleGLogo: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    gap: 8,
  },
  demoBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
