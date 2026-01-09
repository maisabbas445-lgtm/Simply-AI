 import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import XLSX from "xlsx";

const OPENAI_API_KEY =

export default function App() {
  const [page, setPage] = useState("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [profileName, setProfileName] = useState("ميس عباس");
  const [profileEmail, setProfileEmail] = useState("mais@example.com");

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [emotion, setEmotion] = useState("");
  const [backgroundMood, setBackgroundMood] = useState("#f0f4f8");
  const [tone, setTone] = useState("رسمية");

  const [subscriptionType, setSubscriptionType] = useState("free");
  const [trialStartDate, setTrialStartDate] = useState(null);
  const TRIAL_DAYS = 7;

  const [adminOnline, setAdminOnline] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    loadChatHistory();
    loadProfile();
    loadSubscription();
    checkTrialStatus();
  }, []);

  const loadChatHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem("chatHistory");
      if (saved) setChatHistory(JSON.parse(saved));
    } catch {}
  };

  const saveChatHistory = async (data) => {
    try {
      await AsyncStorage.setItem("chatHistory", JSON.stringify(data));
    } catch {}
  };

  const clearChat = async () => {
    setChatHistory([]);
    await AsyncStorage.removeItem("chatHistory");
  };

  const loadProfile = async () => {
    try {
      const savedName = await AsyncStorage.getItem("profileName");
      const savedEmail = await AsyncStorage.getItem("profileEmail");
      if (savedName) setProfileName(savedName);
      if (savedEmail) setProfileEmail(savedEmail);
    } catch {}
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem("profileName", profileName);
      await AsyncStorage.setItem("profileEmail", profileEmail);
      Alert.alert("تم الحفظ", "تم حفظ بيانات الملف الشخصي.");
    } catch {}
  };

  const loadSubscription = async () => {
    try {
      const savedType = await AsyncStorage.getItem("subscriptionType");
      const savedTrial = await AsyncStorage.getItem("trialStartDate");
      if (savedType) setSubscriptionType(savedType);
      if (savedTrial) setTrialStartDate(Number(savedTrial));
    } catch {}
  };

  const saveSubscription = async (type) => {
    setSubscriptionType(type);
    await AsyncStorage.setItem("subscriptionType", type);
  };

  const startTrial = async () => {
    const now = Date.now();
    setTrialStartDate(now);
    await AsyncStorage.setItem("trialStartDate", String(now));
    setSubscriptionType("trial");
    await AsyncStorage.setItem("subscriptionType", "trial");
    Alert.alert("🎁 تجربة مجانية", "تم تفعيل التجربة المجانية لمدة 7 أيام.");
  };

  const checkTrialStatus = async () => {
    if (!trialStartDate) return;
    const daysPassed = (Date.now() - trialStartDate) / (1000 * 60 * 60 * 24);
    if (daysPassed > TRIAL_DAYS) {
      if (subscriptionType === "trial") {
        setSubscriptionType("free");
        await AsyncStorage.setItem("subscriptionType", "free");
      }
    }
  };

  const handleLogin = () => {
    if (username === "mais" && password === "1234") {
      setPage("chat");
    } else {
      Alert.alert("خطأ", "بيانات الدخول غير صحيحة");
    }
  };

  const logout = () => {
    setUsername("");
    setPassword("");
    setPage("login");
  };
