import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../../shared/store';
import { logoutUser, logout, restoreSession } from '../../../shared/store/authSlice';
import { useGetCounsellorProfileQuery, useGetDashboardOverviewQuery } from '../../../shared/store/api/counsellorApi';
import { compactRupees, parseRupees } from '../../../shared/utils/bookings';
import { navigationRef } from '../../navigation/AppNavigator';

import Avatar from '../../../shared/components/Avatar';
import { useAppAlert } from '../../../shared/components/AlertProvider';
import { StatPill } from '../../../shared/components/StatCard';
import SettingsGroup, { SettingsRow } from '../../../shared/components/SettingsGroup';
import { GroupLabel } from '../../../shared/components/SectionHeader';
import {
  CheckIcon,
  StarIcon,
  PencilIcon,
  ClockIcon,
  BellIcon,
  ShieldIcon,
  HelpCircleIcon,
  FlagIcon,
  LogOutIcon,
} from '../../../shared/components/Icons';

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const phone = user?.phone || '';
  const { showAlert, confirm } = useAppAlert();

  const { data: profileRes, refetch: refetchProfile } = useGetCounsellorProfileQuery(phone, { skip: !phone });
  const { data: overview, refetch: refetchOverview } = useGetDashboardOverviewQuery(phone, { skip: !phone });

  const profile = profileRes?.data;
  const stats = overview?.stats;

  const name = profile?.fullName || user?.name || 'Counsellor';
  const experience = profile?.experienceYears ?? 0;
  const languages = profile?.languages?.length ? profile.languages.join(', ') : 'English';
  const rate = profile?.rates?.chat ? `₹${profile.rates.chat.toLocaleString('en-IN')} / session` : '—';
  const monthlyEarnings = compactRupees(parseRupees(stats?.totalEarnings));

  // Local only for now — the backend has no "accepting bookings" flag yet.
  const [acceptingBookings, setAcceptingBookings] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([dispatch(restoreSession()), refetchProfile(), refetchOverview()]);
    } catch (e) {
      console.log('Profile refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, refetchProfile, refetchOverview]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need your phone number and an OTP to sign back in.',
      confirmText: 'Sign Out',
      destructive: true,
    });
    if (!ok) return;
    dispatch(logout());
    dispatch(logoutUser());
    // The counsellor stack keeps onboarding and Main in one navigator, so
    // send the root navigator back to Login explicitly.
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    } else {
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const comingSoon = (feature: string) => () => showAlert({ title: feature, message: 'This section is coming soon.', tone: 'info' });

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
          <Text style={styles.screenTitle}>My Profile</Text>

          {/* Profile header card */}
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <Avatar name={name} size={px(52)} />
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {name}
                  </Text>
                  {profile?.isVerified ? (
                    <View style={styles.verifiedPill}>
                      <CheckIcon size={px(10)} color={colors.primary} strokeWidth={3} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.metaText} numberOfLines={1}>
                  {experience} yrs · {languages}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatPill value={String(stats?.totalSessions ?? 0)} label="Sessions" />
              <StatPill
                value={String(stats?.rating ?? profile?.rating ?? '—')}
                valueSuffix={<StarIcon size={px(14)} color={colors.black} filled />}
                label="Rating"
              />
              <StatPill value={monthlyEarnings} label="This month" />
            </View>
          </View>

          {/* Availability toggle */}
          <LinearGradient colors={colors.primaryGradient} useAngle angle={100} style={styles.availabilityBanner}>
            <View style={styles.flex}>
              <Text style={styles.bannerTitle}>{acceptingBookings ? "You're available for bookings" : "You're not taking bookings"}</Text>
              <Text style={styles.bannerSubtitle}>
                {acceptingBookings ? 'Clients can book your open slots' : 'Turn on to let clients book you'}
              </Text>
            </View>
            <Switch
              value={acceptingBookings}
              onValueChange={setAcceptingBookings}
              trackColor={{ false: 'rgba(255,255,255,0.35)', true: 'rgba(255,255,255,0.45)' }}
              thumbColor={colors.white}
              ios_backgroundColor="rgba(255,255,255,0.35)"
            />
          </LinearGradient>

          {/* PROFILE */}
          <GroupLabel title="Profile" />
          <SettingsGroup>
            <SettingsRow icon={<PencilIcon size={px(20)} color={colors.primary} />} title="Edit Profile" onPress={comingSoon('Edit Profile')} />
            <SettingsRow icon={<StarIcon size={px(20)} color={colors.primary} />} title="Rate" value={rate} onPress={comingSoon('Rate')} />
            <SettingsRow
              icon={<ClockIcon size={px(20)} color={colors.primary} />}
              title="Experience"
              value={`${experience} year${experience === 1 ? '' : 's'}`}
              onPress={comingSoon('Experience')}
            />
          </SettingsGroup>

          {/* ACCOUNT */}
          <GroupLabel title="Account" />
          <SettingsGroup>
            <SettingsRow icon={<BellIcon size={px(20)} color={colors.primary} />} title="Notifications" value="On" onPress={comingSoon('Notifications')} />
            <SettingsRow icon={<ShieldIcon size={px(20)} color={colors.primary} />} title="Privacy & Safety" onPress={comingSoon('Privacy & Safety')} />
          </SettingsGroup>

          {/* SUPPORT */}
          <GroupLabel title="Support" />
          <SettingsGroup>
            <SettingsRow icon={<HelpCircleIcon size={px(20)} color={colors.primary} />} title="Help Center" onPress={comingSoon('Help Center')} />
            <SettingsRow icon={<FlagIcon size={px(20)} color={colors.primary} />} title="Report an Issue" onPress={comingSoon('Report an Issue')} />
          </SettingsGroup>

          {/* SIGN OUT */}
          <TouchableOpacity style={styles.signOutCard} activeOpacity={0.8} onPress={handleLogout}>
            <LogOutIcon size={px(20)} color={colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>Endhalla Counsellor v1.0 · Your privacy matters</Text>

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
  screenTitle: {
    fontSize: px(26),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginTop: px(4),
    marginBottom: px(20),
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: px(22),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(18),
    marginBottom: px(16),
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(16),
  },
  profileInfo: {
    flex: 1,
    marginLeft: px(14),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(8),
    marginBottom: px(3),
  },
  nameText: {
    fontSize: px(17),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    flexShrink: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(4),
    backgroundColor: colors.primaryLight,
    paddingHorizontal: px(8),
    paddingVertical: px(3),
    borderRadius: px(10),
  },
  verifiedText: {
    fontSize: px(11),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  metaText: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: px(10),
  },
  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: px(20),
    paddingHorizontal: px(16),
    paddingVertical: px(14),
    marginBottom: px(24),
  },
  bannerTitle: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: colors.white,
    marginBottom: px(2),
  },
  bannerSubtitle: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: 'rgba(255,255,255,0.85)',
  },
  signOutCard: {
    backgroundColor: colors.card,
    borderRadius: px(22),
    borderWidth: 1,
    borderColor: colors.dangerLight,
    paddingVertical: px(15),
    paddingHorizontal: px(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(12),
    marginTop: px(8),
    marginBottom: px(20),
  },
  signOutText: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: colors.danger,
  },
  footerText: {
    textAlign: 'center',
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: '#AAA8A0',
    marginBottom: px(24),
  },
  bottomSpace: {
    height: px(40),
  },
});
