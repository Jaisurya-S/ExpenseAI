# 💰 ExpenseAI — Smart Personal Finance & AI Expense Tracker

<div align="center">

![ExpenseAI Logo](mobile/assets/images/logo.png)

**Your Intelligent Personal CFO powered by Voice AI, Receipt OCR, and Automated WhatsApp Digests.**

[![Live Web App](https://img.shields.io/badge/Live_Demo-https%3A%2F%2Fexpense--94f00.web.app-10B981?style=for-the-badge&logo=googlechrome&logoColor=white)](https://expense-94f00.web.app)
[![React Native](https://img.shields.io/badge/React_Native-Expo_v52-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_|_Firestore_|_Hosting-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Style-NativeWind_|_Shadcn_Zinc-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 🌟 Key Features

### 1. 🎙️ AI Voice Expense Logging
- Speak naturally in English, Hindi, Tamil, etc. (e.g., *"₹120 chai and snacks via UPI"*, *"Paid 450 for petrol cash yesterday"*).
- Instant speech-to-text with AI regex heuristics and OpenRouter LLM extraction for amount, category, payment method, and merchant.

### 2. 📸 AI Receipt & Bill Scanner
- Snap or upload receipts and bills.
- Automatic OCR extraction for merchant names, transaction dates, and total amount.

### 3. 💬 AI Financial Advisor & Chat
- Conversational financial copilot for budget planning, savings recommendations, and spending analysis.
- Understands your real-time expenses, budgets, and cash flow.

### 4. 📲 Automated WhatsApp Daily Expense Digest
- **Evening Summaries**: Receive an automated WhatsApp message every day at your chosen time (e.g., 9:30 PM).
- **Rich Message Content**:
  - 💰 Total Spent Today & Number of Transactions
  - 💵 Today's Incomes Logged
  - 📂 Emoji Categorized Breakdown with percentages
  - 📈 Visual ASCII Budget Progress Bar (`[██████░░░░] 60%`)
  - 💡 Contextual AI Smart Tips for wealth building
- **1-Tap Direct Send**: Test and share today's report directly on WhatsApp with prefilled parameters.

### 5. 📊 Real-Time Analytics & Cashflow Tracking
- Monthly cash flow breakdown: Income vs. Expenses vs. Net Savings.
- Category spending distributions and merchant frequency charts.
- CSV export for spreadsheets and accounting.

### 6. 🎨 Premium Shadcn Zinc Aesthetic
- Sleek dark and light modes with curated HSL neutral palettes.
- Crisp Lucide icons, tactile buttons, and clean responsive layouts for Web, iOS, and Android.

---

## 📱 WhatsApp Daily Digest Sample

```text
━━━━━━━━━━━━━━━━━━━
📊 EXPENSE AI • DAILY DIGEST
━━━━━━━━━━━━━━━━━━━
👤 Hello Alex!
📅 Sunday, Oct 4, 2026
⚡ Status: 🟢 On Track

💰 Total Spent Today: ₹1,450
📝 Transactions: 3 records
💵 Income Received: +₹5,000

📂 Category Breakdown:
🍔 Food: ₹450 (31%) (Chai, Lunch)
🚗 Transport: ₹500 (34%) (Petrol)
🛒 Grocery: ₹500 (34%) (Supermarket)

📈 Monthly Budget Progress:
[████░░░░░░] 42%
• Spent: ₹12,600 / ₹30,000
• Remaining: ₹17,400

💡 AI Smart Tip: Great job logging your daily expenses consistently!
━━━━━━━━━━━━━━━━━━━
ExpenseAI — Your Smart Personal CFO ✨
```

---

## 🏗️ Architecture & Tech Stack

```
EXPENSE/
├── mobile/                        # Cross-Platform React Native App (Expo Router)
│   ├── assets/images/             # App icons, splash, and 3D brand logo
│   ├── src/
│   │   ├── app/                   # File-based routing (Expo Router)
│   │   │   ├── (auth)/            # Login, Registration screens
│   │   │   ├── (tabs)/            # Home Dashboard, Analytics, Expenses, Profile
│   │   │   └── modal/             # Add Expense, Add Income, Voice AI, Receipt OCR, AI Chat
│   │   ├── components/            # UI Design system (Shadcn Zinc + Lucide Icons)
│   │   ├── services/              # AI Service, Firebase, WhatsApp, Storage
│   │   ├── store/                 # Zustand state stores (Auth, Expenses, Budgets)
│   │   └── types/                 # TypeScript interfaces
│   └── dist/                      # Exported web production bundle
├── functions/                     # Firebase Cloud Functions (Node.js Backend)
│   └── index.js                   # Scheduled WhatsApp digests & AI callable endpoints
├── firebase.json                  # Firebase Hosting & Functions config
└── firestore.rules                # Database security rules
```

| Component | Technology |
| :--- | :--- |
| **Frontend** | React Native, Expo SDK 52, Expo Router v4 |
| **Styling** | NativeWind / Tailwind CSS, Shadcn Zinc Theme |
| **Icons** | Lucide React Native |
| **State Management** | Zustand |
| **Backend & Database** | Firebase Authentication, Cloud Firestore, Cloud Storage |
| **Hosting** | Firebase Hosting (`https://expense-94f00.web.app`) |
| **AI LLM API** | OpenRouter API / Google Gemini 2.0 Flash / Meta Llama 3.3 |
| **WhatsApp Integration** | Meta WhatsApp Cloud API / `wa.me` Universal Links / Twilio |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Jaisurya-S/ExpenseAI.git
cd EXPENSE/mobile
npm install
```

### 2. Configure Environment Variables
Create `.env` inside `mobile/`:
```env
EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Run Locally
```bash
# Start Expo development server (Web, iOS, Android)
npm start

# Or directly in web browser:
npm run web
```

---

## ⚡ Deployment

### Deploy Web App to Firebase Hosting
```bash
cd mobile
npx expo export --platform web
npx firebase deploy --only hosting
```

### Deploy Scheduled Cloud Functions
```bash
cd functions
npm install
firebase functions:config:set whatsapp.token="YOUR_META_TOKEN" whatsapp.phone_id="YOUR_PHONE_ID"
firebase deploy --only functions
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).