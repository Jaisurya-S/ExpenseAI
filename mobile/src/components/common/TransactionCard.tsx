import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UnifiedTransaction } from '../../types';
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
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const isIncome = transaction.type === 'income';

  let iconName = isIncome ? 'Briefcase' : 'Receipt';
  let categoryLabel = transaction.categoryOrSource;

  if (isIncome) {
    const srcMeta = INCOME_SOURCES[transaction.categoryOrSource as keyof typeof INCOME_SOURCES];
    if (srcMeta) {
      iconName = srcMeta.iconName;
      categoryLabel = srcMeta.label;
    }
  } else {
    const catMeta = CATEGORIES[transaction.categoryOrSource as keyof typeof CATEGORIES];
    if (catMeta) {
      iconName = catMeta.iconName;
      categoryLabel = catMeta.label;
    }
  }

  const IconComponent = IconMap[iconName] || (isIncome ? CirclePlus : MoreHorizontal);

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
      {/* Left Icon with subtle monochrome squircle container */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <IconComponent size={16} color={isIncome ? colors.success : colors.text} />
      </View>

      {/* Center Details */}
      <View style={styles.centerDetails}>
        <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
          {transaction.description || transaction.merchantOrPayer || categoryLabel}
        </Text>

        <View style={styles.subRow}>
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            {categoryLabel}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
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
              color: isIncome ? colors.success : colors.text,
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
        <Text style={[styles.methodText, { color: colors.textMuted }]}>
          {transaction.paymentMethod || 'UPI'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  centerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '400',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  amountText: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  methodText: {
    fontSize: 10.5,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});
