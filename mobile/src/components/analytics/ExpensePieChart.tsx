import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { ExpenseCategory } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Icons } from '../ui/icons';

interface ExpensePieChartProps {
  categoryTotals: Partial<Record<ExpenseCategory, number>>;
  categoryCounts?: Partial<Record<ExpenseCategory, number>>;
  totalSpent: number;
  onSelectCategory?: (category: ExpenseCategory | null) => void;
  selectedCategory?: ExpenseCategory | null;
}

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
  categoryTotals,
  categoryCounts = {},
  totalSpent,
  onSelectCategory,
  selectedCategory: externalSelectedCategory,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';

  const [internalSelected, setInternalSelected] = useState<ExpenseCategory | null>(null);
  const activeCategory = externalSelectedCategory !== undefined ? externalSelectedCategory : internalSelected;

  const handleSelect = (cat: ExpenseCategory) => {
    const next = activeCategory === cat ? null : cat;
    if (onSelectCategory) {
      onSelectCategory(next);
    } else {
      setInternalSelected(next);
    }
  };

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Prepare slices with precomputed cumulative offsets
  const entries = (Object.entries(categoryTotals) as [ExpenseCategory, number][])
    .filter(([_, amount]) => (amount || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0));

  let runningOffset = 0;
  const slicesWithOffset = entries.map(([cat, amount]) => {
    const val = amount || 0;
    const meta = CATEGORIES[cat] || CATEGORIES.Other;
    const percentage = totalSpent > 0 ? (val / totalSpent) * 100 : 0;
    const offset = runningOffset;
    runningOffset += percentage;
    return {
      category: cat,
      amount: val,
      percentage,
      color: meta.color,
      bgColor: meta.bgColor,
      iconName: meta.iconName,
      offset,
      count: categoryCounts[cat] || 0,
    };
  });

  const activeSlice = slicesWithOffset.find((s) => s.category === activeCategory);

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
        <View>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>EXPENSE DISTRIBUTION</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            {slicesWithOffset.length} active categories
          </Text>
        </View>
        {activeCategory && (
          <TouchableOpacity
            onPress={() => handleSelect(activeCategory)}
            style={[styles.resetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Show All</Text>
          </TouchableOpacity>
        )}
      </View>

      {totalSpent === 0 || slicesWithOffset.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No expense data for this period
          </Text>
        </View>
      ) : (
        <View>
          <View style={styles.chartWrapper}>
            <Svg width={size} height={size}>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                {/* Background Ring */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}
                  strokeWidth={strokeWidth}
                  fill="none"
                />

                {/* Slices */}
                {slicesWithOffset.map((slice, index) => {
                  const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((slice.offset / 100) * circumference);
                  const isSelected = activeCategory === slice.category;
                  const isAnySelected = activeCategory !== null;
                  const opacity = !isAnySelected || isSelected ? 1 : 0.35;
                  const currentStrokeWidth = isSelected ? strokeWidth + 4 : strokeWidth;

                  return (
                    <Circle
                      key={index}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={currentStrokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                      fill="none"
                      opacity={opacity}
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Center Label */}
            <View style={styles.centerLabel}>
              <Text style={[styles.centerSub, { color: colors.textSecondary }]}>
                {activeSlice ? activeSlice.category : 'Total Spent'}
              </Text>
              <Text style={[styles.centerAmount, { color: colors.text }]}>
                {currency}
                {(activeSlice ? activeSlice.amount : totalSpent).toLocaleString('en-IN')}
              </Text>
              {activeSlice && (
                <Text style={[styles.centerPercent, { color: activeSlice.color }]}>
                  {Math.round(activeSlice.percentage)}% of total
                </Text>
              )}
            </View>
          </View>

          {/* Slices Grid Legend */}
          <View style={styles.legendGrid}>
            {slicesWithOffset.map((slice) => {
              const isSelected = activeCategory === slice.category;
              const IconComp = (Icons as any)[slice.iconName] || Icons.CirclePlus;

              return (
                <TouchableOpacity
                  key={slice.category}
                  onPress={() => handleSelect(slice.category)}
                  activeOpacity={0.7}
                  style={[
                    styles.legendItem,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.05)'
                        : 'transparent',
                      borderColor: isSelected ? slice.color : colors.cardBorder,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: slice.bgColor }]}>
                    <IconComp size={13} color={slice.color} />
                  </View>
                  <View style={styles.legendDetails}>
                    <Text style={[styles.legendLabel, { color: colors.text }]} numberOfLines={1}>
                      {slice.category}
                    </Text>
                    <Text style={[styles.legendValue, { color: colors.textMuted }]}>
                      {currency}{slice.amount.toLocaleString('en-IN')} ({Math.round(slice.percentage)}%)
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 110,
  },
  centerSub: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  centerAmount: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  centerPercent: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    padding: 8,
    borderRadius: 12,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
});
