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
import { parseVoiceTranscript, deduplicateSpokenText, normalizeSpokenPhrases } from '../../services/aiService';
import { ALL_CATEGORIES, CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { ExpenseCategory, PaymentMethod, AIParseResult } from '../../types';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Check,
  Building2,
  Calendar,
  RefreshCw,
  Info,
  CheckCircle2,
  Zap,
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
  'Swiggy dinner 480 paid with Google Pay',
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

  // Editable confirmation form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isSaving, setIsSaving] = useState(false);

  // Keep ref to latest transcript so stopping never uses stale closure state
  const transcriptRef = useRef('');
  transcriptRef.current = transcript;

  // Web Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Pulse animation for mic
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let waveLoop: Animated.CompositeAnimation | null = null;

    if (isRecording) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseLoop.start();

      waveLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(waveAnim, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      waveLoop.start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0.3);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
      if (waveLoop) waveLoop.stop();
    };
  }, [isRecording]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startSpeech = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false; // Prevents buffer duplication on Android Chrome
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          recognition.lang = 'en-IN';

          recognition.onstart = () => {
            setSpeechStatus('Listening... Speak naturally now 🎙️');
            setIsRecording(true);
          };

          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                finalTranscript += res[0].transcript + ' ';
              } else {
                interimTranscript += res[0].transcript;
              }
            }
            const raw = (finalTranscript + ' ' + interimTranscript).trim();
            const deduplicated = deduplicateSpokenText(raw);
            if (deduplicated) {
              setTranscript(deduplicated);
              transcriptRef.current = deduplicated;
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
              setSpeechStatus('Microphone permission needed. You can also type or choose an example below.');
            } else if (event.error === 'no-speech') {
              setSpeechStatus('No speech detected. Tap mic to try again or tap an example.');
            } else {
              setSpeechStatus(`Speech notice: ${event.error}. You can also type below.`);
            }
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

    // Fallback if browser/platform speech recognition is unavailable
    setIsRecording(true);
    setSpeechStatus('Dictate your expense or choose a quick example below ✨');
  };

  const stopSpeech = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
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
    setSpeechStatus('✨ AI analyzing and structuring expense details...');

    try {
      const result = await parseVoiceTranscript(cleanText);
      setParsedResult(result);

      if (result.amount > 0) setAmount(result.amount.toString());
      if (result.category) setCategory(result.category);
      if (result.description) setDescription(result.description);
      if (result.merchant) setMerchant(result.merchant);
      if (result.date) setDate(result.date);
      if (result.paymentMethod) setPaymentMethod(result.paymentMethod);

      setSpeechStatus(`🎉 Extracted: ${currency}${result.amount} for ${result.description} (${result.category})`);
    } catch (err) {
      console.warn('Voice parse error:', err);
      setSpeechStatus('Could not parse automatically. Please verify values below.');
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

      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert('Expense Added! 🎙️', `Recorded ${currency}${amountNum} for ${cleanDesc}.`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save voice expense.');
      } else {
        Alert.alert('Save Error', 'Failed to save voice expense.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconCircle,
                {
                  backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.12)',
                },
              ]}
            >
              <Mic size={19} color="#8B5CF6" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Voice Expense</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Speak Naturally · Instant AI Structuring
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Microphone Interactive Recording Stage */}
          <View
            style={[
              styles.micCard,
              {
                backgroundColor: colors.card,
                borderColor: isRecording
                  ? '#EF4444'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
                shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.08)',
              },
            ]}
          >
            {/* Animated Mic Button */}
            <View style={styles.micButtonWrapper}>
              <Animated.View
                style={[
                  styles.micPulseRing,
                  {
                    backgroundColor: isRecording
                      ? 'rgba(239, 68, 68, 0.22)'
                      : isDark
                      ? 'rgba(139, 92, 246, 0.15)'
                      : 'rgba(139, 92, 246, 0.1)',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={toggleRecording}
                style={[
                  styles.micButton,
                  isRecording
                    ? { backgroundColor: '#EF4444' }
                    : { backgroundColor: colors.primary },
                ]}
              >
                {isRecording ? (
                  <MicOff size={34} color="#FFFFFF" />
                ) : (
                  <Mic size={34} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.recordingStatusText, { color: colors.text }]}>
              {isRecording
                ? 'Listening... Tap to finish & extract'
                : 'Tap microphone to speak or type below'}
            </Text>

            {/* Sound Wave Simulation Bar */}
            {isRecording && (
              <View style={styles.waveformRow}>
                {[14, 28, 42, 22, 36, 48, 20, 32, 16].map((h, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: h,
                        backgroundColor: colors.primary,
                        opacity: waveAnim,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Speech Status Banner */}
            {speechStatus !== '' && (
              <View
                style={[
                  styles.speechStatusBanner,
                  {
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
                  },
                ]}
              >
                <Sparkles size={13} color="#8B5CF6" />
                <Text style={styles.speechStatusText}>
                  {speechStatus}
                </Text>
              </View>
            )}

            {/* Transcript Text Box */}
            <View
              style={[
                styles.transcriptBox,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <TextInput
                style={[styles.transcriptInput, { color: colors.text }]}
                multiline
                placeholder="Say or type e.g. 'Spent 350 for lunch at Subway with UPI'"
                placeholderTextColor={colors.textMuted}
                value={transcript}
                onChangeText={(text) => {
                  setTranscript(text);
                  transcriptRef.current = text;
                }}
              />
              {transcript.trim() !== '' && !isRecording && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleProcessTranscript(transcript)}
                  disabled={isProcessing}
                  style={[
                    styles.reparseBtn,
                    {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(29, 78, 216, 0.1)',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(29, 78, 216, 0.2)',
                    },
                  ]}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Sparkles size={13} color={colors.primary} />
                      <Text style={[styles.reparseText, { color: colors.primary }]}>Analyze with AI</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Voice Examples Chips */}
          <View style={styles.examplesSection}>
            <Text style={[styles.examplesTitle, { color: colors.textMuted }]}>
              TRY SAMPLE VOICE PHRASES
            </Text>
            <View style={styles.examplesList}>
              {VOICE_EXAMPLES.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTranscript(ex);
                    transcriptRef.current = ex;
                    handleProcessTranscript(ex);
                  }}
                  style={[
                    styles.exampleChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <Text style={[styles.exampleText, { color: colors.textSecondary }]}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AI Structured Confirmation Form */}
          {(amount !== '' || isProcessing) && (
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.08)',
                },
              ]}
            >
              <View
                style={[
                  styles.aiBadgeBanner,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.1)',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                  },
                ]}
              >
                <CheckCircle2 size={14} color="#10B981" />
                <Text style={styles.aiBadgeBannerText}>
                  AI EXTRACTED EXPENSE
                </Text>
              </View>

              {/* Amount */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>EXPENSE AMOUNT ({currency})</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currency}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Description */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Lunch at Subway"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Merchant */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                MERCHANT / STORE
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Building2 size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="e.g. Starbucks, Uber, Subway"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Category */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPickerRow}
              >
                {ALL_CATEGORIES.map((cat) => {
                  const meta = CATEGORIES[cat];
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: isSelected ? meta.bgColor : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isSelected ? meta.color : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          {
                            color: isSelected ? meta.color : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Payment Method */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>PAYMENT METHOD</Text>
              <View style={styles.paymentMethodRow}>
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      onPress={() => setPaymentMethod(pm.id)}
                      style={[
                        styles.pmChip,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(29, 78, 216, 0.1)'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pmChipText,
                          {
                            color: isSelected ? colors.primary : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save Confirm Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmSave}
                disabled={isSaving}
                style={[styles.confirmSaveBtn, { backgroundColor: colors.primary }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.confirmSaveBtnText}>
                      Save Voice Expense
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  micCard: {
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  micButtonWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  micPulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  micButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingStatusText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    maxWidth: 260,
  },
  speechStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  speechStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    marginBottom: 12,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  transcriptBox: {
    width: '100%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  transcriptInput: {
    fontSize: 14,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  reparseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 5,
  },
  reparseText: {
    fontSize: 12,
    fontWeight: '800',
  },
  examplesSection: {
    marginBottom: 4,
  },
  examplesTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  examplesList: {
    gap: 6,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  aiBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  aiBadgeBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pmChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pmChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 20,
    gap: 8,
  },
  confirmSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
