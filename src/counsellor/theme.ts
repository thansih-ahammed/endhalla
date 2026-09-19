import { px } from '../shared/utils/responsive';

export const fonts = {
  sans: {
    regular: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    semiBold: 'DMSans-SemiBold',
    bold: 'DMSans-Bold',
    italic: 'DMSans-Italic',
    boldItalic: 'DMSans-BoldItalic',
  },
  serif: {
    regular: 'DMSerifDisplay-Regular',
    italic: 'DMSerifDisplay-Italic',
  },
};

export const colors = {
  background: '#F8F8FC',
  primary: '#5865F2', // Blue theme for counsellor
  primaryLight: '#EEF0FD',
  primaryDark: '#3F4BD1',
  primaryGradient: ['#5865F2', '#8B8FF8'],
  text: '#1C1C1E',
  black: '#1A1A1A',
  pureBlack: '#000000',
  textSecondary: '#7A7870',
  muted: '#7A7870',
  white: '#FFFFFF',
  card: '#FFFFFF',
  inputBg: '#F4F4F4',
  inputLight: '#F0EDE7',
  lightGreen: '#EEF0FD',
  border: '#ECEBF5',
  borderColor: '#ECEBF5',
  divider: '#F3F2F9',
  avatarBg: '#E6EDE7',
  avatarText: '#4A684F',
  chevron: '#C2C0C8',
  star: '#F59E0B',
  success: '#5A7A5F',
  successLight: '#EBF0EB',
  danger: '#D32F2F',
  dangerLight: '#F2D6D6',
  dark: '#1E1B33',
  darkGradient: ['#1E1B33', '#2E2A4A'],
  neutralPill: '#EFECE6',
};

export const borderRadius = {
  sm: px(8),
  md: px(12),
  card: px(16),
  container: px(16),
  lg: px(16),
  xl: px(20),
  xxl: px(24),
  full: 9999,
};

export const radii = borderRadius;
