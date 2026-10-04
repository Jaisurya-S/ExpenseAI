import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { parseVoiceTranscript, normalizeSpokenPhrases } from '../../services/aiService';
import { ALL_CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { ExpenseCategory, PaymentMethod, AIParseResult } from '../../types';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Building2,
  Calendar,
} from '../../components/ui/icons';

const VOICE_EXAMPLES = [
  'Tea 20',
  'Chai 10',
  'Coffee 40',
  'Auto 50',
  'Milk 35',
  'Spent ₹450 for 2 coffees at Starbucks with UPI',
  'Uber ride to office 280 yesterday by card',
  'Bought groceries from Walmart 2500 in cash',
];

export default function VoiceModal() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';
  const { addExpense } = useExpenseStore();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<AIParseResult | null>(null);
  const [speechStatus, setSpeechStatus] = useState<string>('');

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isSaving, setIsSaving] = useState(false);

  const transcriptRef = useRef('');
  transcriptRef.current = transcript;
  const recognitionRef = useRef<any>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 450,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop?.stop();
    };
  }, [isRecording]);

  const startSpeech = () => {
    setSpeechStatus('Listening... Speak naturally (e.g. "Tea 20" or "Dinner 450")');
    setIsRecording(true);
    setTranscript('');
    transcriptRef.current = '';

    if (Platform.OS === 'web') {
      const windowObj = typeof window !== 'undefined' ? (window as any) : null;
      const SpeechRecognition =
        windowObj?.SpeechRecognition || windowObj?.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-IN';

          recognition.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              combined += event.results[i][0].transcript + ' ';
            }
            const clean = normalizeSpokenPhrases(combined.trim());
            setTranscript(clean);
            transcriptRef.current = clean;
          };

          recognition.onerror = (e: any) => {
            console.warn('Speech recognition event error:', e);
            setIsRecording(false);
          };

          recognition.onend = () => {
            setIsRecording(false);
            const current = normalizeSpokenPhrases(transcriptRef.current);
            if (current) {
              setTranscript(current);
              transcriptRef.current = current;
              handleProcessTranscript(current);
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
          return;
        } catch (err) {
          console.warn('Speech start error:', err);
        }
      }
    }

    setIsRecording(true);
    setSpeechStatus('Dictate your expense or choose an example below ✨');
  };

  const stopSpeech = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    const currentText = normalizeSpokenPhrases(transcriptRef.current);
    if (currentText) {
      setTranscript(currentText);
      transcriptRef.current = currentText;
      handleProcessTranscript(currentText);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeech();
    } else {
      startSpeech();
    }
  };

  const handleProcessTranscript = async (textToParse: string) => {
    const cleanText = textToParse.trim();
    if (!cleanText) return;

    setIsProcessing(true);
    setSpeechStatus('AI extracting and structuring details...');

    try {
      const result = await parseVoiceTranscript(cleanText);
      setParsedResult(result);

      if (result.amount > 0) setAmount(result.amount.toString());
      if (result.category) setCategory(result.category);
      if (result.description) setDescription(result.description);
      if (result.merchant) setMerchant(result.merchant);
      if (result.date) setDate(result.date);
      if (result.paymentMethod) setPaymentMethod(result.paymentMethod);

      setSpeechStatus(`Extracted: ${currency}${result.amount} for ${result.description} (${result.category})`);
    } catch {
      setSpeechStatus('Could not parse automatically. Please fill details below.');
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
    }
  };

  const handleConfirmSave = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid expense amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please verify the expense amount.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const userId = user?.uid || profile.uid || 'demo-user';
      const cleanDesc = description.trim() || merchant.trim() || `${category} Expense`;

      await addExpense({
        userId,
        amount: amountNum,
        category,
        description: cleanDesc,
        merchant: merchant.trim() || undefined,
        date,
        paymentMethod,
        inputMethod: 'voice',
        aiConfidence: parsedResult?.confidence || 0.95,
        aiSuggestedCategory: category,
        isAiGenerated: true,
      });

      router.back();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to save expense.');
      } else {
        Alert.alert('Error', 'Failed to save expense.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Voice Expense</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Microphone Card */}
          <View
            style={[
              styles.micCard,
              {
                backgroundColor: colors.card,
                borderColor: isRecording ? colors.primary : colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleRecording}
                style={[
                  styles.micCircle,
                  {
                    backgroundColor: isRecording ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                {isRecording ? (
                  <MicOff size={32} color={colors.primaryText} />
                ) : (
                  <Mic size={32} color={colors.text} />
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={[styles.micActionText, { color: colors.text }]}>
              {isRecording ? 'Tap to finish recording' : 'Tap to speak expense'}
            </Text>

            {speechStatus !== '' && (
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {speechStatus}
              </Text>
            )}

            {/* Live Transcript Input */}
            <View
              style={[
                styles.transcriptContainer,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <TextInput
                style={[styles.transcriptInput, { color: colors.text }]}
                placeholder='Spoken phrase appears here or type "Tea 20"...'
                placeholderTextColor={colors.textMuted}
                value={transcript}
                onChangeText={(t) => {
                  setTranscript(t);
                  transcriptRef.current = t;
                }}
                onSubmitEditing={() => handleProcessTranscript(transcript)}
                returnKeyType="done"
              />
              {transcript.trim() !== '' && (
                <TouchableOpacity
                  onPress={() => handleProcessTranscript(transcript)}
                  style={[styles.parseChip, { backgroundColor: colors.primary }]}
                >
                  <Sparkles size={12} color={colors.primaryText} style={{ marginRight: 4 }} />
                  <Text style={[styles.parseChipText, { color: colors.primaryText }]}>Parse</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Examples */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUICK EXAMPLES</Text>
            <View style={styles.examplesGrid}>
              {VOICE_EXAMPLES.map((ex) => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => {
                    setTranscript(ex);
                    transcriptRef.current = ex;
                    handleProcessTranscript(ex);
                  }}
                  style={[
                    styles.exampleChip,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.exampleText, { color: colors.text }]}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Parsed / Editable Results */}
          {(parsedResult || amount !== '') && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PARSED DETAILS</Text>

              {/* Amount */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount ({currency})</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      color: colors.text,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      color: colors.text,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholder="e.g. Coffee, Lunch"
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                  {ALL_CATEGORIES.map((cat) => {
                    const isSel = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={[
                          styles.catPickChip,
                          {
                            backgroundColor: isSel ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                            borderColor: isSel ? colors.primary : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.catPickText, { color: isSel ? colors.primaryText : colors.text }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Merchant */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Merchant / Store</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      color: colors.text,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                  value={merchant}
                  onChangeText={setMerchant}
                />
              </View>

              {/* Payment Method */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {PAYMENT_METHODS.map((m) => {
                    const isSel = paymentMethod === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setPaymentMethod(m.id)}
                        style={[
                          styles.methodPickChip,
                          {
                            backgroundColor: isSel ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                            borderColor: isSel ? colors.primary : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.methodPickText, { color: isSel ? colors.primaryText : colors.text }]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        {(parsedResult || amount !== '') && (
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirmSave}
              disabled={isSaving}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text style={[styles.submitBtnText, { color: colors.primaryText }]}>
                  Save Expense ({currency}{amount || '0'})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  micCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  micCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  micActionText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  transcriptContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  transcriptInput: {
    flex: 1,
    fontSize: 13,
  },
  parseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  parseChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  exampleChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  catScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  catPickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  catPickText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodPickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  methodPickText: {
    fontSize: 11.5,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
