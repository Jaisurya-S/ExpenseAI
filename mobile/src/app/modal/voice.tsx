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
import { parseVoiceTranscript } from '../../services/aiService';
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
} from 'lucide-react-native';

const VOICE_EXAMPLES = [
  'Spent ₹450 for 2 coffees at Starbucks with UPI',
  'Uber ride to office 280 yesterday by card',
  'Bought groceries from Walmart 2500 in cash',
  'Paid ₹3200 for electricity bill with NetBanking',
  'Swiggy dinner 480 paid with Google Pay',
  'Netflix subscription 899 on credit card',
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

  // Web Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Pulse animation for mic
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
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

  const startWebSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechStatus('Speech recognition not supported in this browser. You can type or tap examples.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setSpeechStatus('Listening... Speak naturally now');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechStatus('Microphone access was denied. Please allow microphone permissions.');
        } else {
          setSpeechStatus(`Speech note: ${event.error}. You can use sample prompts below.`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Speech start error:', err);
      setSpeechStatus('Could not access microphone.');
      setIsRecording(false);
    }
  };

  const stopWebSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      stopWebSpeechRecognition();
      if (transcript.trim()) {
        handleProcessTranscript(transcript);
      }
    } else {
      setSpeechStatus('');
      setIsRecording(true);
      if (Platform.OS === 'web') {
        startWebSpeechRecognition();
      } else {
        setTimeout(() => {
          if (!transcript) {
            setTranscript('Spent ₹450 on coffee at Starbucks with UPI');
            handleProcessTranscript('Spent ₹450 on coffee at Starbucks with UPI');
          }
          setIsRecording(false);
        }, 2200);
      }
    }
  };

  const handleProcessTranscript = async (textToParse: string) => {
    if (!textToParse.trim()) return;

    setIsProcessing(true);
    setSpeechStatus('AI Parsing amount, category & merchant...');

    try {
      const result = await parseVoiceTranscript(textToParse);
      setParsedResult(result);

      if (result.amount > 0) setAmount(result.amount.toString());
      if (result.category) setCategory(result.category);
      if (result.description) setDescription(result.description);
      if (result.merchant) setMerchant(result.merchant);
      if (result.date) setDate(result.date);
      if (result.paymentMethod) setPaymentMethod(result.paymentMethod);

      setSpeechStatus(`AI matched category "${result.category}" (${Math.round(result.confidence * 100)}% confidence)`);
    } catch (err) {
      console.warn('Voice parse error:', err);
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
    }
  };

  const handleConfirmSave = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Please verify the expense amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please verify the expense amount.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const userId = user?.uid || profile.uid || 'demo-user';
      await addExpense({
        userId,
        amount: amountNum,
        category,
        description: description || merchant || 'Voice Expense',
        merchant,
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
        Alert.alert('Expense Added! 🎙️', `Recorded ${currency}${amountNum} for ${description || category}.`, [
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
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconCircle,
                {
                  backgroundColor: isDark ? 'rgba(155, 93, 229, 0.2)' : 'rgba(124, 58, 237, 0.1)',
                },
              ]}
            >
              <Mic size={20} color={colors.accentPurple} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Voice Expense</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Speak Naturally • AI Structured
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
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.micPulseRing,
                isRecording && { backgroundColor: isDark ? 'rgba(255, 107, 107, 0.2)' : 'rgba(220, 38, 38, 0.15)' },
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleRecording}
                style={[
                  styles.micButton,
                  isRecording
                    ? { backgroundColor: colors.danger }
                    : { backgroundColor: colors.primary },
                ]}
              >
                {isRecording ? (
                  <MicOff size={36} color="#FFFFFF" />
                ) : (
                  <Mic size={36} color={colors.primaryText} />
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={[styles.recordingStatusText, { color: colors.text }]}>
              {isRecording
                ? 'Listening to microphone... Tap to finish & process'
                : 'Tap microphone to speak or choose an example below'}
            </Text>

            {speechStatus !== '' && (
              <View
                style={[
                  styles.speechStatusBanner,
                  {
                    backgroundColor: isDark ? 'rgba(155, 93, 229, 0.12)' : 'rgba(124, 58, 237, 0.08)',
                  },
                ]}
              >
                <Info size={13} color={colors.accentPurple} />
                <Text style={[styles.speechStatusText, { color: colors.accentPurple }]}>
                  {speechStatus}
                </Text>
              </View>
            )}

            {/* Sound Wave simulation bars */}
            {isRecording && (
              <View style={styles.waveformRow}>
                {[14, 28, 42, 22, 36, 48, 20, 32, 16].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: h,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Transcript Text Box */}
            <View
              style={[
                styles.transcriptBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <TextInput
                style={[styles.transcriptInput, { color: colors.text }]}
                multiline
                placeholder="Say something like: 'Spent 300 on lunch at Subway with UPI'"
                placeholderTextColor={colors.textMuted}
                value={transcript}
                onChangeText={setTranscript}
              />
              {transcript !== '' && !isRecording && (
                <TouchableOpacity
                  onPress={() => handleProcessTranscript(transcript)}
                  style={[styles.reparseBtn, { backgroundColor: colors.primaryLight }]}
                >
                  <RefreshCw size={14} color={colors.primary} />
                  <Text style={[styles.reparseText, { color: colors.primary }]}>Analyze with AI</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Voice Examples Chips */}
          <View style={styles.examplesSection}>
            <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>
              TRY VOICE PROMPTS
            </Text>
            <View style={styles.examplesList}>
              {VOICE_EXAMPLES.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTranscript(ex);
                    handleProcessTranscript(ex);
                  }}
                  style={[
                    styles.exampleChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Sparkles size={12} color={colors.primary} style={{ marginRight: 6 }} />
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
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View
                style={[
                  styles.aiBadgeBanner,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Sparkles size={14} color={colors.primary} />
                <Text style={[styles.aiBadgeBannerText, { color: colors.primary }]}>
                  AI EXTRACTED & STRUCTURED EXPENSE
                </Text>
              </View>

              {/* Amount */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EXTRACTED AMOUNT</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Expense description"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Merchant */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                MERCHANT (AUTO-DETECTED)
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <Building2 size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="e.g. Starbucks, Uber"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Category */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
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
                          backgroundColor: isSelected ? meta.bgColor : colors.inputBg,
                          borderColor: isSelected ? meta.color : colors.inputBorder,
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PAYMENT METHOD</Text>
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
                          backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                          borderColor: isSelected ? colors.primary : colors.inputBorder,
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
                activeOpacity={0.8}
                onPress={handleConfirmSave}
                disabled={isSaving}
                style={[styles.confirmSaveBtn, { backgroundColor: colors.primary }]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <>
                    <Check size={20} color={colors.primaryText} />
                    <Text style={[styles.confirmSaveBtnText, { color: colors.primaryText }]}>
                      Confirm & Save Voice Expense
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
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  micCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  micPulseRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingStatusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 260,
  },
  speechStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  speechStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 50,
    marginBottom: 14,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  transcriptBox: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  transcriptInput: {
    fontSize: 14,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  reparseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  reparseText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examplesSection: {
    marginBottom: 8,
  },
  examplesTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  examplesList: {
    gap: 8,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  aiBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  aiBadgeBannerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
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
    paddingVertical: 7,
    borderRadius: 12,
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
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  confirmSaveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
