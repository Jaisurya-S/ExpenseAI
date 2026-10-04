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
  Plus,
  X,
  Check,
  Sparkles,
  Building2,
  Calendar,
  FileText,
  ChevronDown,
} from '../../components/ui/icons';

export default function AddExpenseModal() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const { addExpense, updateExpense, draftExpense, setDraftExpense } = useExpenseStore();

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

  // Real-Time Intelligent Categorization (only for new expenses)
  useEffect(() => {
    if (isEditing) return;
    if (!description && !merchant) {
      setAiConfidence(null);
      return;
    }

    // 1. Instant local categorization
    const local = categorizeLocally(description, merchant);
    if (local.confidence > 0.8) {
      setCategory(local.category);
      setAiConfidence(local.confidence);
    }

    // 2. Debounced AI fallback if local confidence is low
    const timer = setTimeout(async () => {
      if (description.length > 3) {
        setIsAiPredicting(true);
        const res = await autoCategorize(description, merchant);
        setCategory(res.category);
        setAiConfidence(res.confidence);
        setIsAiPredicting(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [description, merchant, isEditing]);

  const handleClose = () => {
    setDraftExpense(null);
    router.back();
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
        window.alert('Please add a short note or description.');
      } else {
        Alert.alert('Missing Description', 'Please add a short note or description.');
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
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save expense. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save expense. Please try again.');
      }
    } finally {
      setIsSaving(false);
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
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconCircle,
                {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Plus size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isEditing ? 'Edit Expense' : 'Add Expense'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {isEditing ? 'Update transaction details' : 'With Real-Time Auto-Categorization'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Hero Amount Input */}
          <View
            style={[
              styles.amountCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>AMOUNT</Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.amountCurrency, { color: colors.primary }]}>{currency}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          </View>

          {/* Description & Real-Time AI Suggestion Banner */}
          <View
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              {aiConfidence !== null && (
                <View
                  style={[
                    styles.aiSuggestedPill,
                    {
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                >
                  <Sparkles size={11} color={colors.primary} />
                  <Text style={[styles.aiSuggestedPillText, { color: colors.primary }]}>
                    AI Suggested: {category} ({Math.round(aiConfidence * 100)}%)
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <FileText size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. Starbucks cappuccino, Uber ride, Grocery..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
              {isAiPredicting && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
          </View>

          {/* Merchant / Store */}
          <View
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              MERCHANT / VENDOR (OPTIONAL)
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Building2 size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. Amazon, Shell Fuel, Walmart"
                placeholderTextColor={colors.textMuted}
                value={merchant}
                onChangeText={setMerchant}
              />
            </View>
          </View>

          {/* Category Selector */}
          <View
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EXPENSE CATEGORY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPickerRow}
            >
              {ALL_CATEGORIES.map((cat) => {
                const meta = CATEGORIES[cat];
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isSelected ? meta.bgColor : colors.inputBg,
                        borderColor: isSelected ? meta.color : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        {
                          color: isSelected ? meta.color : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Date Selector */}
          <View
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TRANSACTION DATE</Text>
            <View style={styles.dateSelectorRow}>
              <TouchableOpacity
                onPress={() => setDateOffset(0)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isToday ? colors.primaryLight : colors.inputBg,
                    borderColor: isToday ? colors.primary : colors.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color: isToday ? colors.primary : colors.textSecondary,
                      fontWeight: isToday ? '700' : '500',
                    },
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDateOffset(1)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isYesterday ? colors.primaryLight : colors.inputBg,
                    borderColor: isYesterday ? colors.primary : colors.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color: isYesterday ? colors.primary : colors.textSecondary,
                      fontWeight: isYesterday ? '700' : '500',
                    },
                  ]}
                >
                  Yesterday
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsDatePickerVisible(true)}
                style={[
                  styles.dateDisplayBadge,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <Calendar size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.dateDisplayText, { color: colors.text }]}>{date}</Text>
                <ChevronDown size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Method Selector */}
          <View
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PAYMENT METHOD</Text>
            <View style={styles.paymentMethodRow}>
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <TouchableOpacity
                    key={pm.id}
                    onPress={() => setPaymentMethod(pm.id)}
                    style={[
                      styles.pmChip,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                        borderColor: isSelected ? colors.primary : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pmChipText,
                        {
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSaveExpense}
            disabled={isSaving}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <>
                <Check size={20} color={colors.primaryText} />
                <Text style={[styles.saveButtonText, { color: colors.primaryText }]}>
                  {isEditing ? 'Update Expense' : 'Save Expense'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          selectedDate={date}
          onSelectDate={(newDate) => setDate(newDate)}
          title="Transaction Date"
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
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  amountCard: {
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCurrency: {
    fontSize: 34,
    fontWeight: '900',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '900',
    minWidth: 100,
    textAlign: 'center',
  },
  fieldCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  aiSuggestedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  aiSuggestedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateChipText: {
    fontSize: 12,
  },
  dateDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateDisplayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pmChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pmChipText: {
    fontSize: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
