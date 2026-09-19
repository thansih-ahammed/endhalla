import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import ArrowLeftIcon from '../../../shared/assets/icons/back-icon.svg';
import ProgressBar from '../../../shared/components/ProgressBar';
import CustomButton from '../../../shared/components/CustomButton';
import OTPInput from '../../../shared/components/OTPInput';
import { useAppDispatch } from '../../../shared/store';
import { loginUser } from '../../../shared/store/authSlice';
import { setOnboardingPhone } from '../../../shared/store/counsellorOnboardingSlice';
import { useVerifyCounsellorOTPMutation } from '../../../shared/store/api/counsellorApi';

export default function OTPVerificationScreen({ route, navigation }: any) {
  const dispatch = useAppDispatch();
  const [verifyOTP, { isLoading }] = useVerifyCounsellorOTPMutation();
  const phone = route?.params?.phone || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleCodeChange = (val: string) => {
    setCode(val);
    if (error) setError('');
  };

  const handleVerify = async () => {
    try {
      const result = await verifyOTP({ phone, otp: code }).unwrap();
      dispatch(
        loginUser({
          token: result.token,
          user: result.user,
        })
      );
      if (result.counsellor?.isOnboardingComplete) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        dispatch(setOnboardingPhone(phone));
        navigation.navigate('FullName', { phone });
      }
    } catch (e: any) {
      setError(e?.data?.message || 'Invalid verification code. Please try again.');
      setCode('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <ProgressBar progress={0.2} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeftIcon width={px(22)} height={px(22)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>Sent to your number via SMS.</Text>

            <OTPInput value={code} onChange={handleCodeChange} hasError={!!error} />

            {!!error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendTimer}>Resend in 0:42</Text></Text>
          </View>

          <View style={styles.footer}>
            <CustomButton
              title="Verify"
              onPress={handleVerify}
              disabled={code.length !== 6 || isLoading}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: px(24),
    paddingTop: px(12),
  },
  backButton: {
    width: px(38),
    height: px(38),
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: px(16),
  },
  content: {
    flex: 1,
    paddingHorizontal: px(24),
  },
  title: {
    fontSize: px(24),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(8),
  },
  subtitle: {
    fontSize: px(14),
    color: colors.textSecondary,
    marginBottom: px(32),
    fontFamily: fonts.sans.regular,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    textAlign: 'left',
    marginBottom: px(16),
  },
  resendText: {
    fontFamily: fonts.sans.regular,
    fontSize: px(14),
    color: colors.textSecondary,
    marginTop: px(8),
  },
  resendTimer: {
    color: colors.primary,
    fontFamily: fonts.sans.medium,
  },
  footer: {
    paddingHorizontal: px(24),
    paddingBottom: px(24),
  },
});
