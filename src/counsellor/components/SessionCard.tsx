import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { px } from '../../shared/utils/responsive';
import { colors, fonts } from '../theme';
import Avatar from '../../shared/components/Avatar';
import { BookingRecord, BookingStatus, SESSION_DURATION_MIN, relativeDayLabel } from '../../shared/utils/bookings';

interface SessionCardProps {
  booking: BookingRecord;
  /** Gradient "Next up" treatment for the first session of the day. */
  highlight?: boolean;
  /** Prefix the time with Today / Tomorrow / date. */
  showDay?: boolean;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Client avatar + "Voice · 10:00 AM · 40 min" row used on Home and Schedule. */
export default function SessionCard({ booking, highlight = false, showDay = false, rightElement, onPress, style }: SessionCardProps) {
  const name = booking.clientName || 'Client';
  const parts: string[] = [booking.sessionType];
  if (showDay) parts.push(relativeDayLabel(booking));
  parts.push(booking.timeText, `${SESSION_DURATION_MIN} min`);
  const subtitle = parts.join(' · ');

  const body = (
    <>
      <Avatar name={name} size={px(64)} shape={highlight ? 'round' : 'square'} />
      <View style={styles.textCol}>
        <Text style={[styles.name, highlight && styles.nameLight]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.subtitle, highlight && styles.subtitleLight]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
    </>
  );

  if (highlight) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress} style={style}>
        <LinearGradient colors={colors.primaryGradient} useAngle angle={100} style={styles.card}>
          {body}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress} style={[styles.card, styles.cardDefault, style]}>
      {body}
    </TouchableOpacity>
  );
}

/** "Next up" chip rendered on the highlighted card. */
export function NextUpPill() {
  return (
    <View style={styles.nextUp}>
      <Text style={styles.nextUpText}>Next up</Text>
    </View>
  );
}

const STATUS_STYLES: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  confirmed: { bg: colors.primaryLight, text: colors.primary, label: 'confirmed' },
  completed: { bg: colors.neutralPill, text: colors.textSecondary, label: 'Completed' },
  cancelled: { bg: colors.dangerLight, text: colors.danger, label: 'Cancelled' },
};

/** Booking status chip (confirmed / Completed / Cancelled). */
export function StatusPill({ status }: { status: BookingStatus }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.confirmed;
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: px(28),
    paddingVertical: px(18),
    paddingHorizontal: px(18),
    marginBottom: px(14),
  },
  cardDefault: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textCol: {
    flex: 1,
    marginLeft: px(16),
  },
  name: {
    fontSize: px(18),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginBottom: px(4),
  },
  nameLight: {
    color: colors.white,
  },
  subtitle: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    lineHeight: px(20),
  },
  subtitleLight: {
    color: 'rgba(255,255,255,0.85)',
  },
  right: {
    marginLeft: px(10),
  },
  nextUp: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: px(16),
    paddingVertical: px(10),
    borderRadius: px(22),
  },
  nextUpText: {
    color: colors.white,
    fontFamily: fonts.sans.semiBold,
    fontSize: px(15),
  },
  statusPill: {
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: px(16),
  },
  statusText: {
    fontFamily: fonts.sans.medium,
    fontSize: px(14),
  },
});
