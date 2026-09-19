import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Channel } from 'stream-chat';
import { connectChatUser } from './streamChatClient';
import { colors, fonts } from '../theme';
import { px } from '../utils/responsive';
import Avatar from '../components/Avatar';
import Header from '../components/Header';

interface ChatTokenData {
  apiKey: string;
  token: string;
  userId: string;
  userName: string;
}

interface ChatListScreenProps {
  chatToken?: ChatTokenData;
  navigation: any;
  /** Shown as a back button when the list is pushed on a stack rather than a tab. */
  onBackPress?: () => void;
}

function getOtherMember(channel: Channel, myUserId: string) {
  const members = Object.values(channel.state.members || {});
  const other = members.find((m) => m.user?.id !== myUserId);
  return other?.user;
}

export default function ChatListScreen({ chatToken, navigation, onBackPress }: ChatListScreenProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    if (!chatToken) return;
    setLoading(true);
    setError(null);
    try {
      const client = await connectChatUser(chatToken);
      const result = await client.queryChannels(
        { type: 'messaging', members: { $in: [chatToken.userId] } },
        [{ last_message_at: -1 }],
      );
      setChannels(result);
    } catch (err: any) {
      console.error('Failed to load chat channels:', err);
      setError(err?.message || 'Failed to load messages. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [chatToken]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  if (!chatToken || (loading && channels.length === 0 && !error)) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity onPress={loadChannels} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {onBackPress ? (
          <Header title="Messages" onBackPress={onBackPress} containerStyle={styles.header} titleStyle={styles.headerTitle} />
        ) : (
          <Text style={styles.title}>Messages</Text>
        )}
        <FlatList
          data={channels}
          keyExtractor={(item) => item.cid}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadChannels}
          ListEmptyComponent={<Text style={styles.emptyText}>No conversations yet.</Text>}
          renderItem={({ item }) => {
            const other = getOtherMember(item, chatToken.userId);
            const lastMessage = item.state.messages[item.state.messages.length - 1];
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('ChatScreen', {
                    channelId: item.id,
                    chatToken,
                    otherUserName: other?.name || 'Conversation',
                  })
                }
              >
                <Avatar name={other?.name} size={px(48)} shape="round" badge={item.countUnread()} style={styles.avatar} />
                <View style={styles.rowBody}>
                  <Text style={styles.name}>{other?.name || 'Conversation'}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {lastMessage?.text || 'Say hello 👋'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: px(28),
    fontFamily: fonts.sans.bold,
    color: colors.black,
    paddingHorizontal: px(20),
    marginTop: px(8),
    marginBottom: px(16),
  },
  header: { paddingHorizontal: px(20), marginBottom: px(8) },
  headerTitle: { fontFamily: fonts.sans.bold, fontSize: px(22) },
  list: { paddingHorizontal: px(20), paddingBottom: px(30) },
  emptyText: { color: colors.textSecondary, fontFamily: fonts.sans.regular, textAlign: 'center', marginTop: px(40) },
  retryButton: { marginTop: px(16), paddingHorizontal: px(20), paddingVertical: px(10), backgroundColor: colors.primary, borderRadius: px(20) },
  retryText: { color: colors.white, fontFamily: fonts.sans.semiBold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: px(24),
    borderWidth: 1,
    borderColor: colors.border,
    padding: px(16),
    marginBottom: px(12),
  },
  avatar: { marginRight: px(14) },
  rowBody: { flex: 1 },
  name: { fontFamily: fonts.sans.bold, fontSize: px(16), color: colors.black, marginBottom: px(2) },
  preview: { fontSize: px(13), fontFamily: fonts.sans.regular, color: colors.textSecondary },
});
