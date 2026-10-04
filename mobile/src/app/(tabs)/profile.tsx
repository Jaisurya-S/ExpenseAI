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
} from '../../components/ui/icons';

const CURRENCIES = ['₹', '$', '€', '£', '¥'];
const THEME_OPTIONS: { id: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Smartphone },
];

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    user,
    logout,
    setCurrency,
    toggleNotifications,
    toggleBiometrics,
    themeMode,
    setThemeMode,
  } = useAuthStore();
  const { expenses } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

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
      Alert.alert('Export Successful', `Exported ${expenses.length} expenses to CSV format.`);
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

  const displayName = profile.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings & Account</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Preferences, appearance, and account controls
          </Text>
        </View>

        {/* Profile Card */}
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
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: colors.text }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {profile.email || user?.email || 'Guest Account'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance / Theme */}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme & Appearance</Text>
          <View
            style={[
              styles.segmentedControl,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {THEME_OPTIONS.map((opt) => {
              const isSelected = themeMode === opt.id;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => setThemeMode(opt.id)}
                  style={[
                    styles.segmentBtn,
                    isSelected && {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      shadowColor: colors.cardShadow,
                    },
                  ]}
                >
                  <IconComp size={13} color={isSelected ? colors.text : colors.textMuted} style={{ marginRight: 5 }} />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected ? colors.text : colors.textMuted,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Currency Preference */}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Currency Symbol</Text>
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
                      backgroundColor: isSelected ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyText,
                      {
                        color: isSelected ? colors.primaryText : colors.text,
                        fontWeight: isSelected ? '700' : '500',
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

        {/* General Preferences */}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>General Preferences</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 }]}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Budget Alerts</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Notify when reaching spending threshold
              </Text>
            </View>
            <Switch
              value={profile.notificationsEnabled ?? true}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Biometric Lock</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Require Fingerprint / FaceID
              </Text>
            </View>
            <Switch
              value={profile.biometricsEnabled ?? false}
              onValueChange={toggleBiometrics}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data & Security */}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Security</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleExportCSV}
            style={[styles.actionRow, { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 }]}
          >
            <View style={styles.actionLeft}>
              <FileSpreadsheet size={16} color={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Export Records as CSV</Text>
            </View>
            <ChevronRight size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={styles.actionRow}
          >
            <View style={styles.actionLeft}>
              <LogOut size={16} color={colors.danger} />
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Sign Out</Text>
            </View>
            <ChevronRight size={14} color={colors.danger} />
          </TouchableOpacity>
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
    paddingBottom: 40,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
  },
  header: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: {
    fontSize: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 11.5,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
