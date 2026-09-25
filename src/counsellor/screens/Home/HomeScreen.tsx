import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { format, formatDistanceToNowStrict } from 'date-fns';

import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import { useAppSelector } from '../../../shared/store';
import { useGetDashboardOverviewQuery, useGetCounsellorProfileQuery } from '../../../shared/store/api/counsellorApi';
import { BookingRecord, isSameBookingDay, sortBookingsAsc, timeOfDayGreeting } from '../../../shared/utils/bookings';
import { useRecentChats } from '../../hooks/useRecentChats';

import Avatar from '../../../shared/components/Avatar';
import StatCard from '../../../shared/components/StatCard';
import SectionHeader from '../../../shared/components/SectionHeader';
import EmptyState from '../../../shared/components/EmptyState';
import { SkeletonItem } from '../../../shared/components/SkeletonCard';
import {
  BellIcon,
  TrendingUpIcon,
  CalendarIcon,
  StarIcon,
  ClockIcon,
  UsersIcon,
  ChevronRightIcon,
} from '../../../shared/components/Icons';
import SessionCard, { NextUpPill } from '../../components/SessionCard';

const shortAgo = (date: Date | null) =>
  date
    ? formatDistanceToNowStrict(date)
        .replace(/ seconds?/, 's')
        .replace(/ minutes?/, 'm')
        .replace(/ hours?/, 'h')
        .replace(/ days?/, 'd')
        .replace(/ months?/, 'mo')
        .replace(/ years?/, 'y') + ' ago'
    : '';

