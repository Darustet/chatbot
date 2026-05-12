import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { ADMIN_API_BASE_URL } from '@/app/utils/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
}

interface ChatbotProps {
  visible?: boolean;
  onClose?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Chatbot({ visible = false, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! 👋 I\'m your Nokia assistant. Ask me about theses or universities!',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  
  // CRITICAL FIX: Separate input state completely from component state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(visible);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const sessionId = useMemo(() => `session_${Date.now()}_${Math.random()}`, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    setIsOpen(visible);
  }, [visible]);

  // Auto-scroll only when messages change, not during typing
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages.length]); // Only when message count changes

  // CRITICAL FIX: Completely isolated input handler
  const handleInputChange = useCallback((text: string) => {
    // console.log('Input changed:', text); // Debug log
    setInputText(text);
  }, []);

  // Send message function
  const sendMessage = useCallback(async () => {
    const messageToSend = inputText.trim();
    if (!messageToSend || isLoading) return;

    console.log('Sending message:', messageToSend); // Debug log
    
    // Clear input FIRST
    setInputText('');
    
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: messageToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiUrl = `${ADMIN_API_BASE_URL}/api/chatbot`;
      
      const requestBody = {
        message: messageToSend,
        context: {
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
        }
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        text: data.reply || 'Sorry, I received an empty response.',
        isUser: false,
        timestamp: new Date(),
        intent: data.intent,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      
      const errorMessage = 'Sorry, I\'m having trouble connecting. Please check if the server is running! ';
      
      const errorMessageObj: Message = {
        id: `error_${Date.now()}`,
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, sessionId]);

  const handleSubmitEditing = useCallback(() => {
    sendMessage();
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome_new',
        text: 'Hi! 👋 I\'m your Nokia assistant. Ask me about theses, dashboard data, or universities!',
        isUser: false,
        timestamp: new Date(),
      }
    ]);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const quickSuggestions = useMemo(() => [
    '🔍 Find theses',
    '📊 Dashboard', 
    '🏫 Universities',
    '❓ Help'
  ], []);

  const handleQuickSuggestion = useCallback((suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/^[🔍📊🏫❓]\s/, '');
    setInputText(cleanSuggestion);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, []);

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.compactModalContainer,
          keyboardVisible && styles.compactModalContainerKeyboard
        ]}>
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.statusDot} />
                <Text style={styles.headerTitle}>Nokia Assistant</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>🗑️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageWrapper,
                    message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.isUser ? styles.userMessage : styles.botMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.isUser ? styles.userMessageText : styles.botMessageText,
                      ]}
                      selectable={true}
                    >
                      {message.text}
                    </Text>
                    <Text
                      style={[
                        styles.timestamp,
                        message.isUser ? styles.userTimestamp : styles.botTimestamp,
                      ]}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
              
              {isLoading && (
                <View style={styles.loadingWrapper}>
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color="#007BFF" />
                    <Text style={styles.loadingText}>...</Text>
                  </View>
                </View>
              )}

              {/* Quick suggestions */}
              {messages.length === 1 && !isLoading && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Try:</Text>
                  <View style={styles.suggestionRow}>
                    {quickSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionButton}
                        onPress={() => handleQuickSuggestion(suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* FIXED Input Section */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={textInputRef}
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={handleInputChange}
                    placeholder="Ask me anything..."
                    placeholderTextColor="#999"
                    
                    // CRITICAL: These settings prevent focus loss
                    multiline={false}
                    numberOfLines={1}
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmitEditing}
                    blurOnSubmit={false}
                    
                    // FIXED: Disable all auto-features that cause re-renders
                    autoCorrect={false}
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    keyboardType="default"
                    textContentType="none"
                    
                    // CRITICAL: Prevent focus issues
                    autoFocus={false}
                    selectTextOnFocus={false}
                    clearButtonMode="never"
                    enablesReturnKeyAutomatically={false}
                    
                    // Platform-specific fixes
                    underlineColorAndroid="transparent"
                    allowFontScaling={false}
                    
                    // Debug props
                    onFocus={() => console.log('Input focused')}
                    onBlur={() => console.log('Input blurred')}
                  />
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!inputText.trim() || isLoading}
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendButtonText}>
                      {isLoading ? '⏳' : '➤'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Floating Button Component
export const ChatbotButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity 
      style={[styles.floatingButton, pulse && styles.floatingButtonPulse]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.floatingButtonText}>💬</Text>
      <View style={styles.notificationBadge}>
        <Text style={styles.badgeText}>AI</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  compactModalContainer: {
    width: Math.min(380, screenWidth * 0.9),
    height: Math.min(500, screenHeight * 0.7),
    marginRight: 15,
    marginBottom: 90,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  compactModalContainerKeyboard: {
    height: Math.min(400, screenHeight * 0.6),
    marginBottom: 20,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 6,
    marginLeft: 4,
  },
  headerButtonText: {
    fontSize: 14,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginVertical: 2,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userMessage: {
    backgroundColor: '#007BFF',
  },
  botMessage: {
    backgroundColor: '#f1f3f5',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#999',
  },
  loadingWrapper: {
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 12,
  },
  suggestionsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  suggestionButton: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 2,
  },
  suggestionText: {
    color: '#1976d2',
    fontSize: 11,
    fontWeight: '500',
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 20,
    maxHeight: 80,
    textAlignVertical: 'center',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007BFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonPulse: {
    transform: [{ scale: 1.1 }],
  },
  floatingButtonText: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#28a745',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
});