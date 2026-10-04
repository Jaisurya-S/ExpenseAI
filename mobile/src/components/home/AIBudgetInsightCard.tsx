import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from '../ui/icons';
import { useAppTheme } from '../../hooks/use-theme';

interface AIBudgetInsightCardProps {
  insights: string[];
  onPressDetails?: () => void;
}

export const AIBudgetInsightCard: React.FC<AIBudgetInsightCardProps> = ({
  insights,
}) => {
  const { colors, isDark } = useAppTheme();

  if (!insights || insights.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={15} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>SPENDING ADVISOR</Text>
        </View>
      </View>

      <View style={styles.insightsList}>
        {insights.slice(0, 2).map((item, index) => {
          const cleanText = item.replace(/\*\*/g, '');
          return (
            <View key={index} style={styles.insightItem}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>{cleanText}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: '400',
  },
});
