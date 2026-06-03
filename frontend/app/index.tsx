import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../src/theme";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero gradient background */}
      <View style={styles.heroSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="leaf" size={48} color="#fff" />
          </View>
          <Text style={styles.logoText}>FarmDirect</Text>
          <Text style={styles.tagline}>
            Fresh from the field — straight to your door
          </Text>
        </View>
      </View>

      {/* Bottom card */}
      <View style={styles.bottomCard}>
        <Text style={styles.heading}>Your local farm marketplace</Text>
        <Text style={styles.subheading}>
          Buy fresh produce directly from farmers nearby, or sell what you grow.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.noteRow}>
          <View style={styles.noteItem}>
            <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
            <Text style={styles.noteText}> Secure</Text>
          </View>
          <Text style={styles.noteSeparator}>·</Text>
          <View style={styles.noteItem}>
            <Ionicons name="leaf" size={14} color={theme.colors.textMuted} />
            <Text style={styles.noteText}> Local Farmers</Text>
          </View>
          <Text style={styles.noteSeparator}>·</Text>
          <View style={styles.noteItem}>
            <Ionicons name="car" size={14} color={theme.colors.textMuted} />
            <Text style={styles.noteText}> COD Available</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },

  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 20,
    left: -50,
  },

  logoContainer: { alignItems: "center" },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  bottomCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 28,
    lineHeight: 21,
  },

  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryBtn: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },

  noteRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  noteText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  noteSeparator: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginHorizontal: 6,
  },
});
