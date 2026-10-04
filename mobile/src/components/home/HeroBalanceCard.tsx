import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ArrowDownLeft, ArrowUpRight, Plus, ChevronRight } from '../ui/icons';

interface HeroBalanceCardProps {
  availableBalance: number;
  totalIncome: number;
  totalExpenses: number;
  monthIncome: number;
  monthExpenses: number;
  monthlyBudget: number;
  monthName: string;
  onAddMoneyPress?: () => void;
  onSetBudgetPress?: () => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  availableBalance,
  totalIncome,
  totalExpenses,
  monthIncome,
  monthExpenses,
  monthlyBudget,
  monthName,
  onAddMoneyPress,
  onSetBudgetPress,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';

  const isNegative = availableBalance < 0;
  const hasBudget = monthlyBudget > 0;
  const budgetRemaining = Math.max(0, monthlyBudget - monthExpenses);
  const budgetPercentUsed = hasBudget
    ? Math.min(100, Math.round((monthExpenses / monthlyBudget) * 100))
    : 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isNegative ? colors.dangerBorder : colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.balanceLabelContainer}>
          <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
            Total Balance
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isNegative ? colors.dangerBg : colors.successBg,
                borderColor: isNegative ? colors.dangerBorder : 'rgba(16, 185, 129, 0.2)',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isNegative ? colors.danger : colors.success },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isNegative ? colors.danger : colors.success },
              ]}
            >
              {isNegative ? 'Negative' : 'Active'}
            </Text>
          </View>
        </View>

        {onAddMoneyPress && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAddMoneyPress}
            style={[
              styles.addMoneyBtn,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Plus size={13} color={colors.primaryText} />
            <Text style={[styles.addMoneyBtnText, { color: colors.primaryText }]}>
              Add Money
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Balance Hero Typography */}
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.currencySymbol,
            { color: isNegative ? colors.danger : colors.textSecondary },
          ]}
        >
          {currency}
        </Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: isNegative ? colors.danger : colors.text },
          ]}
        >
          {Math.abs(availableBalance).toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>

      {/* 2-Column High-Contrast Metrics (Income vs Expense) */}
      <View style={styles.metricsGrid}>
        {/* Total Inflow */}
        <View
          style={[
            styles.metricTile,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.metricTitleRow}>
            <View style={[styles.metricIconBg, { backgroundColor: colors.successBg }]}>
              <ArrowDownLeft size={13} color={colors.success} />
            </View>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Income</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            +{currency}{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            +{currency}{monthIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this mo.
          </Text>
        </View>

        {/* Total Outflow */}
        <View
          style={[
            styles.metricTile,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.metricTitleRow}>
            <View style={[styles.metricIconBg, { backgroundColor: colors.dangerBg }]}>
              <ArrowUpRight size={13} color={colors.danger} />
            </View>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Expenses</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            -{currency}{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            -{currency}{monthExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this mo.
          </Text>
        </View>
      </View>

      {/* Clean Budget Progress Strip */}
      {hasBudget ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSetBudgetPress}
          style={[
            styles.budgetStrip,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.budgetStripHeader}>
            <Text style={[styles.budgetStripTitle, { color: colors.textSecondary }]}>
              {monthName} Budget
            </Text>
            <Text style={[styles.budgetStripValue, { color: colors.text }]}>
              {currency}{monthExpenses.toLocaleString('en-IN')} <Text style={{ color: colors.textMuted }}>/ {currency}{monthlyBudget.toLocaleString('en-IN')}</Text>
            </Text>
          </View>

          <View
            style={[
              styles.budgetTrack,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
            ]}
          >
            <View
              style={[
                styles.budgetBar,
                {
                  width: `${budgetPercentUsed}%`,
                  backgroundColor:
                    budgetPercentUsed >= 100
                      ? colors.danger
                      : budgetPercentUsed >= 80
                      ? colors.accentYellow
                      : colors.primary,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSetBudgetPress}
          style={[
            styles.setBudgetBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.setBudgetText, { color: colors.textSecondary }]}>
            Set monthly budget limit
          </Text>
          <ChevronRight size={13} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceCaption: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addMoneyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '600',
    marginRight: 3,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricTile: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '400',
  },
  budgetStrip: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  budgetStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetStripTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  budgetStripValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetBar: {
    height: '100%',
    borderRadius: 3,
  },
  setBudgetBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  setBudgetText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
