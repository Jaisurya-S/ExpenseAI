import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Budget } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ChevronRight } from '../ui/icons';

interface BudgetProgressBarProps {
  budget: Budget;
  spent: number;
  onEdit?: () => void;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  budget,
  spent,
  onEdit,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const limit = budget.amount || 1;
  const ratio = spent / limit;
  const percent = Math.round(ratio * 100);
  const remaining = Math.max(0, limit - spent);
  const isOverBudget = spent > limit;
  const threshold = budget.alertThreshold || 80;

  let statusColor: string = colors.success;
  let statusText = `${currency}${remaining.toLocaleString('en-IN')} left`;

  if (isOverBudget) {
    statusColor = colors.danger;
    statusText = `Over by ${currency}${(spent - limit).toLocaleString('en-IN')}`;
  } else if (percent >= 90) {
    statusColor = colors.danger;
    statusText = `${currency}${remaining.toLocaleString('en-IN')} left`;
  } else if (percent >= threshold) {
    statusColor = colors.accentYellow;
    statusText = `${currency}${remaining.toLocaleString('en-IN')} left`;
  }

  const fillWidth = Math.min(100, Math.max(0, percent));
  const fillColor = isOverBudget
    ? colors.danger
    : percent >= 90
    ? colors.danger
    : percent >= threshold
    ? colors.accentYellow
    : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onEdit}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isOverBudget ? colors.dangerBorder : colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      {/* Top Row: Category + Remaining status */}
      <View style={styles.topRow}>
        <View style={styles.categoryWrapper}>
          {budget.isOverall ? (
            <Text style={[styles.overallTitle, { color: colors.text }]}>Overall Monthly Budget</Text>
          ) : (
            <CategoryBadge category={budget.category || 'Other'} size="md" />
          )}
        </View>

        <View style={styles.rightHeader}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
          <ChevronRight size={13} color={colors.textMuted} />
        </View>
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${fillWidth}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>

      {/* Footer: Spent / Limit & Percentage */}
      <View style={styles.footerRow}>
        <Text style={[styles.spentSubText, { color: colors.textSecondary }]}>
          {currency}{spent.toLocaleString('en-IN')} <Text style={{ color: colors.textMuted }}>of {currency}{limit.toLocaleString('en-IN')}</Text>
        </Text>
        <Text style={[styles.percentText, { color: colors.textSecondary }]}>
          {percent}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentSubText: {
    fontSize: 12,
    fontWeight: '500',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