[٣‏/١، ٢:٤٠ م] Mais: const analyzeEmotion = async (text) => {
    const prompt = `حلل مشاعر هذه الرسالة: "${text}". هل هي سعيدة، حزينة، غاضبة، أو محايدة؟`;
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data.choices[0].message.content;
  };

  const sendToAI = async () => {
    if (!message.trim()) return;

    if (!adminOnline) {
      const timestamp = new Date().toLocaleString();
      const reply = "📩 شكراً لرسالة، سيتم الرد عليك قريباً من قبل ميس عباس 💚";
      const updated = [
        ...chatHistory,
        { message, reply, timestamp, emotion: "انتظار المشرف" },
      ];
      setChatHistory(updated);
      await saveChatHistory(updated);
      setMessage("");
      return;
    }

    setLoading(true);

    try {
      const emotionResult = await analyzeEmotion(message);
      setEmotion(emotionResult);

      if (emotionResult.includes("حزينة")) setBackgroundMood("#dbe9f4");
      else if (emotionResult.includes("سعيدة")) setBackgroundMood("#fff8dc");
      else setBackgroundMood("#f0f4f8");

      const prompt = `اكتب الرد بنغمة ${tone} على هذه الرسالة:\n"${message}"`;

      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const reply = res.data.choices[0].message.content;
      const timestamp = new Date().toLocaleString();

      const updated = [
        ...chatHistory,
        { message, reply, timestamp, emotion: emotionResult },
      ];
      setChatHistory(updated);
      await saveChatHistory(updated);
      setMessage("");

      if (subscriptionType !== "free") {
        Speech.speak(reply, { language: "ar", rate: 1.0 });
      }
    } catch (err) {
      Alert.alert("خطأ", "حدث خطأ، حاول مرة أخرى.");
    }

    setLoading(false);
  };

  const shareToWhatsApp = () => {
    if (!chatHistory.length) return;
    const last = chatHistory[chatHistory.length - 1];
    const text = encodeURIComponent(last.reply || last.message || "");
    Linking.openURL(`whatsapp://send?text=${text}`);
  };

  const exportToPDF = async () => {
    if (!chatHistory.length) return;
    const html = chatHistory
      .map(
        (item) => `
      <p><strong>🙋‍♀️:</strong> ${item.message}</p>
      <p><strong>🤖:</strong> ${item.reply}</p>
      <p><em>المشاعر: ${item.emotion || ""}</em></p>
      <hr/>
    `
      )
      .join("");
    await Print.printAsync({ html: `<html><body>${html}</body></html>` });
  };

  const exportToExcel = async () => {
    if (!chatHistory.length) return;
    const data = chatHistory.map((item) => ({
      التاريخ: item.timestamp,
      الرسالة: item.message,
      الرد: item.reply,
      المشاعر: item.emotion || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المحادثات");
    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const uri = FileSystem.documentDirectory + "chat.xlsx";
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(uri);
  };

  const saveToCloud = async () => {
    if (!chatHistory.length) return;
    const content = chatHistory
      .map(
        (item) =>
          `🙋‍♀️ ${item.message}\n🤖 ${item.reply}\nالمشاعر: ${
            item.emotion || ""
          }\n`
      )
      .join("\n\n");
    const path = FileSystem.documentDirectory + "chat.txt";
    await FileSystem.writeAsStringAsync(path, content);
    await Sharing.shareAsync(path);
  };
[٣‏/١، ٢:٤١ م] Mais: const openPaymentMonthly = async () => {
    const url = "https://yamersal.com/pay/Maisabbas-monthly";
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("خطأ", "لا يمكن فتح صفحة الدفع.");
  };

  const openPaymentYearly = async () => {
    const url = "https://yamersal.com/pay/Maisabbas-yearly";
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("خطأ", "لا يمكن فتح صفحة الدفع.");
  };

  const activateMonthly = async () => {
    await saveSubscription("monthly");
    Alert.alert("تم التفعيل", "تم تفعيل الاشتراك الشهري (20$).");
  };

  const activateYearly = async () => {
    await saveSubscription("yearly");
    Alert.alert("تم التفعيل", "تم تفعيل الاشتراك السنوي (100$).");
  };

  const renderLogin = () => (
    <View style={styles.content}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <Text style={styles.label}>اسم المستخدم</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="مثال: mais"
      />
      <Text style={styles.label}>كلمة المرور</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="مثال: 1234"
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>دخول</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChat = () => {
    const today = new Date().toLocaleDateString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyCount = chatHistory.filter((item) =>
      item.timestamp?.includes(today)
    ).length;
    const weeklyCount = chatHistory.filter(
      (item) => new Date(item.timestamp) >= weekAgo
    ).length;

    const isPremium =
      subscriptionType === "monthly" ||
      subscriptionType === "yearly" ||
      subscriptionType === "trial";

    return (
      <View style={styles.content}>
        <Text style={styles.title}>المحادثة الذكية</Text>

        {subscriptionType === "trial" && (
          <Text style={styles.badge}>🎁 تجربة مجانية 7 أيام</Text>
        )}

        {subscriptionType === "monthly" && (
          <Text style={styles.badge}>💎 اشتراك شهري (20$)</Text>
        )}

        {subscriptionType === "yearly" && (
          <Text style={styles.badge}>💎 اشتراك سنوي (100$)</Text>
        )}

        {subscriptionType === "free" && (
          <Text style={styles.infoText}>
            بعض الميزات متاحة فقط للمشتركين 💎
          </Text>
        )}

        <Text style={styles.infoText}>
          📅 رسائل اليوم: {dailyCount} | 📈 هذا الأسبوع: {weeklyCount}
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          {["مرحة", "رسمية", "حزينة"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.toneButton,
                tone === t && { backgroundColor: "#4a90e2" },
              ]}
              onPress={() => setTone(t)}
            >
              <Text
                style={[
                  styles.toneButtonText,
                  tone === t && { color: "#fff" },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.chatBox}>
          {chatHistory.map((item, index) => (
            <View key={index} style={styles.chatBubble}>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
              <Text style={styles.userMessage}>🙋🏽‍♀️ {item.message}</Text>
              <Text style={styles.aiReply}>🤖 {item.reply}</Text>
              {item.emotion && (
                <Text style={styles.emotionText}>
                  المشاعر: {item.emotion}
                </Text>
              )}
              {item.adminReply && (
                <Text style={styles.adminReplyText}>
                  👩‍💼 رد المشرف: {item.adminReply}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>

        {loading && <ActivityIndicator size="large" color="#4a90e2" />}

        <TextInput
          style={styles.input}
          placeholder="اكتب رسالتك هنا..."
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.button} onPress={sendToAI}>
          <Text style={styles.buttonText}>إرسال</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={clearChat}>
          <Text style={styles.secondaryButtonText}>مسح المحادثة</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={shareToWhatsApp}
        >
          <Text style={styles.secondaryButtonText}>
            📤 مشاركة آخر رد عبر واتساب
          </Text>
        </TouchableOpacity>

        {isPremium && (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={exportToPDF}
            >
              <Text style={styles.secondaryButtonText}>
                📄 حفظ المحادثة PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={exportToExcel}
            >
              <Text style={styles.secondaryButtonText}>
                📊 حفظ المحادثة Excel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={saveToCloud}
            >
              <Text style={styles.secondaryButtonText}>
                ☁️ حفظ ومشاركة ملف نصي
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!isPremium && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setPage("subscription")}
          >
            <Text style={styles.secondaryButtonText}>🔓 اشترك الآن</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setPage("profile")}
        >
          <Text style={styles.secondaryButtonText}>الملف الشخصي</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setPage("admin")}
        >
          <Text style={styles.secondaryButtonText}>لوحة المشرف</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={logout}>
          <Text style={styles.secondaryButtonText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    );
  };
[٣‏/١، ٢:٤١ م] Mais: const renderProfile = () => (
    <View style={styles.content}>
      <Text style={styles.title}>الملف الشخصي</Text>

      <Text style={styles.label}>الاسم</Text>
      <TextInput
        style={styles.input}
        value={profileName}
        onChangeText={setProfileName}
      />

      <Text style={styles.label}>البريد الإلكتروني</Text>
      <TextInput
        style={styles.input}
        value={profileEmail}
        onChangeText={setProfileEmail}
      />

      <TouchableOpacity style={styles.button} onPress={saveProfile}>
        <Text style={styles.buttonText}>حفظ الملف الشخصي</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setPage("chat")}
      >
        <Text style={styles.secondaryButtonText}>عودة للمحادثة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSubscription = () => (
    <View style={styles.content}>
      <Text style={styles.title}>الاشتراك</Text>

      {subscriptionType === "free" && (
        <TouchableOpacity style={styles.button} onPress={startTrial}>
          <Text style={styles.buttonText}>🎁 ابدأ التجربة المجانية 7 أيام</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>الخطة المجانية</Text>
      <Text style={styles.listItem}>• دردشة أساسية</Text>
      <Text style={styles.listItem}>• تحليل مشاعر</Text>
      <Text style={styles.listItem}>• نبرة الرد</Text>
      <Text style={styles.listItem}>• تغيير الخلفية</Text>

      <Text style={styles.sectionTitle}>الخطة الشهرية (20$)</Text>
      <Text style={styles.listItem}>• PDF</Text>
      <Text style={styles.listItem}>• Excel</Text>
      <Text style={styles.listItem}>• TXT</Text>
      <Text style={styles.listItem}>• صوت AI</Text>
      <Text style={styles.listItem}>• حفظ سحابي</Text>
      <Text style={styles.listItem}>• رد المشرف</Text>

      <TouchableOpacity style={styles.button} onPress={openPaymentMonthly}>
        <Text style={styles.buttonText}>💳 الدفع الشهري (20$)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={activateMonthly}>
        <Text style={styles.buttonText}>✅ تفعيل الاشتراك الشهري</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>الخطة السنوية (100$)</Text>
      <Text style={styles.listItem}>• كل ميزات Premium</Text>
      <Text style={styles.listItem}>• توفير 60%</Text>

      <TouchableOpacity style={styles.button} onPress={openPaymentYearly}>
        <Text style={styles.buttonText}>💳 الدفع السنوي (100$)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={activateYearly}>
        <Text style={styles.buttonText}>✅ تفعيل الاشتراك السنوي</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setPage("chat")}
      >
        <Text style={styles.secondaryButtonText}>عودة للمحادثة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAdmin = () => {
    const today = new Date().toLocaleDateString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dailyCount = chatHistory.filter((item) =>
      item.timestamp?.includes(today)
    ).length;

    const weeklyCount = chatHistory.filter(
      (item) => new Date(item.timestamp) >= weekAgo
    ).length;

    const filteredMessages = chatHistory.filter(
      (item) =>
        item.message.includes(searchKeyword) ||
        item.reply.includes(searchKeyword)
    );

    return (
      <View style={styles.content}>
        <Text style={styles.title}>لوحة المشرف</Text>

        <Text>📅 عدد الرسائل اليوم: {dailyCount}</Text>
        <Text>📈 عدد الرسائل هذا الأسبوع: {weeklyCount}</Text>

        <TextInput
          style={styles.input}
          placeholder="🔍 ابحث في المحادثات"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
        />

        {filteredMessages.map((item, index) => (
          <View key={index} style={styles.chatBubble}>
            <Text>🧑‍💻 {item.message}</Text>
            <Text>🤖 {item.reply}</Text>

            {item.adminReply && (
              <Text>👩‍💼 رد المشرف: {item.adminReply}</Text>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSelectedMessage(index)}
            >
              <Text style={styles.secondaryButtonText}>رد كمشرف</Text>
            </TouchableOpacity>
          </View>
        ))}

        {selectedMessage !== null && (
          <>
            <TextInput
              style={styles.input}
              placeholder="اكتب رد المشرف هنا"
              value={adminReply}
              onChangeText={setAdminReply}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                const updated = [...chatHistory];
                updated[selectedMessage].adminReply = adminReply;
                setChatHistory(updated);
                saveChatHistory(updated);
                setAdminReply("");
                setSelectedMessage(null);
              }}
            >
              <Text style={styles.buttonText}>إرسال الرد</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            Alert.alert("📢 إشعار", "تم إرسال إشعار جماعي (وهمي)")
          }
        >
          <Text style={styles.secondaryButtonText}>📢 إرسال إشعار جماعي</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setAdminOnline(!adminOnline)}
        >
          <Text style={styles.secondaryButtonText}>
            حالة المشرف: {adminOnline ? "متصل ✅" : "غير متصل ⛔"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setPage("chat")}
        >
          <Text style={styles.secondaryButtonText}>عودة للمحادثة</Text>
        </TouchableOpacity>
      </View>
    );
  };
[٣‏/١، ٢:٤١ م] Mais: return (
    <ScrollView
      style={[styles.container, { backgroundColor: backgroundMood }]}
      keyboardShouldPersistTaps="handled"
    >
      {page === "login" && renderLogin()}
      {page === "chat" && renderChat()}
      {page === "profile" && renderProfile()}
      {page === "subscription" && renderSubscription()}
      {page === "admin" && renderAdmin()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#4a90e2",
    textAlign: "center",
  },
  label: { marginBottom: 5, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  secondaryButton: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#4a90e2",
  },
  secondaryButtonText: {
    color: "#4a90e2",
    textAlign: "center",
    fontWeight: "bold",
  },
  chatBox: {
    maxHeight: 350,
    marginBottom: 10,
  },
  chatBubble: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
    width: "100%",
    borderColor: "#ddd",
    borderWidth: 1,
  },
  timestamp: { fontSize: 12, color: "#888", marginBottom: 4 },
  userMessage: { fontWeight: "bold", marginBottom: 4 },
  aiReply: { color: "#333" },
  emotionText: { fontStyle: "italic", color: "#888", marginTop: 4 },
  adminReplyText: { color: "#4a90e2", marginTop: 4 },
  badge: {
    textAlign: "center",
    color: "#28a745",
    marginBottom: 10,
    fontWeight: "bold",
  },
  infoText: { textAlign: "center", color: "#777", marginBottom: 10 },
  sectionTitle: {
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    color: "#333",
  },
  listItem: { color: "#555", marginBottom: 3 },
  toneButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#4a90e2",
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 8,
  },
  toneButtonText: {
    textAlign: "center",
    color: "#4a90e2",
    fontWeight: "bold",
  },
});
