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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { TransactionCard } from '../../components/common/TransactionCard';
import { ALL_CATEGORIES, CATEGORIES, ALL_INCOME_SOURCES, INCOME_SOURCES } from '../../constants/categories';
import { ExpenseCategory, IncomeSource, PaymentMethod, Expense, Income, UnifiedTransaction } from '../../types';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  ArrowUpDown,
  X,
  SlidersHorizontal,
} from 'lucide-react-native';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export default function ExpensesScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const currency = profile.currency || '₹';
  const {
    expenses,
    incomes,
    deleteExpense,
    deleteIncome,
    setDraftExpense,
    setDraftIncome,
  } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'expense' | 'income'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  // Unified list construction
  const allTransactions = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    incomes.forEach((inc) => {
      list.push({
        id: inc.id,
        type: 'income',
        amount: inc.amount,
        categoryOrSource: inc.source,
        description: inc.description || inc.source,
        merchantOrPayer: inc.payer,
        date: inc.date,
        paymentMethod: inc.paymentMethod,
        receiptUrl: inc.receiptUrl,
        notes: inc.notes,
        isOpeningBalance: inc.isOpeningBalance,
        rawIncome: inc,
        createdAt: inc.createdAt,
      });
    });

    expenses.forEach((exp) => {
      list.push({
        id: exp.id,
        type: 'expense',
        amount: exp.amount,
        categoryOrSource: exp.category,
        description: exp.description || exp.merchant || exp.category,
        merchantOrPayer: exp.merchant,
        date: exp.date,
        paymentMethod: exp.paymentMethod,
        receiptUrl: exp.receiptUrl,
        notes: exp.notes,
        rawExpense: exp,
        createdAt: exp.createdAt,
      });
    });

    return list;
  }, [expenses, incomes]);

  // Filter & Search
  const filteredTransactions = useMemo(() => {
    return allTransactions
      .filter((tx) => {
        // Type filter
        if (selectedType !== 'ALL' && tx.type !== selectedType) {
          return false;
        }

        // Category / Source filter
        if (selectedTag !== 'ALL' && tx.categoryOrSource !== selectedTag) {
          return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchDesc = (tx.description || '').toLowerCase().includes(q);
          const matchMerchant = (tx.merchantOrPayer || '').toLowerCase().includes(q);
          const matchCat = (tx.categoryOrSource || '').toLowerCase().includes(q);
          const matchNotes = (tx.notes || '').toLowerCase().includes(q);
          const matchMethod = (tx.paymentMethod || '').toLowerCase().includes(q);

          if (!matchDesc && !matchMerchant && !matchCat && !matchNotes && !matchMethod) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          const cmp = (b.date || '').localeCompare(a.date || '');
          if (cmp !== 0) return cmp;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        if (sortBy === 'date-asc') {
          const cmp = (a.date || '').localeCompare(b.date || '');
          if (cmp !== 0) return cmp;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        }
        if (sortBy === 'amount-desc') {
          return (b.amount || 0) - (a.amount || 0);
        }
        if (sortBy === 'amount-asc') {
          return (a.amount || 0) - (b.amount || 0);
        }
        return 0;
      });
  }, [allTransactions, search, selectedType, selectedTag, sortBy]);

  // Financial statistics of filtered transactions
  const totalFilteredIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const totalFilteredExpense = filteredTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const netFilteredCashflow = totalFilteredIncome - totalFilteredExpense;

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: UnifiedTransaction[] } = {};
    filteredTransactions.forEach((item) => {
      const d = item.date || 'Unknown Date';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return groups;
  }, [filteredTransactions]);

  const handleEdit = (tx: UnifiedTransaction) => {
    if (tx.type === 'income' && tx.rawIncome) {
      setDraftIncome(tx.rawIncome);
      router.push('/modal/add-income');
    } else if (tx.rawExpense) {
      setDraftExpense(tx.rawExpense);
      router.push('/modal/add-expense');
    }
  };

  const handleDelete = (tx: UnifiedTransaction) => {
    const title = tx.type === 'income' ? 'Delete Income' : 'Delete Expense';
    const msg = `Are you sure you want to delete this ${tx.type}?`;

    const performDelete = () => {
      if (tx.type === 'income') {
        deleteIncome(tx.id);
      } else {
        deleteExpense(tx.id);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        performDelete();
      }
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const toggleSort = () => {
    const order: SortOption[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
    const nextIdx = (order.indexOf(sortBy) + 1) % order.length;
    setSortBy(order[nextIdx]);
  };

  const sortLabels: Record<SortOption, string> = {
    'date-desc': 'Newest First',
    'date-asc': 'Oldest First',
    'amount-desc': 'Highest Amount',
    'amount-asc': 'Lowest Amount',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {filteredTransactions.length} records • Net:{' '}
              <Text style={{ color: netFilteredCashflow >= 0 ? '#10B981' : colors.danger, fontWeight: '700' }}>
                {netFilteredCashflow >= 0 ? '+' : ''}
                {currency}
                {netFilteredCashflow.toLocaleString()}
              </Text>
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/modal/add-income')}
              style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}
            >
              <ArrowDownLeft size={14} color="#10B981" />
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>+ Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/modal/add-expense')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>+ Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar & Sort Button */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
              },
            ]}
          >
            <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search transactions..."
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

          <TouchableOpacity
            onPress={toggleSort}
            style={[
              styles.sortBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <ArrowUpDown size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Type Filter Pills: All | Expense | Income */}
        <View style={styles.typeFilterRow}>
          <TouchableOpacity
            onPress={() => {
              setSelectedType('ALL');
              setSelectedTag('ALL');
            }}
            style={[
              styles.typeTab,
              {
                backgroundColor: selectedType === 'ALL' ? colors.primaryLight : colors.card,
                borderColor: selectedType === 'ALL' ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.typeTabText,
                {
                  color: selectedType === 'ALL' ? colors.primary : colors.textSecondary,
                  fontWeight: selectedType === 'ALL' ? '800' : '600',
                },
              ]}
            >
              All Activity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSelectedType('expense');
              setSelectedTag('ALL');
            }}
            style={[
              styles.typeTab,
              {
                backgroundColor:
                  selectedType === 'expense' ? 'rgba(239, 68, 68, 0.12)' : colors.card,
                borderColor: selectedType === 'expense' ? colors.danger : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.typeTabText,
                {
                  color: selectedType === 'expense' ? colors.danger : colors.textSecondary,
                  fontWeight: selectedType === 'expense' ? '800' : '600',
                },
              ]}
            >
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSelectedType('income');
              setSelectedTag('ALL');
            }}
            style={[
              styles.typeTab,
              {
                backgroundColor:
                  selectedType === 'income' ? 'rgba(16, 185, 129, 0.12)' : colors.card,
                borderColor: selectedType === 'income' ? '#10B981' : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.typeTabText,
                {
                  color: selectedType === 'income' ? '#10B981' : colors.textSecondary,
                  fontWeight: selectedType === 'income' ? '800' : '600',
                },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category / Source Sub-Filter Chips */}
        <View style={styles.filterScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedTag('ALL')}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedTag === 'ALL' ? colors.primaryLight : colors.card,
                  borderColor: selectedTag === 'ALL' ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: selectedTag === 'ALL' ? colors.primary : colors.textSecondary,
                    fontWeight: selectedTag === 'ALL' ? '700' : '500',
                  },
                ]}
              >
                All Tags
              </Text>
            </TouchableOpacity>

            {/* If Income selected, show income sources */}
            {selectedType === 'income' &&
              ALL_INCOME_SOURCES.map((src) => {
                const meta = INCOME_SOURCES[src];
                const isSelected = selectedTag === src;
                return (
                  <TouchableOpacity
                    key={src}
                    onPress={() => setSelectedTag(isSelected ? 'ALL' : src)}
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

            {/* If Expense or ALL selected, show expense categories */}
            {selectedType !== 'income' &&
              ALL_CATEGORIES.map((cat) => {
                const meta = CATEGORIES[cat];
                const isSelected = selectedTag === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedTag(isSelected ? 'ALL' : cat)}
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

        {/* Sort Indicator Pill */}
        <View style={styles.sortIndicatorRow}>
          <Text style={[styles.sortIndicatorText, { color: colors.textMuted }]}>
            Sorted by: <Text style={{ color: colors.primary, fontWeight: '700' }}>{sortLabels[sortBy]}</Text>
          </Text>
        </View>

        {/* Unified Transactions List */}
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedTransactions).length === 0 ? (
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
                No transactions found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Try adjusting your search criteria or add new income/expenses.
              </Text>
            </View>
          ) : (
            Object.keys(groupedTransactions).map((dateStr) => {
              const dateItems = groupedTransactions[dateStr];
              const dateIncome = dateItems
                .filter((i) => i.type === 'income')
                .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
              const dateExpense = dateItems
                .filter((i) => i.type === 'expense')
                .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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

                    <View style={styles.dateGroupTotalsRow}>
                      {dateIncome > 0 && (
                        <Text style={[styles.dateGroupIncome, { color: '#10B981' }]}>
                          +{currency}{dateIncome.toLocaleString()}
                        </Text>
                      )}
                      {dateExpense > 0 && (
                        <Text style={[styles.dateGroupExpense, { color: colors.danger }]}>
                          -{currency}{dateExpense.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  {dateItems.map((tx) => (
                    <TransactionCard
                      key={`${tx.type}-${tx.id}`}
                      transaction={tx}
                      onPress={() => handleEdit(tx)}
                      onDelete={() => handleDelete(tx)}
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
    paddingBottom: 10,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
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
    fontSize: 13,
  },
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1,
    gap: 4,
  },
  typeTabText: {
    fontSize: 11,
  },
  filterScrollWrapper: {
    marginBottom: 8,
  },
  categoryFilterRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 11,
  },
  sortIndicatorRow: {
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  sortIndicatorText: {
    fontSize: 10,
    fontWeight: '500',
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
  dateGroupTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateGroupIncome: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateGroupExpense: {
    fontSize: 11,
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

