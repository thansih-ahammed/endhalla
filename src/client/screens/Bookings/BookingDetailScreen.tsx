import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import {
  useGetBookingByIdQuery,
  useLazyGetCallTokenQuery,
  useEndCallMutation,
  useLazyGetChatChannelQuery,
  useLazyGetChatTokenQuery,
  useCancelBookingMutation,
} from '../../../shared/store/api/clientApi';
import JoinCallButton from '../../../shared/videoCall/JoinCallButton';
import { useAppAlert } from '../../../shared/components/AlertProvider';

export default function BookingDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  // Polls while this screen is open so callStatus catches up if the
  // counsellor starts the call while the client is already sitting here —
  // otherwise the Join Call button never appears without leaving and
  // re-entering the screen (no live push forces a refetch on its own).
  const { data, isLoading } = useGetBookingByIdQuery(bookingId, {
    pollingInterval: 4000,
    skipPollingIfUnfocused: true,
    refetchOnMountOrArgChange: true,
  });
  const [fetchCallToken, { isFetching: isJoining }] = useLazyGetCallTokenQuery();
  const [endCall] = useEndCallMutation();
  const [fetchChatChannel] = useLazyGetChatChannelQuery();
  const [fetchChatToken] = useLazyGetChatTokenQuery();
  const [isMessaging, setIsMessaging] = useState(false);
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const { showAlert, confirm } = useAppAlert();

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Cancel this booking?',
      message: 'This frees the slot and cannot be undone — you would need to book again.',
      confirmText: 'Cancel booking',
      cancelText: 'Keep booking',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelBooking(bookingId).unwrap();
      navigation.goBack();
    } catch (err: any) {
      showAlert({
        title: 'Could not cancel',
        message: err?.data?.message || 'Please try again.',
        tone: 'error',
      });
    }
  };

  const booking = data?.data;

  const handleMessage = async () => {
    setIsMessaging(true);
    try {
      const [channelResult, tokenResult] = await Promise.all([
        fetchChatChannel(bookingId).unwrap(),
        fetchChatToken().unwrap(),
      ]);
      navigation.navigate('ChatScreen', {
        channelId: channelResult.channelId,
        chatToken: tokenResult,
        otherUserName: booking.counsellorName,
      });
    } catch (err: any) {
      showAlert({ title: 'Unable to open chat', message: err?.data?.message || 'Please try again.', tone: 'error' });
    } finally {
      setIsMessaging(false);
    }
  };

  const handleJoinCall = async () => {
    try {
      const result = await fetchCallToken(bookingId).unwrap();
      navigation.navigate('VideoCall', {
        bookingId,
        callToken: result,
        onCallEnd: () => endCall(bookingId),
        role: 'client',
        otherUserName: booking.counsellorName,
      });
    } catch (err: any) {
      const reason = err?.data?.reason;
      const message =
        reason === 'not_started'
          ? "The counsellor hasn't started the call yet. Please wait."
          : reason === 'expired'
          ? 'This call has already ended.'
          : err?.data?.message || 'Could not join the call. Please try again.';
      showAlert({ title: 'Unable to join call', message, tone: 'error' });
    }
  };

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{booking.counsellorName}</Text>
          <Text style={styles.subtitle}>{booking.sessionType} session</Text>

          <View style={styles.card}>
            <Row label="Date" value={booking.dateText} />
            <Row label="Time" value={booking.timeText} />
            <Row label="Status" value={booking.status} />
            <Row label="Price" value={`₹${booking.price}`} />
          </View>

          <View style={{ marginTop: px(24) }}>
            <JoinCallButton
              sessionType={booking.sessionType}
              status={booking.status}
              callStatus={booking.callStatus}
              role="client"
              loading={isJoining}
              onPress={handleJoinCall}
            />
          </View>

          {booking.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleMessage}
              disabled={isMessaging}
            >
              <Text style={styles.messageButtonText}>
                {isMessaging ? 'Opening...' : 'Message Counsellor'}
              </Text>
            </TouchableOpacity>
          )}

          {booking.status === 'confirmed' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isCancelling}>
              <Text style={styles.cancelButtonText}>
                {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: px(20),
    paddingTop: px(12),
    paddingBottom: px(40),
  },
  title: {
    fontFamily: fonts.sans.bold,
    fontSize: px(22),
    color: colors.black,
  },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: px(14),
    color: colors.textSecondary,
    marginBottom: px(20),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: px(16),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(16),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: px(8),
  },
  rowLabel: {
    fontFamily: fonts.sans.regular,
    fontSize: px(14),
    color: colors.textSecondary,
  },
  rowValue: {
    fontFamily: fonts.sans.medium,
    fontSize: px(14),
    color: colors.black,
    textTransform: 'capitalize',
  },
  messageButton: {
    marginTop: px(12),
    alignItems: 'center',
    paddingVertical: px(12),
    borderRadius: px(10),
    borderWidth: 1,
    borderColor: colors.primary,
  },
  messageButtonText: {
    fontFamily: fonts.sans.medium,
    fontSize: px(14),
    color: colors.primary,
  },
  cancelButton: {
    marginTop: px(12),
    paddingVertical: px(14),
    borderRadius: px(12),
    borderWidth: 1,
    borderColor: colors.dangerLight,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.danger,
    fontFamily: fonts.sans.semiBold,
    fontSize: px(14),
  },
});
