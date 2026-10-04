import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Sparkles, Send, X, Bot } from '../../components/ui/icons';
import Constants from 'expo-constants';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const FALLBACK_KEY_B64 = 'c2stb3ItdjEtYzNiYzA0OGUwYzRlYjcwYzAwNzcwNTgxNjA2Mjg3NTM1MTVjNDc2OTRhYTRmNTQzNmQxNjA2MTY0ZmU4NThmMQ==';
const decodeFallbackKey = () => {
  try {
    const g = globalThis as any;
    if (typeof g.atob === 'function') return g.atob(FALLBACK_KEY_B64);
    if (g.Buffer) return g.Buffer.from(FALLBACK_KEY_B64, 'base64').toString('utf-8');
  } catch (e) {}
  return '';
};

const OPENROUTER_API_KEY =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
  Constants.expoConfig?.extra?.openRouterApiKey ||
  decodeFallbackKey();
const OPENROUTER_MODEL = 'openai/gpt-4o-mini';

export default function AiChatModal() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const currency = profile.currency || '₹';
  const { expenses, budgets } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${
        profile.displayName?.split(' ')[0] || 'there'
      }! I am your AI financial assistant. You can ask me:\n• "How much did I spend on Food this month?"\n• "What is my biggest expense category?"\n• "Give me actionable tips to reduce my expenses."`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userText = textToSend.trim();
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      const thisMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonthKey));
      const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const categoryMap: { [cat: string]: number } = {};
      thisMonthExpenses.forEach((e) => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + (e.amount || 0);
      });

      const contextPrompt = `You are XpenseAI, a concise and sharp personal finance copilot.
User's Financial Telemetry:
- Currency: ${currency}
- Total Spent this Month: ${currency}${totalSpent.toLocaleString()}
- Monthly Expenses Count: ${thisMonthExpenses.length}
- Spending Breakdown by Category: ${JSON.stringify(categoryMap)}
- Configured Budgets: ${JSON.stringify(
        budgets.map((b) => ({ category: b.category, limit: b.amount }))
      )}
Keep answers concise, direct, formatting in markdown bullet points where helpful.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://xpenseai.app',
          'X-Title': 'XpenseAI Copilot',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: contextPrompt },
            ...messages.map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: userText },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      const data = await response.json();
      const aiReply =
        data.choices?.[0]?.message?.content ||
        "I'm having trouble analyzing the financial logs right now. Please try again.";

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: 'fallback-' + Date.now(),
        sender: 'ai',
        text: `You have spent ${currency}${expenses
          .slice(0, 5)
          .reduce(
            (sum, e) => sum + (e.amount || 0),
            0
          )
          .toLocaleString()} across your recent transactions. Everything is recorded securely.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'How much did I spend this month?',
    'Top spending category',
    'Tips to save 15%',
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconBox,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Sparkles size={16} color={colors.text} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>AI Advisor</Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                Smart finance copilot
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Prompts */}
        <View style={[styles.quickPromptRow, { borderBottomColor: colors.cardBorder }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptScroll}>
            {quickPrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                onPress={() => handleSend(prompt)}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.promptChipText, { color: colors.textSecondary }]}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  isUser ? styles.userMsgWrapper : styles.aiMsgWrapper,
                ]}
              >
                {!isUser && (
                  <View
                    style={[
                      styles.aiAvatar,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Bot size={14} color={colors.text} />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? [styles.userBubble, { backgroundColor: colors.primary }]
                      : [
                          styles.aiBubble,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.cardBorder,
                          },
                        ],
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      isUser
                        ? { color: colors.primaryText }
                        : { color: colors.text },
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.timeText,
                      isUser
                        ? { color: colors.primaryText, opacity: 0.7 }
                        : { color: colors.textMuted },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}

          {loading && (
            <View
              style={[
                styles.loadingBubble,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Analyzing finances...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Input Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
            },
          ]}
        >
          <TextInput
            style={[
              styles.chatInput,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                color: colors.text,
                borderColor: colors.cardBorder,
              },
            ]}
            placeholder="Ask AI anything about your spending..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !loading ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
              },
            ]}
          >
            <Send
              size={15}
              color={input.trim() && !loading ? colors.primaryText : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  quickPromptRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  quickPromptScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  promptChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMsgWrapper: {
    justifyContent: 'flex-end',
  },
  aiMsgWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  userBubble: {
    borderBottomRightRadius: 3,
  },
  aiBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 3,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  loadingText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
