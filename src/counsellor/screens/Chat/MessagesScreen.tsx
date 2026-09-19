import React from 'react';
import { useGetCounsellorChatTokenQuery } from '../../../shared/store/api/counsellorApi';
import ChatListScreen from '../../../shared/chat/ChatListScreen';

export default function MessagesScreen({ navigation }: any) {
  const { data } = useGetCounsellorChatTokenQuery();
  return <ChatListScreen chatToken={data} navigation={navigation} onBackPress={() => navigation.goBack()} />;
}
