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
} from '../../components/ui/icons';

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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Income' : 'Add Income'}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>INCOME AMOUNT</Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.amountCurrency, { color: colors.success }]}>+{currency}</Text>
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

          {/* Description */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DESCRIPTION / NOTE</Text>
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
                placeholder="e.g. Monthly Salary, Freelance project, Dividend..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Payer / Client */}
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
              PAYER / EMPLOYER / SOURCE (OPTIONAL)
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
                placeholder="e.g. Google, Client, Bank, Self..."
                placeholderTextColor={colors.textMuted}
                value={payer}
                onChangeText={setPayer}
              />
            </View>
          </View>

          {/* Income Source Chips */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>INCOME STREAM</Text>
            <View style={styles.sourceGrid}>
              {ALL_INCOME_SOURCES.map((src) => {
                const isSelected = source === src;
                return (
                  <TouchableOpacity
                    key={src}
                    onPress={() => setSource(src)}
                    style={[
                      styles.sourceChip,
                      {
                        backgroundColor: isSelected ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceChipText,
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

          {/* Date Picker */}
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
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.submitBtnText, { color: colors.primaryText }]}>
                {isEditing ? 'Update Income' : 'Save Income'}
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
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sourceChipText: {
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flex: 1,
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
