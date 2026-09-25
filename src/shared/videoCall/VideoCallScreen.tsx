import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  CallContent,
  useCallStateHooks,
} from '@stream-io/video-react-native-sdk';
import { requestCallPermissions } from '../utils/mediaPermissions';
import { colors, fonts, borderRadius } from '../theme';
import { px } from '../utils/responsive';

type PermissionState = 'checking' | 'granted' | 'denied';

/** Full-bleed dark surface shared by every pre-call state. */
function CallSurface({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.surface}>{children}</SafeAreaView>;
}

/**
 * Gates the call UI behind a "Calling…" waiting screen for the counsellor
 * until the client actually joins — otherwise the counsellor lands straight
 * in the live call view (their own camera) with nobody else there yet.
 * The client has no such gate: getting here already means the counsellor
 * started the call, so there's nothing to wait for on their side.
 */
function CallGate({
  role,
  otherUserName,
  onHangup,
}: {
  role: 'counsellor' | 'client';
  otherUserName: string;
  onHangup: () => void;
}) {
  const { useRemoteParticipants } = useCallStateHooks();
  const remoteParticipants = useRemoteParticipants();
  const isWaiting = role === 'counsellor' && remoteParticipants.length === 0;

  if (isWaiting) {
    return (
      <CallSurface>
        <View style={styles.waitingBody}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(otherUserName || '?').charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.waitingTitle}>{otherUserName}</Text>
          <View style={styles.statusPill}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.statusPillText}>Ringing…</Text>
          </View>
        </View>
        <View style={styles.waitingFooter}>
          <TouchableOpacity style={styles.endCallButton} onPress={onHangup} activeOpacity={0.85}>
            <Text style={styles.endCallButtonText}>End Call</Text>
          </TouchableOpacity>
          <Text style={styles.waitingHint}>Waiting for them to join</Text>
        </View>
      </CallSurface>
    );
  }

  return <CallContent onHangupCallHandler={onHangup} />;
}

export default function VideoCallScreen({ route, navigation }: any) {
  const { bookingId, callToken, onCallEnd, role = 'client', otherUserName = 'the other person' } = route.params;
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');

  useEffect(() => {
    let cancelled = false;
    requestCallPermissions().then((granted) => {
      if (!cancelled) setPermissionState(granted ? 'granted' : 'denied');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const client = useMemo(() => {
    if (permissionState !== 'granted') return null;
    return new StreamVideoClient({
      apiKey: callToken.apiKey,
      user: { id: callToken.userId, name: callToken.userName },
      token: callToken.token,
    });
  }, [permissionState, callToken]);

  const call = useMemo(() => {
    if (!client) return null;
    return client.call('default', callToken.callId);
  }, [client, callToken.callId]);

  useEffect(() => {
    if (!call) return;
    call.join({ create: true }).catch((err) => {
      console.error('Failed to join call:', err);
    });
    return () => {
      call.leave().catch(() => {});
    };
  }, [call]);

  const handleHangup = () => {
    onCallEnd?.(bookingId);
    navigation.goBack();
  };

  if (permissionState === 'checking') {
    return (
      <CallSurface>
        <View style={styles.centeredBody}>
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.connectingText}>Preparing your call…</Text>
        </View>
      </CallSurface>
    );
  }

  if (permissionState === 'denied') {
    return (
      <CallSurface>
        <View style={styles.centeredBody}>
          <Text style={styles.deniedTitle}>Camera & microphone needed</Text>
          <Text style={styles.deniedBody}>
            Endhalla needs access to your camera and microphone to connect this session.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.ghostButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </CallSurface>
    );
  }

  if (!client || !call) {
    return (
      <CallSurface>
        <View style={styles.centeredBody}>
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.connectingText}>Connecting…</Text>
        </View>
      </CallSurface>
    );
  }

  return (
    <View style={styles.container}>
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallGate role={role} otherUserName={otherUserName} onHangup={handleHangup} />
        </StreamCall>
      </StreamVideo>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  // colors.dark is the app's own dark surface, so the client reads green-black
  // and the counsellor blue-black without this file knowing which app it's in.
  surface: { flex: 1, backgroundColor: colors.dark },

  centeredBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: px(32) },
  connectingText: {
    marginTop: px(16),
    color: colors.white,
    fontFamily: fonts.sans.medium,
    fontSize: px(15),
    opacity: 0.8,
  },

  waitingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: px(32) },
  avatarRing: {
    padding: px(6),
    borderRadius: borderRadius.full,
    borderWidth: px(2),
    borderColor: colors.primary,
    marginBottom: px(24),
  },
  avatar: {
    width: px(104),
    height: px(104),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: px(40), fontFamily: fonts.sans.bold },
  waitingTitle: {
    color: colors.white,
    fontSize: px(24),
    fontFamily: fonts.sans.bold,
    textAlign: 'center',
    marginBottom: px(14),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: px(16),
    paddingVertical: px(8),
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusPillText: {
    marginLeft: px(8),
    color: colors.white,
    fontFamily: fonts.sans.medium,
    fontSize: px(14),
  },

  waitingFooter: { alignItems: 'center', paddingBottom: px(40) },
  endCallButton: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.full,
    paddingVertical: px(16),
    paddingHorizontal: px(44),
  },
  endCallButtonText: { color: colors.white, fontSize: px(16), fontFamily: fonts.sans.bold },
  waitingHint: {
    marginTop: px(14),
    color: colors.white,
    opacity: 0.55,
    fontFamily: fonts.sans.regular,
    fontSize: px(13),
  },

  deniedTitle: {
    color: colors.white,
    fontSize: px(20),
    fontFamily: fonts.sans.bold,
    textAlign: 'center',
    marginBottom: px(10),
  },
  deniedBody: {
    color: colors.white,
    opacity: 0.7,
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    textAlign: 'center',
    lineHeight: px(20),
    marginBottom: px(28),
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: px(14),
    paddingHorizontal: px(36),
  },
  primaryButtonText: { color: colors.white, fontSize: px(15), fontFamily: fonts.sans.semiBold },
  ghostButton: { marginTop: px(14), paddingVertical: px(10), paddingHorizontal: px(20) },
  ghostButtonText: { color: colors.white, opacity: 0.6, fontFamily: fonts.sans.medium, fontSize: px(14) },
});
