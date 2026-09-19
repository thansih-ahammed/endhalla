import React, { useEffect, useRef } from 'react';
import { View, Pressable, Platform, StyleSheet, Animated, LayoutAnimation, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { px } from '../utils/responsive';
import { colors, fonts } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type TabIconRenderer = (label: string, color: string) => React.ReactNode;

interface AnimatedTabItemProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  renderIcon: TabIconRenderer;
}

function AnimatedTabItem({ label, isFocused, onPress, renderIcon }: AnimatedTabItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }).start();
  };

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onPress();
  };

  const iconScale = focusAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1.1] });
  const labelOpacity = focusAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });
  const labelTranslateX = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });
  const inactiveIconOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const activeIconOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          styles.tabItemBase,
          isFocused ? styles.tabItemActive : styles.tabItemInactive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View style={[styles.iconStack, { transform: [{ scale: iconScale }] }]}>
          {/* Inactive Icon Layer */}
          <Animated.View style={{ opacity: inactiveIconOpacity }}>{renderIcon(label, '#8E8E93')}</Animated.View>
          {/* Active Icon Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: activeIconOpacity }]}>
            {renderIcon(label, '#FFFFFF')}
          </Animated.View>
        </Animated.View>

        {isFocused && (
          <Animated.Text
            style={[styles.tabTextActive, { opacity: labelOpacity, transform: [{ translateX: labelTranslateX }] }]}
          >
            {label}
          </Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

interface AnimatedTabBarProps {
  state: any;
  navigation: any;
  renderIcon: TabIconRenderer;
}

/**
 * Bottom tab bar with the animated "pill" active state. Pass it to
 * `<Tab.Navigator tabBar={props => <AnimatedTabBar {...props} renderIcon={...} />}>`.
 */
export default function AnimatedTabBar({ state, navigation, renderIcon }: AnimatedTabBarProps) {
  // Edge-to-edge Android (and iPhones with a home indicator) draw the system
  // nav bar over our content, so pad by the real inset instead of a guess.
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, px(10));
  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
      {state.routes.map((route: any, index: number) => {
        const label = route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return <AnimatedTabItem key={route.key} label={label} isFocused={isFocused} onPress={onPress} renderIcon={renderIcon} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: px(10),
    paddingHorizontal: px(16),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItemBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: px(24),
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    paddingHorizontal: px(16),
    paddingVertical: px(10),
    gap: px(8),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  tabItemInactive: {
    backgroundColor: 'transparent',
    paddingHorizontal: px(12),
    paddingVertical: px(10),
  },
  iconStack: {
    position: 'relative',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.sans.bold,
    fontSize: px(14),
    letterSpacing: 0.2,
  },
});
