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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../src/api";
import { theme } from "../src/theme";

type UserType = "farmer" | "consumer" | null;

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<UserType>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!userType) {
      Alert.alert("Select Type", "Please choose Farmer or Consumer");
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!name || !email || !mobile || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert("Invalid Mobile", "Mobile number must be exactly 10 digits");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const data: any = await api.register({
        name,
        email,
        mobile,
        password,
        user_type: userType!,
      });
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.user_type === "farmer") {
        router.replace("/farmer");
      } else {
        router.replace("/consumer");
      }
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>I am a…</Text>
        <Text style={styles.subtitle}>Choose how you want to use FarmDirect</Text>

        <TouchableOpacity
          style={[
            styles.typeCard,
            userType === "farmer" && styles.typeCardActive,
          ]}
          onPress={() => setUserType("farmer")}
        >
          <View style={styles.typeIconWrapper}>
            <MaterialCommunityIcons name="account-cowboy-hat" size={36} color={userType === "farmer" ? theme.colors.primary : theme.colors.textSecondary} />
          </View>
          <Text style={styles.typeTitle}>Farmer</Text>
          <Text style={styles.typeDesc}>
            List your produce, manage orders, and earn directly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeCard,
            userType === "consumer" && styles.typeCardActive,
          ]}
          onPress={() => setUserType("consumer")}
        >
          <View style={styles.typeIconWrapper}>
            <Ionicons name="cart" size={36} color={userType === "consumer" ? theme.colors.primary : theme.colors.textSecondary} />
          </View>
          <Text style={styles.typeTitle}>Consumer</Text>
          <Text style={styles.typeDesc}>
            Browse fresh produce and buy directly from farmers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, !userType && { opacity: 0.5 }]}
          onPress={handleNext}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <View style={styles.backRow}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
            <Text style={styles.backText}> Back to Welcome</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => setStep(1)}>
          <View style={styles.backRow}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
            <Text style={styles.backText}> Change type</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          {userType === "farmer" ? (
            <MaterialCommunityIcons name="account-cowboy-hat" size={26} color={theme.colors.primary} />
          ) : (
            <Ionicons name="cart" size={26} color={theme.colors.primary} />
          )}
          <Text style={styles.title}>
            {" "}{userType === "farmer" ? "Farmer" : "Consumer"} Account
          </Text>
        </View>
        <Text style={styles.subtitle}>Fill in your details below</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.label}>Mobile Number (10 digits)</Text>
        <TextInput
          style={styles.input}
          placeholder="9876543210"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="number-pad"
          maxLength={10}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.label}>Password (min 6 chars)</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={theme.colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Creating Account..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 28,
  },

  typeCard: {
    backgroundColor: "#fff",
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  typeCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#F1F8E9",
  },
  typeIconWrapper: { marginBottom: 8 },
  typeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  typeDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },

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

  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  linkBtn: { marginTop: 20, alignItems: "center" },
  linkText: { color: theme.colors.textSecondary, fontSize: 14 },
  linkBold: { color: theme.colors.primary, fontWeight: "700" },
});
