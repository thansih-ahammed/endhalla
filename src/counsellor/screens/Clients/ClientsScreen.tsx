import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNowStrict } from 'date-fns';

import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import { useAppSelector } from '../../../shared/store';
import { useGetDashboardOverviewQuery } from '../../../shared/store/api/counsellorApi';
import {
  BookingRecord,
  SESSION_DURATION_MIN,
  longDateLabel,
  relativeDayLabel,
  sortBookingsDesc,
  upcomingFrom,
} from '../../../shared/utils/bookings';
import { useRecentChats } from '../../hooks/useRecentChats';

import CustomInput from '../../../shared/components/CustomInput';
import SegmentedToggle from '../../../shared/components/SegmentedToggle';
import Avatar from '../../../shared/components/Avatar';
import EmptyState from '../../../shared/components/EmptyState';
import { SkeletonItem } from '../../../shared/components/SkeletonCard';
import { SearchIcon, ClockIcon } from '../../../shared/components/Icons';
import { StatusPill } from '../../components/SessionCard';

type ClientsTab = 'active' | 'history';

const TAB_OPTIONS: { key: ClientsTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
];

interface ActiveClient {
  key: string;
  name: string;
  nextSession: BookingRecord;
  lastActivity: Date | null;
  preview: string;
  unread: number;
}

const timeAgo = (date: Date | null) =>
  date
    ? formatDistanceToNowStrict(date)
        .replace(/ seconds?/, 's')
        .replace(/ minutes?/, 'm')
        .replace(/ hours?/, 'h')
        .replace(/ days?/, 'd')
        .replace(/ months?/, 'mo')
        .replace(/ years?/, 'y') + ' ago'
    : '';

