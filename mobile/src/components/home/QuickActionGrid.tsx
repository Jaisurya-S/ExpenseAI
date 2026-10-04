import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Camera, Mic, Wallet, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '../../hooks/use-theme';

interface QuickActionGridProps {
  onScanPress: () => void;
  onVoicePress: () => void;
  onBudgetPress?: () => void;
  onAiChatPress?: () => void;
  onAddIncomePress?: () => void;
  onAddExpensePress?: () => void;
}

interface BouncyButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
}

const BouncyButton: React.FC<BouncyButtonProps> = ({ onPress, children, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.touchableWrapper}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  onScanPress,
  onVoicePress,
  onBudgetPress,
  onAiChatPress,
}) => {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* 1. Scan */}
        <BouncyButton
          onPress={onScanPress}
          style={[
            styles.toolBtn,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
              shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
            },
          ]}
        >
          <View
            style={[
              styles.toolIconBox,
              { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)' },
            ]}
          >
            <Camera size={18} color="#0284C7" />
          </View>
          <Text style={[styles.toolLabel, { color: colors.text }]}>Scan</Text>
        </BouncyButton>

        {/* 2. Voice */}
        <BouncyButton
          onPress={onVoicePress}
          style={[
            styles.toolBtn,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
              shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
            },
          ]}
        >
          <View
            style={[
              styles.toolIconBox,
              { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)' },
            ]}
          >
            <Mic size={18} color="#8B5CF6" />
          </View>
          <Text style={[styles.toolLabel, { color: colors.text }]}>Voice</Text>
        </BouncyButton>

        {/* 3. Budgets */}
        <BouncyButton
          onPress={onBudgetPress}
          style={[
            styles.toolBtn,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
              shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
            },
          ]}
        >
          <View
            style={[
              styles.toolIconBox,
              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)' },
            ]}
          >
            <Wallet size={18} color="#10B981" />
          </View>
          <Text style={[styles.toolLabel, { color: colors.text }]}>Budgets</Text>
        </BouncyButton>

        {/* 4. Assistant */}
        <BouncyButton
          onPress={onAiChatPress}
          style={[
            styles.toolBtn,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
              shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
            },
          ]}
        >
          <View
            style={[
              styles.toolIconBox,
              { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)' },
            ]}
          >
            <Sparkles size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.toolLabel, { color: colors.text }]}>Advisor</Text>
        </BouncyButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  touchableWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  toolIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
