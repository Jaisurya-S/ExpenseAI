import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Budget } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ChevronRight } from 'lucide-react-native';

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

  let statusColor = '#10B981';
  let statusText = `${currency}${remaining.toLocaleString('en-IN')} left`;

  if (isOverBudget) {
    statusColor = '#EF4444';
    statusText = `Over by ${currency}${(spent - limit).toLocaleString('en-IN')}`;
  } else if (percent >= 90) {
    statusColor = '#EF4444';
    statusText = `${currency}${remaining.toLocaleString('en-IN')} left`;
  } else if (percent >= threshold) {
    statusColor = '#F59E0B';
    statusText = `${currency}${remaining.toLocaleString('en-IN')} left`;
  }

  const fillWidth = Math.min(100, Math.max(0, percent));
  const fillColor = isOverBudget
    ? '#EF4444'
    : percent >= 90
    ? '#EF4444'
    : percent >= threshold
    ? '#F59E0B'
    : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onEdit}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isOverBudget
            ? 'rgba(239, 68, 68, 0.35)'
            : isDark
            ? 'rgba(255, 255, 255, 0.07)'
            : 'rgba(0, 0, 0, 0.05)',
          shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.05)',
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
          <ChevronRight size={14} color={colors.textMuted} />
        </View>
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
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
          {currency}{spent.toLocaleString('en-IN')} of {currency}{limit.toLocaleString('en-IN')}
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
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
    fontSize: 14,
    fontWeight: '700',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
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
