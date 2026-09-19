import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts, borderRadius } from '../theme';
import BackIcon from '../assets/icons/back-icon.svg';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBackPress?: () => void;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

export default function Header({
  title,
  subtitle,
  onBackPress,
  showBack = true,
  rightElement,
  containerStyle,
  titleStyle,
  subtitleStyle,
}: HeaderProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            onPress={onBackPress}
            activeOpacity={0.7}
            style={styles.backBtnContainer}
          >
            <BackIcon width={px(18)} height={px(18)} color={colors.black} />
          </TouchableOpacity>
        )}
        {(title || subtitle) ? (
          <View style={styles.titleColumn}>
            {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
            {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
          </View>
        ) : null}
      </View>
      {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: px(8),
    marginBottom: px(16),
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
  },
  backBtnContainer: {
    width: px(44),
    height: px(44),
    borderRadius: borderRadius.container,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  title: {
    fontSize: px(20),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
});
