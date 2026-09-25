import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import ArrowLeftIcon from '../../../shared/assets/icons/back-icon.svg';
import ProgressBar from '../../../shared/components/ProgressBar';
import CustomButton from '../../../shared/components/CustomButton';
import CustomInput from '../../../shared/components/CustomInput';
import { validateName } from '../../../shared/utils/validation';
import { useAppDispatch } from '../../../shared/store';
import { setOnboardingFullName } from '../../../shared/store/counsellorOnboardingSlice';

export default function FullNameScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const isValid = validateName(name);

  const handleContinue = () => {
    dispatch(setOnboardingFullName(name.trim()));
    navigation.navigate('Gender');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <ProgressBar progress={0.3} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeftIcon width={px(22)} height={px(22)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Your full name</Text>
            <Text style={styles.subtitle}>This will appear on your counsellor profile.</Text>

            <CustomInput
              placeholder="Full Name"
              placeholderTextColor="#9D9D9D"
              inputType="name"
              maxLength={30}
              value={name}
              onChangeText={setName}
              autoFocus={true}
            />
          </View>

          <View style={styles.footer}>
            <CustomButton
              title="Continue"
              disabled={!isValid}
              onPress={handleContinue}
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
    marginBottom: px(4),
  },
  subtitle: {
    fontSize: px(14),
    color: colors.textSecondary,
    marginBottom: px(32),
    fontFamily: fonts.sans.regular,
  },
  textInput: {
    backgroundColor: colors.inputLight,
    height: px(56),
    borderRadius: px(16),
    paddingHorizontal: px(16),
    fontSize: px(16),
    color: '#1A1A1A',
    fontFamily: fonts.sans.medium,
  },
  footer: {
    paddingHorizontal: px(24),
    paddingBottom: px(24),
  },
});
