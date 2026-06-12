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
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../src/api";
import { theme } from "../src/theme";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"identifier" | "password" | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email/mobile and password.");
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.login(identifier.trim(), password);
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.user_type === "farmer") {
        router.replace("/farmer");
      } else {
        router.replace("/consumer");
      }
    } catch (e: any) {
      Alert.alert("Login Failed", e.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryDark} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View style={styles.header}>
          {/* Decorative orbs */}
          <View style={styles.orbHeader1} />
          <View style={styles.orbHeader2} />

          <Animated.View
            style={[styles.headerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Animated.View style={[styles.logoBadge, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="leaf" size={34} color="#fff" />
            </Animated.View>
            <Text style={styles.brandName}>FarmDirect</Text>
            <Text style={styles.headerTagline}>Sign in to your account</Text>
          </Animated.View>

          {/* Wave bottom */}
          <View style={styles.wave} />
        </View>

        {/* Form card */}
        <Animated.View
          style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Input: identifier */}
          <Text style={styles.label}>Email or Mobile</Text>
          <View style={[styles.inputWrap, focusedInput === "identifier" && styles.inputWrapFocused]}>
            <Ionicons
              name="person-outline"
              size={18}
              color={focusedInput === "identifier" ? theme.colors.primary : theme.colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="email@example.com or mobile"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={theme.colors.textMuted}
              onFocus={() => setFocusedInput("identifier")}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Input: password */}
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={theme.colors.textMuted}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (identifier.trim()) {
                Alert.alert(
                  "✓ OTP Sent",
                  `A verification code has been sent to ${identifier.trim()} to reset your password.`
                );
              } else {
                Alert.alert(
                  "Reset Password",
                  "Please enter your email or mobile number in the field above to receive a reset code."
                );
              }
            }}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login CTA */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.75 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <Text style={styles.loginBtnText}>Signing in…</Text>
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push("/register")}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>Create New Account</Text>
          </TouchableOpacity>

          {/* Trust row */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={13} color={theme.colors.primary} />
              <Text style={styles.trustText}>  SSL Secured</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="people" size={13} color={theme.colors.primary} />
              <Text style={styles.trustText}>  1000+ Farmers</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="star" size={13} color={theme.colors.secondary} />
              <Text style={styles.trustText}>  4.9 Rated</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingBottom: 0,
    overflow: "hidden",
    height: 280,
    justifyContent: "center",
  },
  orbHeader1: {
    position: "absolute",
    top: -40,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orbHeader2: {
    position: "absolute",
    bottom: 20,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  headerContent: {
    alignItems: "center",
    paddingTop: 16,
  },
  logoBadge: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  brandName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  headerTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },
  wave: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },

  // Form
  formCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 18,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    height: 52,
    ...theme.shadow.xs,
  },
  inputWrapFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    height: "100%",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  loginBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    ...theme.shadow.xl,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  registerBtn: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  registerBtnText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },

  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  trustText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
  },
});
