import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExpenseCategory } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import { Icons } from '../ui/icons';

interface CategoryBadgeProps {
  category: ExpenseCategory;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  showIcon = true,
  showLabel = true,
}) => {
  const meta = CATEGORIES[category] || CATEGORIES.Other;
  
  // Dynamically resolve icon from shadcn Icons
  const IconComponent = (Icons as any)[meta.iconName] || Icons.CirclePlus;
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 15;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: meta.bgColor, borderColor: meta.color + '40' },
        size === 'sm' && styles.smBadge,
        size === 'lg' && styles.lgBadge,
      ]}
    >
      {showIcon && (
        <IconComponent
          size={iconSize}
          color={meta.color}
          style={showLabel ? { marginRight: 6 } : undefined}
        />
      )}
      {showLabel && (
        <Text
          style={[
            styles.label,
            { color: meta.color },
            size === 'sm' && styles.smLabel,
            size === 'lg' && styles.lgLabel,
          ]}
          numberOfLines={1}
        >
          {meta.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  smBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lgBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  smLabel: {
    fontSize: 10,
  },
  lgLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
