import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts } from '../theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** "Today's sessions ........ View schedule" style row. */
export default function SectionHeader({ title, actionLabel, onActionPress, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Small uppercase group label used above settings groups ("PROFILE", "ACCOUNT"). */
export function GroupLabel({ title, style }: { title: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.groupLabelBox, style]}>
      <Text style={styles.groupLabel}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(14),
  },
  title: {
    fontSize: px(18),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  action: {
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  groupLabelBox: {
    marginBottom: px(10),
    marginTop: px(4),
  },
  groupLabel: {
    fontSize: px(12),
    fontFamily: fonts.sans.bold,
    color: '#8A8A8A',
    letterSpacing: 0.8,
  },
});
