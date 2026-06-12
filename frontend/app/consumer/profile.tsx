import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, Switch, Modal, TextInput,
  Linking, FlatList, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";
import { formatAddress, parseAddress } from "../../src/utils/address";
import AddressEditorModal from "../../src/components/AddressEditorModal";


// ── FAQ Data ──────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "How do I track my order?",
    a: "Go to 'My Orders' and tap on any active order. Tap 'Live Track Order' to see the real-time status of your delivery.",
  },
  {
    q: "Are the products really farm-fresh?",
    a: "Yes! All products are listed directly by verified farmers. We ensure produce is harvested within 12–24 hours before listing.",
  },
  {
    q: "How do I cancel an order?",
    a: "Orders can be cancelled before the farmer confirms them. Go to My Orders → expand the order → contact support with order details.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We support UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD). All digital payments are secured.",
  },
  {
    q: "How do I write a review?",
    a: "Once your order is delivered, go to My Orders and you'll see a 'Write Review' button. Rate the product and leave a comment!",
  },
  {
    q: "Can I change my delivery address?",
    a: "You can update your default delivery address from the profile → Delivery Addresses section. You can also change it per order during checkout.",
  },
];

// ── Notification toggles config ───────────────────────────────────────────────
const NOTIF_CONFIG = [
  { key: "order_updates", label: "Order Updates",   sub: "Get notified on order status changes", icon: "receipt-outline", color: "#3B82F6" },
  { key: "promotions",    label: "Promotions",       sub: "Seasonal deals and discounts",          icon: "pricetag-outline", color: "#F59E0B" },
  { key: "new_produce",   label: "New Produce",      sub: "When farmers add fresh items",          icon: "leaf-outline",     color: "#10B981" },
  { key: "price_alerts",  label: "Price Alerts",     sub: "Alerts when prices drop",               icon: "trending-down-outline", color: "#8B5CF6" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ orders: 0, saved: 0, reviews: 0 });
  const [savedAddress, setSavedAddress] = useState("");
  const [memberYear, setMemberYear] = useState("2025");

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    order_updates: true,
    promotions: true,
    new_produce: true,
    price_alerts: false,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Modals
  const [faqOpen, setFaqOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editAddressStr, setEditAddressStr] = useState<string | undefined>(undefined);

  // FAQ expanded state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUser();
      loadStats();
      loadNotifPrefs();
    }, [])
  );

  const loadUser = async () => {
    try {
      const u = await AsyncStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        setUser(parsed);
        const year = parsed.created_at
          ? new Date(parsed.created_at).getFullYear().toString()
          : "2025";
        setMemberYear(year);
      }
      const addr = await AsyncStorage.getItem("delivery_address");
      if (addr) setSavedAddress(addr);
      // Load addresses from backend
      const me: any = await api.me();
      if (me) {
        setUser(me);
        await AsyncStorage.setItem("user", JSON.stringify(me));
        if (me.addresses && me.addresses.length > 0) {
          setAddresses(me.addresses);
        }
      }
    } catch {}
  };

  const loadStats = async () => {
    try {
      const data: any = await api.consumerStats();
      setStats({ orders: data.orders, saved: data.saved, reviews: data.reviews });
    } catch {}
  };

  const loadNotifPrefs = async () => {
    try {
      const prefs: any = await api.getNotifPrefs();
      setNotifPrefs(prefs);
    } catch {}
  };

  const handleToggleNotif = async (key: keyof typeof notifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try {
      await api.updateNotifPrefs({ [key]: value });
    } catch {}
  };

  const handleSaveAddress = async (addrStr: string) => {
    const updated = [...addresses];
    if (!updated.includes(addrStr)) {
      updated.push(addrStr);
      if (updated.length > 5) updated.shift();
    }
    setAddresses(updated);
    setNewAddress("");
    await AsyncStorage.setItem("delivery_address", addrStr);
    setSavedAddress(addrStr);
    try {
      await api.updateProfile({ addresses: updated });
    } catch {}
  };

  const handleRemoveAddress = async (addr: string) => {
    const updated = addresses.filter((a) => a !== addr);
    setAddresses(updated);
    try {
      await api.updateProfile({ addresses: updated });
      if (savedAddress === addr && updated.length > 0) {
        setSavedAddress(updated[0]);
        await AsyncStorage.setItem("delivery_address", updated[0]);
      }
    } catch {}
  };

  const handleSetDefault = async (addr: string) => {
    setSavedAddress(addr);
    await AsyncStorage.setItem("delivery_address", addr);
    Alert.alert("✓ Default Updated", "Delivery address set as default.");
  };

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
    switch (action) {
      case "orders":
        router.push("/consumer/orders");
        break;
      case "saved":
        router.push("/consumer/saved-products");
        break;
      case "addresses":
        setAddressOpen(true);
        break;
      case "notifs":
        setNotifOpen(true);
        break;
      case "help":
        setFaqOpen(true);
        break;
      case "contact":
        Linking.openURL("tel:+918000123456").catch(() => {
          Alert.alert("Call Support", "You can reach us at: +91 80001 23456");
        });
        break;
      case "rate":
        Linking.openURL(
          "https://play.google.com/store/apps"
        ).catch(() => {
          Alert.alert("Rate Us", "Search 'FarmDirect' on the Play Store or App Store to rate us!");
        });
        break;
      case "about":
        setAboutOpen(true);
        break;
      case "privacy":
        Linking.openURL("https://farmdirect.in/privacy").catch(() => {
          Alert.alert(
            "Privacy Policy",
            "Your data is stored securely and never shared with third parties without consent. Visit farmdirect.in/privacy for full policy."
          );
        });
        break;
      case "terms":
        Linking.openURL("https://farmdirect.in/terms").catch(() => {
          Alert.alert(
            "Terms of Service",
            "By using FarmDirect you agree to our terms. Farmers are responsible for product quality. Visit farmdirect.in/terms for full details."
          );
        });
        break;
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const MENU_SECTIONS = [
    {
      title: "Account",
      items: [
        { icon: "location-outline",    label: "Delivery Addresses",  color: "#16A34A", action: "addresses" },
        { icon: "receipt-outline",     label: "My Orders",           color: "#3B82F6", action: "orders" },
        { icon: "heart-outline",       label: "Saved Products",      color: "#EF4444", action: "saved", badge: stats.saved > 0 ? String(stats.saved) : undefined },
        { icon: "notifications-outline", label: "Notifications",    color: "#F59E0B", action: "notifs" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle-outline", label: "Help & FAQ",          color: "#8B5CF6", action: "help" },
        { icon: "call-outline",        label: "Contact Us",          color: "#06B6D4", action: "contact" },
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
              <Text style={styles.heroTagText}> Member since {memberYear}</Text>
            </View>
          </View>
        </View>

        {/* Contact card */}
        <View style={styles.contactCard}>
          {[
            { icon: "mail-outline",         label: "Email",  val: user?.email  || "—" },
            { icon: "phone-portrait-outline", label: "Mobile", val: user?.mobile || "—" },
            { icon: "location-outline",     label: "Address", val: formatAddress(savedAddress) || "Not set — tap Delivery Addresses" },
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
            { label: "Orders", icon: "receipt", val: String(stats.orders) },
            { label: "Saved",  icon: "heart",   val: String(stats.saved) },
            { label: "Reviews", icon: "star",   val: String(stats.reviews) },
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
              {section.items.map((item: any, idx) => (
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
                  {item.badge && (
                    <View style={[styles.menuBadge, { backgroundColor: item.color }]}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Version */}
        <View style={styles.versionRow}>
          <Ionicons name="leaf" size={12} color={theme.colors.primary} />
          <Text style={styles.version}> FarmDirect v1.0.0 · Made in India 🇮🇳</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.87}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── FAQ Modal ─────────────────────────────────────────────────────────── */}
      <Modal visible={faqOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Help & FAQ</Text>
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
              Linking.openURL("tel:+918000123456").catch(() => {});
            }}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.contactSupportText}> Still need help? Call Us</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* ── About Modal ────────────────────────────────────────────────────────── */}
      <Modal visible={aboutOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>About FarmDirect</Text>
          <TouchableOpacity onPress={() => setAboutOpen(false)} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <View style={styles.aboutLogoCircle}>
            <Ionicons name="leaf" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.aboutTitle}>FarmDirect</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutSectionTitle}>Our Mission</Text>
            <Text style={styles.aboutText}>
              FarmDirect is India's first zero-middleman farm-to-table platform. We connect farmers directly with consumers, ensuring farmers earn more and consumers get fresher, healthier produce at fair prices.
            </Text>
          </View>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutSectionTitle}>How It Works</Text>
            {[
              "Farmers list fresh produce directly on the app",
              "Consumers browse and order with transparent pricing",
              "AI-powered mandi price intelligence helps you get fair deals",
              "Delivery within hours of harvest",
            ].map((step, i) => (
              <View key={i} style={styles.aboutStep}>
                <View style={styles.aboutStepNum}>
                  <Text style={styles.aboutStepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.aboutStepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutSectionTitle}>Impact</Text>
            <View style={styles.aboutStatsRow}>
              {[
                { val: "500+", label: "Farmers" },
                { val: "50K+", label: "Orders" },
                { val: "12hrs", label: "Freshness" },
              ].map((s) => (
                <View key={s.label} style={styles.aboutStat}>
                  <Text style={styles.aboutStatVal}>{s.val}</Text>
                  <Text style={styles.aboutStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.aboutFooter}>© 2025 FarmDirect Technologies Pvt. Ltd. · Made in India 🇮🇳</Text>
        </ScrollView>
      </Modal>

      {/* ── Address Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={addressOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Delivery Addresses</Text>
          <TouchableOpacity onPress={() => setAddressOpen(false)} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {addresses.length === 0 && (
            <View style={styles.addrEmpty}>
              <Ionicons name="location-outline" size={40} color={theme.colors.textMuted} />
              <Text style={styles.addrEmptyText}>No saved addresses yet</Text>
            </View>
          )}
          {addresses.map((addr, idx) => {
            const parsed = parseAddress(addr);
            const iconName = parsed.tag === "Home" ? "home" : parsed.tag === "Work" ? "briefcase" : "location";
            return (
              <View key={idx} style={styles.addrCard}>
                <View style={styles.addrIconWrap}>
                  <Ionicons name={iconName} size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.addrText} numberOfLines={2}>{formatAddress(addr)}</Text>
                <View style={styles.addrActions}>
                  <TouchableOpacity
                    style={[styles.addrActionBtn, { backgroundColor: theme.colors.primarySoft }]}
                    onPress={() => handleSetDefault(addr)}
                  >
                    <Text style={[styles.addrActionText, { color: theme.colors.primary }]}>Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addrActionBtn, { backgroundColor: theme.colors.borderLight }]}
                    onPress={() => {
                      setEditAddressStr(addr);
                      setEditorOpen(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addrActionBtn, { backgroundColor: theme.colors.errorSoft }]}
                    onPress={() => handleRemoveAddress(addr)}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          
          <TouchableOpacity
            style={[styles.addrSaveBtn, { marginTop: 16, backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setEditAddressStr(undefined);
              setEditorOpen(true);
            }}
            activeOpacity={0.88}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.addrSaveBtnText}> Add New Address</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <AddressEditorModal
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={(newAddr) => {
          if (editAddressStr) {
            const updated = addresses.map((a) => (a === editAddressStr ? newAddr : a));
            setAddresses(updated);
            api.updateProfile({ addresses: updated }).catch(() => {});
            if (savedAddress === editAddressStr) {
              setSavedAddress(newAddr);
              AsyncStorage.setItem("delivery_address", newAddr);
            }
          } else {
            handleSaveAddress(newAddr);
          }
          setEditorOpen(false);
        }}
        initialAddressString={editAddressStr}
      />

      {/* ── Notifications Modal ────────────────────────────────────────────────── */}
      <Modal visible={notifOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Notifications</Text>
          <TouchableOpacity onPress={() => setNotifOpen(false)} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.notifSubtitle}>Choose which notifications you'd like to receive</Text>
          {NOTIF_CONFIG.map((cfg) => (
            <View key={cfg.key} style={styles.notifRow}>
              <View style={[styles.notifIcon, { backgroundColor: cfg.color + "18" }]}>
                <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifLabel}>{cfg.label}</Text>
                <Text style={styles.notifSub}>{cfg.sub}</Text>
              </View>
              <Switch
                value={notifPrefs[cfg.key as keyof typeof notifPrefs]}
                onValueChange={(v) => handleToggleNotif(cfg.key as keyof typeof notifPrefs, v)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={notifPrefs[cfg.key as keyof typeof notifPrefs] ? theme.colors.primary : "#f4f3f4"}
              />
            </View>
          ))}
        </ScrollView>
      </Modal>
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
  menuBadge: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6,
  },
  menuBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  version: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "500" },
  versionRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: 16,
    borderWidth: 2, borderColor: theme.colors.error,
    borderRadius: 14, height: 50, backgroundColor: theme.colors.errorSoft,
    marginBottom: 10,
  },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: "800" },

  // ── Shared Modal Styles ─────────────────────────────────────────────────────
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

  // ── FAQ ─────────────────────────────────────────────────────────────────────
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

  // ── About ───────────────────────────────────────────────────────────────────
  aboutLogoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 12,
    borderWidth: 2, borderColor: theme.colors.primaryLight + "30",
  },
  aboutTitle: { fontSize: 24, fontWeight: "900", color: theme.colors.textPrimary, textAlign: "center" },
  aboutVersion: { fontSize: 12, color: theme.colors.textMuted, textAlign: "center", marginBottom: 20, fontWeight: "600" },
  aboutCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 16, marginBottom: 12, ...theme.shadow.xs,
  },
  aboutSectionTitle: { fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 10, letterSpacing: 0.5 },
  aboutText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 21 },
  aboutStep: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  aboutStepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1,
  },
  aboutStepNumText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  aboutStepText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  aboutStatsRow: { flexDirection: "row", justifyContent: "space-around" },
  aboutStat: { alignItems: "center" },
  aboutStatVal: { fontSize: 22, fontWeight: "900", color: theme.colors.primary },
  aboutStatLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "600" },
  aboutFooter: { fontSize: 12, color: theme.colors.textMuted, textAlign: "center", marginTop: 10, marginBottom: 20 },

  // ── Address ──────────────────────────────────────────────────────────────────
  addrEmpty: { alignItems: "center", paddingVertical: 30 },
  addrEmptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8, fontWeight: "600" },
  addrCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", ...theme.shadow.xs,
  },
  addrIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  addrText: { flex: 1, fontSize: 13, color: theme.colors.textPrimary, fontWeight: "600", marginRight: 8 },
  addrActions: { flexDirection: "row", gap: 6 },
  addrActionBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addrActionText: { fontSize: 11, fontWeight: "700" },
  addrAddLabel: { fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 10, marginBottom: 10 },
  addrInputWrap: {
    flexDirection: "row", alignItems: "flex-start",
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderRadius: 14, backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  addrInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  addrSaveBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 14,
    height: 50, flexDirection: "row", alignItems: "center",
    justifyContent: "center", ...theme.shadow.sm, marginBottom: 20,
  },
  addrSaveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // ── Notifications ───────────────────────────────────────────────────────────
  notifSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  notifRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, marginBottom: 10, ...theme.shadow.xs,
  },
  notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 14 },
  notifLabel: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  notifSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
