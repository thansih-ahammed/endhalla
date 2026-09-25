import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Channel } from 'stream-chat';
import { connectChatUser } from './streamChatClient';

export default function ChatScreen({ route, navigation }: any) {
  const { channelId, chatToken, otherUserName } = route.params;
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      setError(null);
      try {
        const client = await connectChatUser(chatToken);
        const ch = client.channel('messaging', channelId);
        await ch.watch();
        if (cancelled) return;

        channelRef.current = ch;
        setChannel(ch);
        setMessages([...ch.state.messages]);

        const sub = ch.on('message.new', () => {
          setMessages([...ch.state.messages]);
        });
        unsubscribe = () => sub.unsubscribe();
      } catch (err: any) {
        console.error('Failed to open chat channel:', err);
        if (!cancelled) setError(err?.message || 'Failed to open chat. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [channelId, chatToken]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !channelRef.current) return;
    setText('');
    try {
      await channelRef.current.sendMessage({ text: trimmed });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [text]);

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBackButton}>
          <Text style={styles.errorBackText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading || !channel) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#0F9D8C" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{otherUserName}</Text>
        </View>

        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMe = item.user?.id === chatToken.userId;
            return (
              <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextOther}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#9D9D9D"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!text.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  centered: { flex: 1, backgroundColor: '#F9F8F5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { color: '#1A1A1A', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  errorBackButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0F9D8C', borderRadius: 20 },
  errorBackText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E2DB',
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#1A1A1A', marginTop: -4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12 },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#0F9D8C', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E2DB', borderBottomLeftRadius: 4 },
  bubbleTextMe: { color: '#fff', fontSize: 15 },
  bubbleTextOther: { color: '#1A1A1A', fontSize: 15 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E2DB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F0EDE7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1A1A1A',
  },
  sendButton: {
    backgroundColor: '#0F9D8C',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});
