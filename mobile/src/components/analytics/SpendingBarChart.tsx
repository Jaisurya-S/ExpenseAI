import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';

interface BarData {
  label: string;
  amount: number;
}

interface SpendingBarChartProps {
  data: BarData[];
  title?: string;
}

export const SpendingBarChart: React.FC<SpendingBarChartProps> = ({
  data,
  title = 'DAILY SPENDING TREND',
}) => {
  const { profile } = useAuthStore();
  const { colors } = useAppTheme();
  const currency = profile.currency || '₹';

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

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
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>

      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const heightPercent = Math.max(8, (item.amount / maxAmount) * 100);
          const isHighest = item.amount === maxAmount && item.amount > 0;

          return (
            <View key={index} style={styles.barColumn}>
              <View style={[styles.barTrack, { backgroundColor: colors.inputBg }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: isHighest ? colors.primary : colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.barAmount, { color: colors.text }]}>
                {item.amount > 0
                  ? item.amount >= 1000
                    ? `${(item.amount / 1000).toFixed(0)}k`
                    : item.amount
                  : '-'}
              </Text>
            </View>
          );
        })}
      </View>
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
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 90,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  barAmount: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
});
