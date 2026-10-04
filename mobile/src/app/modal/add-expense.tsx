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
        >
          {/* Main Hero Amount Card */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>AMOUNT</Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.amountCurrency, { color: colors.textSecondary }]}>{currency}</Text>
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

          {/* Description & Real-Time AI Suggestion */}
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
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              {aiConfidence !== null && (
                <View
                  style={[
                    styles.aiSuggestedPill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Sparkles size={11} color={colors.text} />
                  <Text style={[styles.aiSuggestedPillText, { color: colors.text }]}>
                    AI: {category} ({Math.round(aiConfidence * 100)}%)
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <FileText size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. Coffee, Taxi, Grocery, Electricity..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
              {isAiPredicting && <ActivityIndicator size="small" color={colors.text} />}
            </View>
          </View>

          {/* Merchant (Optional) */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              MERCHANT / STORE (OPTIONAL)
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Building2 size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. Starbucks, Amazon, Shell..."
                placeholderTextColor={colors.textMuted}
                value={merchant}
                onChangeText={setMerchant}
              />
            </View>
          </View>

          {/* Category Chips */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      setAiConfidence(null);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
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

          {/* Date Picker & Quick Days */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DATE</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                onPress={() => setDateOffset(0)}
                style={[
                  styles.quickDateBtn,
                  {
                    backgroundColor: isToday ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                    borderColor: isToday ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickDateText,
                    { color: isToday ? colors.primaryText : colors.text },
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDateOffset(1)}
                style={[
                  styles.quickDateBtn,
                  {
                    backgroundColor: isYesterday ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                    borderColor: isYesterday ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickDateText,
                    { color: isYesterday ? colors.primaryText : colors.text },
                  ]}
                >
                  Yesterday
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsDatePickerVisible(true)}
                style={[
                  styles.customDateBtn,
                  {
                    backgroundColor: !isToday && !isYesterday ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                    borderColor: !isToday && !isYesterday ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <Calendar size={13} color={!isToday && !isYesterday ? colors.primaryText : colors.text} style={{ marginRight: 4 }} />
                <Text
                  style={[
                    styles.quickDateText,
                    { color: !isToday && !isYesterday ? colors.primaryText : colors.text },
                  ]}
                >
                  {date}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Method */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PAYMENT METHOD</Text>
            <View style={styles.paymentMethodRow}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() => setPaymentMethod(method.id)}
                    style={[
                      styles.methodChip,
                      {
                        backgroundColor: isSelected ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        {
                          color: isSelected ? colors.primaryText : colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA Submit */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSaveExpense}
            disabled={isSaving}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.submitBtnText, { color: colors.primaryText }]}>
                {isEditing ? 'Update Expense' : 'Save Expense'}
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
    paddingVertical: 12,
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
    gap: 10,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountCurrency: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    padding: 0,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiSuggestedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiSuggestedPillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodChipText: {
    fontSize: 12,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
