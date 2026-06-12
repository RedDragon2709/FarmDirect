import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";

const { width, height } = Dimensions.get("window");

type PaymentMethod = "upi" | "card" | "netbanking" | "cod";
type PaymentStep = "method" | "details" | "processing" | "success";

interface Props {
  visible: boolean;
  amount: number;
  productName: string;
  onSuccess: (method: PaymentMethod, transactionId: string) => void;
  onClose: () => void;
}

const METHODS: { id: PaymentMethod; label: string; icon: string; iconLib: "ion" | "mci"; desc: string; color: string }[] = [
  { id: "upi", label: "UPI", icon: "phone-portrait", iconLib: "ion", desc: "Pay via any UPI app", color: "#7C3AED" },
  { id: "card", label: "Card", icon: "card", iconLib: "ion", desc: "Credit / Debit card", color: "#2563EB" },
  { id: "netbanking", label: "Net Banking", icon: "business", iconLib: "ion", desc: "All major banks", color: "#0891B2" },
  { id: "cod", label: "Cash on Delivery", icon: "cash", iconLib: "ion", desc: "Pay when order arrives", color: "#059669" },
];

function generateTxnId(): string {
  return "FD" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default function PaymentModal({ visible, amount, productName, onSuccess, onClose }: Props) {
  const [step, setStep] = useState<PaymentStep>("method");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("farmdirect@okaxis");
  const [cardNum, setCardNum] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/29");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardName, setCardName] = useState("John Doe");
  const [bank, setBank] = useState("HDFC Bank");
  const [txnId, setTxnId] = useState("");
  const [processingMessage, setProcessingMessage] = useState("Please wait, verifying your transaction…");

  const slideAnim = useRef(new Animated.Value(height)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep("method");
      setUpiId("farmdirect@okaxis");
      setCardNum("4111 2222 3333 4444");
      setCardExpiry("12/29");
      setCardCvv("123");
      setCardName("John Doe");
      setBank("HDFC Bank");
      setProcessingMessage("Please wait, verifying your transaction…");
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  // Spinner animation when processing
  useEffect(() => {
    if (step === "processing") {
      Animated.timing(progressAnim, { toValue: 1, duration: 2200, useNativeDriver: false }).start();
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      ).start();

      const id = setTimeout(() => {
        const newTxn = generateTxnId();
        setTxnId(newTxn);
        setStep("success");
        Animated.parallel([
          Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }),
          Animated.timing(successFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
        setTimeout(() => onSuccess(method, newTxn), 1400);
      }, 2200);
      return () => clearTimeout(id);
    }
  }, [step]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const triggerDirectAppPay = (appName: string) => {
    setProcessingMessage(`Connecting to ${appName}... Authorizing secure token.`);
    setStep("processing");
  };

  const handlePay = () => {
    if (method === "upi" && !upiId.trim()) {
      Alert.alert("UPI ID Required", "Please enter your UPI ID to continue."); return;
    }
    if (method === "card" && (!cardNum.trim() || !cardExpiry.trim() || !cardCvv.trim() || !cardName.trim())) {
      Alert.alert("Card Details", "Please fill all card details."); return;
    }
    if (method === "netbanking" && !bank.trim()) {
      Alert.alert("Select Bank", "Please enter or select your bank."); return;
    }
    setStep("processing");
  };

  const renderIcon = (m: typeof METHODS[0]) =>
    <Ionicons name={m.icon as any} size={22} color={m.color} />;

  const formatCard = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    return clean.length > 2 ? clean.slice(0, 2) + "/" + clean.slice(2) : clean;
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={step !== "processing" ? onClose : undefined} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          {step !== "success" && (
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  {step === "method" ? "Choose Payment" : step === "details" ? "Enter Details" : "Processing…"}
                </Text>
                <Text style={styles.headerSub}>{productName}</Text>
              </View>
              <View style={styles.amountBadge}>
                <Text style={styles.amountText}>₹{amount.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* STEP: Method */}
            {step === "method" && (
              <View style={styles.body}>
                {METHODS.map((m) => {
                  const sel = method === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.methodCard, sel && { borderColor: m.color, backgroundColor: m.color + "0A" }]}
                      onPress={() => setMethod(m.id)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.methodIconWrap, { backgroundColor: m.color + "18" }]}>
                        {renderIcon(m)}
                      </View>
                      <View style={styles.methodText}>
                        <Text style={[styles.methodLabel, sel && { color: m.color }]}>{m.label}</Text>
                        <Text style={styles.methodDesc}>{m.desc}</Text>
                      </View>
                      {sel && (
                        <View style={[styles.methodCheck, { backgroundColor: m.color }]}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={styles.payBtn} onPress={() => setStep("details")} activeOpacity={0.88}>
                  <Text style={styles.payBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                {method === "cod" && (
                  <TouchableOpacity style={styles.codDirectBtn} onPress={() => setStep("processing")} activeOpacity={0.88}>
                    <Ionicons name="cash" size={16} color={theme.colors.primary} />
                    <Text style={styles.codDirectText}> Confirm COD Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* STEP: Details */}
            {step === "details" && (
              <View style={styles.body}>
                {method === "upi" && (
                  <>
                    <Text style={styles.detailsTitle}>Pay via UPI App</Text>
                    <View style={styles.upiRow}>
                      {[
                        { id: "Google Pay", color: "#4285F4", bgColor: "#E8F0FE", icon: "logo-google" },
                        { id: "PhonePe", color: "#5f259f", bgColor: "#F1EAFA", icon: "flash" },
                        { id: "Paytm", color: "#00b9f5", bgColor: "#E6F8FE", icon: "wallet" },
                        { id: "BHIM", color: "#1C593C", bgColor: "#EAF2EE", icon: "qr-code" }
                      ].map((app) => (
                        <TouchableOpacity
                          key={app.id}
                          style={styles.upiApp}
                          onPress={() => triggerDirectAppPay(app.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.upiAppIcon, { backgroundColor: app.bgColor }]}>
                            <Ionicons name={app.icon as any} size={22} color={app.color} />
                          </View>
                          <Text style={styles.upiAppLabel}>{app.id}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.inputLabel}>Or Pay via custom UPI ID</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.input}
                        placeholder="yourname@bank"
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </>
                )}

                {method === "card" && (
                  <>
                    <Text style={styles.detailsTitle}>Card Details</Text>
                    {/* Card Preview */}
                    <View style={styles.cardPreview}>
                      <View style={styles.cardPreviewTop}>
                        <Ionicons name="card" size={26} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.cardPreviewBank}>VISA / MC</Text>
                      </View>
                      <Text style={styles.cardPreviewNum}>
                        {cardNum ? cardNum.replace(/ /g, "").padEnd(16, "•").replace(/(.{4})/g, "$1 ").trim() : "•••• •••• •••• ••••"}
                      </Text>
                      <View style={styles.cardPreviewBottom}>
                        <Text style={styles.cardPreviewLabel}>{cardName || "Card Holder"}</Text>
                        <Text style={styles.cardPreviewLabel}>{cardExpiry || "MM/YY"}</Text>
                      </View>
                    </View>

                    {[
                      { label: "Cardholder Name", val: cardName, setter: setCardName, kb: "default" as const, ph: "As on card" },
                      { label: "Card Number", val: cardNum, setter: (v: string) => setCardNum(formatCard(v)), kb: "number-pad" as const, ph: "1234 5678 9012 3456" },
                    ].map((f) => (
                      <View key={f.label}>
                        <Text style={styles.inputLabel}>{f.label}</Text>
                        <View style={styles.inputWrap}>
                          <TextInput style={styles.input} placeholder={f.ph} value={f.val} onChangeText={f.setter}
                            keyboardType={f.kb} placeholderTextColor={theme.colors.textMuted} />
                        </View>
                      </View>
                    ))}

                    <View style={styles.rowTwo}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.inputLabel}>Expiry</Text>
                        <View style={styles.inputWrap}>
                          <TextInput style={styles.input} placeholder="MM/YY" value={cardExpiry}
                            onChangeText={(v) => setCardExpiry(formatExpiry(v))} keyboardType="number-pad"
                            maxLength={5} placeholderTextColor={theme.colors.textMuted} />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CVV</Text>
                        <View style={styles.inputWrap}>
                          <TextInput style={styles.input} placeholder="•••" value={cardCvv}
                            onChangeText={setCardCvv} keyboardType="number-pad"
                            maxLength={4} secureTextEntry placeholderTextColor={theme.colors.textMuted} />
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {method === "netbanking" && (
                  <>
                    <Text style={styles.detailsTitle}>Net Banking</Text>
                    <Text style={styles.inputLabel}>Bank Name</Text>
                    <View style={styles.inputWrap}>
                      <TextInput style={styles.input} placeholder="e.g. SBI, HDFC, ICICI" value={bank}
                        onChangeText={setBank} placeholderTextColor={theme.colors.textMuted} />
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.88}>
                  <Ionicons name="shield-checkmark" size={16} color="#fff" />
                  <Text style={[styles.payBtnText, { marginLeft: 8 }]}>Pay ₹{amount.toFixed(2)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.changeMethodBtn} onPress={() => setStep("method")} activeOpacity={0.7}>
                  <Text style={styles.changeMethodText}>← Change payment method</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP: Processing */}
            {step === "processing" && (
              <View style={[styles.body, styles.centerBlock]}>
                <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]}>
                  <View style={styles.spinnerInner} />
                </Animated.View>
                <Text style={styles.processingTitle}>Processing Payment</Text>
                <Text style={styles.processingSubtitle}>{processingMessage}</Text>
                <View style={styles.processingBar}>
                  <Animated.View style={[styles.processingFill, {
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })
                  }]} />
                </View>
                <Text style={styles.processingNote}>Do not close this screen</Text>
              </View>
            )}

            {/* STEP: Success */}
            {step === "success" && (
              <View style={[styles.body, styles.centerBlock]}>
                <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }], opacity: successFade }]}>
                  <Ionicons name="checkmark" size={44} color="#fff" />
                </Animated.View>
                <Animated.View style={{ opacity: successFade }}>
                  <Text style={styles.successTitle}>Payment Successful!</Text>
                  <Text style={styles.successSub}>Your order has been placed successfully!</Text>
                  <View style={styles.txnBox}>
                    <Text style={styles.txnLabel}>Transaction ID</Text>
                    <Text style={styles.txnId}>{txnId}</Text>
                  </View>
                  <View style={styles.successMeta}>
                    <Ionicons name="leaf" size={14} color={theme.colors.primary} />
                    <Text style={styles.successMetaText}>  Farm-fresh delivery on its way!</Text>
                  </View>
                </Animated.View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.92,
    ...theme.shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center", marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, fontWeight: "500" },
  amountBadge: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.colors.primaryLight + "30",
  },
  amountText: { fontSize: 16, fontWeight: "900", color: theme.colors.primary },

  body: { padding: 20, paddingBottom: 40 },
  centerBlock: { alignItems: "center", paddingTop: 40, paddingBottom: 60 },

  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
    ...theme.shadow.xs,
  },
  methodIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    marginRight: 14,
  },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  methodDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  methodCheck: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },

  payBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    ...theme.shadow.xl,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  codDirectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  codDirectText: { color: theme.colors.primary, fontSize: 14, fontWeight: "700" },

  detailsTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 16 },

  upiRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 18 },
  upiApp: { alignItems: "center", minWidth: 65, paddingVertical: 4 },
  upiAppIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    ...theme.shadow.xs,
  },
  upiAppLabel: { fontSize: 10, fontWeight: "800", color: theme.colors.textPrimary },

  cardPreview: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    ...theme.shadow.md,
  },
  cardPreviewTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  cardPreviewBank: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "700" },
  cardPreviewNum: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 2, marginBottom: 16 },
  cardPreviewBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardPreviewLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },

  inputLabel: {
    fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary,
    marginBottom: 7, marginTop: 12,
  },
  inputWrap: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md, backgroundColor: "#fff",
    paddingHorizontal: 14, height: 50,
    justifyContent: "center",
    ...theme.shadow.xs,
  },
  input: { fontSize: 15, color: theme.colors.textPrimary },
  rowTwo: { flexDirection: "row" },

  changeMethodBtn: { alignItems: "center", marginTop: 14, paddingVertical: 6 },
  changeMethodText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "600" },

  spinnerRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 5, borderColor: theme.colors.border,
    borderTopColor: theme.colors.primary,
    marginBottom: 24,
  },
  spinnerInner: {
    position: "absolute",
    width: "100%", height: "100%",
    borderRadius: 40,
  },
  processingTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 8, textAlign: "center" },
  processingSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 24, textAlign: "center" },
  processingBar: { width: width * 0.65, height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: "hidden" },
  processingFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },
  processingNote: { marginTop: 14, fontSize: 11, color: theme.colors.textMuted, fontWeight: "600" },

  successCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24, ...theme.shadow.xl,
  },
  successTitle: { fontSize: 24, fontWeight: "900", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 8 },
  successSub: { fontSize: 15, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 22 },
  txnBox: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md, padding: 14,
    alignItems: "center", marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  txnLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  txnId: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary, letterSpacing: 1 },
  successMeta: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  successMetaText: { color: theme.colors.primary, fontSize: 13, fontWeight: "700" },
});
