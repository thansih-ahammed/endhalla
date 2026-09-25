import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { px } from '../utils/responsive';
import { colors, fonts, borderRadius } from '../theme';
import { CheckIcon, CloseIcon, ShieldIcon } from './Icons';

export type AppModalTone = 'success' | 'error' | 'warning' | 'info';

export interface AppModalButton {
  text: string;
  /** 'primary' fills with the app colour, 'destructive' is red, 'cancel' is muted. */
  style?: 'primary' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
  loading?: boolean;
}

export interface AppModalProps {
  visible: boolean;
  title: string;
  message?: string;
  tone?: AppModalTone;
  buttons?: AppModalButton[];
  /** Tapping the backdrop / hardware back. Omit to make the modal non-dismissable. */
  onDismiss?: () => void;
}

const TONE: Record<AppModalTone, { bg: string; fg: string }> = {
  success: { bg: colors.successLight, fg: colors.success },
  error: { bg: colors.dangerLight, fg: colors.danger },
  warning: { bg: '#FDF3E2', fg: '#B76E00' },
  info: { bg: colors.primaryLight, fg: colors.primary },
};

const ToneIcon = ({ tone, color }: { tone: AppModalTone; color: string }) => {
  const size = px(26);
  if (tone === 'success') return <CheckIcon size={size} color={color} strokeWidth={2.6} />;
  if (tone === 'error') return <CloseIcon size={size} color={color} strokeWidth={2.6} />;
  return <ShieldIcon size={size} color={color} />;
};

/**
 * Themed replacement for React Native's `Alert`. Colours come from the active
 * app's theme, so it is green in the client app and blue for counsellors.
 * Usually driven through `useAppAlert()` rather than rendered directly.
 */
export default function AppModal({ visible, title, message, tone = 'info', buttons, onDismiss }: AppModalProps) {
  const palette = TONE[tone] || TONE.info;
  const actions: AppModalButton[] = buttons?.length ? buttons : [{ text: 'OK', style: 'primary' }];
  // Two short buttons sit side by side; anything else stacks.
  const inline = actions.length === 2 && actions.every((b) => b.text.length <= 14);

  const renderButton = (btn: AppModalButton, index: number) => {
    const isCancel = btn.style === 'cancel';
    const isDestructive = btn.style === 'destructive';
    return (
      <TouchableOpacity
        key={`${btn.text}-${index}`}
        activeOpacity={0.85}
        disabled={btn.loading}
        onPress={() => {
          onDismiss?.();
          btn.onPress?.();
        }}
        style={[
          styles.button,
          inline && styles.buttonInline,
          isCancel ? styles.buttonCancel : isDestructive ? styles.buttonDestructive : styles.buttonPrimary,
          btn.loading && styles.buttonDisabled,
        ]}
      >
        {btn.loading ? (
          <ActivityIndicator size="small" color={isCancel ? colors.textSecondary : colors.white} />
        ) : (
          <Text style={[styles.buttonText, isCancel ? styles.buttonTextCancel : styles.buttonTextFilled]}>{btn.text}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop}>
          {/* Inner wrapper stops backdrop taps from closing when the card itself is tapped. */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
                <ToneIcon tone={tone} color={palette.fg} />
              </View>

              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              <View style={[styles.actions, inline && styles.actionsInline]}>{actions.map(renderButton)}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,16,20,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: px(28),
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: px(24),
    paddingTop: px(28),
    paddingBottom: px(22),
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: px(58),
    height: px(58),
    borderRadius: px(29),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: px(18),
  },
  title: {
    fontSize: px(19),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    textAlign: 'center',
  },
  message: {
    fontSize: px(15),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: px(22),
    marginTop: px(8),
  },
  actions: {
    width: '100%',
    marginTop: px(24),
    gap: px(10),
  },
  actionsInline: {
    flexDirection: 'row-reverse',
  },
  button: {
    height: px(52),
    borderRadius: px(16),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: px(16),
  },
  buttonInline: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDestructive: {
    backgroundColor: colors.danger,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
  },
  buttonTextFilled: {
    color: colors.white,
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
});
