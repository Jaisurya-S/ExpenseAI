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
          <View
            style={[
              styles.sparkleIconBox,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Sparkles size={13} color={colors.text} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Smart Advisor</Text>
        </View>
        <View
          style={[
            styles.aiPill,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.aiPillText, { color: colors.textSecondary }]}>AI</Text>
        </View>
      </View>

      <View style={styles.insightsList}>
        {insights.slice(0, 2).map((item, index) => {
          const cleanText = item.replace(/\*\*/g, '');
          return (
            <View key={index} style={styles.insightItem}>
              <View style={[styles.bullet, { backgroundColor: colors.textSecondary }]} />
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  aiPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '700',
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
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
  },
  insightText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
    fontWeight: '400',
  },
});
