import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import ArrowLeftIcon from '../../../shared/assets/icons/back-icon.svg';
import ProgressBar from '../../../shared/components/ProgressBar';
import CustomButton from '../../../shared/components/CustomButton';
import { useAppDispatch } from '../../../shared/store';
import { setOnboardingGender } from '../../../shared/store/counsellorOnboardingSlice';
// Simulating the checkmark
const CheckIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
  </View>
);

export default function GenderScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: 'Female', label: 'Female', icon: '👩' },
    { id: 'Male', label: 'Male', icon: '👨' },
  ];

  const handleContinue = () => {
    if (!selected) return;
    dispatch(setOnboardingGender(selected));
    navigation.navigate('Experience');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <ProgressBar progress={0.4} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeftIcon width={px(22)} height={px(22)} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.title}>Your gender</Text>
          <Text style={styles.subtitle}>Some clients prefer counsellors of a specific gender. This helps us match better.</Text>

          <View style={styles.optionsContainer}>
            {options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => setSelected(option.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.emojiText}>{option.icon}</Text>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
                  </View>
                  {isSelected && <CheckIcon color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <CustomButton 
            title="Continue"
            onPress={handleContinue}
            disabled={!selected}
          />
        </View>
      </KeyboardAvoidingView>
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
  optionsContainer: {
    gap: px(12),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: px(20),
    borderRadius: px(16),
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF0FF', // Light blue tint
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(16),
  },
  emojiText: {
    fontSize: px(24),
  },
  optionLabel: {
    fontSize: px(16),
    fontFamily: fonts.sans.medium,
    color: '#1A1A1A',
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: px(24),
    paddingBottom: px(24),
  },
});
