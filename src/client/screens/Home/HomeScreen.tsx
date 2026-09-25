import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts } from '../../theme';
import BellIcon from '../../../shared/assets/icons/bell.svg';
import SearchIcon from '../../../shared/assets/icons/search.svg';
import WaveformSVG from '../../../shared/assets/icons/waveform.svg';
import PlayIcon from '../../../shared/assets/icons/play.svg';
import StarIcon from '../../../shared/assets/icons/star.svg';
import { useAppSelector } from '../../../shared/store';
import { useGetCounsellorsQuery, CounsellorItem } from '../../../shared/store/api/clientApi';
import { CounsellorCardSkeleton } from '../../../shared/components/SkeletonCard';
import { playAudio, stopAudio } from '../../../shared/utils/soundPlayer';

// Pause Icon
const PauseIcon = ({ width = 12, height = 12, fill = '#FFFFFF' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill={fill}>
    <Path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </Svg>
);

export default function HomeScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.name || 'Sara';
  const bookingState = useAppSelector((state) => state.booking);
  const confirmedBookings = bookingState?.confirmedBookings || [];
  const latestBooking = bookingState?.latestConfirmedBooking || (confirmedBookings.length > 0 ? confirmedBookings[0] : null);

  const freeSessionsUsed = confirmedBookings.filter((b) => b.price === 'Free').length;
  const remainingFree = Math.max(0, 2 - freeSessionsUsed);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real backend counsellors
  const { data: counsellorsResponse, refetch, isFetching, isLoading } = useGetCounsellorsQuery();
  const counsellors: CounsellorItem[] = counsellorsResponse?.data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.log('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const togglePlay = (id: string, audioUrl?: string) => {
    if (playingId === id) {
      stopAudio();
      setPlayingId(null);
    } else {
      setPlayingId(id);
      const urlToPlay = audioUrl || '/public/sample_voicenote.mp3';
      playAudio(
        urlToPlay,
        () => setPlayingId(null),
        () => setPlayingId(null)
      );
    }
  };

  // A voice note keeps playing through a tab switch otherwise — the sound is
  // module-level, so it outlives this screen losing focus.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAudio();
        setPlayingId(null);
      };
    }, []),
  );

  const showSkeleton = isLoading || (isFetching && counsellors.length === 0);

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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Welcome to Endhalla</Text>
              <Text style={styles.greetingText}>Hello, {userName} 👋</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <BellIcon width={px(20)} height={px(20)} />
            </TouchableOpacity>
          </View>

          {/* DYNAMIC TOP SECTION BANNER */}
          {latestBooking ? (
            <View style={styles.upcomingBannerCard}>
              <View style={styles.upcomingTopRow}>
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>📅 UPCOMING SESSION</Text>
                </View>
                <View style={styles.livePulseDot} />
              </View>

              <Text style={styles.upcomingTitle}>{latestBooking.sessionType} Session</Text>
              <Text style={styles.upcomingCounsellor}>with {latestBooking.counsellorName}</Text>

              <View style={styles.upcomingTimePill}>
                <Text style={styles.upcomingTimeText}>
                  🗓️ {latestBooking.dateText} · {latestBooking.timeText}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.upcomingJoinBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('BookingConfirmed', {
                    counsellorName: latestBooking.counsellorName,
                    sessionType: latestBooking.sessionType,
                    dateText: latestBooking.dateText,
                    timeText: latestBooking.timeText,
                  })
                }
              >
                <Text style={styles.upcomingJoinBtnText}>View Session Details & Join</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bannerCard}>
              <Text style={styles.bannerBadge}>You're new here 🌱</Text>
              <Text style={styles.bannerTitle}>
                {freeSessionsUsed > 0 ? 'Your Free Sessions' : 'Start with a free session'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {remainingFree > 0
                  ? `You have ${remainingFree} free session${remainingFree > 1 ? 's' : ''} remaining. No payment needed.`
                  : 'All free sessions used. Book a regular session anytime!'}
              </Text>

              {/* Dual Progress Bars */}
              <View style={styles.progressRow}>
                <View
                  style={[
                    styles.progressBar,
                    freeSessionsUsed >= 1 ? styles.progressBarFilled : styles.progressBarEmpty,
                  ]}
                />
                <View
                  style={[
                    styles.progressBar,
                    freeSessionsUsed >= 2 ? styles.progressBarFilled : styles.progressBarEmpty,
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{freeSessionsUsed}/2 free sessions used</Text>
            </View>
          )}

          {/* Section 1: Counsellors reaching out */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Counsellors reaching out to you</Text>
            <Text style={styles.sectionSubtitle}>They've sent you a personal voice note</Text>
          </View>

          {showSkeleton ? (
            <>
              <CounsellorCardSkeleton />
              <CounsellorCardSkeleton />
              <CounsellorCardSkeleton />
            </>
          ) : counsellors.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No counsellors found</Text>
              <Text style={styles.emptyStateSubtitle}>Please pull down to refresh or check back shortly.</Text>
            </View>
          ) : (
            counsellors.map((counsellor) => {
              const isPlaying = playingId === counsellor._id;
              const initial = counsellor.fullName?.charAt(0) || 'C';
              const expLangs = `${counsellor.experienceYears || 1} yrs · ${(counsellor.languages || ['English']).join(', ')}`;
              const freeOfferText = counsellor.freeSessionDurationText || '40 min · Free';
              const quoteText = counsellor.voiceNote?.quote || '"Hi! I\'d love to offer you a free session to help you get started on your journey."';
              const audioDuration = counsellor.voiceNote?.duration || '0:38';

              return (
                <TouchableOpacity
                  key={counsellor._id}
                  style={styles.counsellorCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('CounsellorDetail', {
                      counsellorId: counsellor._id,
                      counsellor,
                    })
                  }
                >
                  {/* Top Meta: Badge & Rating */}
                  <View style={styles.cardTopMeta}>
                    {counsellor.hasFreeSessionOffer ? (
                      <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>🎁 Free session offer</Text>
                      </View>
                    ) : (
                      <View style={styles.standardRateBadge}>
                        <Text style={styles.standardRateBadgeText}>Standard Rates</Text>
                      </View>
                    )}
                    <View style={styles.ratingRow}>
                      <StarIcon width={px(12)} height={px(12)} fill="#F5A623" stroke="#F5A623" />
                      <Text style={styles.ratingText}>{counsellor.rating || 4.9}</Text>
                    </View>
                  </View>

                  {/* Avatar + Info */}
                  <View style={styles.counsellorProfileRow}>
                    {counsellor.avatar ? (
                      <Image source={{ uri: counsellor.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                    )}
                    <View style={styles.profileDetails}>
                      <Text style={styles.counsellorName}>{counsellor.fullName}</Text>
                      <Text style={styles.counsellorSubText}>{expLangs}</Text>
                    </View>
                  </View>

                  {/* Voice Note Player */}
                  <View style={[styles.audioPlayerBox, isPlaying && styles.audioPlayerBoxActive]}>
                    <TouchableOpacity
                      style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                      activeOpacity={0.8}
                      onPress={() => togglePlay(counsellor._id, counsellor.voiceNote?.audioUrl)}
                    >
                      {isPlaying ? (
                        <PauseIcon width={px(12)} height={px(12)} fill="#FFFFFF" />
                      ) : (
                        <PlayIcon width={px(12)} height={px(12)} fill="#FFFFFF" stroke="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.waveformContainer}>
                      <WaveformSVG width={px(130)} height={px(16)} stroke={isPlaying ? '#4A684F' : colors.primary} />
                    </View>
                    <Text style={[styles.audioTimeText, isPlaying && styles.audioTimeActive]}>{audioDuration}</Text>
                  </View>

                  {/* Quote */}
                  <Text style={styles.quoteText}>{quoteText}</Text>

                  {/* Tags Row */}
                  <View style={styles.tagsContainer}>
                    {counsellor.areasOfFocus?.slice(0, 2).map((tag: string, idx: number) => (
                      <View key={idx} style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{tag}</Text>
                      </View>
                    ))}
                    {counsellor.hasFreeSessionOffer ? (
                      <View style={styles.freeHighlightTagPill}>
                        <Text style={styles.freeHighlightTagText}>{freeOfferText}</Text>
                      </View>
                    ) : (
                      <View style={[styles.tagPill, { backgroundColor: '#F4F7FB' }]}>
                        <Text style={[styles.tagPillText, { color: colors.primary, fontFamily: fonts.sans.bold }]}>
                          ₹{counsellor.rates?.chat || 499} / session
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('BookSession', {
                          counsellor,
                          isFreeOffer: counsellor.hasFreeSessionOffer ?? false,
                        })
                      }
                    >
                      <Text style={styles.acceptBtnText}>
                        {counsellor.hasFreeSessionOffer
                          ? 'Accept & Pick a Slot'
                          : `Book Session (₹${counsellor.rates?.chat || 499})`}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.declineBtn} activeOpacity={0.8}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Section 2: Explore counsellors */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Explore counsellors</Text>
          </View>

          <TouchableOpacity
            style={styles.exploreCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Search')}
          >
            <View style={styles.exploreIconCircle}>
              <SearchIcon width={px(20)} height={px(20)} stroke={colors.primary} />
            </View>
            <View style={styles.exploreTextContainer}>
              <Text style={styles.exploreTitle}>Browse all counsellors</Text>
              <Text style={styles.exploreSubtitle}>Find the right match for you</Text>
            </View>
            <Text style={styles.chevronArrow}>›</Text>
          </TouchableOpacity>

          {/* Section 3: What to expect */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>What to expect</Text>
          </View>

          <View style={styles.expectCardList}>
            {/* Feature 1 */}
            <View style={styles.expectCard}>
              <Text style={styles.expectEmoji}>🔒</Text>
              <View style={styles.expectTextContainer}>
                <Text style={styles.expectTitle}>100% private</Text>
                <Text style={styles.expectSubtitle}>
                  Your conversations are fully encrypted and confidential.
                </Text>
              </View>
            </View>

            {/* Feature 2 */}
            <View style={styles.expectCard}>
              <Text style={styles.expectEmoji}>🗣️</Text>
              <View style={styles.expectTextContainer}>
                <Text style={styles.expectTitle}>Your format, your choice</Text>
                <Text style={styles.expectSubtitle}>
                  Chat, voice, or video — whatever feels right.
                </Text>
              </View>
            </View>

            {/* Feature 3 */}
            <View style={styles.expectCard}>
              <Text style={styles.expectEmoji}>💚</Text>
              <View style={styles.expectTextContainer}>
                <Text style={styles.expectTitle}>No judgement</Text>
                <Text style={styles.expectSubtitle}>
                  A safe space to express anything on your mind.
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: px(40) }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3', // Light off-white background matching UI design
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: px(20),
    paddingTop: px(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(20),
  },
  welcomeText: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
    marginBottom: px(2),
  },
  greetingText: {
    fontSize: px(22),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
  },
  bellBtn: {
    width: px(40),
    height: px(40),
    borderRadius: px(20),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E6DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCard: {
    backgroundColor: colors.primary, // Sage Green matching design
    borderRadius: px(20),
    padding: px(20),
    marginBottom: px(24),
  },
  bannerBadge: {
    fontSize: px(13),
    fontFamily: fonts.sans.medium,
    color: '#E2EBE4',
    marginBottom: px(8),
  },
  bannerTitle: {
    fontSize: px(20),
    fontFamily: fonts.sans.bold,
    color: '#FFFFFF',
    marginBottom: px(6),
  },
  bannerSubtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: px(20), // Fixed line-height overflow clipping
    marginBottom: px(16),
  },
  upcomingBannerCard: {
    backgroundColor: '#072654', // Dark Navy Accent matching design
    borderRadius: px(20),
    padding: px(20),
    marginBottom: px(24),
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(8),
  },
  upcomingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: px(10),
    paddingVertical: px(4),
    borderRadius: px(10),
  },
  upcomingBadgeText: {
    fontSize: px(10),
    fontFamily: fonts.sans.bold,
    color: '#00C9A7',
    letterSpacing: 0.5,
  },
  livePulseDot: {
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    backgroundColor: '#00C9A7',
  },
  upcomingTitle: {
    fontSize: px(20),
    fontFamily: fonts.sans.bold,
    color: '#FFFFFF',
    marginTop: px(4),
  },
  upcomingCounsellor: {
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: px(12),
  },
  upcomingTimePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: px(12),
    paddingVertical: px(8),
    borderRadius: px(12),
    alignSelf: 'flex-start',
    marginBottom: px(16),
  },
  upcomingTimeText: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: '#FFFFFF',
  },
  upcomingJoinBtn: {
    backgroundColor: colors.primary,
    height: px(44),
    borderRadius: px(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingJoinBtnText: {
    color: '#FFFFFF',
    fontSize: px(13),
    fontFamily: fonts.sans.bold,
  },
  progressRow: {
    flexDirection: 'row',
    gap: px(8),
    marginBottom: px(8),
  },
  progressBar: {
    flex: 1,
    height: px(6),
    borderRadius: px(3),
  },
  progressBarFilled: {
    backgroundColor: '#FFFFFF',
  },
  progressBarEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionHeaderContainer: {
    marginBottom: px(14),
  },
  sectionTitle: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(2),
  },
  sectionSubtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
  },
  counsellorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(24),
    padding: px(18),
    marginBottom: px(20),
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  cardTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: px(14),
  },
  offerBadge: {
    backgroundColor: '#F5F2EA',
    paddingHorizontal: px(12),
    paddingVertical: px(5),
    borderRadius: px(12),
  },
  offerBadgeText: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  standardRateBadge: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: px(12),
    paddingVertical: px(5),
    borderRadius: px(12),
  },
  standardRateBadgeText: {
    fontSize: px(11),
    fontFamily: fonts.sans.medium,
    color: colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(4),
  },
  ratingText: {
    fontSize: px(13),
    fontFamily: fonts.sans.medium,
    color: '#1A1A1A',
  },
  counsellorProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(14),
  },
  avatarCircle: {
    width: px(48),
    height: px(48),
    borderRadius: px(16),
    backgroundColor: '#EAEFEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(12),
  },
  avatarImage: {
    width: px(48),
    height: px(48),
    borderRadius: px(16),
    marginRight: px(12),
  },
  avatarText: {
    fontSize: px(20),
    fontFamily: fonts.sans.bold,
    color: colors.primary,
  },
  profileDetails: {
    flex: 1,
  },
  counsellorName: {
    fontSize: px(17),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(2),
  },
  counsellorSubText: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
  },
  audioPlayerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F0',
    borderRadius: px(16),
    paddingHorizontal: px(12),
    paddingVertical: px(10),
    marginBottom: px(14),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  audioPlayerBoxActive: {
    backgroundColor: '#EEF4EF',
    borderColor: '#D4E4D7',
  },
  playBtn: {
    width: px(34),
    height: px(34),
    borderRadius: px(17),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnActive: {
    backgroundColor: '#4A684F',
  },
  waveformContainer: {
    flex: 1,
    paddingHorizontal: px(12),
  },
  audioTimeText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
  },
  audioTimeActive: {
    color: colors.primary,
    fontFamily: fonts.sans.medium,
  },
  quoteText: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    fontStyle: 'italic',
    color: '#555555',
    lineHeight: px(20),
    marginBottom: px(14),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: px(8),
    marginBottom: px(18),
  },
  tagPill: {
    backgroundColor: '#F0EDE7',
    paddingHorizontal: px(12),
    paddingVertical: px(6),
    borderRadius: px(12),
  },
  tagPillText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: '#666666',
  },
  freeHighlightTagPill: {
    backgroundColor: '#E5EFE7',
    paddingHorizontal: px(12),
    paddingVertical: px(6),
    borderRadius: px(12),
  },
  freeHighlightTagText: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: px(10),
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    height: px(46),
    borderRadius: px(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: px(14),
    fontFamily: fonts.sans.bold,
  },
  declineBtn: {
    backgroundColor: '#F5F2EA',
    paddingHorizontal: px(20),
    height: px(46),
    borderRadius: px(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#777777',
    fontSize: px(14),
    fontFamily: fonts.sans.medium,
  },
  exploreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(20),
    padding: px(16),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(24),
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  exploreIconCircle: {
    width: px(44),
    height: px(44),
    borderRadius: px(22),
    backgroundColor: '#EAEFEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(14),
  },
  exploreTextContainer: {
    flex: 1,
  },
  exploreTitle: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(2),
  },
  exploreSubtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#8A8A8A',
  },
  chevronArrow: {
    fontSize: px(22),
    color: '#C0C0C0',
    fontFamily: fonts.sans.regular,
  },
  expectCardList: {
    gap: px(12),
    marginBottom: px(16),
  },
  expectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(20),
    padding: px(16),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  expectEmoji: {
    fontSize: px(24),
    marginRight: px(14),
  },
  expectTextContainer: {
    flex: 1,
  },
  expectTitle: {
    fontSize: px(15),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(2),
  },
  expectSubtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#777777',
    lineHeight: px(18),
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(20),
    padding: px(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: px(20),
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  emptyStateTitle: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: '#1A1A1A',
    marginBottom: px(6),
  },
  emptyStateSubtitle: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: '#777777',
    textAlign: 'center',
  },
});
