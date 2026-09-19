import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek, subWeeks } from 'date-fns';

import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import { useAppSelector } from '../../../shared/store';
import {
  useGetDashboardOverviewQuery,
  useGetCounsellorProfileQuery,
  useUpdateCounsellorSettingsMutation,
} from '../../../shared/store/api/counsellorApi';
import { BookingRecord, upcomingFrom } from '../../../shared/utils/bookings';

import SegmentedToggle from '../../../shared/components/SegmentedToggle';
import EmptyState from '../../../shared/components/EmptyState';
import { SkeletonItem } from '../../../shared/components/SkeletonCard';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon } from '../../../shared/components/Icons';
import SessionCard, { StatusPill } from '../../components/SessionCard';

type ScheduleTab = 'sessions' | 'availability';

const TAB_OPTIONS: { key: ScheduleTab; label: string }[] = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'availability', label: 'Availability' },
];

/** Hourly slots a counsellor can open up. Format matches what the client booking flow sends. */
const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

/** "02:00 PM" and "2:00 PM" refer to the same slot. */
const normalizeSlot = (slot: string) => slot.trim().replace(/^0/, '').toUpperCase();

export default function ScheduleScreen({ navigation, route }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const phone = user?.phone || '';

  const [tab, setTab] = useState<ScheduleTab>(route?.params?.tab === 'availability' ? 'availability' : 'sessions');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Jump to the requested tab when Home deep-links here (e.g. "Manage" → availability).
  useEffect(() => {
    const requested = route?.params?.tab;
    if (requested === 'availability' || requested === 'sessions') {
      setTab(requested);
      navigation.setParams({ tab: undefined });
    }
  }, [route?.params?.tab, navigation]);

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useGetDashboardOverviewQuery(phone, { skip: !phone });
  const { data: profileRes, refetch: refetchProfile } = useGetCounsellorProfileQuery(phone, { skip: !phone });
  const [updateSettings, { isLoading: saving }] = useUpdateCounsellorSettingsMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchOverview(), refetchProfile()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchOverview, refetchProfile]);

  // ---- Week strip ----
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const shiftWeek = (dir: -1 | 1) => setSelectedDate((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));

  // ---- Sessions ----
  const bookings: BookingRecord[] | undefined = overview?.upcomingBookings;
  const sessions = useMemo(() => upcomingFrom(bookings || [], selectedDate), [bookings, selectedDate]);

  // ---- Availability ----
  const savedSlots = profileRes?.data?.availableSlots;
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  // Seed local selection from the profile whenever it (re)loads and there are no unsaved edits.
  useEffect(() => {
    if (savedSlots && !dirty) {
      setSelectedSlots(new Set(savedSlots.map(normalizeSlot)));
    }
  }, [savedSlots, dirty]);

  const toggleSlot = (slot: string) => {
    setDirty(true);
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      const key = normalizeSlot(slot);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveAvailability = async () => {
    if (!phone) {
      Alert.alert('Not signed in', 'We could not find your phone number. Please sign in again.');
      return;
    }
    const availableSlots = TIME_SLOTS.filter((s) => selectedSlots.has(normalizeSlot(s)));
    try {
      await updateSettings({ phone, availableSlots }).unwrap();
      setDirty(false);
      Alert.alert('Availability saved', `${availableSlots.length} slot${availableSlots.length === 1 ? '' : 's'} open for booking.`);
    } catch (e: any) {
      Alert.alert('Could not save', e?.data?.message || 'Please try again.');
    }
  };

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
            <Text style={styles.title}>Schedule</Text>
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} activeOpacity={0.7} onPress={() => shiftWeek(-1)}>
                <ChevronLeftIcon size={px(18)} color={colors.black} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{format(selectedDate, 'MMM yyyy')}</Text>
              <TouchableOpacity style={styles.navBtn} activeOpacity={0.7} onPress={() => shiftWeek(1)}>
                <ChevronRightIcon size={px(18)} color={colors.black} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Week strip */}
          <View style={styles.weekRow}>
            {weekDays.map((day) => {
              const active = isSameDay(day, selectedDate);
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[styles.dayCell, active && styles.dayCellActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text style={[styles.dayName, active && styles.dayTextActive]}>{format(day, 'EEE')}</Text>
                  <Text style={[styles.dayNum, active && styles.dayTextActive]}>{format(day, 'd')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SegmentedToggle options={TAB_OPTIONS} value={tab} onChange={setTab} style={styles.toggle} />

          {tab === 'sessions' ? (
            overviewLoading ? (
              <>
                <SkeletonItem height={px(110)} borderRadius={px(28)} style={styles.skeleton} />
                <SkeletonItem height={px(110)} borderRadius={px(28)} style={styles.skeleton} />
                <SkeletonItem height={px(110)} borderRadius={px(28)} style={styles.skeleton} />
              </>
            ) : sessions.length === 0 ? (
              <EmptyState title="No upcoming sessions" subtitle={`Nothing booked from ${format(selectedDate, 'EEE, d MMM')} onwards.`} />
            ) : (
              sessions.map((b) => (
                <SessionCard
                  key={b._id}
                  booking={b}
                  showDay
                  rightElement={<StatusPill status={b.status} />}
                  onPress={() => navigation.navigate('SessionDetail', { bookingId: b._id })}
                />
              ))
            )
          ) : (
            <>
              <Text style={styles.hint}>Tap time slots to mark yourself available. Clients can book any open slot.</Text>

              <View style={styles.slotGrid}>
                {TIME_SLOTS.map((slot) => {
                  const active = selectedSlots.has(normalizeSlot(slot));
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slot, active && styles.slotActive]}
                      activeOpacity={0.8}
                      onPress={() => toggleSlot(slot)}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
                      {active ? <CloseIcon size={px(16)} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                activeOpacity={0.8}
                onPress={saveAvailability}
                disabled={saving}
              >
                <PlusIcon size={px(18)} color={colors.primary} />
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save availability'}</Text>
              </TouchableOpacity>
            </>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(22),
  },
  title: {
    fontSize: px(28),
    fontFamily: fonts.sans.bold,
    color: colors.black,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
  },
  navBtn: {
    width: px(44),
    height: px(44),
    borderRadius: px(22),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: px(17),
    fontFamily: fonts.sans.medium,
    color: colors.black,
    minWidth: px(74),
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: px(20),
  },
  dayCell: {
    width: px(42),
    paddingVertical: px(14),
    borderRadius: px(21),
    alignItems: 'center',
  },
  dayCellActive: {
    backgroundColor: colors.primary,
  },
  dayName: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginBottom: px(6),
  },
  dayNum: {
    fontSize: px(18),
    fontFamily: fonts.sans.semiBold,
    color: colors.black,
  },
  dayTextActive: {
    color: colors.white,
  },
  toggle: {
    marginBottom: px(24),
  },
  skeleton: {
    marginBottom: px(14),
  },
  hint: {
    fontSize: px(15),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    lineHeight: px(22),
    marginBottom: px(18),
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: px(12),
    marginBottom: px(24),
  },
  slot: {
    width: '48%',
    height: px(64),
    borderRadius: px(20),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: px(20),
  },
  slotActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  slotText: {
    fontSize: px(16),
    fontFamily: fonts.sans.regular,
    color: colors.black,
  },
  slotTextActive: {
    color: colors.primary,
    fontFamily: fonts.sans.medium,
  },
  saveBtn: {
    height: px(64),
    borderRadius: px(22),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: px(10),
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: px(17),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  bottomSpace: {
    height: px(32),
  },
});
