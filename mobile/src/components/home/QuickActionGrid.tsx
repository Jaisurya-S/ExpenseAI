import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, Mic, Plus, Sparkles } from '../ui/icons';
import { useAppTheme } from '../../hooks/use-theme';

interface QuickActionGridProps {
  onScanPress: () => void;
  onVoicePress: () => void;
  onAddExpensePress?: () => void;
  onAiChatPress?: () => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  onScanPress,
  onVoicePress,
  onAddExpensePress,
  onAiChatPress,
}) => {
  const { colors, isDark } = useAppTheme();

  const actions = [
    {
      id: 'scan',
      label: 'Scan Bill',
      icon: Camera,
      onPress: onScanPress,
    },
    {
      id: 'voice',
      label: 'Voice Log',
      icon: Mic,
      onPress: onVoicePress,
    },
    {
      id: 'add-expense',
      label: 'Add Expense',
      icon: Plus,
      onPress: onAddExpensePress,
    },
    {
      id: 'ai-chat',
      label: 'AI Advisor',
      icon: Sparkles,
      onPress: onAiChatPress,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((item) => {
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={item.onPress}
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <IconComp size={18} color={colors.text} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
