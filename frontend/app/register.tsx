import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../src/api";
import { theme } from "../src/theme";

const { width } = Dimensions.get("window");
type UserType = "farmer" | "consumer" | null;

const ROLE_OPTIONS = [
  {
    type: "farmer" as const,
    icon: "account-cowboy-hat",
    emoji: "🌾",
    title: "I'm a Farmer",
    desc: "List your fresh produce, manage orders & earn directly — no middlemen.",
    color: "#0A7A40",
    bg: "#F0FDF4",
  },
  {
    type: "consumer" as const,
    icon: "cart",
    emoji: "🛒",
    title: "I'm a Buyer",
    desc: "Browse farm-fresh produce and get it delivered to your door.",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<UserType>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(step === 1 ? 0.5 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [step]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step === 1 ? 0.5 : 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const goToStep2 = () => {
    if (!userType) {
      Alert.alert("Choose a Role", "Please select Farmer or Buyer to continue.");
      return;
    }
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    setStep(2);
  };

  const handleRegister = async () => {
    if (!name || !email || !mobile || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert("Invalid Mobile", "Mobile number must be exactly 10 digits.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.register({ name, email, mobile, password, user_type: userType! });
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.user_type === "farmer") {
        router.replace("/farmer");
      } else {
        router.replace("/consumer");
      }
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryDark} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.orbH1} />
          <View style={styles.orbH2} />
          <View style={styles.headerContent}>
            <View style={styles.logoBadge}>
              <Ionicons name="leaf" size={30} color="#fff" />
            </View>
            <Text style={styles.brandName}>FarmDirect</Text>
            <Text style={styles.headerSub}>
              {step === 1 ? "Who are you?" : "Create your account"}
            </Text>
          </View>
          <View style={styles.wave} />
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Step {step} of 2</Text>
            <Text style={styles.progressLabel}>{step === 1 ? "Choose Role" : "Your Details"}</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {step === 1 ? (
            <>
              {ROLE_OPTIONS.map((role) => {
                const isSelected = userType === role.type;
                return (
                  <TouchableOpacity
                    key={role.type}
                    style={[
                      styles.roleCard,
                      isSelected && { borderColor: role.color, backgroundColor: role.bg },
                    ]}
                    onPress={() => setUserType(role.type)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: isSelected ? role.color : "#F3F4F6" }]}>
                      <Text style={{ fontSize: 28 }}>{role.emoji}</Text>
                    </View>
                    <View style={styles.roleText}>
                      <Text style={[styles.roleTitle, isSelected && { color: role.color }]}>{role.title}</Text>
                      <Text style={styles.roleDesc}>{role.desc}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: role.color }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.nextBtn, !userType && { opacity: 0.5 }]}
                onPress={goToStep2}
                disabled={!userType}
                activeOpacity={0.88}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
                <Text style={styles.backBtnText}> Back to Welcome</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => { fadeAnim.setValue(0); slideAnim.setValue(30); setStep(1); }} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
                <Text style={styles.backBtnText}> Back to Step 1</Text>
              </TouchableOpacity>

              {/* Role indicator */}
              <View style={styles.rolePill}>
                <Text style={{ fontSize: 16 }}>{userType === "farmer" ? "🌾" : "🛒"}</Text>
                <Text style={styles.rolePillText}>
                  Registering as {userType === "farmer" ? "Farmer" : "Buyer"}
                </Text>
              </View>

              {[
                { key: "name", label: "Full Name", icon: "person-outline", placeholder: "e.g. Ravi Kumar", kb: "default" as const },
                { key: "email", label: "Email Address", icon: "mail-outline", placeholder: "you@example.com", kb: "email-address" as const },
                { key: "mobile", label: "Mobile Number", icon: "phone-portrait-outline", placeholder: "10-digit mobile", kb: "number-pad" as const },
              ].map((field) => (
                <View key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View style={[styles.inputWrap, focusedInput === field.key && styles.inputWrapFocused]}>
                    <Ionicons
                      name={field.icon as any}
                      size={18}
                      color={focusedInput === field.key ? theme.colors.primary : theme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      value={field.key === "name" ? name : field.key === "email" ? email : mobile}
                      onChangeText={field.key === "name" ? setName : field.key === "email" ? setEmail : setMobile}
                      keyboardType={field.kb}
                      autoCapitalize={field.kb === "email-address" ? "none" : "words"}
                      maxLength={field.key === "mobile" ? 10 : undefined}
                      placeholderTextColor={theme.colors.textMuted}
                      onFocus={() => setFocusedInput(field.key)}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>
              ))}

              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, focusedInput === "password" && styles.inputWrapFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedInput === "password" ? theme.colors.primary : theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={theme.colors.textMuted}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, loading && { opacity: 0.75 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.88}
              >
                <Text style={styles.nextBtnText}>{loading ? "Creating Account…" : "Create Account"}</Text>
                {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginLinkBtn} onPress={() => router.push("/login")} activeOpacity={0.7}>
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.colors.background },

  header: {
    backgroundColor: theme.colors.primary,
    height: 230,
    overflow: "hidden",
    justifyContent: "center",
  },
  orbH1: {
    position: "absolute", top: -30, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orbH2: {
    position: "absolute", bottom: 10, left: -50,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  headerContent: { alignItems: "center" },
  logoBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 10, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  brandName: { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: -0.6, marginBottom: 4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  wave: {
    position: "absolute", bottom: -2, left: 0, right: 0,
    height: 36, backgroundColor: theme.colors.background,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
  },

  progressSection: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 4 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted },
  progressBar: { height: 5, backgroundColor: theme.colors.border, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },

  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 50 },

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  roleIconWrap: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
    marginRight: 16,
  },
  roleText: { flex: 1 },
  roleTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 4 },
  roleDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },
  checkBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },

  nextBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    ...theme.shadow.xl,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  backBtn: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 4, alignSelf: "flex-start" },
  backBtnText: { color: theme.colors.primary, fontSize: 13, fontWeight: "700" },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.primaryLight + "40",
  },
  rolePillText: { marginLeft: 6, fontSize: 13, fontWeight: "700", color: theme.colors.primary },

  label: {
    fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary,
    marginBottom: 8, marginTop: 16, letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "#fff",
    paddingHorizontal: 14, height: 52,
    ...theme.shadow.xs,
  },
  inputWrapFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: theme.colors.textPrimary, height: "100%" },

  loginLinkBtn: { marginTop: 20, alignItems: "center", paddingVertical: 10 },
  loginLinkText: { color: theme.colors.textSecondary, fontSize: 14 },
  loginLinkBold: { color: theme.colors.primary, fontWeight: "800" },
});
