const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const CATEGORY_MAP = {
  Food: ["coffee", "tea", "starbucks", "cafe", "mcdonalds", "kfc", "burger", "pizza", "subway", "restaurant", "lunch", "dinner", "breakfast", "zomato", "swiggy", "snack"],
  Grocery: ["supermarket", "walmart", "target", "costco", "whole foods", "grocery", "trader joe", "milk", "vegetables", "fruits", "instacart", "blinkit", "zepto"],
  Transport: ["uber", "lyft", "grab", "ola", "metro", "subway", "train", "bus", "gas", "fuel", "petrol", "diesel", "parking", "toll", "flight", "airline"],
  Shopping: ["amazon", "ebay", "target", "nike", "adidas", "zara", "h&m", "clothing", "electronics", "shoes", "mall", "flipkart", "myntra"],
  Bills: ["electricity", "water", "gas bill", "utility", "wifi", "internet", "broadband", "verizon", "at&t", "t-mobile", "phone bill", "rent", "insurance"],
  Entertainment: ["netflix", "spotify", "hulu", "disney", "prime video", "movie", "cinema", "theatre", "concert", "steam", "playstation", "xbox", "game"],
  Health: ["pharmacy", "medicine", "doctor", "hospital", "clinic", "dental", "cvs", "walgreens", "gym", "fitness", "supplement", "therapy"],
  Education: ["udemy", "coursera", "book", "tuition", "course", "college", "school", "exam"],
  Investment: ["stocks", "crypto", "mutual fund", "sip", "zerodha", "robinhood", "etf", "gold"],
  Other: ["miscellaneous", "cash withdrawal", "transfer", "general", "fee"]
};

/**
 * Helper to predict category from text/merchant
 */
function predictCategory(text = "", merchant = "") {
  const combined = `${text} ${merchant}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        return { category, confidence: 0.92 };
      }
    }
  }
  return { category: "Other", confidence: 0.5 };
}

/**
 * Callable Function: Auto Categorize Expense
 */
exports.autoCategorize = functions.https.onCall(async (data, context) => {
  const { description = "", merchant = "", amount = 0 } = data;
  const result = predictCategory(description, merchant);
  return {
    category: result.category,
    confidence: result.confidence,
    timestamp: new Date().toISOString()
  };
});

/**
 * Callable Function: Parse Voice/Natural Language Expense
 */
exports.parseVoiceExpense = functions.https.onCall(async (data, context) => {
  const { transcript = "", today = new Date().toISOString().split("T")[0] } = data;

  if (!transcript) {
    throw new functions.https.HttpsError("invalid-argument", "Transcript is required.");
  }

  const clean = transcript.trim();

  // 1. Extract amount with priority for currency symbols and payment verbs
  let amount = 0;
  const currencyPatterns = [
    /(?:₹|\$|€|£|rs\.?|inr|rupees?|bucks?)\s*(\d+(?:\.\d{1,2})?)/i,
    /(\d+(?:\.\d{1,2})?)\s*(?:₹|\$|€|£|rs\.?|inr|rupees?|bucks?)/i,
    /(?:paid|spent|cost|bill of|for|amount)\s*(?:₹|\$|rs\.?)?\s*(\d+(?:\.\d{1,2})?)/i,
  ];

  for (const pat of currencyPatterns) {
    const m = clean.match(pat);
    if (m && parseFloat(m[1]) > 0) {
      amount = parseFloat(m[1]);
      break;
    }
  }

  // Fallback: check all numbers, penalizing quantities
  if (amount === 0) {
    const numberTokens = [...clean.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)];
    if (numberTokens.length > 0) {
      amount = parseFloat(numberTokens[numberTokens.length - 1][1]);
    }
  }

  // 2. Extract Merchant
  const commonMerchants = [
    'Starbucks', 'McDonald\'s', 'KFC', 'Subway', 'Dominos', 'Pizza Hut', 'Burger King',
    'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Dunzo', 'Instamart', 'BigBasket',
    'Uber', 'Ola', 'Rapido', 'BluSmart',
    'Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho', 'Zara', 'H&M', 'Nike', 'Adidas',
    'Walmart', 'Target', 'Costco', 'Dmart', 'Reliance Fresh', 'Reliance Smart',
    'Shell', 'Indian Oil', 'Bharat Petroleum', 'HP Petrol',
    'Apollo Pharmacy', 'Netmeds', 'PharmEasy', 'Tata 1mg',
    'Netflix', 'Spotify', 'BookMyShow', 'PVR', 'INOX',
  ];

  let detectedMerchant = "";
  for (const m of commonMerchants) {
    const reg = new RegExp(`\\b${m.replace(/[']/g, "[']?")}\\b`, "i");
    if (reg.test(clean)) {
      detectedMerchant = m;
      break;
    }
  }

  // 3. Predict Category
  const { category, confidence } = predictCategory(clean, detectedMerchant);

  // 4. Resolve Date
  let targetDate = today;
  if (/\b(?:day before yesterday)\b/i.test(clean)) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    targetDate = d.toISOString().split("T")[0];
  } else if (/\b(?:yesterday|last night)\b/i.test(clean)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    targetDate = d.toISOString().split("T")[0];
  }

  // 5. Payment Method
  let paymentMethod = "UPI";
  if (/cash|paper money/i.test(clean)) paymentMethod = "Cash";
  else if (/card|credit|debit|visa|mastercard/i.test(clean)) paymentMethod = "Card";
  else if (/net\s*banking|bank transfer/i.test(clean)) paymentMethod = "NetBanking";
  else if (/wallet|paytm wallet/i.test(clean)) paymentMethod = "Wallet";

  // Clean description
  let description = clean
    .replace(/(?:spent|paid|bought|for|with|via|rs\.?|rupees?|\$|₹|bucks?|\d+(?:\.\d{1,2})?)/gi, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!description || description.length < 3) {
    description = detectedMerchant ? `${category} at ${detectedMerchant}` : `${category} Expense`;
  } else {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    amount,
    category,
    confidence: amount > 0 ? confidence : 0.6,
    description,
    merchant: detectedMerchant,
    date: targetDate,
    paymentMethod,
  };
});

