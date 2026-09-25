import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts, borderRadius } from '../../theme';
import CustomInput from '../../../shared/components/CustomInput';
import Header from '../../../shared/components/Header';
import SearchIcon from '../../../shared/assets/icons/search.svg';
import FilterIcon from '../../../shared/assets/icons/filter.svg';
import WaveformSVG from '../../../shared/assets/icons/waveform.svg';
import ClockIcon from '../../../shared/assets/icons/clock.svg';
import PlayIcon from '../../../shared/assets/icons/play.svg';
import StarIcon from '../../../shared/assets/icons/star.svg';

import { useGetCounsellorsQuery, useGetCategoriesQuery, CounsellorItem } from '../../../shared/store/api/clientApi';
import { CounsellorCardSkeleton } from '../../../shared/components/SkeletonCard';
import { playAudio, stopAudio } from '../../../shared/utils/soundPlayer';

export default function SearchScreen({ navigation }: any) {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { data: apiData, refetch, isFetching, isLoading } = useGetCounsellorsQuery({
    category: selectedFilter !== 'All' && selectedFilter !== 'Free Session' ? selectedFilter : undefined,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.log('Search refresh error:', e);
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

  // Chips come from GET /counsellors/categories. 'Free Session' isn't a
  // category — it filters on hasFreeSessionOffer — so it's injected after
  // 'All'. Falls back to the previous hardcoded list if the request fails.
  const { data: categoriesData } = useGetCategoriesQuery();
  const apiCategories: string[] = (categoriesData?.data || []).map((c: any) => c.title).filter(Boolean);
  const filters = apiCategories.length
    ? [apiCategories[0], 'Free Session', ...apiCategories.slice(1)]
    : ['All', 'Free Session', 'Anxiety', 'Relationships', 'Family', 'Trauma'];

  const rawList: CounsellorItem[] = apiData?.data || [];
  const counsellors = rawList
    .filter((c) => {
      if (selectedFilter === 'Free Session') return c.hasFreeSessionOffer !== false;
      if (selectedFilter !== 'All') return c.areasOfFocus?.includes(selectedFilter);
      return true;
    })
    .map((c) => ({
      id: c._id,
      name: c.fullName,
      initial: c.fullName ? c.fullName[0] : 'C',
      verified: c.isVerified,
      exp: `${c.experienceYears || 5} yrs experience`,
      langs: (c.languages || ['English']).join(', '),
      price: c.hasFreeSessionOffer ? 'Free' : `₹${c.rates?.chat || 499}`,
      rating: `${c.rating || 4.9} (${c.reviewCount || 20} reviews)`,
      next: 'Available today',
      tags: c.areasOfFocus || ['Anxiety', 'Mindset'],
      hasFree: c.hasFreeSessionOffer !== false,
      freeText: c.freeSessionDurationText || '40 min · Free',
      duration: c.voiceNote?.duration || '0:38',
      audioUrl: c.voiceNote?.audioUrl,
      rawCounsellor: c,
    }));

  const showSkeleton = isLoading || (isFetching && counsellors.length === 0);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header Section (Fixed at top) */}
        <View style={styles.header}>
          <Header
            title="Find a Counsellor"
            onBackPress={() => navigation.goBack()}
          />

          <View style={styles.searchRow}>
            <CustomInput
              containerStyle={{ flex: 1 }}
              inputContainerStyle={styles.searchInputContainer}
              inputStyle={styles.searchInput}
              placeholder="Search by expertise, name..."
              placeholderTextColor="#9D9D9D"
              leftElement={<SearchIcon width={px(20)} height={px(20)} stroke="#9D9D9D" />}
            />
            <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
              <FilterIcon width={px(18)} height={px(18)} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterPill, selectedFilter === filter ? styles.filterPillActive : null]}
              >
                <Text style={[styles.filterText, selectedFilter === filter ? styles.filterTextActive : null]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List of Counsellors */}
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
          {showSkeleton ? (
            <>
              <CounsellorCardSkeleton />
              <CounsellorCardSkeleton />
              <CounsellorCardSkeleton />
            </>
          ) : counsellors.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No counsellors found</Text>
              <Text style={styles.emptySub}>Try selecting a different filter or search term.</Text>
            </View>
          ) : (
            counsellors.map((counsellor: any, idx: number) => {
              const isPlaying = playingId === counsellor.id;
              return (
                <TouchableOpacity
                  key={counsellor.id || idx}
                  style={styles.counsellorCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('CounsellorDetail', {
                      counsellorId: counsellor.id,
                      counsellor: counsellor.rawCounsellor,
                    })
                  }
                >
                  {counsellor.hasFree ? (
                    <View style={styles.freeBadgeRow}>
                      <Text style={styles.freeBadgeText}>🎁 Free session offer</Text>
                    </View>
                  ) : null}

                  {/* Card Top */}
                  <View style={styles.ccTop}>
                    <View style={styles.ccAvatar}><Text style={styles.ccInitial}>{counsellor.initial}</Text></View>
                    <View style={styles.ccInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.ccName}>{counsellor.name}</Text>
                        {counsellor.verified ? (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓ Verified</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.ccSubtext}>{`${counsellor.exp} • ${counsellor.langs}`}</Text>
                      <View style={styles.ratingRow}>
                        <StarIcon width={px(12)} height={px(12)} fill="#F5A623" stroke="#F5A623" />
                        <Text style={styles.ratingText}>{counsellor.rating}</Text>
                      </View>
                    </View>
                    <View style={styles.ccRight}>
                      <Text style={[styles.ccPrice, counsellor.hasFree ? { color: colors.primary, fontWeight: '700' } : null]}>{counsellor.price}</Text>
                      <Text style={styles.ccPriceSub}>{counsellor.hasFree ? 'First session' : 'per session'}</Text>
                    </View>
                  </View>

                  {/* Audio Player */}
                  <View style={styles.audioPlayer}>
                    <TouchableOpacity
                      style={[styles.playBtn, isPlaying ? { backgroundColor: '#4A684F' } : null]}
                      activeOpacity={0.8}
                      onPress={() => togglePlay(counsellor.id, counsellor.audioUrl)}
                    >
                      <PlayIcon width={px(12)} height={px(12)} fill="#FFFFFF" stroke="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <WaveformSVG width={px(140)} height={px(16)} stroke={isPlaying ? '#4A684F' : colors.primary} />
                    </View>
                    <Text style={styles.audioTime}>{counsellor.duration || '0:38'}</Text>
                  </View>

                  {/* Bottom Section (Tags + Next availability) */}
                  <View style={styles.ccBottom}>
                    <View style={styles.tagsRow}>
                      {counsellor.tags.map((t: string, i: number) => (
                        <View key={i} style={styles.tagPill}><Text style={styles.tagText}>{t}</Text></View>
                      ))}
                      {counsellor.hasFree ? (
                        <View style={styles.freeHighlightPill}>
                          <Text style={styles.freeHighlightText}>{counsellor.freeText}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.nextInfoRow}>
                      <View style={styles.nextInfo}>
                        <ClockIcon width={px(12)} height={px(12)} />
                        <Text style={[styles.nextText, counsellor.next.includes('today') ? { color: colors.primary } : null]}>
                          {counsellor.next.startsWith('Next:') ? counsellor.next : `Next: ${counsellor.next}`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={styles.profileBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('BookSession', { counsellor: counsellor.rawCounsellor || counsellor, isFreeOffer: counsellor.hasFree })}
                  >
                    <Text style={styles.profileBtnText}>{counsellor.hasFree ? 'Accept & Pick a Slot' : 'View Profile & Book'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
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
  header: {
    paddingHorizontal: px(20),
    paddingTop: px(16),
    paddingBottom: px(8),
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: px(16),
    gap: px(12),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: px(16),
    paddingHorizontal: px(16),
    height: px(48),
  },
  searchInput: {
    flex: 1,
    marginLeft: px(8),
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.black,
  },
  filterBtn: {
    width: px(48),
    height: px(48),
    borderRadius: px(16),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    paddingBottom: px(8),
  },
  filterPill: {
    paddingHorizontal: px(16),
    paddingVertical: px(8),
    borderRadius: px(16),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: px(8),
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  filterTextActive: {
    color: colors.white,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: px(20),
    paddingTop: px(8),
  },
  counsellorCard: {
    backgroundColor: colors.white,
    borderRadius: px(20),
    padding: px(16),
    marginBottom: px(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  ccTop: {
    flexDirection: 'row',
    marginBottom: px(16),
  },
  ccAvatar: {
    width: px(48),
    height: px(48),
    borderRadius: px(16),
    backgroundColor: '#EEF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: px(12),
  },
  ccInitial: {
    fontSize: px(20),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  ccInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  ccName: {
    fontSize: px(16),
    fontFamily: fonts.sans.medium,
    color: colors.black,
    marginRight: px(8),
  },
  verifiedBadge: {
    backgroundColor: '#EEF5F0',
    paddingHorizontal: px(6),
    paddingVertical: px(2),
    borderRadius: px(10),
  },
  verifiedText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.primary,
  },
  ccSubtext: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginTop: px(4),
  },
  ccRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ccPrice: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.black,
  },
  ccPriceSub: {
    fontSize: px(10),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginTop: px(2),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(4),
    marginTop: px(4),
  },
  ratingText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: px(16),
    padding: px(8),
    marginBottom: px(16),
  },
  playBtn: {
    width: px(32),
    height: px(32),
    borderRadius: px(16),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTime: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    marginRight: px(8),
  },
  ccBottom: {
    flexDirection: 'column',
    gap: px(10),
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: px(8),
  },
  tagPill: {
    backgroundColor: '#F0EDE7',
    paddingHorizontal: px(12),
    paddingVertical: px(6),
    borderRadius: px(12),
  },
  tagText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  freeBadgeRow: {
    backgroundColor: '#F5F2EA',
    paddingHorizontal: px(12),
    paddingVertical: px(5),
    borderRadius: px(12),
    alignSelf: 'flex-start',
    marginBottom: px(12),
  },
  freeBadgeText: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  freeHighlightPill: {
    backgroundColor: '#E5EFE7',
    paddingHorizontal: px(12),
    paddingVertical: px(6),
    borderRadius: px(12),
  },
  freeHighlightText: {
    fontSize: px(12),
    fontFamily: fonts.sans.medium,
    color: colors.primary,
  },
  nextInfoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  nextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(4),
  },
  nextText: {
    fontSize: px(12),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
  },
  profileBtn: {
    backgroundColor: colors.primary,
    height: px(48),
    borderRadius: borderRadius.container,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: px(12),
  },
  profileBtnText: {
    color: colors.white,
    fontSize: px(14),
    fontFamily: fonts.sans.bold,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: px(20),
    padding: px(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: px(20),
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: px(16),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    marginBottom: px(6),
  },
  emptySub: {
    fontSize: px(13),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
