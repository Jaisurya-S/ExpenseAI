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
} from '../../components/ui/icons';

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
        if (selectedType !== 'ALL' && tx.type !== selectedType) {
          return false;
        }

        if (selectedTag !== 'ALL' && tx.categoryOrSource !== selectedTag) {
          return false;
        }

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
    'date-desc': 'Newest',
    'date-asc': 'Oldest',
    'amount-desc': 'Highest',
    'amount-asc': 'Lowest',
  };

  const availableTags = useMemo(() => {
    if (selectedType === 'income') {
      return ALL_INCOME_SOURCES;
    }
    if (selectedType === 'expense') {
      return ALL_CATEGORIES;
    }
    return [];
  }, [selectedType]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {filteredTransactions.length} records • Net{' '}
              <Text style={{ color: netFilteredCashflow >= 0 ? colors.success : colors.danger, fontWeight: '600' }}>
                {netFilteredCashflow >= 0 ? '+' : ''}
                {currency}
                {netFilteredCashflow.toLocaleString('en-IN')}
              </Text>
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/modal/add-income')}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <ArrowDownLeft size={13} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/modal/add-expense')}
              style={[
                styles.actionBtnPrimary,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Plus size={13} color={colors.primaryText} />
              <Text style={[styles.actionBtnPrimaryText, { color: colors.primaryText }]}>Expense</Text>
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
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Search size={15} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search transactions, tags..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={15} color={colors.textMuted} />
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
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <ArrowUpDown size={14} color={colors.text} />
            <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>
              {sortLabels[sortBy]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Control / Type Tabs: All | Expenses | Income */}
        <View style={styles.tabContainer}>
          <View
            style={[
              styles.segmentedControl,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {(['ALL', 'expense', 'income'] as const).map((type) => {
              const isActive = selectedType === type;
              const label = type === 'ALL' ? 'All' : type === 'expense' ? 'Expenses' : 'Income';
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setSelectedType(type);
                    setSelectedTag('ALL');
                  }}
                  style={[
                    styles.segmentTab,
                    isActive && {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      shadowColor: colors.cardShadow,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentTabText,
                      {
                        color: isActive ? colors.text : colors.textMuted,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Horizontal Filter (if selected type is expense or income) */}
        {availableTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <TouchableOpacity
              onPress={() => setSelectedTag('ALL')}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedTag === 'ALL' ? colors.primary : colors.card,
                  borderColor: selectedTag === 'ALL' ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: selectedTag === 'ALL' ? colors.primaryText : colors.textSecondary,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {availableTags.map((cat) => {
              const isSelected = selectedTag === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedTag(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? colors.primaryText : colors.textSecondary,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Transactions List */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedTransactions).length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No transactions found</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textMuted }]}>
                Try adjusting your search query or filter criteria.
              </Text>
            </View>
          ) : (
            Object.keys(groupedTransactions).map((dateStr) => {
              const items = groupedTransactions[dateStr];
              const dateTotal = items.reduce(
                (sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)),
                0
              );

              return (
                <View key={dateStr} style={styles.dateGroup}>
                  <View style={styles.dateGroupHeader}>
                    <Text style={[styles.dateGroupTitle, { color: colors.textSecondary }]}>
                      {dateStr}
                    </Text>
                    <Text
                      style={[
                        styles.dateGroupSum,
                        { color: dateTotal >= 0 ? colors.success : colors.textMuted },
                      ]}
                    >
                      {dateTotal >= 0 ? '+' : ''}
                      {currency}
                      {Math.abs(dateTotal).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {items.map((tx) => (
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
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    paddingVertical: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentTabText: {
    fontSize: 12.5,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 14,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateGroupSum: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
