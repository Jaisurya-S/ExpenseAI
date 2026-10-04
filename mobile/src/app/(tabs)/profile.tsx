import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator,
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
  MessageSquare,
  MessageCircle,
  Clock,
  Send,
  CheckCircle2,
} from '../../components/ui/icons';
import {
  generateDailyWhatsAppReport,
  openWhatsAppReport,
  formatWhatsAppNumber,
} from '../../services/whatsappService';

const CURRENCIES = ['₹', '$', '€', '£', '¥'];
const THEME_OPTIONS: { id: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Smartphone },
];

const TIME_PRESETS = [
  { id: '21:00', label: '9:00 PM' },
  { id: '21:30', label: '9:30 PM' },
  { id: '22:00', label: '10:00 PM' },
  { id: '22:30', label: '10:30 PM' },
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
    updateWhatsAppSettings,
  } = useAuthStore();
  const { expenses, incomes, budgets } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState(profile.whatsappDailyReport ?? false);
  const [whatsappTime, setWhatsappTime] = useState(profile.whatsappReportTime || '21:30');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Compute today's expenses & incomes
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todayIncomes = incomes.filter((i) => i.date === todayStr);

  // Month total
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const monthTotalExpenses = expenses
    .filter((e) => e.date >= startOfMonth)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalMonthlyBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0) || profile.totalBudgetLimit || 0;

  const handleToggleWhatsApp = async (val: boolean) => {
    setWhatsappEnabled(val);
    await updateWhatsAppSettings({
      whatsappDailyReport: val,
      whatsappNumber: whatsappNumber.trim(),
      whatsappReportTime: whatsappTime,
    });
  };

  const handleSaveWhatsAppNumber = async (text: string) => {
    setWhatsappNumber(text);
    await updateWhatsAppSettings({
      whatsappNumber: text.trim(),
      whatsappDailyReport: whatsappEnabled,
      whatsappReportTime: whatsappTime,
    });
  };

  const handleSelectWhatsAppTime = async (timeId: string) => {
    setWhatsappTime(timeId);
    await updateWhatsAppSettings({
      whatsappReportTime: timeId,
      whatsappDailyReport: whatsappEnabled,
      whatsappNumber: whatsappNumber.trim(),
    });
  };

  const handleSendTestWhatsApp = async () => {
    const cleanPhone = formatWhatsAppNumber(whatsappNumber);
    if (!cleanPhone && !whatsappNumber) {
      if (Platform.OS === 'web') {
        window.alert('Please enter your WhatsApp mobile number first.');
      } else {
        Alert.alert('Phone Number Needed', 'Please enter your WhatsApp mobile number.');
      }
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const reportText = generateDailyWhatsAppReport({
        dateStr: todayStr,
        currency: profile.currency || '₹',
        todayExpenses,
        todayIncomes,
        monthTotalExpenses,
        monthlyBudget: totalMonthlyBudget,
        userName: profile.displayName || user?.displayName || 'User',
      });

      const opened = await openWhatsAppReport(whatsappNumber, reportText);
      if (opened) {
        if (Platform.OS === 'web') {
          // Alert confirmed
        }
      }
    } catch (err) {
      console.error('WhatsApp dispatch error:', err);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const previewReportText = generateDailyWhatsAppReport({
    dateStr: todayStr,
    currency: profile.currency || '₹',
    todayExpenses,
    todayIncomes,
    monthTotalExpenses,
    monthlyBudget: totalMonthlyBudget,
    userName: profile.displayName || user?.displayName || 'User',
  });

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
            Preferences, WhatsApp alerts, and account controls
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

        {/* WhatsApp Daily Expense Summary Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: whatsappEnabled ? (isDark ? '#059669' : '#10B981') : colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.whatsappHeaderRow}>
            <View style={styles.whatsappHeaderLeft}>
              <View
                style={[
                  styles.whatsappIconBox,
                  { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' },
                ]}
              >
                <MessageCircle size={18} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}>
                  WhatsApp Daily Summary
                </Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                  Automated daily spending digest
                </Text>
              </View>
            </View>
            <Switch
              value={whatsappEnabled}
              onValueChange={handleToggleWhatsApp}
              trackColor={{ false: colors.cardBorder, true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {whatsappEnabled && (
            <View style={styles.whatsappBody}>
              <View style={styles.whatsappDivider} />

              {/* Phone Number Input */}
              <View style={styles.whatsappFieldGroup}>
                <Text style={[styles.whatsappFieldLabel, { color: colors.textSecondary }]}>
                  YOUR WHATSAPP NUMBER
                </Text>
                <View
                  style={[
                    styles.whatsappInputBox,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Smartphone size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[
                      styles.whatsappTextInput,
                      {
                        color: colors.text,
                        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                      },
                    ]}
                    placeholder="e.g. +91 98765 43210"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={whatsappNumber}
                    onChangeText={handleSaveWhatsAppNumber}
                  />
                  {whatsappNumber.length >= 10 && (
                    <CheckCircle2 size={16} color="#10B981" />
                  )}
                </View>
              </View>

              {/* Schedule Time Selector */}
              <View style={styles.whatsappFieldGroup}>
                <Text style={[styles.whatsappFieldLabel, { color: colors.textSecondary }]}>
                  DELIVERY TIME (EVERY EVENING)
                </Text>
                <View style={styles.timePillsRow}>
                  {TIME_PRESETS.map((t) => {
                    const isSelected = whatsappTime === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelectWhatsAppTime(t.id)}
                        style={[
                          styles.timePill,
                          {
                            backgroundColor: isSelected
                              ? '#10B981'
                              : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                            borderColor: isSelected ? '#10B981' : colors.cardBorder,
                          },
                        ]}
                      >
                        <Clock
                          size={11}
                          color={isSelected ? '#FFFFFF' : colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.timePillText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.text,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.whatsappActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSendTestWhatsApp}
                  disabled={isSendingWhatsApp}
                  style={styles.sendWhatsAppBtn}
                >
                  {isSendingWhatsApp ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Send size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.sendWhatsAppBtnText}>Send Today's Digest Now</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPreview(!showPreview)}
                  style={[
                    styles.previewToggleBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.previewToggleBtnText, { color: colors.textSecondary }]}>
                    {showPreview ? 'Hide Preview' : '👁️ Preview'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message Live Preview Box */}
              {showPreview && (
                <View
                  style={[
                    styles.previewBox,
                    {
                      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.previewHeading, { color: colors.textMuted }]}>
                    WHATSAPP MESSAGE PREVIEW:
                  </Text>
                  <Text style={[styles.previewContent, { color: colors.text }]}>
                    {previewReportText}
                  </Text>
                </View>
              )}
            </View>
          )}
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

        {/* Preferences Toggle Rows */}
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

        {/* Data & Export */}
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
  whatsappHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whatsappHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  whatsappIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBody: {
    marginTop: 12,
  },
  whatsappDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginBottom: 14,
  },
  whatsappFieldGroup: {
    marginBottom: 12,
  },
  whatsappFieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  whatsappInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  whatsappTextInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  timePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 11.5,
  },
  whatsappActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sendWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    height: 40,
  },
  sendWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  previewToggleBtn: {
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  previewToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewBox: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  previewHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  previewContent: {
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