/**
 * Callable Function: Process Receipt AI / OCR
 */
exports.processReceipt = functions.https.onCall(async (data, context) => {
  const { imageUrl, textRaw = "" } = data;

  // Heuristic extraction from raw OCR text
  const lines = textRaw.split("\n").map(l => l.trim()).filter(Boolean);
  let totalAmount = 0;
  let detectedMerchant = lines[0] || "Store Receipt";

  for (const line of lines) {
    const match = line.match(/(?:total|amount|due|balance|subtotal)[\s:]*(?:₹|\$|rs\.?)?\s*(\d+(?:\.\d{1,2})?)/i);
    if (match) {
      totalAmount = parseFloat(match[1]);
      break;
    }
  }

  if (totalAmount === 0) {
    // Look for largest number
    const numbers = textRaw.match(/\b\d+(?:\.\d{2})?\b/g);
    if (numbers) {
      const floats = numbers.map(n => parseFloat(n)).filter(n => n > 0 && n < 1000000);
      if (floats.length > 0) {
        totalAmount = Math.max(...floats);
      }
    }
  }

  const { category } = predictCategory(textRaw, detectedMerchant);

  return {
    merchant: detectedMerchant,
    amount: totalAmount || 0,
    category,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Card",
    rawText: textRaw
  };
});

/**
 * Trigger: On expense created, check if category budget is exceeded and send FCM notification
 */
exports.onExpenseCreated = functions.firestore
  .document("expenses/{expenseId}")
  .onCreate(async (snap, context) => {
    const expense = snap.data();
    if (!expense || !expense.userId || !expense.category) return;

    const userId = expense.userId;
    const category = expense.category;

    // Fetch user budget for this category
    const budgetsSnap = await db.collection("budgets")
      .where("userId", "==", userId)
      .where("category", "==", category)
      .limit(1)
      .get();

    if (budgetsSnap.empty) return;
    const budgetDoc = budgetsSnap.docs[0].data();
    const budgetLimit = budgetDoc.amount || 0;

    // Calculate total spent in current month for this category
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    const expensesSnap = await db.collection("expenses")
      .where("userId", "==", userId)
      .where("category", "==", category)
      .where("date", ">=", startOfMonth)
      .get();

    let totalSpent = 0;
    expensesSnap.forEach(doc => {
      totalSpent += (doc.data().amount || 0);
    });

    if (totalSpent > budgetLimit) {
      // Exceeded budget! Log & trigger push notification via FCM
      const userDoc = await db.collection("users").doc(userId).get();
      const fcmToken = userDoc.exists ? userDoc.data().fcmToken : null;

      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: `⚠️ Budget Alert: ${category}`,
            body: `You've spent ₹${totalSpent.toLocaleString()} of your ₹${budgetLimit.toLocaleString()} monthly budget for ${category}.`
          },
          data: {
            category,
            totalSpent: String(totalSpent),
            budgetLimit: String(budgetLimit)
          }
        });
      }
    }
  });
