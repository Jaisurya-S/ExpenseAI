import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';

export interface BarData {
  label: string;
  subLabel?: string;
  amount: number;
  fullDate?: string;
}

interface SpendingBarChartProps {
  data: BarData[];
  title?: string;
  subtitle?: string;
  averageAmount?: number;
}

export const SpendingBarChart: React.FC<SpendingBarChartProps> = ({
  data,
  title = 'SPENDING VELOCITY',
  subtitle,
  averageAmount,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const selectedItem = selectedIdx !== null ? data[selectedIdx] : null;

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
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>

        {selectedItem ? (
          <View style={[styles.activeTag, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.activeTagLabel, { color: colors.textSecondary }]}>
              {selectedItem.fullDate || selectedItem.label}:
            </Text>
            <Text style={[styles.activeTagVal, { color: colors.text }]}>
              {currency}{selectedItem.amount.toLocaleString('en-IN')}
            </Text>
          </View>
        ) : averageAmount !== undefined ? (
          <View style={[styles.avgBadge, { borderColor: colors.cardBorder }]}>
            <Text style={[styles.avgBadgeText, { color: colors.textMuted }]}>
              Avg: {currency}{Math.round(averageAmount).toLocaleString('en-IN')}/d
            </Text>
          </View>
        ) : null}
      </View>

      {data.length === 0 || maxAmount <= 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No spending activity recorded
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContainer}
        >
          <View style={styles.chartArea}>
            {data.map((item, index) => {
              const heightPercent = item.amount > 0 ? Math.max(12, (item.amount / maxAmount) * 100) : 4;
              const isHighest = item.amount === maxAmount && item.amount > 0;
              const isSelected = selectedIdx === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.barColumn}
                  activeOpacity={0.7}
                  onPress={() => setSelectedIdx(isSelected ? null : index)}
                >
                  <View style={styles.barTopLabelContainer}>
                    {isSelected && (
                      <View
                        style={[
                          styles.tooltip,
                          {
                            backgroundColor: colors.primary,
                          },
                        ]}
                      >
                        <Text style={[styles.tooltipText, { color: colors.primaryText }]}>
                          {currency}{item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.barTrack,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isSelected ? 1 : 0,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: isSelected
                            ? colors.primary
                            : isHighest
                            ? colors.accentPurple
                            : item.amount > 0
                            ? isDark
                              ? '#3F3F46'
                              : '#71717A'
                            : 'transparent',
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.barLabel,
                      {
                        color: isSelected ? colors.text : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.subLabel ? (
                    <Text style={[styles.barSubLabel, { color: colors.textMuted }]}>
                      {item.subLabel}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
    marginTop: 2,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeTagVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  avgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  avgBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  chartScrollContainer: {
    flexGrow: 1,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingTop: 20,
    minWidth: '100%',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    minWidth: 28,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopLabelContainer: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  tooltip: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tooltipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  barTrack: {
    width: 14,
    height: 96,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10.5,
    marginTop: 6,
  },
  barSubLabel: {
    fontSize: 8.5,
    marginTop: 1,
  },
});
