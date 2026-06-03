import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem("user").then((u) => { if (u) setUser(JSON.parse(u)); });
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          try { await api.logout(); } catch {}
          await AsyncStorage.multiRemove(["token", "user"]);
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.name}>{user?.name || "Consumer"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.mobileRow}>
          <Ionicons name="call-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.mobile}> {user?.mobile}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Type</Text>
          <Text style={styles.infoValue}>Consumer</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment</Text>
          <Text style={styles.infoValue}>Cash on Delivery</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20 },
  avatarCard: { backgroundColor: "#fff", borderRadius: theme.borderRadius.lg, padding: 24,
    alignItems: "center", marginBottom: 16, ...theme.shadow.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F1F8E9",
    alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 4 },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 },
  mobileRow: { flexDirection: "row", alignItems: "center" },
  mobile: { fontSize: 13, color: theme.colors.textMuted },
  infoCard: { backgroundColor: "#fff", borderRadius: theme.borderRadius.lg,
    padding: 20, marginBottom: 20, ...theme.shadow.sm },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: theme.colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  divider: { height: 1, backgroundColor: theme.colors.border },
  logoutBtn: { backgroundColor: theme.colors.error, borderRadius: theme.borderRadius.md,
    paddingVertical: 14, alignItems: "center" },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
