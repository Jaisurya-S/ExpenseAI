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
import { Sparkles, Mail, Lock, User, UserPlus, ArrowLeft, Sun, Moon } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { registerWithEmail, loginWithGoogle, isLoading } = useAuthStore();
  const { colors, isDark, setThemeMode } = useAppTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatRegisterError = (err: any) => {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email is already registered. Please go back to Sign In.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address format.';
    }
    return err.message || 'Registration failed.';
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg('');
    try {
      await registerWithEmail(email, password, name);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Firebase Register Error:', err);
      setErrorMsg(formatRegisterError(err));
    }
  };

  const handleGoogleSignup = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Firebase Google Register Error:', err);
      setErrorMsg(formatRegisterError(err));
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
          {/* Top Bar Navigation & Theme Toggle */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={18} color={colors.textSecondary} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back to Sign In</Text>
            </TouchableOpacity>

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
                  <Sun size={14} color="#FEE440" />
                  <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>Light</Text>
                </>
              ) : (
                <>
                  <Moon size={14} color="#0D9488" />
                  <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>Dark</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.brandSection}>
            <View
              style={[
                styles.logoCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                  borderWidth: 1,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 24,
                  shadowColor: colors.cardShadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 2,
                },
              ]}
            >
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Enterprise financial intelligence & AI budget engine
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

            {/* Google Signup Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGoogleSignup}
              disabled={isLoading}
              style={[
                styles.googleBtn,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
                  borderColor: isDark ? '#E2E8F0' : '#CBD5E1',
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleGLogo}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR WITH EMAIL</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
            </View>

            {/* Name Field */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <User size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Alex Morgan"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
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

            {/* Confirm Password Field */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CONFIRM PASSWORD</Text>
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
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={isLoading}
              style={[styles.registerBtn, { backgroundColor: colors.primary }]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <>
                  <UserPlus size={18} color={colors.primaryText} />
                  <Text style={[styles.registerBtnText, { color: colors.primaryText }]}>
                    Create Account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Sign in Footer */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>Sign In</Text>
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 24,
    alignItems: 'center',
  },
  logoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 200,
    height: 60,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
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
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleGLogo: {
    color: '#4285F4',
    fontSize: 17,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#1E293B',
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
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  registerBtnText: {
    fontSize: 15,
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
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
