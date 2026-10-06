import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaymentMethod } from '../../types';
import { PAYMENT_METHODS } from '../../constants/categories';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Icons } from '../ui/icons';

interface PaymentMethodBreakdownProps {
  methodTotals: Partial<Record<PaymentMethod, number>>;
  methodCounts: Partial<Record<PaymentMethod, number>>;
  totalSpent: number;
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  UPI: '#8B5CF6',
  Card: '#0284C7',
  Cash: '#10B981',
  NetBanking: '#F59E0B',
  Wallet: '#EC4899',
  Other: '#64748B',
};

export const PaymentMethodBreakdown: React.FC<PaymentMethodBreakdownProps> = ({
  methodTotals,
  methodCounts,
  totalSpent,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';

  const activeMethods = Object.entries(methodTotals)
    .filter(([_, amount]) => (amount || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0)) as [PaymentMethod, number][];

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
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>PAYMENT CHANNELS</Text>
        <Text style={[styles.cardSub, { color: colors.textMuted }]}>
          {activeMethods.length} payment channels used
        </Text>
      </View>

      {activeMethods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No payment method data recorded
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {activeMethods.map(([method, amount]) => {
            const meta = PAYMENT_METHODS.find((m) => m.id === method) || {
              id: method,
              label: method,
              icon: 'CreditCard',
            };
            const count = methodCounts[method] || 0;
            const percentage = totalSpent > 0 ? Math.round(((amount || 0) / totalSpent) * 100) : 0;
            const barColor = METHOD_COLORS[method] || colors.primary;
            const IconComp = (Icons as any)[meta.icon] || Icons.CreditCard;

            return (
              <View key={method} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <View style={styles.methodInfo}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(0, 0, 0, 0.04)',
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    >
                      <IconComp size={13} color={barColor} />
                    </View>
                    <View>
                      <Text style={[styles.methodName, { color: colors.text }]}>{meta.label}</Text>
                      <Text style={[styles.methodMeta, { color: colors.textMuted }]}>
                        {count} transaction{count > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={[styles.amountText, { color: colors.text }]}>
                      {currency}{amount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.percentText, { color: barColor }]}>
                      {percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View
                  style={[
                    styles.track,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
                  ]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(100, Math.max(4, percentage))}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  itemRow: {
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  methodMeta: {
    fontSize: 10.5,
    marginTop: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  percentText: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
  },
  track: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2.5,
  },
});
