import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import ScreenContainer from '../../../shared/components/ScreenContainer';
import CustomButton from '../../../shared/components/CustomButton';
import MessageIcon from '../../../shared/assets/icons/message-icon.svg';
import SheeldIcon from '../../../shared/assets/icons/sheeld-icon.svg';
import { px, verticalScale } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import LinearGradient from 'react-native-linear-gradient';

export default function LoginScreen({ navigation }: any) {
  return (
    <ScreenContainer style={styles.centerContent}>
      <View style={styles.content}>
        <LinearGradient
          colors={['#5865F2', '#8B8FF8']}
          useAngle={true}
          angle={135}
          style={styles.iconContainer}
        >
          <MessageIcon width={px(40)} height={px(40)} fill="#fff" />
        </LinearGradient>
        <Text style={styles.title}>Endhalla</Text>
        <Text style={styles.subtitle}>Counsellor Platform</Text>
        <Text style={styles.description}>Support clients on their journey</Text>
        <View style={styles.privacyContainer}>
          <SheeldIcon color={colors.primary} />
          <Text style={styles.privacyText}>Verified · Secure · Trusted</Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <CustomButton
          title="I'm a counsellor"
          onPress={() => navigation.navigate('PhoneInput')}
        />
        <Text style={styles.agreeText}>By continuing you agree to our Counsellor Terms & Code of Ethics</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: px(80),
    height: px(80),
    borderRadius: px(24),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  title: {
    fontFamily: fonts.serif.regular,
    fontSize: px(30),
    color: colors.text,
    marginTop: verticalScale(24),
  },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: px(14),
    color: colors.textSecondary,
    marginTop: verticalScale(5),
    marginBottom: verticalScale(4),

  },
  description: {
    fontFamily: fonts.sans.regular,
    fontSize: px(16),
    color: colors.textSecondary,
    marginBottom: verticalScale(12),
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(8),
    marginTop: verticalScale(12),
    backgroundColor: '#F5F8FF', // Light blue background for counsellor
    paddingHorizontal: px(16),
    paddingVertical: px(8),
    borderRadius: px(20),
  },
  privacyText: {
    color: colors.primary,
    fontFamily: fonts.sans.regular,
    fontSize: px(14),
  },
  buttonContainer: {
    gap: px(12),
    width: '100%',
  },
  agreeText: {
    fontFamily: fonts.sans.regular,
    fontSize: px(12),
    color: colors.textSecondary,
    textAlign: 'center',
  }
});