export default function ClientsScreen({ navigation, route }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const phone = user?.phone || '';

  const [tab, setTab] = useState<ClientsTab>(route?.params?.tab === 'history' ? 'history' : 'active');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const requested = route?.params?.tab;
    if (requested === 'active' || requested === 'history') {
      setTab(requested);
      navigation.setParams({ tab: undefined });
    }
  }, [route?.params?.tab, navigation]);

  const { data: overview, isLoading, refetch } = useGetDashboardOverviewQuery(phone, { skip: !phone });
  const { chats, reload: reloadChats } = useRecentChats(30);
  const bookings: BookingRecord[] | undefined = overview?.upcomingBookings;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), reloadChats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, reloadChats]);

  const q = query.trim().toLowerCase();
  const matches = useCallback((name?: string) => !q || (name || '').toLowerCase().includes(q), [q]);

  /** Groups bookings by client and keeps the ones with an upcoming confirmed session. */
  const activeClients = useMemo<ActiveClient[]>(() => {
    const all = bookings || [];
    const map = new Map<string, ActiveClient>();

    upcomingFrom(all).forEach((b) => {
      const key = b.clientPhone || b.clientName || b._id;
      if (map.has(key)) return;
      const own = all.filter((x) => (x.clientPhone || x.clientName || x._id) === key);
      const latest = own.reduce<Date | null>((acc, x) => {
        const d = x.createdAt ? new Date(x.createdAt) : null;
        return d && (!acc || d > acc) ? d : acc;
      }, null);
      // Pair with the Stream conversation by client name (the only shared key we have).
      const chat = chats.find((c) => c.name.toLowerCase() === (b.clientName || '').toLowerCase());
      map.set(key, {
        key,
        name: b.clientName || 'Client',
        nextSession: b,
        lastActivity: chat?.lastMessageAt || latest,
        preview: chat?.preview || b.notes?.trim() || `Upcoming ${b.sessionType.toLowerCase()} session · ${SESSION_DURATION_MIN} min`,
        unread: chat?.unread || 0,
      });
    });

    return Array.from(map.values()).filter((c) => matches(c.name));
  }, [bookings, chats, matches]);

  const history = useMemo(
    () => sortBookingsDesc((bookings || []).filter((b) => b.status !== 'confirmed' && matches(b.clientName))),
    [bookings, matches],
  );

  const openSession = (b: BookingRecord) => navigation.navigate('SessionDetail', { bookingId: b._id });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          <Text style={styles.title}>Clients</Text>

          <CustomInput
            placeholder="Search clients…"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            leftElement={
              <View style={styles.searchIcon}>
                <SearchIcon size={px(20)} color="#9D9D9D" />
              </View>
            }
            inputContainerStyle={styles.searchBox}
            containerStyle={styles.searchContainer}
          />

          <SegmentedToggle options={TAB_OPTIONS} value={tab} onChange={setTab} style={styles.toggle} />

          {isLoading ? (
            <>
              <SkeletonItem height={px(150)} borderRadius={px(28)} style={styles.skeleton} />
              <SkeletonItem height={px(150)} borderRadius={px(28)} style={styles.skeleton} />
            </>
          ) : tab === 'active' ? (
            activeClients.length === 0 ? (
              <EmptyState
                title={q ? 'No clients match your search' : 'No active clients'}
                subtitle={q ? 'Try a different name.' : 'Clients with an upcoming session will appear here.'}
              />
            ) : (
              activeClients.map((c) => (
                <TouchableOpacity key={c.key} style={styles.card} activeOpacity={0.85} onPress={() => openSession(c.nextSession)}>
                  <Avatar name={c.name} size={px(68)} badge={c.unread} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.cardMeta}>{timeAgo(c.lastActivity)}</Text>
                    </View>
                    <Text style={styles.cardPreview} numberOfLines={1}>
                      {c.preview}
                    </Text>
                    <View style={styles.nextRow}>
                      <ClockIcon size={px(14)} color={colors.primary} />
                      <Text style={styles.nextText}>
                        {relativeDayLabel(c.nextSession)}, {c.nextSession.timeText}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : history.length === 0 ? (
            <EmptyState
              title={q ? 'No sessions match your search' : 'No past sessions yet'}
              subtitle={q ? 'Try a different name.' : 'Completed and cancelled sessions will appear here.'}
            />
          ) : (
            history.map((b) => (
              <TouchableOpacity key={b._id} style={styles.historyCard} activeOpacity={0.85} onPress={() => openSession(b)}>
                <View style={styles.historyTopRow}>
                  <Avatar name={b.clientName} size={px(48)} shape="round" />
                  <View style={styles.historyText}>
                    <Text style={styles.historyName} numberOfLines={1}>
                      {b.clientName || 'Client'} · {b.sessionType}
                    </Text>
                    <Text style={styles.historyDate}>
                      {longDateLabel(b)} · {b.timeText}
                    </Text>
                  </View>
                  <StatusPill status={b.status} />
                </View>
                <View style={styles.durationRow}>
                  <ClockIcon size={px(14)} color={colors.textSecondary} />
                  <Text style={styles.durationText}>{SESSION_DURATION_MIN} min</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.bottomSpace} />
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
    paddingTop: Platform.OS === 'ios' ? px(8) : px(16),
  },
  title: {
    fontSize: px(28),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginBottom: px(20),
  },
  searchContainer: {
    marginBottom: px(16),
  },
  searchBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    height: px(60),
    borderRadius: px(20),
  },
  searchIcon: {
    marginRight: px(10),
  },
  toggle: {
    marginBottom: px(24),
  },
  skeleton: {
    marginBottom: px(14),
  },
  // Active client card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: px(28),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(18),
    marginBottom: px(14),
  },
  cardBody: {
    flex: 1,
    marginLeft: px(14),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(4),
  },
  cardName: {
    fontSize: px(17),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    flexShrink: 1,
    marginRight: px(8),
  },
  cardMeta: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  cardPreview: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginBottom: px(8),
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(6),
  },
  nextText: {
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  // History card
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: px(28),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(18),
    marginBottom: px(14),
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    flex: 1,
    marginHorizontal: px(12),
  },
  historyName: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginBottom: px(2),
  },
  historyDate: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(6),
    marginTop: px(12),
  },
  durationText: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  bottomSpace: {
    height: px(32),
  },
});
