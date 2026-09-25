import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { px } from '../../../shared/utils/responsive';
import { colors, fonts, borderRadius } from '../../theme';
import Header from '../../../shared/components/Header';
import CustomButton from '../../../shared/components/CustomButton';
import { useGetCounsellorByIdQuery, CounsellorItem } from '../../../shared/store/api/clientApi';

/**
 * Full profile for one counsellor, opened by tapping a card on Home or Search.
 *
 * The caller passes the list item it already has as `counsellor`, so the page
 * paints immediately and the API response just fills in anything the list
 * response trimmed. That fallback also keeps the screen usable if
 * GET /counsellors/:id 404s — it only returns approvalStatus === 'approved'.
 */
export default function CounsellorDetailScreen({ route, navigation }: any) {
  const { counsellorId, counsellor: passed } = route.params || {};
  const { data, isLoading } = useGetCounsellorByIdQuery(counsellorId, { skip: !counsellorId });

  const c: Partial<CounsellorItem> = data?.data || passed || {};
  const hasAnything = Object.keys(c).length > 0;

  if (isLoading && !hasAnything) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!hasAnything) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>This counsellor is no longer available.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isFree = c.hasFreeSessionOffer !== false;
  const rates = c.rates || { chat: 0, voice: 0, video: 0 };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <Header title="Counsellor" onBackPress={() => navigation.goBack()} containerStyle={styles.header} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={styles.topRow}>
            {c.avatar ? (
              <Image source={{ uri: c.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(c.fullName || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.identity}>
              <Text style={styles.name}>{c.fullName}</Text>
              {c.title ? <Text style={styles.role}>{c.title}</Text> : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>⭐ {c.rating ?? 4.9}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{c.reviewCount ?? 0} reviews</Text>
              </View>
            </View>
          </View>

          {isFree ? (
            <View style={styles.freePill}>
              <Text style={styles.freePillText}>🎁 {c.freeSessionDurationText || '40 min · Free'}</Text>
            </View>
          ) : null}

          {/* Quick facts */}
          <View style={styles.card}>
            <Fact label="Experience" value={`${c.experienceYears ?? 0} yrs`} />
            <Fact label="Languages" value={(c.languages || ['English']).join(', ')} />
            <Fact label="Gender" value={c.gender || '—'} />
            <Fact label="Verified" value={c.isVerified ? 'Yes' : 'Not yet'} last />
          </View>

          {/* Areas of focus */}
          {c.areasOfFocus?.length ? (
            <>
              <Text style={styles.sectionTitle}>Areas of focus</Text>
              <View style={styles.tagWrap}>
                {c.areasOfFocus.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* About */}
          {c.bio ? (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{c.bio}</Text>
            </>
          ) : null}

          {/* Rates */}
          <Text style={styles.sectionTitle}>Session rates</Text>
          <View style={styles.card}>
            <Fact label="💬  Chat" value={isFree ? 'Free' : `₹${rates.chat}`} />
            <Fact label="🎧  Voice" value={isFree ? 'Free' : `₹${rates.voice}`} />
            <Fact label="🎥  Video" value={isFree ? 'Free' : `₹${rates.video}`} last />
          </View>

          {/* Credentials */}
          {c.certificates?.length ? (
            <>
              <Text style={styles.sectionTitle}>Credentials</Text>
              <View style={styles.tagWrap}>
                {c.certificates.map((cert) => (
                  <View key={cert} style={styles.certTag}>
                    <Text style={styles.certText}>✓ {cert}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.spacer} />
        </ScrollView>

        <View style={styles.footer}>
          <CustomButton
            title={isFree ? 'Book a free session' : 'Book a session'}
            onPress={() => navigation.navigate('BookSession', { counsellor: c, isFreeOffer: isFree })}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Fact({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.factRow, last ? styles.factRowLast : null]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: px(20) },
  content: { paddingHorizontal: px(20), paddingBottom: px(20) },

  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: px(8) },
  avatar: { width: px(84), height: px(84), borderRadius: borderRadius.xxl, marginRight: px(16) },
  avatarFallback: { backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: px(32), fontFamily: fonts.sans.bold, color: colors.avatarText },
  identity: { flex: 1 },
  name: { fontSize: px(22), fontFamily: fonts.sans.bold, color: colors.black },
  role: { fontSize: px(13), fontFamily: fonts.sans.regular, color: colors.textSecondary, marginTop: px(2) },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: px(6) },
  metaText: { fontSize: px(12), fontFamily: fonts.sans.medium, color: colors.textSecondary },
  metaDot: { marginHorizontal: px(6), color: colors.chevron },

  freePill: {
    alignSelf: 'flex-start',
    marginTop: px(16),
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  freePillText: { fontSize: px(12), fontFamily: fonts.sans.semiBold, color: colors.primaryDark },

  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: px(16),
    marginTop: px(12),
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: px(13),
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  factRowLast: { borderBottomWidth: 0 },
  factLabel: { fontSize: px(13), fontFamily: fonts.sans.regular, color: colors.textSecondary },
  factValue: { fontSize: px(13), fontFamily: fonts.sans.semiBold, color: colors.black },

  sectionTitle: { fontSize: px(16), fontFamily: fonts.sans.bold, color: colors.black, marginTop: px(24) },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: px(10) },
  tag: {
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutralPill,
    marginRight: px(8),
    marginBottom: px(8),
  },
  tagText: { fontSize: px(12), fontFamily: fonts.sans.medium, color: colors.black },
  certTag: {
    paddingHorizontal: px(14),
    paddingVertical: px(8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    marginRight: px(8),
    marginBottom: px(8),
  },
  certText: { fontSize: px(12), fontFamily: fonts.sans.medium, color: colors.primaryDark },
  bio: {
    fontSize: px(14),
    fontFamily: fonts.sans.regular,
    color: colors.textSecondary,
    lineHeight: px(21),
    marginTop: px(8),
  },

  spacer: { height: px(20) },
  footer: {
    paddingHorizontal: px(20),
    paddingTop: px(12),
    paddingBottom: px(20),
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  emptyText: { fontSize: px(14), fontFamily: fonts.sans.regular, color: colors.textSecondary },
  ghostBtn: { marginTop: px(14), paddingVertical: px(10), paddingHorizontal: px(20) },
  ghostBtnText: { fontFamily: fonts.sans.semiBold, color: colors.primary },
});