export default function HomeScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const phone = user?.phone || '';

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useGetDashboardOverviewQuery(phone, { skip: !phone });
  const { data: profileRes, refetch: refetchProfile } = useGetCounsellorProfileQuery(phone, { skip: !phone });
  const { chats, chatToken, loading: chatsLoading, reload: reloadChats, totalUnread } = useRecentChats(2);

  const profile = profileRes?.data;
  const stats = overview?.stats;
  const firstName = (profile?.fullName || user?.name || 'Counsellor').split(' ')[0];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchOverview(), refetchProfile(), reloadChats()]);
    } catch (e) {
      console.log('Home refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [refetchOverview, refetchProfile, reloadChats]);

  // Coming back from a chat should refresh unread counts.
  useFocusEffect(
    useCallback(() => {
      reloadChats();
    }, [reloadChats]),
  );

  const bookings: BookingRecord[] | undefined = overview?.upcomingBookings;
  const todaySessions = useMemo(() => {
    const today = new Date();
    return sortBookingsAsc((bookings || []).filter((b) => b.status === 'confirmed' && isSameBookingDay(b, today)));
  }, [bookings]);

  const slotCount = profile?.availableSlots?.length ?? 0;
  const earningsText = stats?.totalEarnings || '₹0';
  const monthLabel = format(new Date(), 'MMMM yyyy');

  const goToSchedule = (tab?: 'sessions' | 'availability') => navigation.navigate('Schedule', tab ? { tab } : undefined);
  const openSession = (b: BookingRecord) => navigation.navigate('SessionDetail', { bookingId: b._id });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{timeOfDayGreeting()}</Text>
              <Text style={styles.name}>{firstName} 👋</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Messages')}>
              <BellIcon size={px(20)} color={colors.black} />
              {totalUnread > 0 ? <View style={styles.bellDot} /> : null}
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon={<TrendingUpIcon size={px(20)} color={colors.primary} />} value={earningsText} label="This month" />
            <StatCard icon={<CalendarIcon size={px(20)} color={colors.primary} />} value={String(stats?.totalSessions ?? 0)} label="Sessions" />
            <StatCard
              icon={<StarIcon size={px(20)} color={colors.star} />}
              value={String(stats?.rating ?? '—')}
              valueSuffix={<StarIcon size={px(16)} color={colors.black} filled />}
              label="Rating"
            />
          </View>

          {/* Today's sessions */}
          <SectionHeader title="Today's sessions" actionLabel="View schedule" onActionPress={() => goToSchedule('sessions')} />

          {overviewLoading ? (
            <>
              <SkeletonItem height={px(80)} borderRadius={px(20)} style={styles.gap} />
              <SkeletonItem height={px(80)} borderRadius={px(20)} style={styles.gap} />
            </>
          ) : todaySessions.length === 0 ? (
            <EmptyState title="No sessions today" subtitle="Confirmed bookings for today will show up here." style={styles.gap} />
          ) : (
            todaySessions.map((b, i) => (
              <SessionCard
                key={b._id}
                booking={b}
                highlight={i === 0}
                rightElement={i === 0 ? <NextUpPill /> : undefined}
                onPress={() => openSession(b)}
              />
            ))
          )}

          {/* Availability */}
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityIcon}>
              <ClockIcon size={px(20)} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Your availability</Text>
              <Text style={styles.cardSubtitle}>
                {slotCount > 0 ? `${slotCount} slot${slotCount === 1 ? '' : 's'} set` : 'No slots set yet'}
              </Text>
            </View>
            <TouchableOpacity style={styles.managePill} activeOpacity={0.8} onPress={() => goToSchedule('availability')}>
              <Text style={styles.managePillText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {/* Recent messages */}
          <SectionHeader title="Recent messages" actionLabel="See all" onActionPress={() => navigation.navigate('Messages')} />
          {chatsLoading && chats.length === 0 ? (
            <>
              <SkeletonItem height={px(76)} borderRadius={px(20)} style={styles.gap} />
              <SkeletonItem height={px(76)} borderRadius={px(20)} style={styles.gap} />
            </>
          ) : chats.length === 0 ? (
            <EmptyState title="No messages yet" subtitle="Conversations with your clients will appear here." style={styles.gap} />
          ) : (
            chats.map((c) => (
              <TouchableOpacity
                key={c.channelId}
                style={styles.messageCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ChatScreen', { channelId: c.channelId, chatToken, otherUserName: c.name })}
              >
                <Avatar name={c.name} size={px(48)} shape="round" />
                <View style={styles.messageBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {c.preview}
                  </Text>
                </View>
                <View style={styles.messageMeta}>
                  <Text style={styles.messageTime}>{shortAgo(c.lastMessageAt)}</Text>
                  {c.unread > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{c.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Reach new users */}
          <TouchableOpacity style={styles.reachCard} activeOpacity={0.85}>
            <View style={styles.reachIcon}>
              <UsersIcon size={px(22)} color={colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Reach new users</Text>
              <Text style={styles.cardSubtitle}>
                {profile?.hasFreeSessionOffer ? 'Send free session invites · 3 left today' : 'Offer a free session to new clients'}
              </Text>
            </View>
            <ChevronRightIcon size={px(20)} color={colors.primary} />
          </TouchableOpacity>

          {/* Total earnings */}
          <LinearGradient colors={colors.darkGradient} useAngle angle={135} style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Total earnings</Text>
            <Text style={styles.earningsValue}>{earningsText}</Text>
            <Text style={styles.earningsMeta}>
              {monthLabel} · {stats?.completedSessions ?? 0} sessions completed
            </Text>
            <TouchableOpacity style={styles.earningsLink} activeOpacity={0.7} onPress={() => navigation.navigate('Clients', { tab: 'history' })}>
              <Text style={styles.earningsLinkText}>View breakdown</Text>
              <ChevronRightIcon size={px(16)} color={colors.white} />
            </TouchableOpacity>
          </LinearGradient>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(20),
  },
  greeting: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginBottom: px(2),
  },
  name: {
    fontSize: px(22),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  bellBtn: {
    width: px(40),
    height: px(40),
    borderRadius: px(20),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: px(10),
    right: px(11),
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: px(10),
    marginBottom: px(24),
  },
  gap: {
    marginBottom: px(12),
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: px(20),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(16),
    marginTop: px(4),
    marginBottom: px(24),
  },
  availabilityIcon: {
    width: px(44),
    height: px(44),
    borderRadius: px(22),
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(14),
  },
  cardTitle: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginBottom: px(2),
  },
  cardSubtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    lineHeight: px(18),
  },
  managePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: px(14),
    marginLeft: px(8),
  },
  managePillText: {
    color: colors.primary,
    fontFamily: fonts.sans.semiBold,
    fontSize: px(13),
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: px(20),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(16),
    marginBottom: px(12),
  },
  messageBody: {
    flex: 1,
    marginLeft: px(12),
    marginRight: px(8),
  },
  messageMeta: {
    alignItems: 'flex-end',
    gap: px(6),
  },
  messageTime: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  unreadBadge: {
    minWidth: px(20),
    height: px(20),
    borderRadius: px(10),
    paddingHorizontal: px(5),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: colors.white,
    fontFamily: fonts.sans.bold,
    fontSize: px(11),
  },
  reachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4E6FB',
    borderRadius: px(20),
    padding: px(16),
    marginTop: px(4),
    marginBottom: px(24),
  },
  reachIcon: {
    width: px(44),
    height: px(44),
    borderRadius: px(22),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(14),
  },
  earningsCard: {
    borderRadius: px(20),
    padding: px(20),
  },
  earningsLabel: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: px(6),
  },
  earningsValue: {
    fontSize: px(26),
    fontFamily: fonts.sans.bold,
    color: colors.white,
    marginBottom: px(6),
  },
  earningsMeta: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: px(16),
  },
  earningsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(6),
  },
  earningsLinkText: {
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    color: colors.white,
  },
  bottomSpace: {
    height: px(32),
  },
});
