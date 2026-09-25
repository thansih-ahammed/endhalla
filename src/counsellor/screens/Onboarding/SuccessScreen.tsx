import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Path } from 'react-native-svg';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import CustomButton from '../../../shared/components/CustomButton';

const SuccessIcon = () => (
  <View style={styles.iconCircle}>
    <Svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12"></Polyline>
    </Svg>
  </View>
);

const SmallShieldIcon = () => (
  <View style={{ marginRight: px(12) }}>
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></Path>
    </Svg>
  </View>
);

export default function SuccessScreen({ navigation }: any) {
  // Auth session was already established for real at OTP verification —
  // this screen just finishes the local onboarding UI and moves on.
  const handleFinishOnboarding = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <SuccessIcon />
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Your counsellor profile is ready. Set your{'\n'}availability and start supporting clients.
        </Text>
        <View style={styles.infoBox}>
          <SmallShieldIcon />
          <Text style={styles.infoText}>
            Certificates submitted — under review{'\n'}(24–48 hrs)
          </Text>
        </View>
        <CustomButton
          title="Go to Dashboard"
          onPress={handleFinishOnboarding}
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: px(24),
  },
  iconCircle: {
    width: px(88),
    height: px(88),
    borderRadius: px(44),
    backgroundColor: '#F3F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: px(32),
  },
  title: {
    fontSize: px(28),
    fontFamily: fonts.serif.regular,
    color: colors.text,
    marginBottom: px(9),
  },
  subtitle: {
    fontSize: px(14),
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fonts.sans.regular,
    lineHeight: px(24),
    marginBottom: px(19),
  },
  infoBox: {
    backgroundColor: '#F5F8FF',
    paddingHorizontal: px(20),
    paddingVertical: px(16),
    borderRadius: px(16),
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: px(32)
  },
  infoText: {
    color: colors.primary,
    fontFamily: fonts.sans.medium,
    fontSize: px(14),
    lineHeight: px(20),
    flex: 1,
  },
  footer: {
    paddingHorizontal: px(24),
    paddingBottom: px(24),
  },
});
