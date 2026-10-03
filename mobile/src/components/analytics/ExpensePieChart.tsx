import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { ExpenseCategory } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';

interface SliceData {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
  color: string;
}

interface ExpensePieChartProps {
  categoryTotals: Partial<Record<ExpenseCategory, number>>;
  totalSpent: number;
}

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
  categoryTotals,
  totalSpent,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Prepare slices
  const entries = Object.entries(categoryTotals).filter(([_, amount]) => (amount || 0) > 0);
  const slices: SliceData[] = entries
    .map(([cat, amount]) => {
      const val = amount || 0;
      const meta = CATEGORIES[cat as ExpenseCategory] || CATEGORIES.Other;
      return {
        category: cat as ExpenseCategory,
        amount: val,
        percentage: totalSpent > 0 ? (val / totalSpent) * 100 : 0,
        color: meta.color,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  let accumulatedPercent = 0;

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
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>CATEGORY BREAKDOWN</Text>

      {totalSpent === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No expense data for this period
          </Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {/* Donut Chart */}
          <View style={styles.chartWrapper}>
            <Svg width={size} height={size}>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                {/* Background Ring */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={colors.inputBg}
                  strokeWidth={strokeWidth}
                  fill="none"
                />

                {/* Slices */}
                {slices.map((slice, index) => {
                  const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                  accumulatedPercent += slice.percentage;

                  return (
                    <Circle
                      key={index}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Center Label */}
            <View style={styles.centerLabel}>
              <Text style={[styles.centerSub, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.centerAmount, { color: colors.text }]}>
                {currency}
                {totalSpent >= 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent}
              </Text>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {slices.slice(0, 5).map((slice, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <View style={styles.legendDetails}>
                  <Text style={[styles.legendLabel, { color: colors.text }]} numberOfLines={1}>
                    {slice.category}
                  </Text>
                  <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                    {currency}
                    {slice.amount.toLocaleString()} ({Math.round(slice.percentage)}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSub: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  centerAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendDetails: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '500',
  },
});
