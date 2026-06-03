import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../src/api";
import { theme } from "../src/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill all fields");
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
      Alert.alert("Login Failed", e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="leaf" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Login with your email or mobile number
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email or Mobile</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com or 9876543210"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.textMuted}
          />

          <TouchableOpacity
            onPress={() => Alert.alert("Coming Soon", "Password reset via email — coming soon!")}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.linkText}>
              Don't have an account?{" "}
              <Text style={styles.linkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 40 },
  iconWrapper: { marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  form: {},
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: "#fff",
  },
  forgotText: {
    textAlign: "right",
    color: theme.colors.primary,
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },

  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  linkBtn: { marginTop: 20, alignItems: "center" },
  linkText: { color: theme.colors.textSecondary, fontSize: 14 },
  linkBold: { color: theme.colors.primary, fontWeight: "700" },
});
