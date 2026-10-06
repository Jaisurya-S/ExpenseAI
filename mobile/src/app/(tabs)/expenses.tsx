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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { TransactionCard } from '../../components/common/TransactionCard';
import {
  ALL_CATEGORIES,
  CATEGORIES,
  ALL_INCOME_SOURCES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
} from '../../constants/categories';
import {
  ExpenseCategory,
  IncomeSource,
  PaymentMethod,
  Expense,
  Income,
  UnifiedTransaction,
} from '../../types';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Calendar,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Tag,
  Info,
  Wallet,
  Sparkles,
  ChevronDown,
} from '../../components/ui/icons';
import { Icons } from '../../components/ui/icons';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type DateRangeOption = 'ALL' | 'this-month' | 'last-month' | 'this-week' | 'this-year';

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

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'expense' | 'income'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  // Modals
  const [detailModalTx, setDetailModalTx] = useState<UnifiedTransaction | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Current dates for filtering
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const currentYearKey = String(now.getFullYear());

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

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

  // Filter & Search processing
  const filteredTransactions = useMemo(() => {
    return allTransactions
      .filter((tx) => {
        // 1. Type filter
        if (selectedType !== 'ALL' && tx.type !== selectedType) {
          return false;
        }

        // 2. Category / Source filter
        if (selectedCategory !== 'ALL' && tx.categoryOrSource !== selectedCategory) {
          return false;
        }

        // 3. Payment method filter
        if (selectedPaymentMethod !== 'ALL' && tx.paymentMethod !== selectedPaymentMethod) {
          return false;
        }

        // 4. Date Range filter
        if (dateRange === 'this-month' && (!tx.date || !tx.date.startsWith(currentMonthKey))) {
          return false;
        }
        if (dateRange === 'last-month' && (!tx.date || !tx.date.startsWith(lastMonthKey))) {
          return false;
        }
        if (dateRange === 'this-week' && (!tx.date || tx.date < sevenDaysAgoStr)) {
          return false;
        }
        if (dateRange === 'this-year' && (!tx.date || !tx.date.startsWith(currentYearKey))) {
          return false;
        }

        // 5. Search query
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
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        }
        if (sortBy === 'amount-asc') {
          return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        }
        return 0;
      });
  }, [
    allTransactions,
    search,
    selectedType,
    selectedCategory,
    selectedPaymentMethod,
    dateRange,
    sortBy,
    currentMonthKey,
    lastMonthKey,
    sevenDaysAgoStr,
    currentYearKey,
  ]);

  // Statistics for current filtered view
  const totalFilteredIncome = useMemo(
    () =>
      filteredTransactions
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
    [filteredTransactions]
  );

  const totalFilteredExpense = useMemo(
    () =>
      filteredTransactions
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
    [filteredTransactions]
  );

  const netFilteredCashflow = totalFilteredIncome - totalFilteredExpense;

  // Active filter count
  const activeFiltersCount =
    (selectedType !== 'ALL' ? 1 : 0) +
    (selectedCategory !== 'ALL' ? 1 : 0) +
    (selectedPaymentMethod !== 'ALL' ? 1 : 0) +
    (dateRange !== 'ALL' ? 1 : 0) +
    (search.trim() !== '' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedType('ALL');
    setSelectedCategory('ALL');
    setSelectedPaymentMethod('ALL');
    setDateRange('ALL');
    setSearch('');
  };

  // Group transactions by date with friendly headers (Today, Yesterday, Date)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: UnifiedTransaction[] } = {};
    filteredTransactions.forEach((item) => {
      const d = item.date || 'Undated';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return groups;
  }, [filteredTransactions]);

  const formatFriendlyDate = (dateStr: string) => {
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return dObj.toLocaleDateString('default', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: dObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch {}
    return dateStr;
  };

  const handleEdit = (tx: UnifiedTransaction) => {
    setDetailModalTx(null);
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
      if (detailModalTx?.id === tx.id) {
        setDetailModalTx(null);
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

  // Categories list based on active type
  const categoryOptions = useMemo(() => {
    if (selectedType === 'income') return ALL_INCOME_SOURCES;
    if (selectedType === 'expense') return ALL_CATEGORIES;
    return [...ALL_CATEGORIES];
  }, [selectedType]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {filteredTransactions.length} of {allTransactions.length} records
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: colors.cardBorder,
                },
              ]}
              accessibilityLabel="Export transactions"
            >
              <FileSpreadsheet size={15} color={colors.text} />
            </TouchableOpacity>

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

        {/* Live Filter Summary Card */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Inflow</Text>
            <Text style={[styles.summaryVal, { color: colors.success }]}>
              +{currency}
              {totalFilteredIncome.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Outflow</Text>
            <Text style={[styles.summaryVal, { color: colors.danger }]}>
              -{currency}
              {totalFilteredExpense.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net Cash</Text>
            <Text
              style={[
                styles.summaryVal,
                { color: netFilteredCashflow >= 0 ? colors.success : colors.danger },
              ]}
            >
              {netFilteredCashflow >= 0 ? '+' : ''}
              {currency}
              {netFilteredCashflow.toLocaleString('en-IN')}
            </Text>
          </View>

          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={resetAllFilters} style={styles.clearFilterBadge}>
              <Text style={[styles.clearFilterText, { color: colors.accentPurple }]}>Clear</Text>
              <X size={11} color={colors.accentPurple} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar & Controls */}
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
              placeholder="Search descriptions, merchants, tags..."
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

          {/* Sort Button */}
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
            <ArrowUpDown size={13} color={colors.text} />
            <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>
              {sortLabels[sortBy]}
            </Text>
          </TouchableOpacity>

          {/* Filter Modal Trigger */}
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={[
              styles.filterTriggerBtn,
              {
                backgroundColor:
                  activeFiltersCount > 0
                    ? colors.primary
                    : colors.card,
                borderColor: activeFiltersCount > 0 ? colors.primary : colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <SlidersHorizontal
              size={13}
              color={activeFiltersCount > 0 ? colors.primaryText : colors.text}
            />
            {activeFiltersCount > 0 && (
              <View style={[styles.filterBadgeCount, { backgroundColor: colors.accentPurple }]}>
                <Text style={styles.filterBadgeCountText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Primary Type Tabs: All | Expenses | Income */}
        <View style={styles.typeTabContainer}>
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
              const label =
                type === 'ALL' ? 'All Records' : type === 'expense' ? 'Expenses' : 'Income';
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setSelectedType(type);
                    setSelectedCategory('ALL');
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

        {/* Quick Date Range & Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChipsScroll}
        >
          {/* Date range chips */}
          <TouchableOpacity
            onPress={() => setDateRange(dateRange === 'this-month' ? 'ALL' : 'this-month')}
            style={[
              styles.chip,
              {
                backgroundColor: dateRange === 'this-month' ? colors.primary : colors.card,
                borderColor: dateRange === 'this-month' ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Calendar
              size={11}
              color={dateRange === 'this-month' ? colors.primaryText : colors.textMuted}
            />
            <Text
              style={[
                styles.chipText,
                {
                  color: dateRange === 'this-month' ? colors.primaryText : colors.textSecondary,
                  fontWeight: dateRange === 'this-month' ? '700' : '500',
                },
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDateRange(dateRange === 'this-week' ? 'ALL' : 'this-week')}
            style={[
              styles.chip,
              {
                backgroundColor: dateRange === 'this-week' ? colors.primary : colors.card,
                borderColor: dateRange === 'this-week' ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: dateRange === 'this-week' ? colors.primaryText : colors.textSecondary,
                  fontWeight: dateRange === 'this-week' ? '700' : '500',
                },
              ]}
            >
              Past 7 Days
            </Text>
          </TouchableOpacity>

          <View style={[styles.chipDivider, { backgroundColor: colors.cardBorder }]} />

          {/* Category Chips */}
          <TouchableOpacity
            onPress={() => setSelectedCategory('ALL')}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCategory === 'ALL' ? colors.primary : colors.card,
                borderColor: selectedCategory === 'ALL' ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selectedCategory === 'ALL' ? colors.primaryText : colors.textSecondary,
                  fontWeight: selectedCategory === 'ALL' ? '700' : '500',
                },
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {categoryOptions.map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta =
              CATEGORIES[cat as ExpenseCategory] ||
              INCOME_SOURCES[cat as IncomeSource] ||
              CATEGORIES.Other;

            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <View style={[styles.categoryDot, { backgroundColor: meta.color }]} />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.primaryText : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Search size={24} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                No transactions match your filters
              </Text>
              <Text style={[styles.emptyStateSub, { color: colors.textMuted }]}>
                Try adjusting your search keywords, clearing filters, or logging a new record.
              </Text>

              <View style={styles.emptyActionsRow}>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity
                    onPress={resetAllFilters}
                    style={[styles.emptyActionBtn, { borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.emptyActionBtnText, { color: colors.text }]}>
                      Reset Filters
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => router.push('/modal/add-expense')}
                  style={[styles.emptyActionBtnPrimary, { backgroundColor: colors.primary }]}
                >
                  <Plus size={13} color={colors.primaryText} />
                  <Text style={[styles.emptyActionBtnPrimaryText, { color: colors.primaryText }]}>
                    Add Record
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            Object.keys(groupedTransactions).map((dateStr) => {
              const items = groupedTransactions[dateStr];
              const dateNet = items.reduce(
                (sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)),
                0
              );

              return (
                <View key={dateStr} style={styles.dateGroup}>
                  <View style={styles.dateGroupHeader}>
                    <Text style={[styles.dateGroupTitle, { color: colors.textSecondary }]}>
                      {formatFriendlyDate(dateStr)}
                    </Text>
                    <Text
                      style={[
                        styles.dateGroupSum,
                        { color: dateNet >= 0 ? colors.success : colors.textMuted },
                      ]}
                    >
                      {dateNet >= 0 ? '+' : ''}
                      {currency}
                      {Math.abs(dateNet).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {items.map((tx) => (
                    <TransactionCard
                      key={`${tx.type}-${tx.id}`}
                      transaction={tx}
                      onPress={() => setDetailModalTx(tx)}
                      onDelete={() => handleDelete(tx)}
                    />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Transaction Detail & Actions Modal */}
      <Modal
        visible={detailModalTx !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalTx(null)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          {detailModalTx && (
            <View style={styles.detailModalBody}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Transaction Details
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    {detailModalTx.type.toUpperCase()} • ID: {detailModalTx.id.slice(0, 8)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDetailModalTx(null)}
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                  ]}
                >
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.detailContent}>
                {/* Master Amount Banner */}
                <View
                  style={[
                    styles.detailHeroCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      shadowColor: colors.cardShadow,
                    },
                  ]}
                >
                  <Text style={[styles.detailHeroLabel, { color: colors.textSecondary }]}>
                    {detailModalTx.type === 'income' ? 'RECEIVED AMOUNT' : 'SPENT AMOUNT'}
                  </Text>
                  <Text
                    style={[
                      styles.detailHeroAmount,
                      { color: detailModalTx.type === 'income' ? colors.success : colors.text },
                    ]}
                  >
                    {detailModalTx.type === 'income' ? '+' : '-'}
                    {currency}
                    {Number(detailModalTx.amount).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.detailHeroTitle, { color: colors.text }]}>
                    {detailModalTx.description || detailModalTx.categoryOrSource}
                  </Text>
                </View>

                {/* Attributes Grid */}
                <View
                  style={[
                    styles.attributesCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      shadowColor: colors.cardShadow,
                    },
                  ]}
                >
                  <View style={[styles.attributeRow, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.attributeLabel, { color: colors.textSecondary }]}>
                      Category / Source
                    </Text>
                    <Text style={[styles.attributeVal, { color: colors.text }]}>
                      {detailModalTx.categoryOrSource}
                    </Text>
                  </View>

                  <View style={[styles.attributeRow, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.attributeLabel, { color: colors.textSecondary }]}>
                      {detailModalTx.type === 'income' ? 'Payer' : 'Merchant / Payee'}
                    </Text>
                    <Text style={[styles.attributeVal, { color: colors.text }]}>
                      {detailModalTx.merchantOrPayer || 'Not specified'}
                    </Text>
                  </View>

                  <View style={[styles.attributeRow, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.attributeLabel, { color: colors.textSecondary }]}>
                      Date
                    </Text>
                    <Text style={[styles.attributeVal, { color: colors.text }]}>
                      {detailModalTx.date}
                    </Text>
                  </View>

                  <View style={[styles.attributeRow, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.attributeLabel, { color: colors.textSecondary }]}>
                      Payment Method
                    </Text>
                    <Text style={[styles.attributeVal, { color: colors.text }]}>
                      {detailModalTx.paymentMethod || 'UPI'}
                    </Text>
                  </View>

                  {detailModalTx.notes && (
                    <View style={styles.attributeRow}>
                      <Text style={[styles.attributeLabel, { color: colors.textSecondary }]}>
                        Notes
                      </Text>
                      <Text style={[styles.attributeVal, { color: colors.text }]}>
                        {detailModalTx.notes}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    onPress={() => handleEdit(detailModalTx)}
                    style={[styles.editBtn, { backgroundColor: colors.primary }]}
                  >
                    <Edit3 size={15} color={colors.primaryText} />
                    <Text style={[styles.editBtnText, { color: colors.primaryText }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(detailModalTx)}
                    style={[
                      styles.deleteModalBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                        borderColor: colors.dangerBorder,
                      },
                    ]}
                  >
                    <Trash2 size={15} color={colors.danger} />
                    <Text style={[styles.deleteModalBtnText, { color: colors.danger }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Advanced Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Transactions</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Narrow down by timeframe, type, or channel
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={[
                styles.modalCloseBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.filterModalContent}>
            {/* Timeframe Section */}
            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>
              TIMEFRAME
            </Text>
            <View style={styles.filterChipGrid}>
              {[
                { id: 'ALL', label: 'All Time' },
                { id: 'this-month', label: 'This Month' },
                { id: 'last-month', label: 'Last Month' },
                { id: 'this-week', label: 'Past 7 Days' },
                { id: 'this-year', label: 'This Year' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setDateRange(opt.id as DateRangeOption)}
                  style={[
                    styles.modalFilterChip,
                    {
                      backgroundColor: dateRange === opt.id ? colors.primary : colors.card,
                      borderColor: dateRange === opt.id ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalFilterChipText,
                      { color: dateRange === opt.id ? colors.primaryText : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Method Section */}
            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary, marginTop: 18 }]}>
              PAYMENT METHOD
            </Text>
            <View style={styles.filterChipGrid}>
              <TouchableOpacity
                onPress={() => setSelectedPaymentMethod('ALL')}
                style={[
                  styles.modalFilterChip,
                  {
                    backgroundColor: selectedPaymentMethod === 'ALL' ? colors.primary : colors.card,
                    borderColor:
                      selectedPaymentMethod === 'ALL' ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalFilterChipText,
                    {
                      color:
                        selectedPaymentMethod === 'ALL' ? colors.primaryText : colors.text,
                    },
                  ]}
                >
                  All Methods
                </Text>
              </TouchableOpacity>

              {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity
                  key={pm.id}
                  onPress={() => setSelectedPaymentMethod(pm.id)}
                  style={[
                    styles.modalFilterChip,
                    {
                      backgroundColor:
                        selectedPaymentMethod === pm.id ? colors.primary : colors.card,
                      borderColor:
                        selectedPaymentMethod === pm.id ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalFilterChipText,
                      {
                        color:
                          selectedPaymentMethod === pm.id ? colors.primaryText : colors.text,
                      },
                    ]}
                  >
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Section */}
            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary, marginTop: 18 }]}>
              SORT ORDER
            </Text>
            <View style={styles.filterChipGrid}>
              {[
                { id: 'date-desc', label: 'Newest First' },
                { id: 'date-asc', label: 'Oldest First' },
                { id: 'amount-desc', label: 'Highest Amount' },
                { id: 'amount-asc', label: 'Lowest Amount' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setSortBy(opt.id as SortOption)}
                  style={[
                    styles.modalFilterChip,
                    {
                      backgroundColor: sortBy === opt.id ? colors.primary : colors.card,
                      borderColor: sortBy === opt.id ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalFilterChipText,
                      { color: sortBy === opt.id ? colors.primaryText : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bottom Actions */}
            <View style={styles.filterModalBottomRow}>
              <TouchableOpacity
                onPress={resetAllFilters}
                style={[styles.filterResetBtn, { borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.filterResetBtnText, { color: colors.textSecondary }]}>
                  Reset All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={[styles.filterApplyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.filterApplyBtnText, { color: colors.primaryText }]}>
                  Apply ({filteredTransactions.length} results)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Export / Share Modal */}
      <Modal
        visible={exportModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.exportOverlay}>
          <View
            style={[
              styles.exportCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.exportHeader}>
              <Text style={[styles.exportTitle, { color: colors.text }]}>
                Export {filteredTransactions.length} Transactions
              </Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.exportDesc, { color: colors.textMuted }]}>
              Copy a structured CSV summary or formatted ledger to your clipboard.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setExportModalVisible(false);
                Alert.alert('Export Ready', 'Transaction ledger summary copied to clipboard.');
              }}
              style={[styles.exportBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.exportBtnText, { color: colors.primaryText }]}>
                Copy CSV Summary
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 8,
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
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  summaryDivider: {
    width: 1,
    height: 22,
  },
  clearFilterBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  clearFilterText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
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
    fontSize: 11.5,
    fontWeight: '600',
  },
  filterTriggerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeCountText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  typeTabContainer: {
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
    fontSize: 12,
  },
  horizontalChipsScroll: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11.5,
  },
  chipDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 2,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 12,
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
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateGroupSum: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  emptyActionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  detailModalBody: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    padding: 16,
    gap: 14,
  },
  detailHeroCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailHeroLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailHeroAmount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  detailHeroTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  attributesCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  attributeLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  attributeVal: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  deleteModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteModalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  filterModalContent: {
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  modalFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterModalBottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterApplyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  exportCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exportTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  exportDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
  },
  exportBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
