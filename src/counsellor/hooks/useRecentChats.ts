import { useCallback, useEffect, useState } from 'react';
import type { Channel } from 'stream-chat';
import { useGetCounsellorChatTokenQuery } from '../../shared/store/api/counsellorApi';
import { connectChatUser } from '../../shared/chat/streamChatClient';

export interface RecentChat {
  channelId: string;
  name: string;
  preview: string;
  unread: number;
  lastMessageAt: Date | null;
}

const getOtherMember = (channel: Channel, myUserId: string) => {
  const members = Object.values(channel.state.members || {});
  return members.find((m) => m.user?.id !== myUserId)?.user;
};

/**
 * Most recent Stream Chat conversations for the signed-in counsellor.
 * Returns the chat token too so callers can navigate straight into ChatScreen.
 */
export function useRecentChats(limit = 3) {
  const { data: chatToken, isError: tokenError } = useGetCounsellorChatTokenQuery();
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!chatToken) return;
    setLoading(true);
    setError(null);
    try {
      const client = await connectChatUser(chatToken);
      const channels = await client.queryChannels(
        { type: 'messaging', members: { $in: [chatToken.userId] } },
        [{ last_message_at: -1 }],
        { limit },
      );
      setChats(
        channels.map((ch) => {
          const other = getOtherMember(ch, chatToken.userId);
          const last = ch.state.messages[ch.state.messages.length - 1];
          return {
            channelId: ch.id || '',
            name: other?.name || 'Conversation',
            preview: last?.text || 'Say hello 👋',
            unread: ch.countUnread(),
            lastMessageAt: last?.created_at ? new Date(last.created_at) : null,
          };
        }),
      );
    } catch (err: any) {
      console.error('Failed to load recent chats:', err);
      setError(err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chatToken, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tokenError) setLoading(false);
  }, [tokenError]);

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  return { chats, chatToken, loading: loading && !tokenError, error, reload: load, totalUnread };
}
