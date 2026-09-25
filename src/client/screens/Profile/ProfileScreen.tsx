import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../../shared/store';
import { logoutUser, logout, restoreSession } from '../../../shared/store/authSlice';
import { loadBookingsFromStorage } from '../../../shared/store/bookingSlice';
import { useAppAlert } from '../../../shared/components/AlertProvider';

// --- SVG ICONS MATCHING DESIGN ---
const ChevronRight = ({ color = '#C2C0B8', size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

const LeafIcon = ({ size = 26, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M11 20A9 9 0 0 1 2 11 9 9 0 0 1 11 2c5.5 0 10 4.5 10 10a9 9 0 0 1-10 8z" />
    <Path d="M11 2a9 9 0 0 0 9 9" />
    <Path d="M2 11a9 9 0 0 0 9 9" />
    <Path d="M11 20V10" />
  </Svg>
);

const GlobeIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M2 12h20" />
    <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Svg>
);

const BellIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const CreditCardIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <Path d="M1 10h22" />
  </Svg>
);

const LockIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const ShieldIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

const FileTextIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Path d="M14 2v6h6" />
    <Path d="M16 13H8" />
    <Path d="M16 17H8" />
    <Path d="M10 9H8" />
  </Svg>
);

const HelpCircleIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <Path d="M12 17h.01" />
  </Svg>
);

const FlagIcon = ({ size = 20, color = '#4A684F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <Path d="M4 22v-7" />
  </Svg>
);

const LogOutIcon = ({ size = 20, color = '#D32F2F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="M16 17l5-5-5-5" />
    <Path d="M21 12H9" />
  </Svg>
);

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [refreshing, setRefreshing] = useState(false);
  const { confirm } = useAppAlert();

  const userName = user?.name || 'Sara Ahmed';
  const memberSince = 'Member since June 2026';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(restoreSession());
      dispatch(loadBookingsFromStorage());
    } catch (e) {
      console.log('Profile refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

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
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Main Title */}
          <Text style={styles.screenTitle}>Profile</Text>

          {/* User Profile Header Card */}
          <View style={styles.userHeaderCard}>
            <View style={styles.avatarLeafBox}>
              <LeafIcon size={px(24)} color="#4A684F" />
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userNameText}>{userName}</Text>
              <Text style={styles.memberSinceText}>{memberSince}</Text>
            </View>
          </View>

          {/* Mood Journal Card */}
          <TouchableOpacity style={styles.moodJournalCard} activeOpacity={0.85}>
            <View style={styles.moodEmojiBox}>
              <Text style={styles.moodEmojiText}>📔</Text>
            </View>
            <View style={styles.moodTextContainer}>
              <Text style={styles.moodTitle}>Mood Journal</Text>
              <Text style={styles.moodSubtitle}>3 entries this week</Text>
            </View>
            <ChevronRight color="#4A684F" size={px(18)} />
          </TouchableOpacity>

          {/* SECTION 1: SESSIONS */}
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeaderText}>SESSIONS</Text>
          </View>

          <View style={styles.groupCard}>
            <TouchableOpacity
              style={styles.rowItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MyBookings')}
            >
              <View style={styles.rowLeft}>
                <FileTextIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>My Bookings</Text>
              </View>
              <ChevronRight color="#C2C0B8" size={px(16)} />
            </TouchableOpacity>
          </View>

          {/* SECTION 2: ACCOUNT */}
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeaderText}>ACCOUNT</Text>
          </View>

          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <GlobeIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Language</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValueText}>English</Text>
                <ChevronRight color="#C2C0B8" size={px(16)} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <BellIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Notifications</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValueText}>On</Text>
                <ChevronRight color="#C2C0B8" size={px(16)} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <CreditCardIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Subscription</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValueText}>Pay per session</Text>
                <ChevronRight color="#C2C0B8" size={px(16)} />
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION 2: PRIVACY & SAFETY */}
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeaderText}>PRIVACY & SAFETY</Text>
          </View>

          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <LockIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Privacy Settings</Text>
              </View>
              <ChevronRight color="#C2C0B8" size={px(16)} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <ShieldIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Safety Information</Text>
              </View>
              <ChevronRight color="#C2C0B8" size={px(16)} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <FileTextIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Privacy Policy</Text>
              </View>
              <ChevronRight color="#C2C0B8" size={px(16)} />
            </TouchableOpacity>
          </View>

          {/* SECTION 3: SUPPORT */}
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeaderText}>SUPPORT</Text>
          </View>

          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <HelpCircleIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Help Center</Text>
              </View>
              <ChevronRight color="#C2C0B8" size={px(16)} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <FlagIcon size={px(20)} color="#4A684F" />
                <Text style={styles.rowTitle}>Report an Issue</Text>
              </View>
              <ChevronRight color="#C2C0B8" size={px(16)} />
            </TouchableOpacity>
          </View>

          {/* SIGN OUT BUTTON */}
          <TouchableOpacity style={styles.signOutCard} activeOpacity={0.8} onPress={handleLogout}>
            <LogOutIcon size={px(20)} color="#D32F2F" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* FOOTER */}
          <Text style={styles.footerText}>Endhalla v1.0 · Your privacy matters</Text>

          <View style={{ height: px(40) }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F3', // Warm cream background matching UI screenshot
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: px(20),
    paddingTop: Platform.OS === 'ios' ? px(8) : px(16),
  },
  screenTitle: {
    fontSize: px(26),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginTop: px(4),
    marginBottom: px(20),
  },
  // User Header Card
  userHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(22),
    padding: px(18),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(16),
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  avatarLeafBox: {
    width: px(52),
    height: px(52),
    borderRadius: px(16),
    backgroundColor: '#EEF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(14),
  },
  userInfoContainer: {
    flex: 1,
  },
  userNameText: {
    fontSize: px(17),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(3),
  },
  memberSinceText: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
  },
  // Mood Journal Card
  moodJournalCard: {
    backgroundColor: '#DCE8DD', // Soft green accent card
    borderRadius: px(20),
    paddingHorizontal: px(16),
    paddingVertical: px(14),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(24),
  },
  moodEmojiBox: {
    width: px(38),
    height: px(38),
    borderRadius: px(12),
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(12),
  },
  moodEmojiText: {
    fontSize: px(18),
  },
  moodTextContainer: {
    flex: 1,
  },
  moodTitle: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
  },
  moodSubtitle: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: '#5A735E',
    marginTop: px(2),
  },
  // Section Headers
  sectionHeaderBox: {
    marginBottom: px(8),
    marginTop: px(4),
  },
  sectionHeaderText: {
    fontSize: px(11),
    fontFamily: fonts.sans.bold,
    color: '#8A8A8A',
    letterSpacing: 0.6,
  },
  // Group Cards
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(22),
    borderWidth: 1,
    borderColor: '#E8E6DF',
    marginBottom: px(20),
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: px(16),
    paddingVertical: px(15),
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
  },
  rowTitle: {
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    color: '#1A1A1A',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(6),
  },
  rowValueText: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F4F2EB',
    marginLeft: px(50),
  },
  // Sign Out Card
  signOutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(22),
    borderWidth: 1,
    borderColor: '#F2D6D6',
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
    color: '#D32F2F',
  },
  footerText: {
    textAlign: 'center',
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: '#AAA8A0',
    marginBottom: px(24),
  },
});
