import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, Modal, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { Send, X, MessageSquare, User, ShieldCheck } from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import { COLORS, API_URL } from '../constants/theme';

interface ChatMessage {
  _id?: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'Admin' | 'Worker';
  message: string;
  timestamp: string;
}

interface ChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  complaintId: string;
  workerId: string;
  workerName: string;
}

export default function ChatModal({ isVisible, onClose, complaintId, workerId, workerName }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isVisible) {
      // Connect to Socket
      socketRef.current = io(API_URL, {
        path: '/ws/socket.io'
      });

      // Join Room
      socketRef.current.emit('join_chat', { complaint_id: complaintId });

      // Fetch History
      fetch(`${API_URL}/chat/${complaintId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(err => console.error('Error fetching chat history:', err));

      // Listen for new messages
      socketRef.current.on('new_chat_message', (msg: ChatMessage) => {
        setMessages(prev => {
          if (prev.some(m => m.timestamp === msg.timestamp && m.message === msg.message)) return prev;
          return [...prev, msg];
        });
      });

      return () => {
        socketRef.current?.emit('leave_chat', { complaint_id: complaintId });
        socketRef.current?.disconnect();
      };
    }
  }, [isVisible, complaintId]);

  const handleSend = () => {
    if (!input.trim()) return;

    const msg = {
      sender_id: workerId,
      sender_name: workerName,
      sender_role: 'Worker',
      message: input,
    };

    fetch(`${API_URL}/chat/${complaintId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).then(() => {
      setInput('');
    }).catch(err => console.error('Send error:', err));
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_role === 'Worker';
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: COLORS.primary + '20' }]}>
            <ShieldCheck size={16} color={COLORS.primary} />
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.senderName, isMe ? styles.senderMe : styles.senderOther]}>
            {isMe ? 'You' : 'Management Office'}
          </Text>
          <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeOther]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Task Discussion</Text>
              <Text style={styles.headerSubtitle}>#{complaintId.slice(-6)}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Chat List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageSquare size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>Start a conversation with the management about this task</Text>
              </View>
            }
          />

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message office..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            <TouchableOpacity 
              onPress={handleSend} 
              disabled={!input.trim()}
              style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
            >
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff'
  },
  closeBtn: { padding: 8 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 32 },
  messageRow: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
  messageRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageRowOther: { alignSelf: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageBubble: { padding: 12, borderRadius: 20 },
  bubbleMe: { backgroundColor: COLORS.primary, borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderTopLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  senderName: { fontSize: 10, fontWeight: '800', marginBottom: 2, textTransform: 'uppercase' },
  senderMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  senderOther: { color: COLORS.primary },
  messageText: { fontSize: 15, lineHeight: 20 },
  textMe: { color: '#fff' },
  textOther: { color: COLORS.text },
  timeText: { fontSize: 9, marginTop: 4 },
  timeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  timeOther: { color: COLORS.textMuted },
  inputArea: { 
    flexDirection: 'row', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'flex-end'
  },
  input: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 8,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sendBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 16, fontSize: 14, lineHeight: 20 }
});
