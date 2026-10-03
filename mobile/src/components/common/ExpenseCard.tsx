import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Expense } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  GraduationCap,
  TrendingUp,
  MoreHorizontal,
  Trash2,
} from 'lucide-react-native';

interface ExpenseCardProps {
  expense: Expense;
  onPress?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const CategoryIconMap: Record<string, React.FC<{ size: number; color: string }>> = {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  GraduationCap,
  TrendingUp,
  MoreHorizontal,
};

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onPress,
  onDelete,
  showActions = true,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';

  const catMeta = CATEGORIES[expense.category] || CATEGORIES.Other;
  const IconComponent = CategoryIconMap[catMeta.iconName] || MoreHorizontal;

  const formatDisplayDate = (dateStr: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (dateStr === today) return 'Today';
      if (dateStr === yesterday) return 'Yesterday';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      {/* Category Icon Squircle */}
      <View
        style={[
          styles.iconSquircle,
          {
            backgroundColor: catMeta.bgColor,
          },
        ]}
      >
        <IconComponent size={20} color={catMeta.color} />
      </View>

      {/* Center Details */}
      <View style={styles.centerDetails}>
        <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
          {expense.description || expense.merchant || catMeta.label}
        </Text>
        <View style={styles.subRow}>
          <Text style={[styles.categorySubText, { color: colors.textSecondary }]}>
            {catMeta.label}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {expense.paymentMethod || 'UPI'}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {formatDisplayDate(expense.date)}
          </Text>
        </View>
      </View>

      {/* Right Amount & Actions */}
      <View style={styles.rightSection}>
        <Text style={[styles.amountText, { color: colors.text }]}>
          -{currency}
          {Number(expense.amount).toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </Text>

        {showActions && onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.deleteBtn}
          >
            <Trash2 size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  centerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySubText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 5,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '400',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deleteBtn: {
    marginTop: 4,
    padding: 2,
  },
});
