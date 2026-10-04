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
import { Mail, Lock, Zap, Sun, Moon } from '../../components/ui/icons';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, loginDemoUser, isLoading } = useAuthStore();
  const { colors, isDark, setThemeMode } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatAuthError = (err: any) => {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in window was closed.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Invalid credentials or user does not exist. Tap "Create Account" below.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email format.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection error.';
    }
    return err.message || 'Authentication failed.';
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
      setErrorMsg(formatAuthError(err));
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg('');
    try {
      await loginDemoUser();
      router.replace('/(tabs)');
    } catch (err: any) {
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
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              {isDark ? (
                <>
                  <Sun size={14} color={colors.text} />
                  <Text style={[styles.themeToggleText, { color: colors.text }]}>Light</Text>
                </>
              ) : (
                <>
                  <Moon size={14} color={colors.text} />
                  <Text style={[styles.themeToggleText, { color: colors.text }]}>Dark</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Brand Logo & Header */}
          <View style={styles.brandSection}>
            <View
              style={[
                styles.logoCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              Welcome back
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
              Sign in to manage your budget and finances
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

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Mail size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Lock size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Sign In Primary CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isLoading}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
            </View>

            {/* Google & Demo Buttons */}
            <View style={styles.oauthRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleDemoLogin}
                disabled={isLoading}
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Zap size={13} color={colors.text} style={{ marginRight: 4 }} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Guest Demo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don&apos;t have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.footerLink, { color: colors.text }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 14,
  },
  logoImage: {
    width: 140,
    height: 38,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  errorBox: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    height: '100%',
  },
  primaryBtn: {
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    marginHorizontal: 10,
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
