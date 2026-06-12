import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, Switch, Modal, Linking, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const FAQ_ITEMS = [
  {
    q: "How do I list fresh produce?",
    a: "Go to the main Dashboard (Add Produce) tab. Enter the name, category, price, stock quantity, unit, description, and upload a photo, then tap 'List on Marketplace'.",
  },
  {
    q: "How do I receive payments?",
    a: "Payments for digital/UPI orders are processed instantly. Cash on Delivery (COD) orders are collected by the delivery rider and settled to your bank account weekly.",
  },
  {
    q: "How do order statuses work?",
    a: "When a customer orders, it appears in your 'Orders' tab as 'Placed'. Tap 'Confirm' to accept. Once harvested and packed, mark as 'Packed'. Mark as 'Dispatched' when the delivery rider picks it up.",
  },
  {
    q: "Can I update a product price or stock?",
    a: "Yes! In 'My Listed Produce', you can view your current stock. If you need to edit or delete a listing, tap 'Remove' and list a fresh batch.",
  },
  {
    q: "How does the AI Price Predictor work?",
    a: "It fetches current Mandi market data across your state/district and runs an ML model to suggest the optimal minimum, maximum, and modal price for your crop.",
  },
];

export default function FarmerProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmType, setFarmType] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(true);

  // FAQ Modal states
  const [faqOpen, setFaqOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("user").then((u) => { if (u) setUser(JSON.parse(u)); });
    AsyncStorage.multiGet(["farm_name", "farm_location", "farm_type", "farm_size"]).then((vals) => {
      const map = Object.fromEntries(vals);
      setFarmName(map["farm_name"] || "");
      setFarmLocation(map["farm_location"] || "");
      setFarmType(map["farm_type"] || "");
      setFarmSize(map["farm_size"] || "");
    });
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          try { await api.logout(); } catch {}
          await AsyncStorage.multiRemove(["token", "user", "farmer_onboarded", "farm_name", "farm_location", "farm_type", "farm_size"]);
          router.replace("/");
        },
      },
    ]);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case "help":
        setFaqOpen(true);
        break;
      case "rate":
        Linking.openURL("https://play.google.com/store/apps").catch(() => {
          Alert.alert("Rate Us", "Search 'FarmDirect' on the Play Store or App Store to rate us!");
        });
        break;
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "F";

  const FARM_TYPE_LABELS: Record<string, string> = {
    organic: "Organic", mixed: "Mixed", dairy: "Dairy Farm",
    poultry: "Poultry", orchard: "Orchard", other: "Other",
  };

  const MENU = [
    {
      title: "Farm Details",
      items: [
        { icon: "business-outline",    label: "Farm Name",     val: farmName || "Not set",     color: "#0A7A40" },
        { icon: "location-outline",    label: "Location",      val: farmLocation || "Not set",  color: "#3B82F6" },
        { icon: "leaf-outline",        label: "Farm Type",     val: FARM_TYPE_LABELS[farmType] || "Not set", color: "#F59E0B" },
        { icon: "resize-outline",      label: "Farm Size",     val: farmSize || "Not set",      color: "#8B5CF6" },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: "mail-outline",            label: "Email",    val: user?.email  || "—", color: "#0A7A40" },
        { icon: "phone-portrait-outline",  label: "Mobile",   val: user?.mobile || "—", color: "#3B82F6" },
      ],
    },
  ];

  const ACTION_ITEMS = [
    { icon: "receipt-outline",   label: "View Orders",          color: "#3B82F6",  action: () => router.push("/farmer/orders") },
    { icon: "wallet-outline",    label: "Earnings Summary",     color: "#0A7A40",  action: () => router.push("/farmer/earnings") },
    { icon: "leaf-outline",      label: "My Listed Produce",    color: "#F59E0B",  action: () => router.push("/farmer/my-produce") },
    { icon: "sparkles-outline",  label: "AI Price Predictor",   color: "#8B5CF6",  action: () => router.push("/farmer/price-predict") },
    { icon: "help-circle-outline", label: "Help & Support FAQs", color: "#06B6D4",  action: () => handleMenuAction("help") },
    { icon: "star-outline",      label: "Rate the App",         color: "#F59E0B",  action: () => handleMenuAction("rate") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero header */}
        <View style={styles.hero}>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{user?.name || "Farmer"}</Text>
          {farmName ? (
            <View style={styles.farmBadge}>
              <Ionicons name="leaf" size={12} color={theme.colors.secondaryLight} />
              <Text style={styles.farmBadgeText}> {farmName}</Text>
            </View>
          ) : null}
          <View style={styles.heroTagRow}>
            <View style={styles.heroTag}>
              <Ionicons name="shield-checkmark" size={11} color={theme.colors.secondaryLight} />
              <Text style={styles.heroTagText}> Verified Farmer</Text>
            </View>
            {farmLocation ? (
              <View style={styles.heroTag}>
                <Ionicons name="location" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroTagText}> {farmLocation.split(",")[0]}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Info cards */}
        {MENU.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <View key={item.label} style={[styles.infoRow, idx < section.items.length - 1 && styles.infoRowBorder]}>
                  <View style={[styles.infoIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoVal} numberOfLines={2}>{item.val}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            {ACTION_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.actionRow, idx < ACTION_ITEMS.length - 1 && styles.infoRowBorder]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[styles.infoIcon, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon as any} size={16} color={item.color} />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.actionRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#F59E0B18" }]}>
                <Ionicons name="notifications-outline" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>New Order Notifications</Text>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={notifEnabled ? theme.colors.primary : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        {/* Re-trigger onboarding */}
        <TouchableOpacity
          style={styles.editFarmBtn}
          onPress={() => {
            AsyncStorage.removeItem("farmer_onboarded");
            Alert.alert("Farm Details Reset", "Reopen the Dashboard tab to re-enter your farm details.");
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.editFarmText}> Edit Farm Profile</Text>
        </TouchableOpacity>

        <View style={styles.versionRow}>
          <Ionicons name="leaf" size={12} color={theme.colors.primary} />
          <Text style={styles.version}> FarmDirect v1.0.0 · Made in India</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.87}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── FAQ Modal ─────────────────────────────────────────────────────────── */}
      <Modal visible={faqOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Farmer Help & Support</Text>
          <TouchableOpacity onPress={() => setFaqOpen(false)} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {FAQ_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.faqCard}
              onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <View style={[styles.faqNum, { backgroundColor: theme.colors.primarySoft }]}>
                  <Text style={styles.faqNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons
                  name={expandedFaq === idx ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.colors.textMuted}
                />
              </View>
              {expandedFaq === idx && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.contactSupportBtn}
            onPress={() => {
              setFaqOpen(false);
              Linking.openURL("tel:+918000123456").catch(() => {
                Alert.alert("Support Contact", "Reach us at +91 80001 23456 or email farmdirect@support.in");
              });
            }}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.contactSupportText}> Call Support Hotline</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primary,
    paddingTop: 28, paddingBottom: 36, alignItems: "center", overflow: "hidden",
  },
  heroOrb1: { position: "absolute", top: -30, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.07)" },
  heroOrb2: { position: "absolute", top: 40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(245,158,11,0.09)" },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarInitials: { fontSize: 28, fontWeight: "900", color: "#fff" },
  heroName: { fontSize: 22, fontWeight: "900", color: "#fff", marginBottom: 4 },
  farmBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  farmBadgeText: { fontSize: 12, color: "rgba(255,255,255,0.95)", fontWeight: "700" },
  heroTagRow: { flexDirection: "row", gap: 8 },
  heroTag: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  heroTagText: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: "700" },

  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden", ...theme.shadow.xs },

  infoRow: { flexDirection: "row", alignItems: "flex-start", padding: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  infoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 },
  infoLabel: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 2 },
  infoVal: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },

  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary },

  editFarmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 2, borderColor: theme.colors.primary,
    borderRadius: 14, height: 46, backgroundColor: theme.colors.primarySoft,
  },
  editFarmText: { color: theme.colors.primary, fontSize: 14, fontWeight: "700" },

  version: { textAlign: "center", fontSize: 12, color: theme.colors.textMuted, marginBottom: 16, fontWeight: "500" },
  versionRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: 16, borderWidth: 2, borderColor: theme.colors.error,
    borderRadius: 14, height: 50, backgroundColor: theme.colors.errorSoft,
  },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: "800" },

  // Shared Modal Header Styles
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    backgroundColor: "#fff",
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },

  // FAQ
  faqCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, marginBottom: 10, ...theme.shadow.xs,
  },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  faqNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  faqNumText: { fontSize: 12, fontWeight: "900", color: theme.colors.primary },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  faqA: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19, marginTop: 10, paddingLeft: 36 },
  contactSupportBtn: {
    backgroundColor: theme.colors.primary, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
    borderRadius: 14, height: 50, marginTop: 8, marginBottom: 20,
    ...theme.shadow.sm,
  },
  contactSupportText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
