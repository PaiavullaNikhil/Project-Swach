import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { Send, Bot, User } from 'lucide-react-native';
import axios from 'axios';
import { COLORS, API_URL } from '../constants/theme';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isTyping?: boolean;
}

interface ChatBotProps {
  isKeyboardVisible: boolean;
  userHash: string | null;
}

export default function ChatBotView({ isKeyboardVisible, userHash }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: 'Hello! I am Swachh AI. How can I help you today?', sender: 'ai', isTyping: false }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), text: input.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // We will create this endpoint in the citizens backend next
      const response = await axios.post(`${API_URL}/api/ai/query`, { 
        query: userMsg.text,
        user_hash: userHash,
        history: messages.slice(-5).map(m => ({ role: m.sender, text: m.text }))
      });
      
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        text: response.data.answer || "Sorry, I couldn't understand that.", 
        sender: 'ai',
        isTyping: true
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        text: "Sorry, I am having trouble connecting to the server.", 
        sender: 'ai',
        isTyping: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const markMessageComplete = (id: string) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, isTyping: false } : msg));
  };

  const TypewriterText = ({ msg }: { msg: ChatMessage }) => {
    const [displayedText, setDisplayedText] = useState(msg.isTyping ? '' : msg.text);

    useEffect(() => {
      if (!msg.isTyping) {
        setDisplayedText(msg.text);
        return;
      }

      let i = 0;
      setDisplayedText('');
      const timer = setInterval(() => {
        if (i < msg.text.length) {
          setDisplayedText(prev => prev + msg.text.charAt(i));
          i++;
        } else {
          clearInterval(timer);
          markMessageComplete(msg.id);
        }
      }, 15); // 15ms per character for a fast, snappy effect

      return () => clearInterval(timer);
    }, [msg.text, msg.isTyping]);

    return <>{displayedText}</>;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
      <View style={styles.iconContainer}>
        {item.sender === 'user' ? <User size={16} color="#fff" /> : <Bot size={16} color={COLORS.primary} />}
      </View>
      <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.aiText]}>
        {item.sender === 'ai' ? <TypewriterText msg={item} /> : item.text}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bot size={28} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Swachh Assistant</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
      />

      <View style={[styles.inputContainer, { paddingBottom: keyboardHeight > 0 ? (Platform.OS === 'ios' ? keyboardHeight + 10 : keyboardHeight + 10) : 120 }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginLeft: 10 },
  chatContainer: { padding: 20, paddingBottom: 100 },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageText: {
    fontSize: 15,
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userText: { backgroundColor: COLORS.primary, color: '#fff' },
  aiText: { backgroundColor: '#fff', color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 12,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
