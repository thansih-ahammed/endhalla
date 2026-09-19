import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import { useGetCounsellorBookingByIdQuery } from '../../../shared/store/api/counsellorApi';
import { SESSION_DURATION_MIN, longDateLabel, relativeDayLabel } from '../../../shared/utils/bookings';
import { useSessionActions } from '../../hooks/useSessionActions';

import Header from '../../../shared/components/Header';
import Avatar from '../../../shared/components/Avatar';
import CustomButton from '../../../shared/components/CustomButton';
import EmptyState from '../../../shared/components/EmptyState';
import { CalendarIcon, ClockIcon, MessageIcon, VideoIcon, PhoneIcon } from '../../../shared/components/Icons';
import { StatusPill } from '../../components/SessionCard';

const SESSION_ICON = {
  Video: VideoIcon,
  Voice: PhoneIcon,
  Chat: MessageIcon,
};

export default function SessionDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;

  // Polls so callStatus stays fresh while the counsellor sits on this screen
  // (e.g. the client ends the call from their side).
  const { data, isLoading, isError } = useGetCounsellorBookingByIdQuery(bookingId, {
    pollingInterval: 4000,
    skipPollingIfUnfocused: true,
    refetchOnMountOrArgChange: true,
  });
  const { joinCall, openChat, joiningId, messagingId } = useSessionActions(navigation);

  const booking = data?.data;

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (isError || !booking) {
      return <EmptyState title="Session not found" subtitle="This booking may have been removed." />;
    }

    const TypeIcon = SESSION_ICON[booking.sessionType] || MessageIcon;
    const isConfirmed = booking.status === 'confirmed';
    const callEnded = booking.callStatus === 'ended';
    const callLabel = booking.callStatus === 'ongoing' ? 'Join Call' : 'Start Call';

    return (
      <>
        {/* Client card */}
        <View style={styles.card}>
          <View style={styles.clientRow}>
            <Avatar name={booking.clientName} size={px(64)} shape="round" />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>
                {booking.clientName || 'Client'}
              </Text>
              <Text style={styles.clientMeta}>{booking.sessionType} session</Text>
            </View>
            <StatusPill status={booking.status} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <CalendarIcon size={px(18)} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {relativeDayLabel(booking)} · {longDateLabel(booking)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <ClockIcon size={px(18)} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {booking.timeText} · {SESSION_DURATION_MIN} min
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <TypeIcon size={px(18)} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoLabel}>Type & fee</Text>
              <Text style={styles.infoValue}>
                {booking.sessionType} · {/^\d/.test(String(booking.price)) ? `₹${booking.price}` : booking.price}
              </Text>
            </View>
          </View>
          {booking.notes ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.infoLabel}>Client notes</Text>
              <Text style={styles.notes}>{booking.notes}</Text>
            </>
          ) : null}
        </View>

        {/* Actions */}
        {isConfirmed ? (
          <View style={styles.actions}>
            {booking.sessionType === 'Video' ? (
              <CustomButton
                title={callEnded ? 'Call ended' : callLabel}
                disabled={callEnded}
                loading={joiningId === booking._id}
                leftIcon={callEnded ? undefined : <VideoIcon size={px(20)} color={colors.white} />}
                onPress={() => joinCall(booking)}
              />
            ) : null}
            <CustomButton
              title="Message client"
              variant={booking.sessionType === 'Video' ? 'secondary' : 'primary'}
              loading={messagingId === booking._id}
              leftIcon={
                <MessageIcon size={px(20)} color={booking.sessionType === 'Video' ? colors.primary : colors.white} />
              }
              onPress={() => openChat(booking)}
            />
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          <Header title="Session details" onBackPress={() => navigation.goBack()} />
          {renderBody()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: px(20),
    paddingTop: px(8),
    paddingBottom: px(40),
  },
  centered: {
    paddingVertical: px(60),
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: px(24),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(20),
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    marginHorizontal: px(14),
  },
  clientName: {
    fontSize: px(20),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginBottom: px(2),
  },
  clientMeta: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: px(18),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(16),
  },
  infoIcon: {
    width: px(40),
    height: px(40),
    borderRadius: px(20),
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(14),
  },
  infoLabel: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginBottom: px(2),
  },
  infoValue: {
    fontSize: px(15),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  notes: {
    fontSize: px(15),
    fontFamily: fonts.sans.regular,
    color: colors.black,
    lineHeight: px(22),
    marginTop: px(4),
  },
  actions: {
    marginTop: px(24),
    gap: px(12),
  },
});
