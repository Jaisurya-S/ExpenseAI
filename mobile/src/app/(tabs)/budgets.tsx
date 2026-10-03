import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAppTheme } from '../../hooks/use-theme';
import { BudgetProgressBar } from '../../components/budgets/BudgetProgressBar';
import { ALL_CATEGORIES, CATEGORIES } from '../../constants/categories';
import { ExpenseCategory, Budget } from '../../types';
import { Plus, Wallet, AlertCircle, X, Sparkles } from 'lucide-react-native';

export default function BudgetsScreen() {
  const { profile, user } = useAuthStore();
  const currency = profile.currency || '₹';
  const { expenses, budgets, upsertBudget, deleteBudget } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('Food');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonthKey));

  // Category spent calculations
  const categorySpentMap = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {};
    currentMonthExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });
    return map;
  }, [currentMonthExpenses]);

  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRemaining = Math.max(0, totalBudgeted - totalSpent);

  const overBudgetCategories = budgets.filter((b) => (categorySpentMap[b.category] || 0) > b.amount);

  const openAddModal = (existing?: Budget) => {
    if (existing) {
      setEditingBudgetId(existing.id);
      setSelectedCategory(existing.category);
      setBudgetAmount(existing.amount.toString());
    } else {
      setEditingBudgetId(null);
      // Pick first unbudgeted category or Food
      const budgetedCats = budgets.map((b) => b.category);
      const unbudgeted = ALL_CATEGORIES.find((c) => !budgetedCats.includes(c));
      setSelectedCategory(unbudgeted || 'Food');
      setBudgetAmount('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(budgetAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid budget amount greater than 0.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount greater than 0.');
      }
      return;
    }

    const userId = user?.uid || profile.uid || 'demo-user';
    await upsertBudget(userId, selectedCategory, amountNum);
    setModalVisible(false);
  };

  const handleDeleteCurrentBudget = async () => {
    if (editingBudgetId) {
      if (Platform.OS === 'web') {
        if (window.confirm('Delete this category budget limit?')) {
          await deleteBudget(editingBudgetId);
          setModalVisible(false);
        }
      } else {
        Alert.alert('Delete Budget', 'Are you sure you want to remove this category budget limit?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteBudget(editingBudgetId);
              setModalVisible(false);
            },
          },
        ]);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Budget Limits</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Category-level spending thresholds
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => openAddModal()}
            style={[styles.addBudgetBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color={colors.primaryText} />
            <Text style={[styles.addBudgetBtnText, { color: colors.primaryText }]}>Set Budget</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Over Budget Alert Notice if any */}
          {overBudgetCategories.length > 0 && (
            <View
              style={[
                styles.alertBanner,
                {
                  backgroundColor: colors.dangerBg,
                  borderColor: colors.dangerBorder,
                },
              ]}
            >
              <AlertCircle size={20} color={colors.danger} />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: colors.danger }]}>Budget Limit Exceeded!</Text>
                <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                  You have surpassed monthly limits on {overBudgetCategories.map((b) => b.category).join(', ')}.
                </Text>
              </View>
            </View>
          )}

          {/* Master Budget Tracker Card */}
          <View
            style={[
              styles.masterCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.masterTop}>
              <View>
                <Text style={[styles.masterSubtitle, { color: colors.textSecondary }]}>
                  OVERALL MONTHLY BUDGET
                </Text>
                <Text style={[styles.masterAmount, { color: colors.text }]}>
                  {currency}
                  {totalBudgeted.toLocaleString()}
                </Text>
              </View>
              <View
                style={[
                  styles.masterWalletIcon,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Wallet size={24} color={colors.primary} />
              </View>
            </View>

            <View style={styles.masterProgressRow}>
              <View style={[styles.masterProgressTrack, { backgroundColor: colors.inputBg }]}>
                <View
                  style={[
                    styles.masterProgressFill,
                    {
                      width: `${totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0}%`,
                      backgroundColor: totalSpent > totalBudgeted ? colors.danger : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.masterFooter}>
              <Text style={[styles.footerSpent, { color: colors.textSecondary }]}>
                Spent: {currency}
                {totalSpent.toLocaleString()}
              </Text>
              <Text style={[styles.footerRemaining, { color: colors.primary }]}>
                Remaining: {currency}
                {totalRemaining.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Category Budgets List */}
          <View style={styles.listSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                CATEGORY ALLOCATIONS
              </Text>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>
                {budgets.length} active
              </Text>
            </View>

            {budgets.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Category Budgets Set</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Set monthly budget caps to receive AI alerts when approaching limits.
                </Text>
                <TouchableOpacity
                  onPress={() => openAddModal()}
                  style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.emptyAddBtnText, { color: colors.primaryText }]}>
                    Set First Budget
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              budgets.map((b) => (
                <BudgetProgressBar
                  key={b.id}
                  budget={b}
                  spent={categorySpentMap[b.category] || 0}
                  onEdit={() => openAddModal(b)}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Set/Edit Budget Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingBudgetId ? 'Edit Budget' : 'Set Category Budget'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPickerRow}
              >
                {ALL_CATEGORIES.map((cat) => {
                  const meta = CATEGORIES[cat];
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.catOption,
                        {
                          backgroundColor: isSelected ? meta.bgColor : colors.inputBg,
                          borderColor: isSelected ? meta.color : colors.inputBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
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

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                MONTHLY TARGET AMOUNT ({currency})
              </Text>
              <View
                style={[
                  styles.amountInputContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currency}</Text>
                <TextInput
                  style={[styles.amountTextInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 5000"
                  placeholderTextColor={colors.textMuted}
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>
                  {editingBudgetId ? 'Update Budget Limit' : 'Save Budget Limit'}
                </Text>
              </TouchableOpacity>

              {editingBudgetId && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDeleteCurrentBudget}
                  style={[
                    styles.deleteModalBtn,
                    {
                      backgroundColor: colors.dangerBg,
                      borderColor: colors.dangerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.deleteModalBtnText, { color: colors.danger }]}>
                    Delete Budget
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
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
  addBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addBudgetBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  alertContent: {
    marginLeft: 10,
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  masterCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  masterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  masterSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  masterAmount: {
    fontSize: 30,
    fontWeight: '900',
  },
  masterWalletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterProgressRow: {
    marginBottom: 12,
  },
  masterProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  masterProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  masterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerSpent: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRemaining: {
    fontSize: 12,
    fontWeight: '700',
  },
  listSection: {},
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  categoryPickerRow: {
    gap: 8,
    paddingBottom: 8,
  },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catOptionText: {
    fontSize: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  deleteModalBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  deleteModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
