import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UnifiedTransaction, Expense, Income } from '../../types';
import { CATEGORIES, INCOME_SOURCES } from '../../constants/categories';
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
  Briefcase,
  Laptop,
  Building2,
  Award,
  Gift,
  RefreshCw,
  Percent,
  Landmark,
  HandCoins,
  PiggyBank,
  CirclePlus,
} from '../ui/icons';

interface TransactionCardProps {
  transaction: UnifiedTransaction;
  onPress?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const IconMap: Record<string, React.FC<{ size: number; color: string }>> = {
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
  Briefcase,
  Laptop,
  Building2,
  Award,
  Gift,
  RefreshCw,
  Percent,
  Landmark,
  HandCoins,
  PiggyBank,
  CirclePlus,
};

function formatDisplayDate(dateStr: string) {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${months[monthIdx]} ${day}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onPress,
  onDelete,
  showActions = true,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const isIncome = transaction.type === 'income';

  let metaColor = isIncome ? '#10B981' : colors.primary;
  let metaBgColor = isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)';
  let iconName = isIncome ? 'Briefcase' : 'Receipt';
  let categoryLabel = transaction.categoryOrSource;

  if (isIncome) {
    const srcMeta = INCOME_SOURCES[transaction.categoryOrSource as keyof typeof INCOME_SOURCES];
    if (srcMeta) {
      metaColor = srcMeta.color;
      metaBgColor = srcMeta.bgColor;
      iconName = srcMeta.iconName;
      categoryLabel = srcMeta.label;
    }
  } else {
    const catMeta = CATEGORIES[transaction.categoryOrSource as keyof typeof CATEGORIES];
    if (catMeta) {
      metaColor = catMeta.color;
      metaBgColor = catMeta.bgColor;
      iconName = catMeta.iconName;
      categoryLabel = catMeta.label;
    }
  }

  const IconComponent = IconMap[iconName] || (isIncome ? CirclePlus : MoreHorizontal);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.06)',
        },
      ]}
    >
      {/* Left Category Icon */}
      <View
        style={[
          styles.iconSquircle,
          {
            backgroundColor: metaBgColor,
          },
        ]}
      >
        <IconComponent size={18} color={metaColor} />
      </View>

      {/* Center Details */}
      <View style={styles.centerDetails}>
        <View style={styles.titleRow}>
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
            {transaction.description || transaction.merchantOrPayer || categoryLabel}
          </Text>
        </View>

        <View style={styles.subRow}>
          <Text style={[styles.categorySubText, { color: colors.textSecondary }]}>
            {categoryLabel}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {transaction.paymentMethod || 'UPI'}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {formatDisplayDate(transaction.date)}
          </Text>
        </View>
      </View>

      {/* Right Amount */}
      <View style={styles.rightSection}>
        <Text
          style={[
            styles.amountText,
            {
              color: isIncome ? '#10B981' : colors.text,
            },
          ]}
        >
          {isIncome ? '+' : '-'}
          {currency}
          {Number(transaction.amount).toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  iconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  centerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginRight: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categorySubText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '400',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  deleteBtn: {
    marginTop: 3,
    padding: 2,
  },
});

