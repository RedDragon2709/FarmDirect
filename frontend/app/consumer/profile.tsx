import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const MENU_SECTIONS = [
  {
    title: "Account",
    items: [
      { icon: "location-outline",    label: "Delivery Addresses",  color: "#16A34A", action: "addresses" },
      { icon: "receipt-outline",     label: "My Orders",           color: "#3B82F6", action: "orders" },
      { icon: "heart-outline",       label: "Saved Products",      color: "#EF4444", action: "saved" },
      { icon: "notifications-outline", label: "Notifications",    color: "#F59E0B", action: "notifs" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "help-circle-outline", label: "Help & FAQ",          color: "#8B5CF6", action: "help" },
      { icon: "chatbubble-outline",  label: "Contact Us",          color: "#06B6D4", action: "contact" },
      { icon: "star-outline",        label: "Rate the App",        color: "#F59E0B", action: "rate" },
    ],
  },
  {
    title: "About",
    items: [
      { icon: "leaf-outline",        label: "About FarmDirect",    color: "#0A7A40", action: "about" },
      { icon: "document-text-outline", label: "Privacy Policy",   color: "#6B7280", action: "privacy" },
      { icon: "shield-outline",      label: "Terms of Service",    color: "#6B7280", action: "terms" },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [savedAddress, setSavedAddress] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("user").then((u) => { if (u) setUser(JSON.parse(u)); });
    AsyncStorage.getItem("delivery_address").then((a) => { if (a) setSavedAddress(a); });
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          try { await api.logout(); } catch {}
          await AsyncStorage.multiRemove(["token", "user", "delivery_address"]);
          router.replace("/");
        },
      },
    ]);
  };

  const handleMenuAction = (action: string) => {
    if (action === "orders") { router.push("/consumer/orders"); return; }
    if (action === "addresses") {
      Alert.alert("Delivery Address", savedAddress || "No address saved yet. Set one from the home screen.");
      return;
    }
    Alert.alert("Coming Soon", "This feature is on the way! 🚀");
  };

  const initials = user?.name
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroOrb} />
          <View style={styles.heroOrb2} />
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{user?.name || "Consumer"}</Text>
          <View style={styles.heroTagRow}>
            <View style={styles.heroTag}>
              <Ionicons name="person" size={11} color={theme.colors.primaryLight} />
              <Text style={styles.heroTagText}> Consumer</Text>
            </View>
            <View style={styles.heroTag}>
              <Ionicons name="star" size={11} color={theme.colors.secondary} />
              <Text style={styles.heroTagText}> Member since 2025</Text>
            </View>
          </View>
        </View>

        {/* Contact card */}
        <View style={styles.contactCard}>
          {[
            { icon: "mail-outline",         label: "Email",  val: user?.email  || "—" },
            { icon: "phone-portrait-outline", label: "Mobile", val: user?.mobile || "—" },
            { icon: "location-outline",     label: "Address", val: savedAddress || "Not set — set from Home" },
          ].map((item) => (
            <View key={item.label} style={styles.contactRow}>
              <View style={styles.contactIconWrap}>
                <Ionicons name={item.icon as any} size={16} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactVal} numberOfLines={2}>{item.val}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick stats */}
        <View style={styles.statsCard}>
          {[
            { label: "Orders", icon: "receipt", val: "—" },
            { label: "Saved", icon: "heart",   val: "—" },
            { label: "Reviews", icon: "star",  val: "—" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statNum}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu sections */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.action}
                  style={[styles.menuRow, idx < section.items.length - 1 && styles.menuRowBorder]}
                  onPress={() => handleMenuAction(item.action)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.action === "notifs" ? (
                    <Switch
                      value={notifEnabled}
                      onValueChange={setNotifEnabled}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                      thumbColor={notifEnabled ? theme.colors.primary : "#f4f3f4"}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Version */}
        <Text style={styles.version}>FarmDirect v1.0.0 · Made with 🌱 in India</Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.87}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primary,
    paddingTop: 28, paddingBottom: 36,
    alignItems: "center", overflow: "hidden",
  },
  heroOrb: {
    position: "absolute", top: -30, right: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroOrb2: {
    position: "absolute", top: 40, left: -40,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(245,158,11,0.09)",
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarInitials: { fontSize: 28, fontWeight: "900", color: "#fff" },
  heroName: { fontSize: 22, fontWeight: "900", color: "#fff", marginBottom: 8 },
  heroTagRow: { flexDirection: "row", gap: 10 },
  heroTag: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  heroTagText: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: "700" },

  contactCard: {
    backgroundColor: "#fff", marginHorizontal: 16,
    marginTop: -20, borderRadius: 18, padding: 16,
    ...theme.shadow.md, marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  contactIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  contactLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  contactVal: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },

  statsCard: {
    flexDirection: "row", backgroundColor: "#fff",
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, paddingVertical: 14,
    ...theme.shadow.xs, borderWidth: 1, borderColor: theme.colors.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "900", color: theme.colors.primary },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: "600" },

  menuSection: { marginHorizontal: 16, marginBottom: 12 },
  menuSectionTitle: {
    fontSize: 11, fontWeight: "800", color: theme.colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  menuCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    overflow: "hidden", ...theme.shadow.xs,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary },

  version: {
    textAlign: "center", fontSize: 12,
    color: theme.colors.textMuted, marginBottom: 16, fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: 16,
    borderWidth: 2, borderColor: theme.colors.error,
    borderRadius: 14, height: 50, backgroundColor: theme.colors.errorSoft,
    marginBottom: 10,
  },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: "800" },
});
