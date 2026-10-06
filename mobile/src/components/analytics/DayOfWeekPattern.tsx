import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Expense } from '../../types';

interface DayOfWeekPatternProps {
  expenses: Expense[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DayOfWeekPattern: React.FC<DayOfWeekPatternProps> = ({ expenses }) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';

  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  expenses.forEach((e) => {
    if (!e.date) return;
    const dateObj = new Date(e.date);
    if (isNaN(dateObj.getTime())) return;
    const day = dateObj.getDay();
    dayTotals[day] += Number(e.amount) || 0;
    dayCounts[day] += 1;
  });

  const totalSpent = dayTotals.reduce((a, b) => a + b, 0);
  const maxDayTotal = Math.max(...dayTotals, 1);

  // Weekday vs Weekend stats
  const weekdayTotal = dayTotals[1] + dayTotals[2] + dayTotals[3] + dayTotals[4] + dayTotals[5];
  const weekendTotal = dayTotals[0] + dayTotals[6];
  const weekdayPercent = totalSpent > 0 ? Math.round((weekdayTotal / totalSpent) * 100) : 0;
  const weekendPercent = totalSpent > 0 ? Math.round((weekendTotal / totalSpent) * 100) : 0;

  // Ordered starting Monday: [1, 2, 3, 4, 5, 6, 0]
  const displayDays = [1, 2, 3, 4, 5, 6, 0];

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
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>DAY-OF-WEEK PATTERN</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Weekday ({weekdayPercent}%) vs Weekend ({weekendPercent}%)
          </Text>
        </View>

        <View
          style={[
            styles.biasTag,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.biasTagText, { color: colors.textSecondary }]}>
            {weekendPercent > 40 ? 'Weekend Heavy' : 'Balanced'}
          </Text>
        </View>
      </View>

      {totalSpent === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No expense pattern available
          </Text>
        </View>
      ) : (
        <View>
          <View style={styles.chartRow}>
            {displayDays.map((dayIdx) => {
              const amount = dayTotals[dayIdx];
              const isWeekend = dayIdx === 0 || dayIdx === 6;
              const heightPercent = amount > 0 ? Math.max(10, (amount / maxDayTotal) * 100) : 4;
              const isPeak = amount === maxDayTotal && amount > 0;

              return (
                <View key={dayIdx} style={styles.dayCol}>
                  <Text style={[styles.dayAmount, { color: isPeak ? colors.accentPurple : colors.textMuted }]}>
                    {amount > 0 ? (amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : amount) : ''}
                  </Text>

                  <View
                    style={[
                      styles.dayTrack,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dayFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: isPeak
                            ? colors.accentPurple
                            : isWeekend
                            ? colors.primary
                            : isDark
                            ? '#52525B'
                            : '#A1A1AA',
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.dayName,
                      {
                        color: isWeekend ? colors.primary : colors.textSecondary,
                        fontWeight: isWeekend || isPeak ? '700' : '500',
                      },
                    ]}
                  >
                    {DAY_NAMES[dayIdx]}
                  </Text>
                </View>
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
  biasTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  biasTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  dayAmount: {
    fontSize: 8.5,
    fontWeight: '700',
    marginBottom: 4,
    height: 12,
  },
  dayTrack: {
    width: 14,
    height: 70,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dayFill: {
    width: '100%',
    borderRadius: 7,
  },
  dayName: {
    fontSize: 11,
    marginTop: 6,
  },
});
