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
  background: '#F9F8F5',
  primary: '#5A7A5F', // Based on the button color from your design
  primaryLight: '#EBF0EB',
  primaryDark: '#4A684F',
  primaryGradient: ['#5A7A5F', '#7A9A7F'],
  text: '#1C1C1E',
  black: '#1A1A1A',
  pureBlack: '#000000',
  textSecondary: '#7A7870',
  muted: '#7A7870',
  white: '#FFFFFF',
  card: '#FFFFFF',
  inputBg: '#F4F4F4',
  inputLight: '#F0EDE7',
  lightGreen: '#EBF0EB',
  border: '#E5E2DB',
  borderColor: '#E5E2DB',
  divider: '#F4F2EB',
  avatarBg: '#EEF5F0',
  avatarText: '#4A684F',
  chevron: '#C2C0B8',
  star: '#F59E0B',
  success: '#5A7A5F',
  successLight: '#EBF0EB',
  danger: '#D32F2F',
  dangerLight: '#F2D6D6',
  dark: '#1E2A20',
  darkGradient: ['#1E2A20', '#2E3F31'],
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
