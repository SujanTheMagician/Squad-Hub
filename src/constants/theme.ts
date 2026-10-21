/**
 * Squad Hub design tokens. Brand red comes from the Kalvium logo; each squad has its own colour.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14151A',
    background: '#F7F7FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEEEF3',
    textSecondary: '#6B6F7B',
    primary: '#E3262E',
    primarySoft: '#FDE8E8',
    onPrimary: '#FFFFFF',
    border: '#E6E6EC',
    danger: '#D92D20',
    shadow: '#1B1C2A',
  },
  dark: {
    text: '#F4F4F7',
    background: '#0C0D12',
    backgroundElement: '#171820',
    backgroundSelected: '#22232D',
    textSecondary: '#9A9DAB',
    primary: '#FF5A4E',
    primarySoft: '#3A1A1A',
    onPrimary: '#FFFFFF',
    border: '#2A2B36',
    danger: '#FF6369',
    shadow: '#000000',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Brand gradient (logo, sign-in hero, primary buttons). */
export const BrandGradient = ['#FF6B5B', '#E3262E'] as const;

export const SquadColors = {
  91: '#14B8A6',
  92: '#8B5CF6',
  93: '#F59E0B',
} as const;

/** Squad colours for chart marks, validated for colour-blind separation on each surface. */
export const SquadChartColors = {
  light: { 91: '#14B8A6', 92: '#8B5CF6', 93: '#F59E0B' },
  dark: { 91: '#0D9F90', 92: '#8B5CF6', 93: '#D97706' },
} as const;

export const TypeColors = {
  note: '#3B82F6',
  project: '#E3262E',
  idea: '#F59E0B',
  resource: '#10B981',
  doubt: '#EC4899',
} as const;

/** Plus Jakarta Sans weights, loaded in the root layout. Android needs one family per weight. */
export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** Room to leave at the bottom of tab screens for the floating tab bar. */
export const TabBarSpace = 110;
export const MaxContentWidth = 800;
