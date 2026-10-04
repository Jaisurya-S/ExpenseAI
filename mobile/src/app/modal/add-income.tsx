import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ALL_INCOME_SOURCES, PAYMENT_METHODS } from '../../constants/categories';
import { IncomeSource, PaymentMethod } from '../../types';
import DatePickerModal from '../../components/common/date-picker-modal';
import {
  X,
  Building2,
  Calendar,
  FileText,
  Trash2,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  MoreHorizontal,
  Smartphone,
  CreditCard,
  Banknote,
  Wallet,
} from '../../components/ui/icons';

const SourceIconMap: Record<string, React.FC<{ size?: number; color?: string; style?: any }>> = {
  Salary: Briefcase,
  Freelance: Laptop,
  Business: Building2,
  Investment: TrendingUp,
  Rental: Building2,
  Gift: Gift,
  Other: MoreHorizontal,
};

const PaymentIconMap: Record<string, React.FC<{ size?: number; color?: string; style?: any }>> = {
  UPI: Smartphone,
  Card: CreditCard,
  Cash: Banknote,
  NetBanking: Building2,
  Wallet: Wallet,
  Other: MoreHorizontal,
};

const AMOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000];

export default function AddIncomeModal() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const { addIncome, updateIncome, deleteIncome, draftIncome, setDraftIncome } = useExpenseStore();

  const isEditing = Boolean(draftIncome?.id);

  const [amount, setAmount] = useState(draftIncome?.amount ? draftIncome.amount.toString() : '');
  const [description, setDescription] = useState(draftIncome?.description || '');
  const [payer, setPayer] = useState(draftIncome?.payer || '');
  const [source, setSource] = useState<IncomeSource>(draftIncome?.source || 'Salary');
  const [date, setDate] = useState(draftIncome?.date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(draftIncome?.paymentMethod || 'UPI');
  const [isSaving, setIsSaving] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const handleClose = () => {
    setDraftIncome(null);
    router.back();
  };

  const handleSaveIncome = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid income amount.');
      }
      return;
    }

    const trimmedDesc = description.trim() || `${source} Income`;

    setIsSaving(true);
    try {
      const userId = user?.uid || profile.uid || 'demo-user';

      if (isEditing && draftIncome?.id) {
        await updateIncome(draftIncome.id, {
          amount: amountNum,
          source,
          description: trimmedDesc,
          payer: payer.trim() || undefined,
          date,
          paymentMethod,
        });
      } else {
        await addIncome({
          userId,
          amount: amountNum,
          source,
          description: trimmedDesc,
          payer: payer.trim() || undefined,
          date,
          paymentMethod,
          isOpeningBalance: source === 'Opening Balance',
        });
      }

      setDraftIncome(null);
      router.back();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to save income. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save income record.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draftIncome?.id) return;

    const performDelete = async () => {
      await deleteIncome(draftIncome.id!);
      setDraftIncome(null);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this income record?')) {
        await performDelete();
      }
    } else {
      Alert.alert('Delete Income', 'Are you sure you want to delete this income record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const setDateOffset = (offsetDays: number) => {
    const d = new Date(Date.now() - 86400000 * offsetDays);
    setDate(d.toISOString().split('T')[0]);
  };

  const isToday = date === new Date().toISOString().split('T')[0];
  const isYesterday = date === new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Income' : 'Add Income'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Hero Amount Card */}
          <View
            style={[
              styles.heroAmountCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>INCOME AMOUNT</Text>
            <View style={styles.amountHeroRow}>
              <Text style={[styles.amountHeroCurrency, { color: colors.success }]}>+{currency}</Text>
              <TextInput
                style={[
                  styles.amountHeroInput,
                  {
                    color: colors.text,
                    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                autoFocus={!isEditing}
              />
            </View>

            {/* Quick Amount Preset Chips */}
            <View style={styles.presetsContainer}>
              {AMOUNT_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  activeOpacity={0.7}
                  onPress={() => {
                    const currentVal = parseFloat(amount) || 0;
                    setAmount((currentVal + preset).toString());
                  }}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.presetPillText, { color: colors.textSecondary }]}>
                    +{currency}{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Unified Form Container */}
          <View
            style={[
              styles.unifiedFormCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {/* Description Row */}
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                DESCRIPTION / NOTE
              </Text>
              <View
                style={[
                  styles.inputFieldBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <FileText size={15} color={colors.textMuted} style={styles.inputLeftIcon} />
                <TextInput
                  style={[
                    styles.textInputField,
                    {
                      color: colors.text,
                      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                    },
                  ]}
                  placeholder="e.g. Monthly Salary, Freelance project, Dividend..."
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* Payer / Client Row */}
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                PAYER / SOURCE (OPTIONAL)
              </Text>
              <View
                style={[
                  styles.inputFieldBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Building2 size={15} color={colors.textMuted} style={styles.inputLeftIcon} />
                <TextInput
                  style={[
                    styles.textInputField,
                    {
                      color: colors.text,
                      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                    },
                  ]}
                  placeholder="e.g. Google, Client, Bank, Company..."
                  placeholderTextColor={colors.textMuted}
                  value={payer}
                  onChangeText={setPayer}
                />
              </View>
            </View>

            {/* Income Stream Category Chips */}
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                INCOME STREAM
              </Text>
              <View style={styles.sourceGrid}>
                {ALL_INCOME_SOURCES.map((src) => {
                  const isSelected = source === src;
                  const IconComp = SourceIconMap[src] || MoreHorizontal;
                  return (
                    <TouchableOpacity
                      key={src}
                      activeOpacity={0.7}
                      onPress={() => setSource(src)}
                      style={[
                        styles.sourceTile,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <IconComp
                        size={13}
                        color={isSelected ? colors.primaryText : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.sourceTileText,
                          {
                            color: isSelected ? colors.primaryText : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {src}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Selector Row */}
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                TRANSACTION DATE
              </Text>
              <View style={styles.dateSelectorRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setDateOffset(0)}
                  style={[
                    styles.dateOptionPill,
                    {
                      backgroundColor: isToday
                        ? colors.primary
                        : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: isToday ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      {
                        color: isToday ? colors.primaryText : colors.text,
                        fontWeight: isToday ? '700' : '500',
                      },
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setDateOffset(1)}
                  style={[
                    styles.dateOptionPill,
                    {
                      backgroundColor: isYesterday
                        ? colors.primary
                        : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: isYesterday ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      {
                        color: isYesterday ? colors.primaryText : colors.text,
                        fontWeight: isYesterday ? '700' : '500',
                      },
                    ]}
                  >
                    Yesterday
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsDatePickerVisible(true)}
                  style={[
                    styles.dateCustomPill,
                    {
                      backgroundColor: !isToday && !isYesterday
                        ? colors.primary
                        : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: !isToday && !isYesterday ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Calendar
                    size={13}
                    color={!isToday && !isYesterday ? colors.primaryText : colors.text}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.dateOptionText,
                      {
                        color: !isToday && !isYesterday ? colors.primaryText : colors.text,
                        fontWeight: !isToday && !isYesterday ? '700' : '500',
                      },
                    ]}
                  >
                    {date}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment / Receipt Method */}
            <View style={styles.formRowLast}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                RECEIVED VIA
              </Text>
              <View style={styles.paymentMethodGrid}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.id;
                  const IconComp = PaymentIconMap[method.id] || MoreHorizontal;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      activeOpacity={0.7}
                      onPress={() => setPaymentMethod(method.id)}
                      style={[
                        styles.paymentPill,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <IconComp
                        size={13}
                        color={isSelected ? colors.primaryText : colors.textSecondary}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.paymentPillText,
                          {
                            color: isSelected ? colors.primaryText : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {method.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Bottom Save Action Bar */}
        <View
          style={[
            styles.bottomActionContainer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
            },
          ]}
        >
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: colors.dangerBorder,
                },
              ]}
            >
              <Trash2 size={16} color={colors.danger} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSaveIncome}
            disabled={isSaving}
            style={[styles.saveIncomeBtn, { backgroundColor: colors.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.saveIncomeBtnText, { color: colors.primaryText }]}>
                {isEditing ? 'Update Income' : `Save Income • +${currency}${amount || '0'}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={isDatePickerVisible}
          selectedDate={date}
          onSelectDate={(selected: string) => {
            setDate(selected);
            setIsDatePickerVisible(false);
          }}
          onClose={() => setIsDatePickerVisible(false)}
        />
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    paddingBottom: 30,
  },
  heroAmountCard: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  amountHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  amountHeroCurrency: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 4,
  },
  amountHeroInput: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    minWidth: 100,
    textAlign: 'center',
    padding: 0,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  unifiedFormCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  formRow: {
    marginBottom: 16,
  },
  formRowLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  textInputField: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sourceTileText: {
    fontSize: 12,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dateOptionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCustomPill: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateOptionText: {
    fontSize: 12,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentPillText: {
    fontSize: 12,
  },
  bottomActionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIncomeBtn: {
    flex: 1,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIncomeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
