import { useState } from 'react';
import {
  useLazyGetCounsellorCallTokenQuery,
  useEndCounsellorCallMutation,
  useLazyGetCounsellorChatChannelQuery,
  useLazyGetCounsellorChatTokenQuery,
} from '../../shared/store/api/counsellorApi';
import { BookingRecord } from '../../shared/utils/bookings';
import { useAppAlert } from '../../shared/components/AlertProvider';

/**
 * Start/join a video call or open the chat for a booking. Shared by Home,
 * Schedule and the session detail screen so the error handling lives in one place.
 */
export function useSessionActions(navigation: any) {
  const [fetchCallToken] = useLazyGetCounsellorCallTokenQuery();
  const [endCall] = useEndCounsellorCallMutation();
  const [fetchChatChannel] = useLazyGetCounsellorChatChannelQuery();
  const [fetchChatToken] = useLazyGetCounsellorChatTokenQuery();
  const { showAlert } = useAppAlert();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const joinCall = async (booking: Pick<BookingRecord, '_id' | 'clientName'>) => {
    setJoiningId(booking._id);
    try {
      const result = await fetchCallToken(booking._id).unwrap();
      navigation.navigate('VideoCall', {
        bookingId: booking._id,
        callToken: result,
        onCallEnd: () => endCall(booking._id),
        role: 'counsellor',
        otherUserName: booking.clientName,
      });
    } catch (err: any) {
      const reason = err?.data?.reason;
      const message =
        reason === 'expired' ? 'This call has already ended.' : err?.data?.message || 'Could not join the call. Please try again.';
      showAlert({ title: 'Unable to join call', message, tone: 'error' });
    } finally {
      setJoiningId(null);
    }
  };

  const openChat = async (booking: Pick<BookingRecord, '_id' | 'clientName'>) => {
    setMessagingId(booking._id);
    try {
      const [channelResult, tokenResult] = await Promise.all([fetchChatChannel(booking._id).unwrap(), fetchChatToken().unwrap()]);
      navigation.navigate('ChatScreen', {
        channelId: channelResult.channelId,
        chatToken: tokenResult,
        otherUserName: booking.clientName,
      });
    } catch (err: any) {
      showAlert({ title: 'Unable to open chat', message: err?.data?.message || 'Please try again.', tone: 'error' });
    } finally {
      setMessagingId(null);
    }
  };

  return { joinCall, openChat, joiningId, messagingId };
}
