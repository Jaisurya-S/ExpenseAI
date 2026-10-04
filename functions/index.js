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

/**
 * Helper: Send WhatsApp Message via Meta WhatsApp Cloud API
 */
async function sendWhatsAppCloudApiMessage(toPhone, messageText) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log(`[WhatsApp Mock] Simulated message to ${toPhone}:\n${messageText}`);
    return { success: true, simulated: true };
  }

  // Clean phone number
  const cleanPhone = toPhone.replace(/[^0-9]/g, "");

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        preview_url: false,
        body: messageText
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "WhatsApp API call failed");
  }
  return { success: true, data };
}

/**
 * Format Daily Expense Digest for a user
 */
function buildDailyExpenseReportText(userName, todayExpenses, todayIncomes, currency = "₹", monthTotal = 0, budgetLimit = 0) {
  const totalSpent = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalIncome = todayIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const nowStr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const catEmojis = {
    Food: "🍔",
    Grocery: "🛒",
    Transport: "🚗",
    Shopping: "🛍️",
    Bills: "🧾",
    Entertainment: "🎬",
    Health: "💊",
    Education: "🎓",
    Investment: "📈",
    Other: "💳"
  };

  const categoryMap = {};
  for (const exp of todayExpenses) {
    const cat = exp.category || "Other";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += (exp.amount || 0);
    categoryMap[cat].count += 1;
  }

  const lines = [
    `📊 *ExpenseAI Daily Summary*`,
    `👤 *Hello ${userName || "User"}!*`,
    `📅 *Date:* ${nowStr}`,
    ``,
    `💰 *Total Spent Today:* ${currency}${totalSpent.toLocaleString()}`,
    `📝 *Transactions:* ${todayExpenses.length} expense${todayExpenses.length === 1 ? "" : "s"}`
  ];

  if (totalIncome > 0) {
    lines.push(`💵 *Income Received Today:* +${currency}${totalIncome.toLocaleString()}`);
  }

  lines.push(``);

  if (todayExpenses.length === 0) {
    lines.push(`🎉 *Zero expenses logged today!* Great discipline!`);
  } else {
    lines.push(`*Categorized Breakdown:*`);
    for (const [cat, info] of Object.entries(categoryMap)) {
      const emoji = catEmojis[cat] || "•";
      lines.push(`${emoji} *${cat}:* ${currency}${info.total.toLocaleString()} (${info.count})`);
    }
  }

  if (budgetLimit > 0) {
    lines.push(``);
    const pct = Math.min(100, Math.round((monthTotal / budgetLimit) * 100));
    lines.push(`📈 *Monthly Budget Progress:* ${currency}${monthTotal.toLocaleString()} / ${currency}${budgetLimit.toLocaleString()} (${pct}% used)`);
  }

  lines.push(``);
  lines.push(`_Sent automatically via ExpenseAI_ ✨`);

  return lines.join("\n");
}

/**
 * Scheduled Cloud Function: Runs daily at 21:30 IST (16:00 UTC) to send daily summaries to opted-in WhatsApp users
 */
exports.sendDailyWhatsAppDigests = functions.pubsub
  .schedule("30 21 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("Starting daily WhatsApp expense digest dispatch...");
    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    // Query all users who have enabled whatsappDailyReport
    const usersSnap = await db.collection("users")
      .where("whatsappDailyReport", "==", true)
      .get();

    if (usersSnap.empty) {
      console.log("No users currently enrolled in WhatsApp daily report.");
      return null;
    }

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      const phone = user.whatsappNumber;

      if (!phone) continue;

      try {
        // 1. Fetch today's expenses
        const expSnap = await db.collection("expenses")
          .where("userId", "==", userId)
          .where("date", "==", today)
          .get();

        const todayExpenses = expSnap.docs.map(d => d.data());

        // 2. Fetch today's incomes
        const incSnap = await db.collection("incomes")
          .where("userId", "==", userId)
          .where("date", "==", today)
          .get();

        const todayIncomes = incSnap.docs.map(d => d.data());

        // 3. Fetch month-to-date total
        const mSnap = await db.collection("expenses")
          .where("userId", "==", userId)
          .where("date", ">=", startOfMonth)
          .get();

        let monthTotal = 0;
        mSnap.forEach(d => { monthTotal += (d.data().amount || 0); });

        const message = buildDailyExpenseReportText(
          user.displayName || "there",
          todayExpenses,
          todayIncomes,
          user.currency || "₹",
          monthTotal,
          user.totalBudgetLimit || 0
        );

        await sendWhatsAppCloudApiMessage(phone, message);
        console.log(`Successfully sent daily digest to user ${userId} (${phone})`);
      } catch (err) {
        console.error(`Failed to send WhatsApp digest to user ${userId}:`, err);
      }
    }

    return null;
  });

/**
 * Callable Function: Test send WhatsApp digest on demand
 */
exports.sendTestWhatsAppDigest = functions.https.onCall(async (data, context) => {
  const { phone, userId } = data;
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required.");
  }

  const today = new Date().toISOString().split("T")[0];
  const targetUserId = userId || context?.auth?.uid || "demo-user";

  const expSnap = await db.collection("expenses")
    .where("userId", "==", targetUserId)
    .where("date", "==", today)
    .get();

  const todayExpenses = expSnap.docs.map(d => d.data());

  const incSnap = await db.collection("incomes")
    .where("userId", "==", targetUserId)
    .where("date", "==", today)
    .get();

  const todayIncomes = incSnap.docs.map(d => d.data());

  const message = buildDailyExpenseReportText("User", todayExpenses, todayIncomes, "₹", 0, 0);

  const result = await sendWhatsAppCloudApiMessage(phone, message);
  return { success: true, message, result };
});
