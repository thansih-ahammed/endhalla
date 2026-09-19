import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts } from '../theme';

interface AvatarProps {
  name?: string;
  size?: number;
  /** 'square' gives the rounded-square look used on cards, 'round' a full circle */
  shape?: 'square' | 'round';
  badge?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Initial-letter avatar. Optional numeric badge (unread count) on the top-right corner.
 */
export default function Avatar({ name, size = px(56), shape = 'square', badge, style }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const radius = shape === 'round' ? size / 2 : size * 0.32;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[styles.box, { width: size, height: size, borderRadius: radius }]}>
        <Text style={[styles.initial, { fontSize: size * 0.36 }]}>{initial}</Text>
      </View>
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: fonts.sans.semiBold,
    color: colors.avatarText,
  },
  badge: {
    position: 'absolute',
    top: -px(4),
    right: -px(4),
    minWidth: px(20),
    height: px(20),
    paddingHorizontal: px(5),
    borderRadius: px(10),
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontFamily: fonts.sans.bold,
    fontSize: px(10),
  },
});
