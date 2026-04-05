import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { MessageAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import SocketService from 'services/socketService';
import UpgradeModal from 'src/components/UpgradeModal';

// ── Dummy messages for dev ────────────────────────────────────────────────────
const DUMMY_MESSAGES = [
  { _id: '1', content: "Hey! How was your morning? I just saw that new cafe we talked about.", createdAt: new Date('2024-01-01T10:45:00'), isMine: false, isRead: true },
  { _id: '2', content: "It was great! I'm actually free for lunch if you are? 🥗",            createdAt: new Date('2024-01-01T10:48:00'), isMine: true,  isRead: true },
  { _id: '3', content: "That sounds like a plan! See you then.",                               createdAt: new Date('2024-01-01T10:50:00'), isMine: false, isRead: true },
];

// ── Date separator ────────────────────────────────────────────────────────────
function DateLabel({ date }) {
  const label = (() => {
    const d    = new Date(date);
    const now  = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'YESTERDAY';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  })();

  return (
    <View style={dateStyles.container}>
      <View style={dateStyles.line} />
      <View style={dateStyles.pill}><Text style={dateStyles.text}>{label}</Text></View>
      <View style={dateStyles.line} />
    </View>
  );
}

const dateStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  line:      { flex: 1, height: 1, backgroundColor: '#F0E0E6' },
  pill:      { backgroundColor: '#FFE4EC', paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.full, marginHorizontal: 10 },
  text:      { fontSize: FontSize.xs, color: '#FF4B7A', fontWeight: FontWeight.semibold, letterSpacing: 0.8 },
});

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, showAvatar, avatar }) {
  const { content, isMine, createdAt, isRead, isSending } = message;
  const time = new Date(createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={[bubbleStyles.row, isMine && bubbleStyles.rowMine]}>
      {!isMine && (
        <View style={bubbleStyles.avatarSlot}>
          {showAvatar
            ? <Image source={{ uri: avatar }} style={bubbleStyles.avatar} />
            : <View style={bubbleStyles.avatarPlaceholder} />
          }
        </View>
      )}
      <View style={[bubbleStyles.wrapper, isMine && bubbleStyles.wrapperMine]}>
        <View style={[bubbleStyles.bubble, isMine ? bubbleStyles.bubbleMine : bubbleStyles.bubbleTheirs, isSending && bubbleStyles.bubbleSending]}>
          <Text style={[bubbleStyles.text, isMine && bubbleStyles.textMine]}>{content}</Text>
        </View>
        <View style={[bubbleStyles.metaRow, isMine && bubbleStyles.metaRowMine]}>
          <Text style={bubbleStyles.time}>{time}</Text>
          {isMine && (
            <Text style={[bubbleStyles.ticks, isRead && bubbleStyles.ticksRead]}>
              {isSending ? ' ⏳' : isRead ? ' ✓✓' : ' ✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row:             { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 4, alignItems: 'flex-end' },
  rowMine:         { flexDirection: 'row-reverse' },
  avatarSlot:      { width: 32, marginRight: 8, marginBottom: 18 },
  avatar:          { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { width: 32, height: 32 },
  wrapper:         { maxWidth: '75%' },
  wrapperMine:     { alignItems: 'flex-end' },
  bubble:          { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleMine:      { backgroundColor: '#FF4B7A', borderBottomLeftRadius: 20, borderBottomRightRadius: 4 },
  bubbleTheirs:    { backgroundColor: Colors.white },
  bubbleSending:   { opacity: 0.6 },
  text:            { fontSize: FontSize.base, color: '#2D3436', lineHeight: 22 },
  textMine:        { color: Colors.white, fontWeight: FontWeight.medium },
  metaRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingLeft: 4 },
  metaRowMine:     { paddingLeft: 0, paddingRight: 4 },
  time:            { fontSize: 11, color: '#A0A0A0' },
  ticks:           { fontSize: 11, color: '#A0A0A0' },
  ticksRead:       { color: '#FF4B7A' },
});

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={typingStyles.row}>
      <View style={typingStyles.bubble}>
        <Text style={typingStyles.dots}>• • •</Text>
      </View>
    </View>
  );
}
const typingStyles = StyleSheet.create({
  row:    { flexDirection: 'row', marginHorizontal: Spacing.lg + 40, marginBottom: Spacing.sm },
  bubble: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomLeftRadius: 4 },
  dots:   { fontSize: FontSize.lg, color: '#A0A0A0', letterSpacing: 2 },
});

// ══════════════════════════════════════════════════════════════════════════════
export default function ChatScreen({ navigation, route }) {
  const insets    = useSafeAreaInsets();
  const { user }  = useAuth();

  const userId     = route?.params?.userId;
  const isDummy    = !userId || !/^[a-f0-9]{24}$/i.test(userId);
  const userName   = route?.params?.userName   || 'Match';
  const userAvatar = route?.params?.userAvatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF4D6D&color=fff&size=100`;
  const matchId    = route?.params?.matchId;

  const [messages,        setMessages]        = useState([]);
  const [inputText,       setInputText]       = useState('');
  const [loading,         setLoading]         = useState(true);
  const [sending,         setSending]         = useState(false);
  const [isTyping,        setIsTyping]        = useState(false);
  const [isOnline,        setIsOnline]        = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);

  // ── Fetch message history ─────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (isDummy) {
      setMessages(DUMMY_MESSAGES);
      setLoading(false);
      return;
    }
    try {
      const data    = await MessageAPI.getMessages(userId, 1);
      const fetched = (data.messages || []).map((m) => ({
        ...m,
        isMine: m.sender === user?._id || m.sender?._id === user?._id,
      }));
      setMessages(fetched.length > 0 ? fetched : __DEV__ ? DUMMY_MESSAGES : []);
    } catch (err) {
      console.log('Chat fetch error:', err.message);
      if (__DEV__) setMessages(DUMMY_MESSAGES);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => { fetchMessages(); }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id || !userId || isDummy) return;

    // Join the chat room
    SocketService.joinRoom(user._id, userId);

    // Incoming message
    SocketService.onMessage((data) => {
      // Only handle messages for this conversation
      if (data.sender !== userId && data.receiver !== userId) return;
      if (data.sender === user._id) return; // ignore own messages (already optimistic)

      const newMsg = {
        _id:       data._id || Date.now().toString(),
        content:   data.content,
        createdAt: data.createdAt || new Date().toISOString(),
        isMine:    false,
        isRead:    false,
      };
      setMessages((prev) => [...prev, newMsg]);
      setIsTyping(false);
      scrollToBottom();

      // Mark as read
      SocketService.markAsRead(user._id, userId);
    });

    // Typing indicators
    SocketService.onTypingStart(({ senderId }) => {
      if (senderId === userId) setIsTyping(true);
    });
    SocketService.onTypingStop(({ senderId }) => {
      if (senderId === userId) setIsTyping(false);
    });

    // Read receipts
    SocketService.onMessageRead(({ readerId }) => {
      if (readerId === userId) {
        setMessages((prev) =>
          prev.map((m) => m.isMine ? { ...m, isRead: true } : m)
        );
      }
    });

    return () => {
      SocketService.offMessage();
      SocketService.offTyping();
      SocketService.offMessageRead();
      clearTimeout(typingTimer.current);
    };
  }, [userId, user]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    // ── Subscription gate ─────────────────────────────────────────────────
    const subActive = user?.isSubscribed &&
      (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());
    if (!subActive) {
      setShowUpgradeModal(true);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id:       tempId,
      content:   text,
      createdAt: new Date().toISOString(),
      isMine:    true,
      isRead:    false,
      isSending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setSending(true);
    scrollToBottom();

    // Stop typing
    SocketService.stopTyping(user?._id, userId);
    clearTimeout(typingTimer.current);

    try {
      // 1. Save to DB via REST
      const data = await MessageAPI.sendMessage(userId, text);

      // 2. Emit via Socket for real-time delivery
      SocketService.sendMessage(user?._id, userId, text, tempId);

      // 3. Replace optimistic message with real one
      const realMsg = data.message || data;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId
            ? { ...realMsg, isMine: true, isRead: false }
            : m
        )
      );
    } catch (err) {
      const serverMsg = err?.data?.message || err?.message || '';
      const isMatchError = err?.status === 403 || serverMsg.toLowerCase().includes('matched');
      Alert.alert(
        'Error',
        isMatchError
          ? 'You must be matched to send messages.'
          : 'Failed to send message. Please try again.'
      );
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // ── Typing detection ──────────────────────────────────────────────────────
  const handleInputChange = (text) => {
    setInputText(text);
    if (text.length > 0) {
      SocketService.startTyping(user?._id, userId);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        SocketService.stopTyping(user?._id, userId);
      }, 2000);
    } else {
      SocketService.stopTyping(user?._id, userId);
      clearTimeout(typingTimer.current);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Render items ──────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item, index }) => {
    const prev      = messages[index - 1];
    const next      = messages[index + 1];
    const showDate  = !prev || new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
    const showAvatar = !item.isMine && (!next || next.isMine);

    return (
      <>
        {showDate && <DateLabel date={item.createdAt} />}
        <MessageBubble
          message={item}
          showAvatar={showAvatar}
          avatar={userAvatar}
        />
      </>
    );
  }, [messages, userAvatar]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerCenter} activeOpacity={0.8}>
            <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
            <View>
              <Text style={styles.headerName}>{userName.split(' ')[0]}</Text>
              <Text style={[styles.headerStatus, isTyping && styles.headerStatusTyping]}>
                {isTyping ? '✍️ typing...' : 'Online'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerDivider} />

        {/* ── Messages ──────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FF4B7A" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onLayout={scrollToBottom}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive"
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />
        )}

        {/* ── Input bar ─────────────────────────────────────────────── */}
        <View style={[styles.inputBar, { paddingBottom: 10 + insets.bottom }]}>
          <TouchableOpacity style={styles.plusBtn}>
            <Text style={styles.plusIcon}>+</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#A0A0A0"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity style={styles.emojiBtn}>
            <Text style={styles.emojiIcon}>😊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendIcon}>▶</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Subscription upgrade modal ─────────────────────────────── */}
        <UpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={() => setShowUpgradeModal(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFF5F7' },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: Colors.white },
  backBtn:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:       { fontSize: 22, color: '#FF4B7A', fontWeight: FontWeight.bold },
  headerCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginLeft: Spacing.xs },
  headerAvatar:    { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#FF4B7A' },
  headerName:      { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#2D3436' },
  headerStatus:    { fontSize: FontSize.xs, color: '#2ECC71', fontWeight: FontWeight.medium },
  headerStatusTyping: { color: '#FF4B7A' },
  headerDivider:   { height: 1, backgroundColor: '#F0E0E6' },
  loadingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList:    { paddingVertical: Spacing.sm, paddingBottom: Spacing.md },
  inputBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 10, backgroundColor: '#F5F0F2', borderTopWidth: 1, borderTopColor: '#F0E0E6', gap: 8 },
  plusBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center' },
  plusIcon:        { fontSize: 22, color: Colors.white, fontWeight: FontWeight.bold, lineHeight: 24 },
  input:           { flex: 1, backgroundColor: Colors.white, borderRadius: 24, paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: FontSize.base, color: '#2D3436', maxHeight: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  emojiBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  emojiIcon:       { fontSize: 22 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#FFB8CC' },
  sendIcon:        { fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold },
});