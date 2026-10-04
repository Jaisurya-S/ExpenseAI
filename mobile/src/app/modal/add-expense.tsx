import React, { useState, useEffect } from 'react';
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
import { autoCategorize, categorizeLocally } from '../../services/aiService';
import { ALL_CATEGORIES, CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { ExpenseCategory, PaymentMethod } from '../../types';
import DatePickerModal from '../../components/common/date-picker-modal';
import {
  X,
  Sparkles,
  Building2,
  Calendar,
  FileText,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  GraduationCap,
  TrendingUp,
  MoreHorizontal,
  Smartphone,
  CreditCard,
  Banknote,
  Wallet,
  Trash2,
} from '../../components/ui/icons';

const CategoryIconMap: Record<string, React.FC<{ size?: number; color?: string; style?: any }>> = {
  Food: Utensils,
  Grocery: ShoppingCart,
  Transport: Car,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Entertainment: Film,
  Health: HeartPulse,
  Education: GraduationCap,
  Investment: TrendingUp,
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

const AMOUNT_PRESETS = [50, 100, 200, 500, 1000, 2000];

export default function AddExpenseModal() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const { addExpense, updateExpense, deleteExpense, draftExpense, setDraftExpense } = useExpenseStore();

  const isEditing = Boolean(draftExpense?.id);

  const [amount, setAmount] = useState(draftExpense?.amount ? draftExpense.amount.toString() : '');
  const [description, setDescription] = useState(draftExpense?.description || '');
  const [merchant, setMerchant] = useState(draftExpense?.merchant || '');
  const [category, setCategory] = useState<ExpenseCategory>(draftExpense?.category || 'Food');
  const [date, setDate] = useState(draftExpense?.date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(draftExpense?.paymentMethod || 'UPI');
  const [isAiPredicting, setIsAiPredicting] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(draftExpense?.aiConfidence || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    if (!description && !merchant) {
      setAiConfidence(null);
      return;
    }

    const local = categorizeLocally(description, merchant);
    if (local.confidence > 0.8) {
      setCategory(local.category);
      setAiConfidence(local.confidence);
    }

    const timer = setTimeout(async () => {
      if (description.length > 2) {
        setIsAiPredicting(true);
        const res = await autoCategorize(description, merchant);
        setCategory(res.category);
        setAiConfidence(res.confidence);
        setIsAiPredicting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [description, merchant, isEditing]);

  const handleClose = () => {
    setDraftExpense(null);
    router.back();
  };

  const handleAddPreset = (val: number) => {
    const currentNum = parseFloat(amount) || 0;
    setAmount((currentNum + val).toString());
  };

  const handleSaveExpense = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid expense amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      }
      return;
    }

    if (!description.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please add a short description.');
      } else {
        Alert.alert('Missing Description', 'Please add a short description.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const userId = user?.uid || profile.uid || 'demo-user';

      if (isEditing && draftExpense?.id) {
        await updateExpense(draftExpense.id, {
          amount: amountNum,
          category,
          description: description.trim(),
          merchant: merchant.trim() || undefined,
          date,
          paymentMethod,
        });
      } else {
        await addExpense({
          userId,
          amount: amountNum,
          category,
          description: description.trim(),
          merchant: merchant.trim() || undefined,
          date,
          paymentMethod,
          inputMethod: 'manual',
          aiConfidence: aiConfidence || 0.9,
          aiSuggestedCategory: category,
          isAiGenerated: aiConfidence !== null && aiConfidence >= 0.8,
        });
      }

      setDraftExpense(null);
      router.back();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to save expense. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save expense. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draftExpense?.id) return;

    const performDelete = async () => {
      await deleteExpense(draftExpense.id!);
      setDraftExpense(null);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this expense?')) {
        await performDelete();
      }
    } else {
      Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Hero Centered Amount Display */}
          <View
            style={[
              styles.heroAmountCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
              SPENDING AMOUNT
            </Text>

            <View style={styles.amountHeroRow}>
              <Text style={[styles.amountHeroCurrency, { color: colors.textSecondary }]}>
                {currency}
              </Text>
              <TextInput
                style={[
                  styles.amountHeroInput,
                  { color: colors.text },
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                ]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {/* Quick Increment Preset Chips */}
            <View style={styles.presetsContainer}>
              {AMOUNT_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.7}
                  onPress={() => handleAddPreset(p)}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.presetPillText, { color: colors.textSecondary }]}>
                    +{currency}{p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. Unified Details Form Container */}
          <View
            style={[
              styles.unifiedFormCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            {/* Description Row */}
            <View style={styles.formRow}>
              <View style={styles.formRowHeader}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  DESCRIPTION
                </Text>
                {aiConfidence !== null && (
                  <View
                    style={[
                      styles.aiBadge,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Sparkles size={11} color={colors.text} />
                    <Text style={[styles.aiBadgeText, { color: colors.text }]}>
                      AI auto-detected: {category}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.inputFieldBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <FileText size={16} color={colors.textMuted} style={styles.inputLeftIcon} />
                <TextInput
                  style={[
                    styles.textInputField,
                    { color: colors.text },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  placeholder="What was this expense for? (e.g. Chai, Groceries, Uber)"
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                />
                {isAiPredicting && <ActivityIndicator size="small" color={colors.text} />}
              </View>
            </View>

            {/* Merchant / Vendor Row */}
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                MERCHANT / STORE (OPTIONAL)
              </Text>
              <View
                style={[
                  styles.inputFieldBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Building2 size={16} color={colors.textMuted} style={styles.inputLeftIcon} />
                <TextInput
                  style={[
                    styles.textInputField,
                    { color: colors.text },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  placeholder="e.g. Starbucks, Amazon, Shell, Walmart"
                  placeholderTextColor={colors.textMuted}
                  value={merchant}
                  onChangeText={setMerchant}
                />
              </View>
            </View>

            {/* Category Grid */}
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                CATEGORY
              </Text>
              <View style={styles.categoryGrid}>
                {ALL_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  const IconComp = CategoryIconMap[cat] || MoreHorizontal;
                  return (
                    <TouchableOpacity
                      key={cat}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCategory(cat);
                        setAiConfidence(null);
                      }}
                      style={[
                        styles.categoryTile,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <IconComp
                        size={14}
                        color={isSelected ? colors.primaryText : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryTileText,
                          {
                            color: isSelected ? colors.primaryText : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat}
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

            {/* Payment Method Selector */}
            <View style={styles.formRowLast}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                PAYMENT METHOD
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
              flexDirection: isEditing ? 'row' : 'column',
              gap: 10,
            },
          ]}
        >
          {isEditing && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
                },
              ]}
              accessibilityLabel="Delete Expense"
            >
              <Trash2 size={18} color={colors.danger} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSaveExpense}
            disabled={isSaving}
            style={[
              styles.saveExpenseBtn,
              {
                backgroundColor: colors.primary,
                flex: isEditing ? 1 : undefined,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.saveExpenseBtnText, { color: colors.primaryText }]}>
                {isEditing ? 'Update Expense' : `Save Expense • ${currency}${amount || '0'}`}
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
  formRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryTileText: {
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveExpenseBtn: {
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveExpenseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
