# 🌟 XpenseAI Mobile — AI-Powered Expense Tracker

A production-ready, cross-platform mobile expense tracking application built with **React Native**, **Expo Router**, **TypeScript**, **Firebase Auth & Firestore**, **Zustand**, and **OpenRouter / Cloud Functions AI**.

---

## 🚀 Key Highlights & Primary Input Modalities

Recording an expense requires minimal effort through 3 primary, prominent entry points:

### 1. 📷 Scan Bill & Receipts
* Take a photo or upload an invoice/receipt from the gallery.
* AI Vision and OCR extraction extracts the total amount, merchant/store name, transaction date, line items, and payment method.
* **Auto-categorization** assigns the category with confidence scoring.
* User confirmation modal allows quick one-tap verification before saving.

### 2. 🎙️ Voice Expense
* Speak naturally (e.g. *"Spent ₹340 at Starbucks for coffee"*, *"Uber to airport 450 with UPI"*).
* Real-time audio waveform visualizer and transcript preview.
* Natural language AI extraction parses structured fields (amount, category, merchant, date, payment method).
* Instant review and confirmation.

### 3. ✍️ Manual Expense with Real-Time Auto-Categorization
* Large interactive amount input.
* **Real-time AI auto-categorization badge**: As you type the description, the AI instantly predicts and highlights the matching category.
* Merchant picker, custom date offsets (Today, Yesterday), and payment method chips (UPI, Card, Cash, etc.).

---

## 🧭 Main Navigation

* **Home (`/(tabs)`)**:
  - Hero Balance & Monthly Spend Meter with progress bar and remaining budget tracker.
  - Prominent primary action cards: **📷 Scan Bill**, **🎙️ Voice**, **＋ Add Expense**.
  - Live AI Spending Insights & Budget Burnout Tips.
  - Recent transactions list with 1-tap delete & view all.
* **Expenses (`/(tabs)/expenses`)**:
  - Search by note, merchant, or category.
  - Horizontal category chips filter.
  - Grouping by date (Today, Yesterday, Date timeline).
  - Total count and amount summary.
* **Analytics (`/(tabs)/analytics`)**:
  - Interactive Donut category distribution chart (`ExpensePieChart`).
  - 7-Day Spending trend bar chart (`SpendingBarChart`).
  - Top spending merchants leaderboard.
  - AI Financial Health Score (84/100) and advice breakdown.
* **Budgets (`/(tabs)/budgets`)**:
  - Master budget progress tracker.
  - Category-by-category threshold meters with percentage used.
  - Over-budget alert banners.
  - Interactive "Set Budget" modal.
* **Profile (`/(tabs)/profile`)**:
  - Currency selector (`₹`, `$`, `€`, `£`, `¥`).
  - Push Notification and Biometric lock toggles.
  - 1-Click CSV data export for spreadsheets.
  - Firebase account authentication & logout.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native (0.86) + Expo SDK 57 |
| **Routing** | Expo Router (File-based navigation) |
| **Language** | TypeScript (Strict mode, zero errors) |
| **State Management** | Zustand (`useAuthStore`, `useExpenseStore`) |
| **Server State / Cache** | TanStack Query + AsyncStorage offline fallback |
| **Authentication & DB** | Firebase Auth + Cloud Firestore + Firebase Storage |
| **Cloud Functions** | Node.js Firebase Functions for OCR, Voice AI, and FCM Alerts |
| **Icons & UI** | Lucide Icons (`lucide-react-native`) + Tailwind HSL Dark Palette |
| **Visual Charts** | Custom SVG Donut & Timeline Bar Charts |

---

## 📱 Getting Started

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Start Local Development Server
```bash
npm run start
```
- Press `a` for Android Emulator
- Press `i` for iOS Simulator
- Press `w` for Web Preview
