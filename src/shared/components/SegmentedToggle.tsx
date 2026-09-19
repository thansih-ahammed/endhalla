import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts } from '../theme';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill-style two-or-more way toggle (e.g. Sessions / Availability, Active / History).
 */
export default function SegmentedToggle<T extends string>({ options, value, onChange, style }: SegmentedToggleProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, active && styles.segmentActive]}
            activeOpacity={0.85}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: px(28),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(4),
  },
  segment: {
    flex: 1,
    height: px(44),
    borderRadius: px(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fonts.sans.medium,
    fontSize: px(15),
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.white,
    fontFamily: fonts.sans.bold,
  },
});
