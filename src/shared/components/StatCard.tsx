import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts, borderRadius } from '../theme';

interface StatCardProps {
  icon?: React.ReactNode;
  value: string;
  label: string;
  /** Rendered inline after the value (e.g. a star glyph). */
  valueSuffix?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** White bordered card: icon, big value, small label. Used in dashboard stat rows. */
export default function StatCard({ icon, value, label, valueSuffix, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {valueSuffix}
      </View>
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </View>
  );
}

/** Compact grey pill variant (value on top, label below) used inside profile cards. */
export function StatPill({ value, label, valueSuffix, style }: Omit<StatCardProps, 'icon'>) {
  return (
    <View style={[styles.pill, style]}>
      <View style={styles.valueRow}>
        <Text style={styles.pillValue}>{value}</Text>
        {valueSuffix}
      </View>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: px(16),
    paddingVertical: px(18),
  },
  icon: {
    marginBottom: px(16),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(4),
  },
  value: {
    fontSize: px(20),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  label: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginTop: px(4),
  },
  pill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: px(14),
    alignItems: 'center',
  },
  pillValue: {
    fontSize: px(18),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  pillLabel: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginTop: px(2),
  },
});
