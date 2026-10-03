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
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { ALL_CATEGORIES, CATEGORIES, PAYMENT_METHODS } from '../../constants/categories';
import { ExpenseCategory, PaymentMethod, AIParseResult } from '../../types';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  X,
  Check,
  Calendar,
  Building2,
  Tag,
  CreditCard,
  FileText,
} from 'lucide-react-native';

import { useAppTheme } from '../../hooks/use-theme';

export default function ScanModal() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { profile, user } = useAuthStore();
  const currency = profile.currency || '₹';
  const { addExpense } = useExpenseStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AIParseResult | null>(null);

  // Form states for confirmation
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
        setImageBase64(asset.base64 || null);
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
        setImageBase64(asset.base64 || null);
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
    } catch (err) {
      console.error('Scan processing error:', err);
      Alert.alert('OCR Error', 'Could not process receipt automatically. You can fill details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmSave = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please verify the parsed expense amount.');
      return;
    }

    setIsSaving(true);
    try {
      const userId = user?.uid || profile.uid || 'demo-user';
      await addExpense({
        userId,
        amount: amountNum,
        category,
        description: description || merchant || 'Receipt Expense',
        merchant,
        date,
        paymentMethod,
        inputMethod: 'scan',
        aiConfidence: scanResult?.confidence || 0.95,
        aiSuggestedCategory: category,
        isAiGenerated: true,
        receiptUrl: imageUri || undefined,
      });

      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert('Expense Saved! 🎉', `Added ${currency}${amountNum} for ${merchant || category}.`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save expense. Please try again.');
      } else {
        Alert.alert('Save Error', 'Failed to save expense. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Camera size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Scan Bill & Receipt</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>AI OCR & Auto-Categorization</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* If no image selected yet */}
          {!imageUri ? (
            <View style={styles.pickerSection}>
              <View style={[styles.scanIllustration, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.scanBeam, { backgroundColor: colors.primary }]} />
                <FileText size={64} color={colors.primary} />
                <Text style={[styles.illustrationTitle, { color: colors.text }]}>Upload Receipt or Invoice</Text>
                <Text style={[styles.illustrationSub, { color: colors.textSecondary }]}>
                  Take a photo or pick from gallery. Our AI vision model extracts total amount, merchant, date, and categorizes automatically.
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={takePhoto}
                  style={[styles.actionButton, styles.cameraButton, { backgroundColor: colors.primary }]}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={[styles.cameraButtonText, { color: '#FFFFFF' }]}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={pickImage}
                  style={[styles.actionButton, styles.galleryButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                >
                  <ImageIcon size={20} color={colors.primary} />
                  <Text style={[styles.galleryButtonText, { color: colors.primary }]}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Sample Demo Receipt Fast Try */}
              <TouchableOpacity
                onPress={() => {
                  setImageUri('https://images.unsplash.com/photo-1554415707-9e4c01999908?w=500&q=80');
                  processImage('demo-receipt-uri');
                }}
                style={[styles.sampleTryBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
              >
                <Sparkles size={14} color={colors.primary} />
                <Text style={[styles.sampleTryText, { color: colors.primary }]}>Try with Sample Supermarket Receipt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultSection}>
              {/* Image Preview & Scanning Overlay */}
              <View style={[styles.imagePreviewContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
                {isScanning && (
                  <View style={styles.scanningOverlay}>
                    <ActivityIndicator size="large" color="#00F5D4" />
                    <Text style={styles.scanningText}>AI Analyzing Receipt Items & Total...</Text>
                  </View>
                )}
                {!isScanning && (
                  <TouchableOpacity
                    onPress={() => setImageUri(null)}
                    style={styles.retakeBtn}
                  >
                    <Text style={styles.retakeText}>Change Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Parsed Results Form for confirmation */}
              {scanResult && !isScanning && (
                <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.aiBadgeBanner}>
                    <Sparkles size={16} color="#00F5D4" />
                    <Text style={styles.aiBadgeBannerText}>
                      AI Extracted ({Math.round(scanResult.confidence * 100)}% Confidence)
                    </Text>
                  </View>

                  {/* Amount */}
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TOTAL AMOUNT ({currency})</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currency}</Text>
                    <TextInput
                      style={[styles.amountInput, { color: colors.text }]}
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Merchant */}
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>MERCHANT / STORE</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Building2 size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      value={merchant}
                      onChangeText={setMerchant}
                      placeholder="Store or Vendor name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Description */}
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DESCRIPTION / ITEMS</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Items description"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Category Picker */}
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>AUTO-ASSIGNED CATEGORY</Text>
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
                            { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                            isSelected && { backgroundColor: meta.bgColor, borderColor: meta.color },
                          ]}
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              { color: colors.textSecondary },
                              isSelected && { color: meta.color, fontWeight: '700' },
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
                            { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                            isSelected && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pmChipText,
                              { color: colors.textSecondary },
                              isSelected && { color: colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {pm.id}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Confirm & Save Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleConfirmSave}
                    disabled={isSaving}
                    style={[styles.confirmSaveBtn, { backgroundColor: colors.primary }]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={20} color="#FFFFFF" />
                        <Text style={[styles.confirmSaveBtnText, { color: '#FFFFFF' }]}>Confirm & Save Expense</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: '#0D0F15',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D0F15',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2432',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 187, 249, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    color: '#8D99AE',
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
  },
  pickerSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  scanIllustration: {
    backgroundColor: '#161922',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262D3D',
    width: '100%',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  scanBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00BBF9',
  },
  illustrationTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  illustrationSub: {
    color: '#8D99AE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#00BBF9',
  },
  cameraButtonText: {
    color: '#0D1117',
    fontSize: 15,
    fontWeight: '800',
  },
  galleryButton: {
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#00BBF9',
  },
  galleryButtonText: {
    color: '#00BBF9',
    fontSize: 15,
    fontWeight: '800',
  },
  sampleTryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 212, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 212, 0.25)',
    gap: 6,
  },
  sampleTryText: {
    color: '#00F5D4',
    fontSize: 12,
    fontWeight: '700',
  },
  resultSection: {
    gap: 16,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#262D3D',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 15, 21, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    color: '#00F5D4',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(13, 15, 21, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#161922',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262D3D',
  },
  aiBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  aiBadgeBannerText: {
    color: '#00F5D4',
    fontSize: 12,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#8D99AE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222634',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#2D3548',
  },
  currencyPrefix: {
    color: '#00F5D4',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
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
    backgroundColor: '#222634',
    borderWidth: 1,
    borderColor: '#2D3548',
  },
  catChipText: {
    color: '#8D99AE',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#222634',
    borderWidth: 1,
    borderColor: '#2D3548',
  },
  pmChipActive: {
    backgroundColor: 'rgba(0, 187, 249, 0.15)',
    borderColor: '#00BBF9',
  },
  pmChipText: {
    color: '#8D99AE',
    fontSize: 12,
    fontWeight: '600',
  },
  pmChipTextActive: {
    color: '#00BBF9',
    fontWeight: '700',
  },
  confirmSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00F5D4',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  confirmSaveBtnText: {
    color: '#0D1117',
    fontSize: 15,
    fontWeight: '800',
  },
});
