import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts } from '../theme';
import { ChevronRightIcon } from './Icons';

export interface SettingsRowProps {
  icon?: React.ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  titleColor?: string;
}

/** One row inside a SettingsGroup: icon, title, optional value, chevron. */
export function SettingsRow({ icon, title, value, onPress, showChevron = true, rightElement, titleColor }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      <View style={styles.left}>
        {icon ? <View style={styles.iconBox}>{icon}</View> : null}
        <Text style={[styles.title, titleColor ? { color: titleColor } : null]}>{title}</Text>
      </View>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {rightElement}
        {showChevron ? <ChevronRightIcon size={px(16)} color={colors.chevron} /> : null}
      </View>
    </TouchableOpacity>
  );
}

interface SettingsGroupProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** White rounded card that stacks SettingsRow children with dividers between them. */
export default function SettingsGroup({ children, style }: SettingsGroupProps) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {rows.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < rows.length - 1 ? <View style={styles.divider} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.card,
    borderRadius: px(22),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: px(20),
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: px(16),
    paddingVertical: px(16),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
    flexShrink: 1,
  },
  iconBox: {
    width: px(22),
    alignItems: 'center',
  },
  title: {
    fontSize: px(15),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(8),
  },
  value: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: px(52),
  },
});
