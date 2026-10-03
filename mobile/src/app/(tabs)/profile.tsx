import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAppTheme } from '../../hooks/use-theme';
import {
  User,
  DollarSign,
  Bell,
  Shield,
  FileSpreadsheet,
  LogOut,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Smartphone,
} from 'lucide-react-native';

const CURRENCIES = ['₹', '$', '€', '£', '¥'];
const THEME_OPTIONS: { id: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Smartphone },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, logout, setCurrency, toggleNotifications, toggleBiometrics, themeMode, setThemeMode } =
    useAuthStore();
  const { expenses } = useExpenseStore();
  const { colors, isDark, systemScheme } = useAppTheme();

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('You do not have any expenses to export.');
      } else {
        Alert.alert('No Data', 'You do not have any expenses to export.');
      }
      return;
    }
    const headers = 'Date,Category,Description,Merchant,Amount,PaymentMethod,IsAiTagged\n';
    const rows = expenses
      .map(
        (e) =>
          `"${e.date}","${e.category}","${e.description || ''}","${e.merchant || ''}",${e.amount},"${e.paymentMethod || 'UPI'}",${e.isAiGenerated ? 'Yes' : 'No'}`
      )
      .join('\n');
    const csvContent = headers + rows;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `xpenseai_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert(
        'Export Successful',
        `Exported ${expenses.length} expenses to CSV format ready for download/share.`
      );
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        await logout();
        router.replace('/(auth)/login');
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>User Profile & Settings</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Manage appearance, preferences & security
          </Text>
        </View>

        {/* Profile User Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {(profile.displayName || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {profile.displayName || user?.displayName || user?.email?.split('@')[0] || 'User'}
              </Text>
            </View>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {profile.email || user?.email || 'No email associated'}
            </Text>
            <Text style={[styles.profileMeta, { color: colors.textMuted }]}>
              User ID: {profile.uid ? `${profile.uid.slice(0, 10)}...` : (user?.uid ? `${user.uid.slice(0, 10)}...` : 'Guest')}
            </Text>
          </View>
        </View>

        {/* Theme Preference */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>APPEARANCE / THEME</Text>
            <View
              style={{
                backgroundColor: colors.primaryLight,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={[styles.currentThemeBadge, { color: colors.primary }]}>
                {isDark ? '🌙 Dark Active' : '☀️ Light Active'}
              </Text>
            </View>
          </View>
          <Text style={[styles.themeExplainer, { color: colors.textMuted }]}>
            Select your preferred color scheme. &quot;System&quot; automatically inherits your device OS settings.
          </Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const isSelected = themeMode === opt.id;
              const IconComp = opt.icon;
              const label =
                opt.id === 'system'
                  ? `System (${systemScheme === 'dark' ? 'Dark' : 'Light'})`
                  : opt.label;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => setThemeMode(opt.id)}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                      borderColor: isSelected ? colors.primary : colors.inputBorder,
                    },
                  ]}
                >
                  <IconComp
                    size={16}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {themeMode === 'system' && (
            <View
              style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: colors.inputBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>
                💡 <Text style={{ fontWeight: '700', color: colors.text }}>System Theme</Text> is currently using{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>{systemScheme.toUpperCase()} MODE</Text> because your operating system / browser is set to {systemScheme}. To test or use Light mode, tap the &quot;Light&quot; button above.
              </Text>
            </View>
          )}
        </View>

        {/* Currency Preference */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CURRENCY SYMBOL</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((curr) => {
              const isSelected = profile.currency === curr;
              return (
                <TouchableOpacity
                  key={curr}
                  onPress={() => setCurrency(curr)}
                  style={[
                    styles.currencyBtn,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                      borderColor: isSelected ? colors.primary : colors.inputBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                      },
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preferences Section */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            PREFERENCES & SECURITY
          </Text>

          {/* FCM Push Notifications */}
          <View style={[styles.preferenceRow, { borderBottomColor: colors.inputBorder }]}>
            <View style={styles.prefLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Bell size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.prefTitle, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.prefSub, { color: colors.textSecondary }]}>
                  Budget alerts & daily AI summaries
                </Text>
              </View>
            </View>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Biometrics */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Shield size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.prefTitle, { color: colors.text }]}>Biometric Lock</Text>
                <Text style={[styles.prefSub, { color: colors.textSecondary }]}>
                  Require FaceID / Fingerprint on open
                </Text>
              </View>
            </View>
            <Switch
              value={profile.biometricsEnabled}
              onValueChange={toggleBiometrics}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data & Export */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>DATA MANAGEMENT</Text>
          <TouchableOpacity onPress={handleExportCSV} style={styles.actionRow}>
            <View style={styles.prefLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <FileSpreadsheet size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.prefTitle, { color: colors.text }]}>Export to CSV</Text>
                <Text style={[styles.prefSub, { color: colors.textSecondary }]}>
                  Download spreadsheet of all {expenses.length} records
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.dangerBg,
              borderColor: colors.dangerBorder,
            },
          ]}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.logoutBtnText, { color: colors.danger }]}>Sign Out of Account</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.appFooter}>
          <View
            style={[
              styles.footerLogoContainer,
              {
                backgroundColor: isDark ? '#FFFFFF' : 'transparent',
                borderRadius: 14,
                paddingHorizontal: isDark ? 12 : 0,
                paddingVertical: isDark ? 4 : 0,
                marginBottom: 8,
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.footerLogoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>
            ExpenseAi v1.0.0 • Production Ready
          </Text>
          <Text style={[styles.footerSub, { color: colors.textMuted }]}>
            Secured by Firebase & OpenRouter AI
          </Text>
        </View>
      </ScrollView>
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  proText: {
    fontSize: 9,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  currentThemeBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeExplainer: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 12,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  themeOptionText: {
    fontSize: 13,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  currencyBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '800',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefSub: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  appFooter: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoImage: {
    width: 140,
    height: 44,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
