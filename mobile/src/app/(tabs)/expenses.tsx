import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ExpenseCard } from '../../components/common/ExpenseCard';
import { ALL_CATEGORIES, CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { ExpenseCategory, PaymentMethod, Expense } from '../../types';
import { Search, Plus, Mic, Camera, X } from 'lucide-react-native';

import { Alert } from 'react-native';

export default function ExpensesScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const currency = profile.currency || '₹';
  const { expenses, deleteExpense, setDraftExpense } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  const handleEditExpense = (expense: Expense) => {
    setDraftExpense(expense);
    router.push('/modal/add-expense');
  };

  const handleDeleteExpense = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this expense?')) {
        deleteExpense(id);
      }
    } else {
      Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
      ]);
    }
  };

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'ALL'>('ALL');

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        search === '' ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.merchant && e.merchant.toLowerCase().includes(search.toLowerCase())) ||
        e.category.toLowerCase().includes(search.toLowerCase());

      const matchesCat = selectedCat === 'ALL' || e.category === selectedCat;
      const matchesMethod = selectedMethod === 'ALL' || e.paymentMethod === selectedMethod;

      return matchesSearch && matchesCat && matchesMethod;
    });
  }, [expenses, search, selectedCat, selectedMethod]);

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Group by date
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};
    filteredExpenses.forEach((item) => {
      const d = item.date || 'Unknown Date';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return groups;
  }, [filteredExpenses]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>All Expenses</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {filteredExpenses.length} items • Total: {currency}
              {totalFilteredAmount.toLocaleString()}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/modal/scan')}
              style={[
                styles.smallActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(0, 187, 249, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                },
              ]}
            >
              <Camera size={16} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/modal/voice')}
              style={[
                styles.smallActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(155, 93, 229, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                },
              ]}
            >
              <Mic size={16} color={colors.accentPurple} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/modal/add-expense')}
              style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={18} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by merchant, note, or item..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Horizontal Filter Chips */}
        <View style={styles.filterScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedCat('ALL')}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCat === 'ALL' ? colors.primaryLight : colors.card,
                  borderColor: selectedCat === 'ALL' ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: selectedCat === 'ALL' ? colors.primary : colors.textSecondary,
                    fontWeight: selectedCat === 'ALL' ? '700' : '500',
                  },
                ]}
              >
                All Categories
              </Text>
            </TouchableOpacity>

            {ALL_CATEGORIES.map((cat) => {
              const meta = CATEGORIES[cat];
              const isSelected = selectedCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCat(isSelected ? 'ALL' : cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? meta.bgColor : colors.card,
                      borderColor: isSelected ? meta.color : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
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

        {/* Expenses List */}
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedExpenses).length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No matching expenses found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Try adjusting your search filters or record a new expense.
              </Text>
            </View>
          ) : (
            Object.keys(groupedExpenses).map((dateStr) => {
              const dateItems = groupedExpenses[dateStr];
              const dateTotal = dateItems.reduce((sum, item) => sum + (item.amount || 0), 0);

              let dateDisplay = dateStr;
              const todayStr = new Date().toISOString().split('T')[0];
              const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

              if (dateStr === todayStr) dateDisplay = 'Today';
              else if (dateStr === yesterdayStr) dateDisplay = 'Yesterday';
              else {
                try {
                  dateDisplay = new Date(dateStr).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                } catch {
                  dateDisplay = dateStr;
                }
              }

              return (
                <View key={dateStr} style={styles.dateGroup}>
                  <View style={styles.dateGroupHeader}>
                    <Text style={[styles.dateGroupTitle, { color: colors.textSecondary }]}>
                      {dateDisplay}
                    </Text>
                    <Text style={[styles.dateGroupTotal, { color: colors.danger }]}>
                      -{currency}
                      {dateTotal.toLocaleString()}
                    </Text>
                  </View>

                  {dateItems.map((exp) => (
                    <ExpenseCard
                      key={exp.id}
                      expense={exp}
                      onPress={() => handleEditExpense(exp)}
                      onDelete={() => handleDeleteExpense(exp.id)}
                    />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
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
    paddingBottom: 12,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScrollWrapper: {
    marginBottom: 12,
  },
  categoryFilterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  listScrollView: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateGroupTotal: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
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
  },
});
