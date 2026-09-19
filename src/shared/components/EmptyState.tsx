import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts, borderRadius } from '../theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Bordered card shown when a list has nothing to render. */
export default function EmptyState({ title, subtitle, icon, style }: EmptyStateProps) {
  return (
    <View style={[styles.card, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(24),
    alignItems: 'center',
  },
  icon: {
    marginBottom: px(12),
  },
  title: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: px(6),
    lineHeight: px(19),
  },
});
