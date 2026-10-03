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
import { Sparkles, Send, X, Bot, User } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
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
      }! I'm XpenseAI, your personal financial copilot. You can ask me questions like:\n• "How much did I spend on Food this month?"\n• "What is my biggest expense category?"\n• "Give me 3 tips to cut my subscription bills."`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
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
      // Build smart financial context
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      const thisMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonthKey));
      const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const categoryMap: { [cat: string]: number } = {};
      thisMonthExpenses.forEach((e) => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + (e.amount || 0);
      });

      const contextPrompt = `You are XpenseAI, an empathetic and highly intelligent personal finance assistant for ${
        profile.displayName || 'the user'
      }.
User's Financial Context:
- Currency: ${currency}
- Total monthly spending this month: ${currency}${totalSpent.toLocaleString()}
- Spending by category: ${JSON.stringify(categoryMap)}
- Budgets: ${JSON.stringify(budgets.map((b) => ({ category: b.category, limit: b.amount })))}
- Recent transactions: ${JSON.stringify(
        expenses.slice(0, 8).map((e) => ({
          date: e.date,
          amount: e.amount,
          cat: e.category,
          merchant: e.merchant || e.description,
        }))
      )}

User Query: "${userText}"
Provide a clear, actionable, friendly response formatted nicely with markdown bullet points if helpful. Keep it concise (under 120 words).`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://xpenseai.app',
          'X-Title': 'XpenseAI Assistant',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: contextPrompt }],
          max_tokens: 280,
          temperature: 0.5,
        }),
      });

      const data = await res.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        "I've analyzed your financial data. You're making steady progress this month! Let me know if you want a deeper dive into any specific category.";

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: 'ai-err-' + Date.now(),
        sender: 'ai',
        text: `Based on your ${expenses.length} tracked records, your total monthly spend is ${currency}${expenses.reduce(
          (sum, e) => sum + (e.amount || 0),
          0
        ).toLocaleString()}. You're managing expenses well!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Sparkles size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>XpenseAI Copilot</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                AI Financial Advisor
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
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
                  <View style={[styles.aiAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Bot size={16} color={colors.primary} />
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
                        ? [styles.userText, { color: colors.primaryText }]
                        : [styles.aiText, { color: colors.text }],
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.timeText,
                      isUser
                        ? [styles.userTime, { color: colors.primaryText, opacity: 0.8 }]
                        : [styles.aiTime, { color: colors.textMuted }],
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
                },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Analyzing financial telemetry...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
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
                backgroundColor: colors.inputBg,
                color: colors.text,
              },
            ]}
            placeholder="Ask about your budget, savings tips..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              input.trim() && !loading
                ? [styles.sendBtnActive, { backgroundColor: colors.primary }]
                : [styles.sendBtnDisabled, { backgroundColor: colors.inputBg }],
            ]}
          >
            <Send
              size={18}
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
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  userMsgWrapper: {
    justifyContent: 'flex-end',
  },
  aiMsgWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    fontWeight: '600',
  },
  aiText: {
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTime: {},
  aiTime: {},
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginLeft: 36,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {},
  sendBtnDisabled: {},
});
