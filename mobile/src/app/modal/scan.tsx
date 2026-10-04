import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { scanReceiptWithAI } from '../../services/aiService';
import { ALL_CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { ExpenseCategory, PaymentMethod, AIParseResult } from '../../types';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  X,
  Building2,
  Calendar,
  FileText,
} from '../../components/ui/icons';

import { useAppTheme } from '../../hooks/use-theme';

export default function ScanModal() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { profile, user } = useAuthStore();
  const currency = profile.currency || '₹';
  const { addExpense } = useExpenseStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AIParseResult | null>(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Grocery');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [isSaving, setIsSaving] = useState(false);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Please allow camera access to take receipt photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        processImage(asset.uri, asset.base64);
      }
    } catch (err) {
      console.warn('Camera launch error:', err);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        processImage(asset.uri, asset.base64);
      }
    } catch (err) {
      console.warn('Gallery pick error:', err);
    }
  };

  const processImage = async (uri: string, base64?: string | null) => {
    setIsScanning(true);
    try {
      const parsed = await scanReceiptWithAI(uri, base64 || undefined);
      setScanResult(parsed);
      setAmount(parsed.amount ? parsed.amount.toString() : '');
      setCategory(parsed.category);
      setDescription(parsed.description);
      setMerchant(parsed.merchant);
      setDate(parsed.date);
      setPaymentMethod(parsed.paymentMethod);
    } catch {
      Alert.alert('OCR Notice', 'Could not parse automatically. You can enter details below.');
    } finally {
      setIsScanning(false);
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
      await addExpense({
        userId,
        amount: amountNum,
        category,
        description: description || merchant || `${category} Expense`,
        merchant,
        date,
        paymentMethod,
        inputMethod: 'scan',
        aiConfidence: scanResult?.confidence || 0.95,
        aiSuggestedCategory: category,
        isAiGenerated: true,
        receiptUrl: imageUri || undefined,
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scan Bill / Receipt</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!imageUri ? (
            <View style={styles.pickerSection}>
              <View
                style={[
                  styles.uploadBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.uploadIconCircle,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Camera size={28} color={colors.text} />
                </View>
                <Text style={[styles.uploadTitle, { color: colors.text }]}>
                  Upload Receipt or Invoice
                </Text>
                <Text style={[styles.uploadSub, { color: colors.textMuted }]}>
                  AI OCR extracts the merchant, total amount, and date automatically.
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={takePhoto}
                    style={[styles.primaryUploadBtn, { backgroundColor: colors.primary }]}
                  >
                    <Camera size={15} color={colors.primaryText} style={{ marginRight: 6 }} />
                    <Text style={[styles.primaryUploadText, { color: colors.primaryText }]}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={pickImage}
                    style={[
                      styles.secondaryUploadBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <ImageIcon size={15} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.secondaryUploadText, { color: colors.text }]}>Choose File</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Demo Sample button */}
              <TouchableOpacity
                onPress={() => {
                  setImageUri('https://images.unsplash.com/photo-1554415707-9e4c01999908?w=500&q=80');
                  processImage('demo-receipt-uri');
                }}
                style={[
                  styles.demoSampleBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Sparkles size={13} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.demoSampleText, { color: colors.text }]}>
                  Try Sample Receipt OCR
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Receipt Preview & OCR Scanning State */}
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
                <View style={styles.previewHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECEIPT PREVIEW</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setImageUri(null);
                      setScanResult(null);
                    }}
                  >
                    <Text style={[styles.reuploadText, { color: colors.text }]}>Change Image</Text>
                  </TouchableOpacity>
                </View>

                <Image
                  source={{ uri: imageUri }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />

                {isScanning && (
                  <View style={styles.scanningOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.scanningText, { color: colors.text }]}>
                      AI Vision scanning receipt...
                    </Text>
                  </View>
                )}
              </View>

              {/* Parsed / Editable Results */}
              {!isScanning && (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      shadowColor: colors.cardShadow,
                      marginTop: 10,
                    },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>EXTRACTED DATA</Text>

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
                      value={description}
                      onChangeText={setDescription}
                    />
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
                      value={merchant}
                      onChangeText={setMerchant}
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
            </View>
          )}
        </ScrollView>

        {imageUri && !isScanning && (
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
                  Save Scanned Bill ({currency}{amount || '0'})
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
    paddingBottom: 40,
  },
  pickerSection: {
    gap: 12,
  },
  uploadBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  uploadSub: {
    fontSize: 12.5,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  primaryUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryUploadText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryUploadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  demoSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  demoSampleText: {
    fontSize: 12.5,
    fontWeight: '600',
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
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  reuploadText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  receiptImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  scanningOverlay: {
    position: 'absolute',
    top: 36,
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanningText: {
    fontSize: 13,
    fontWeight: '600',
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
