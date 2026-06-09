import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";

const { height } = Dimensions.get("window");

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  onPaymentSuccess: (method: string, transactionId: string | null) => void;
}

export default function PaymentModal({
  visible,
  onClose,
  amount,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [paymentStep, setPaymentStep] = useState<"select" | "card_details" | "processing" | "success">("select");
  const [selectedMethod, setSelectedMethod] = useState<"UPI" | "CARD" | "COD">("UPI");
  const [selectedUPIApp, setSelectedUPIApp] = useState<string>("Google Pay");
  const [upiId, setUpiId] = useState("");
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Processing Animation state
  const [processingText, setProcessingText] = useState("Connecting to Payment Gateway...");
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setPaymentStep("select");
      setProcessingText("Connecting to Payment Gateway...");
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const triggerSuccessAnimation = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePay = () => {
    if (selectedMethod === "COD") {
      setPaymentStep("processing");
      setProcessingText("Placing your Order...");
      setTimeout(() => {
        setPaymentStep("success");
        triggerSuccessAnimation();
        setTimeout(() => {
          onPaymentSuccess("COD", null);
        }, 1500);
      }, 1500);
    } else if (selectedMethod === "CARD" && paymentStep === "select") {
      setPaymentStep("card_details");
    } else {
      // UPI or CARD with details filled
      setPaymentStep("processing");
      setProcessingText("Authorizing Secure Connection...");
      
      setTimeout(() => {
        setProcessingText("Processing Transaction...");
        
        setTimeout(() => {
          setPaymentStep("success");
          triggerSuccessAnimation();
          
          setTimeout(() => {
            const txId = "TXN" + Math.floor(10000000 + Math.random() * 90000000);
            onPaymentSuccess(selectedMethod, txId);
          }, 1800);
        }, 1500);
      }, 1500);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {paymentStep !== "processing" && paymentStep !== "success" && (
          <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        )}

        <View style={[
          styles.sheet,
          (paymentStep === "processing" || paymentStep === "success") && styles.fullscreenSheet
        ]}>
          
          {/* STEP 1: SELECT PAYMENT METHOD */}
          {paymentStep === "select" && (
            <View>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Payment Method</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.amountBanner}>
                <Text style={styles.amountLabel}>Total to Pay</Text>
                <Text style={styles.amountText}>₹{amount.toFixed(2)}</Text>
              </View>

              {/* UPI Options */}
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === "UPI" && styles.methodCardActive]}
                onPress={() => setSelectedMethod("UPI")}
              >
                <View style={[styles.methodRadio, selectedMethod === "UPI" && styles.methodRadioActive]}>
                  {selectedMethod === "UPI" && <View style={styles.radioDot} />}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Pay via UPI App</Text>
                  <Text style={styles.methodSubtitle}>Google Pay, PhonePe, Paytm</Text>
                  
                  {selectedMethod === "UPI" && (
                    <View style={styles.upiSubOptions}>
                      {["Google Pay", "PhonePe", "Paytm"].map((app) => (
                        <TouchableOpacity
                          key={app}
                          style={[styles.upiAppBtn, selectedUPIApp === app && styles.upiAppBtnActive]}
                          onPress={() => setSelectedUPIApp(app)}
                        >
                          <Ionicons 
                            name={app === "Google Pay" ? "logo-google" : "wallet-outline"} 
                            size={16} 
                            color={selectedUPIApp === app ? theme.colors.primary : theme.colors.textSecondary} 
                          />
                          <Text style={[styles.upiAppText, selectedUPIApp === app && styles.upiAppTextActive]}>
                            {app}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <Ionicons name="flash" size={20} color="#D97706" style={styles.methodIcon} />
              </TouchableOpacity>

              {/* Card Options */}
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === "CARD" && styles.methodCardActive]}
                onPress={() => setSelectedMethod("CARD")}
              >
                <View style={[styles.methodRadio, selectedMethod === "CARD" && styles.methodRadioActive]}>
                  {selectedMethod === "CARD" && <View style={styles.radioDot} />}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Credit / Debit Card</Text>
                  <Text style={styles.methodSubtitle}>Visa, Mastercard, RuPay, etc.</Text>
                </View>
                <Ionicons name="card" size={20} color="#3B82F6" style={styles.methodIcon} />
              </TouchableOpacity>

              {/* Cash on Delivery */}
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === "COD" && styles.methodCardActive]}
                onPress={() => setSelectedMethod("COD")}
              >
                <View style={[styles.methodRadio, selectedMethod === "COD" && styles.methodRadioActive]}>
                  {selectedMethod === "COD" && <View style={styles.radioDot} />}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Cash on Delivery (COD)</Text>
                  <Text style={styles.methodSubtitle}>Pay with cash/UPI at delivery</Text>
                </View>
                <Ionicons name="cash" size={20} color={theme.colors.primary} style={styles.methodIcon} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
                <Text style={styles.payBtnText}>
                  {selectedMethod === "COD" ? "Place Order" : `Pay ₹${amount.toFixed(2)}`}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: CARD DETAILS */}
          {paymentStep === "card_details" && (
            <View>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setPaymentStep("select")}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { marginLeft: 12, flex: 1 }]}>Enter Card Details</Text>
              </View>

              <View style={styles.cardForm}>
                <Text style={styles.label}>Card Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={20} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="4111 2222 3333 4444"
                    keyboardType="number-pad"
                    maxLength={19}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.label}>Expiry Date</Text>
                    <TextInput
                      style={[styles.inputBox, { height: 50 }]}
                      placeholder="MM/YY"
                      keyboardType="number-pad"
                      maxLength={5}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={[styles.inputBox, { height: 50 }]}
                      placeholder="123"
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={3}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
                  <Text style={styles.payBtnText}>Pay Securely ₹{amount.toFixed(2)}</Text>
                  <Ionicons name="shield-checkmark" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: PROCESSING SCREEN */}
          {paymentStep === "processing" && (
            <View style={styles.processingWrapper}>
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
              <Text style={styles.processingTitle}>{processingText}</Text>
              <Text style={styles.processingSubtitle}>Please do not close the app or press back</Text>
              
              <View style={styles.securityStrip}>
                <Ionicons name="shield-checkmark" size={14} color="#059669" />
                <Text style={styles.securityText}>PCI-DSS Compliant • 256-bit SSL Secure</Text>
              </View>
            </View>
          )}

          {/* STEP 4: SUCCESS ANIMATION SCREEN */}
          {paymentStep === "success" && (
            <View style={styles.processingWrapper}>
              <Animated.View style={[
                styles.successCircle,
                { transform: [{ scale: scaleAnim }] }
              ]}>
                <Ionicons name="checkmark" size={60} color="#fff" />
              </Animated.View>
              
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successSubtitle}>Your order has been placed securely</Text>
              
              <View style={styles.receiptBox}>
                <Text style={styles.receiptText}>
                  Method: <Text style={{ fontWeight: "700" }}>{selectedMethod}</Text>
                </Text>
                <Text style={styles.receiptText}>
                  Amount: <Text style={{ fontWeight: "700" }}>₹{amount.toFixed(2)}</Text>
                </Text>
              </View>
            </View>
          )}
          
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)", // Slate shadow overlay
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: height * 0.85,
    ...theme.shadow.lg,
  },
  fullscreenSheet: {
    height: "100%",
    maxHeight: "100%",
    justifyContent: "center",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  amountBanner: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  amountLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  amountText: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.primary,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#FFF",
  },
  methodCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#F0FDF4",
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodRadioActive: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  methodSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  methodIcon: {
    marginLeft: 8,
  },
  upiSubOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  upiAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  upiAppBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#E8F5E9",
  },
  upiAppText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  upiAppTextActive: {
    color: theme.colors.primary,
  },
  payBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    ...theme.shadow.sm,
  },
  payBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  cardForm: {
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  inputBox: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  processingWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 30,
  },
  securityStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  securityText: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "700",
    marginLeft: 6,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    ...theme.shadow.md,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  receiptBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    width: "100%",
  },
  receiptText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
});
