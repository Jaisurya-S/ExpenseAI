import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from '../ui/icons';

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
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isNegative
            ? 'rgba(239, 68, 68, 0.4)'
            : isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.06)',
          shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.08)',
        },
      ]}
    >
      {/* Top Header: Clean Label + Net indicator */}
      <View style={styles.topHeaderRow}>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          Available Balance
        </Text>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isNegative
                ? isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'
                : isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
            },
          ]}
        >
          <View
            style={[
              styles.pulseDot,
              { backgroundColor: isNegative ? '#EF4444' : '#10B981' },
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              { color: isNegative ? '#EF4444' : '#10B981' },
            ]}
          >
            {isNegative ? 'Negative' : 'Active'}
          </Text>
        </View>
      </View>

      {/* Main Display Balance */}
      <View style={styles.balanceRow}>
        <Text
          style={[
            styles.balanceAmount,
            { color: isNegative ? '#EF4444' : colors.text },
          ]}
        >
          {isNegative ? '-' : ''}
          {currency}
          {Math.abs(availableBalance).toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>

      {/* 2-Column Clean Inflow & Outflow Metrics */}
      <View style={styles.breakdownContainer}>
        {/* Income */}
        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
        >
          <View style={styles.metricHeader}>
            <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <ArrowDownLeft size={12} color="#10B981" />
            </View>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Income</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#10B981' }]}>
            +{currency}{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            +{currency}{monthIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month
          </Text>
        </View>

        {/* Expenses */}
        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
        >
          <View style={styles.metricHeader}>
            <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <ArrowUpRight size={12} color="#EF4444" />
            </View>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            -{currency}{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            -{currency}{monthExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month
          </Text>
        </View>
      </View>

      {/* Monthly Budget Progress Bar */}
      {hasBudget ? (
        <View
          style={[
            styles.budgetProgressBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            },
          ]}
        >
          <View style={styles.budgetTopRow}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
              {monthName} Budget
            </Text>
            <Text style={[styles.budgetVal, { color: colors.textSecondary }]}>
              {currency}{monthExpenses.toLocaleString('en-IN')} / {currency}{monthlyBudget.toLocaleString('en-IN')} ({budgetPercentUsed}%)
            </Text>
          </View>

          <View
            style={[
              styles.trackBg,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
            ]}
          >
            <View
              style={[
                styles.trackFill,
                {
                  width: `${budgetPercentUsed}%`,
                  backgroundColor:
                    budgetPercentUsed >= 100
                      ? '#EF4444'
                      : budgetPercentUsed >= 80
                      ? '#F59E0B'
                      : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSetBudgetPress}
          style={[
            styles.noBudgetBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            },
          ]}
        >
          <Text style={[styles.noBudgetText, { color: colors.textSecondary }]}>
            Set a monthly spending budget →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceRow: {
    marginBottom: 16,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  breakdownContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  smallIconCircle: {
    width: 20,
    height: 20,
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
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '400',
  },
  budgetProgressBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetVal: {
    fontSize: 11,
    fontWeight: '500',
  },
  trackBg: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  noBudgetBox: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  noBudgetText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
