import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ArrowDownRight, Target } from 'lucide-react-native';

interface HeroBalanceCardProps {
  totalSpent: number;
  monthlyBudget: number;
  monthName: string;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  totalSpent,
  monthlyBudget,
  monthName,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const hasBudget = monthlyBudget > 0;
  const remaining = Math.max(0, monthlyBudget - totalSpent);
  const percentUsed = hasBudget ? Math.min(100, Math.round((totalSpent / monthlyBudget) * 100)) : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      {/* Top Row: Total Spent */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            TOTAL SPENT IN {monthName.toUpperCase()}
          </Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {currency}
            {totalSpent.toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        {hasBudget && (
          <View
            style={[
              styles.budgetPill,
              {
                backgroundColor: percentUsed > 90 ? colors.dangerBg : colors.primaryLight,
                borderColor: percentUsed > 90 ? colors.dangerBorder : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.budgetPillText,
                { color: percentUsed > 90 ? colors.danger : colors.primary },
              ]}
            >
              {percentUsed}% of budget
            </Text>
          </View>
        )}
      </View>

      {/* Progress Track */}
      {hasBudget ? (
        <View style={styles.progressSection}>
          <View style={[styles.trackBg, { backgroundColor: colors.inputBg }]}>
            <View
              style={[
                styles.trackFill,
                {
                  width: `${percentUsed}%`,
                  backgroundColor:
                    percentUsed > 90
                      ? colors.danger
                      : percentUsed > 75
                      ? '#F59E0B'
                      : colors.primary,
                },
              ]}
            />
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconBox, { backgroundColor: colors.primaryLight }]}>
                <ArrowDownRight size={14} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Available</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {currency}{remaining.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.metricItem}>
              <View style={[styles.metricIconBox, { backgroundColor: colors.inputBg }]}>
                <Target size={14} color={colors.textSecondary} />
              </View>
              <View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Limit Target</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {currency}{monthlyBudget.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.noBudgetBanner, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.noBudgetText, { color: colors.textSecondary }]}>
            No monthly budget cap set. Set limits in the Budgets tab to track your pace.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  caption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  budgetPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 16,
  },
  trackBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 12,
  },
  noBudgetBanner: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noBudgetText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
