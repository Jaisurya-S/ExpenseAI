import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, Mic, Plus, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '../../hooks/use-theme';

interface QuickActionGridProps {
  onScanPress: () => void;
  onVoicePress: () => void;
  onManualPress: () => void;
  onAiChatPress?: () => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  onScanPress,
  onVoicePress,
  onManualPress,
  onAiChatPress,
}) => {
  const { colors, isDark } = useAppTheme();

  const actions = [
    {
      id: 'manual',
      label: 'Add',
      sublabel: 'Manual',
      icon: Plus,
      color: colors.primary,
      bgColor: colors.primaryLight,
      onPress: onManualPress,
    },
    {
      id: 'scan',
      label: 'Scan',
      sublabel: 'Receipt OCR',
      icon: Camera,
      color: '#0284C7',
      bgColor: 'rgba(2, 132, 199, 0.12)',
      onPress: onScanPress,
    },
    {
      id: 'voice',
      label: 'Voice',
      sublabel: 'AI Dictation',
      icon: Mic,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.12)',
      onPress: onVoicePress,
    },
    {
      id: 'ai',
      label: 'Advisor',
      sublabel: 'Insights',
      icon: Sparkles,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      onPress: onAiChatPress || onManualPress,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={item.onPress}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                <Icon size={20} color={item.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.actionSub, { color: colors.textSecondary }]}>{item.sublabel}</Text>
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
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
