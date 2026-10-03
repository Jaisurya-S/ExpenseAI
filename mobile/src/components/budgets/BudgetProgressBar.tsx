import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Budget } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Edit2, AlertTriangle, CheckCircle2 } from 'lucide-react-native';

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
  const percent = Math.min(100, Math.round(ratio * 100));
  const remaining = Math.max(0, limit - spent);
  const isOverBudget = spent > limit;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <CategoryBadge category={budget.category} size="md" />
        <View style={styles.rightHeader}>
          {isOverBudget ? (
            <View
              style={[
                styles.overBadge,
                {
                  backgroundColor: colors.dangerBg,
                },
              ]}
            >
              <AlertTriangle size={12} color={colors.danger} />
              <Text style={[styles.overText, { color: colors.danger }]}>
                Over by {currency}
                {(spent - limit).toLocaleString()}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.safeBadge,
                {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <CheckCircle2 size={12} color={colors.primary} />
              <Text style={[styles.safeText, { color: colors.primary }]}>
                {currency}
                {remaining.toLocaleString()} left
              </Text>
            </View>
          )}

          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
              <Edit2 size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={[styles.spentText, { color: colors.text }]}>
          {currency}
          {spent.toLocaleString()}
          <Text style={[styles.limitText, { color: colors.textSecondary }]}>
            {' '}
            / {currency}
            {limit.toLocaleString()}
          </Text>
        </Text>
        <Text
          style={[
            styles.percentText,
            { color: isOverBudget ? colors.danger : colors.primary },
          ]}
        >
          {Math.round(ratio * 100)}%
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.inputBg }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
              backgroundColor: isOverBudget
                ? colors.danger
                : percent > 80
                ? '#F59E0B'
                : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  overText: {
    fontSize: 11,
    fontWeight: '700',
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  safeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    padding: 4,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  spentText: {
    fontSize: 16,
    fontWeight: '800',
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
