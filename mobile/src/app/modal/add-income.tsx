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
import { ALL_INCOME_SOURCES, INCOME_SOURCES, PAYMENT_METHODS } from '../../constants/categories';
import { IncomeSource, PaymentMethod } from '../../types';
import DatePickerModal from '../../components/common/date-picker-modal';
import {
  Plus,
  X,
  Check,
  Building2,
  Calendar,
  FileText,
  Trash2,
  ArrowDownLeft,
  ChevronDown,
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
    } catch (err) {
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
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconCircle,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                },
              ]}
            >
              <ArrowDownLeft size={20} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isEditing ? 'Edit Income' : 'Add Money / Income'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Credit to available balance & budget
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
            <Text style={[styles.amountLabel, { color: '#10B981' }]}>AMOUNT RECEIVED (+)</Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.amountCurrency, { color: '#10B981' }]}>{currency}</Text>
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

          {/* Income Source Selector */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>INCOME SOURCE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sourcePickerRow}
            >
              {ALL_INCOME_SOURCES.map((src) => {
                const meta = INCOME_SOURCES[src];
                const isSelected = source === src;
                return (
                  <TouchableOpacity
                    key={src}
                    onPress={() => setSource(src)}
                    style={[
                      styles.sourceChip,
                      {
                        backgroundColor: isSelected ? meta.bgColor : colors.inputBg,
                        borderColor: isSelected ? meta.color : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceChipText,
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

          {/* Description / Note */}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DESCRIPTION / NOTE</Text>
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
                placeholder="e.g. October monthly salary, Web design project..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Payer / Client / Company */}
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
              PAYER / CLIENT / COMPANY (OPTIONAL)
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
                placeholder="e.g. Google LLC, Acme Corp, Upwork..."
                placeholderTextColor={colors.textMuted}
                value={payer}
                onChangeText={setPayer}
              />
            </View>
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CREDIT DATE</Text>
            <View style={styles.dateSelectorRow}>
              <TouchableOpacity
                onPress={() => setDateOffset(0)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isToday ? 'rgba(16, 185, 129, 0.15)' : colors.inputBg,
                    borderColor: isToday ? '#10B981' : colors.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color: isToday ? '#10B981' : colors.textSecondary,
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
                    backgroundColor: isYesterday ? 'rgba(16, 185, 129, 0.15)' : colors.inputBg,
                    borderColor: isYesterday ? '#10B981' : colors.inputBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color: isYesterday ? '#10B981' : colors.textSecondary,
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
                <Calendar size={14} color="#10B981" style={{ marginRight: 6 }} />
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DEPOSIT ACCOUNT / METHOD</Text>
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
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : colors.inputBg,
                        borderColor: isSelected ? '#10B981' : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pmChipText,
                        {
                          color: isSelected ? '#10B981' : colors.textSecondary,
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
            onPress={handleSaveIncome}
            disabled={isSaving}
            style={[styles.saveButton, { backgroundColor: '#10B981' }]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
                  {isEditing ? 'Update Income' : 'Add to Available Balance'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete Option if editing */}
          {isEditing && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDelete}
              style={[
                styles.deleteButton,
                {
                  backgroundColor: colors.dangerBg,
                  borderColor: colors.dangerBorder,
                },
              ]}
            >
              <Trash2 size={18} color={colors.danger} />
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete Income</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          selectedDate={date}
          onSelectDate={(newDate) => setDate(newDate)}
          title="Income Date"
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sourcePickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  sourceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceChipText: {
    fontSize: 12,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
