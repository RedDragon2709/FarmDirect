import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Image, StatusBar, ScrollView, Modal, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";
import { addToCart, getCartCount, subscribeToCart } from "../../src/cart";


const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  all:       { label: "All",     icon: "🧺" },
  vegetable: { label: "Veggies", icon: "🥬" },
  fruit:     { label: "Fruits",  icon: "🍎" },
  grain:     { label: "Grains",  icon: "🌾" },
  dairy:     { label: "Dairy",   icon: "🥛" },
  herb:      { label: "Herbs",   icon: "🌿" },
  other:     { label: "Others",  icon: "📦" },
};
const CATEGORIES = ["all", "vegetable", "fruit", "grain", "dairy", "herb", "other"];

const BANNERS = [
  { id: "1", emoji: "🌱", title: "Farm-Fresh Today", sub: "Harvested within 12 hours", color: "#0A7A40" },
  { id: "2", emoji: "⚡", title: "Quick Delivery",   sub: "Get produce in under 30 min", color: "#F59E0B" },
  { id: "3", emoji: "🤝", title: "Zero Middlemen",  sub: "100% direct from farmers", color: "#7C3AED" },
];

export default function BrowseScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  // Address onboarding
  const [addressModal, setAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savedAddress, setSavedAddress] = useState("Set delivery address ▾");

  // Cart State
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    getCartCount().then(setCartCount);
    return subscribeToCart(() => {
      getCartCount().then(setCartCount);
    });
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    checkAddressOnboarding();
  }, []));

  const checkAddressOnboarding = async () => {
    try {
      const addr = await AsyncStorage.getItem("delivery_address");
      if (!addr) {
        setTimeout(() => setAddressModal(true), 600);
      } else {
        setSavedAddress(addr.length > 30 ? addr.slice(0, 30) + "…" : addr);
      }
    } catch {}
  };

  const saveAddress = async () => {
    if (!addressInput.trim()) {
      Alert.alert("Enter Address", "Please enter your delivery address.");
      return;
    }
    await AsyncStorage.setItem("delivery_address", addressInput.trim());
    setSavedAddress(addressInput.length > 30 ? addressInput.slice(0, 30) + "…" : addressInput);
    setAddressModal(false);
  };

  const handleAddToCart = async (product: any) => {
    try {
      await addToCart(product, 1);
      Alert.alert(
        "Added to Cart! 🛒",
        `1 unit of "${product.name}" added to your shopping cart.`,
        [
          { text: "Keep Shopping", style: "cancel" },
          { text: "View Cart", onPress: () => router.push("/consumer/cart") }
        ]
      );
    } catch {
      Alert.alert("Error", "Could not add item to cart.");
    }
  };

  const load = async (s = search, c = category) => {
    try {
      const data: any = await api.listProducts(s || undefined, c === "all" ? undefined : c);
      setProducts(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleSearch = (t: string) => { setSearch(t); load(t, category); };
  const handleCategory = (c: string) => { setCategory(c); load(search, c); };

  const getDummyDelivery = (id: string) => {
    const mins = (id.charCodeAt(id.length - 1) % 15) + 15;
    return `${mins} min`;
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFD13B" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD13B" />

      {/* ---------- FIXED HEADER ---------- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Location */}
          <TouchableOpacity style={styles.locationRow} onPress={() => setAddressModal(true)}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={13} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Delivering to ▾</Text>
              <Text style={styles.locationSub} numberOfLines={1}>{savedAddress}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartHeaderBtn}
            onPress={() => router.push("/consumer/cart")}
          >
            <View style={styles.profileAvatar}>
              <Ionicons name="cart" size={18} color={theme.colors.primary} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push("/consumer/profile")}
          >
            <View style={styles.profileAvatar}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder='Search "tomatoes", "organic milk"…'
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor={theme.colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.promoStrip}>
          <Ionicons name="flash" size={12} color="#92400E" />
          <Text style={styles.promoText}>  FARM FRESH · Harvested within 12 hours</Text>
        </View>
      </View>

      {/* ---------- LIST ---------- */}
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Banner carousel */}
              <ScrollView
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                ref={bannerScrollRef}
                onScroll={(e) => setActiveBanner(Math.round(e.nativeEvent.contentOffset.x / (bannerScrollRef.current ? 1 : 1)))}
                scrollEventThrottle={16}
                style={{ marginTop: 12 }}
              >
                {BANNERS.map((b) => (
                  <View key={b.id} style={[styles.banner, { backgroundColor: b.color }]}>
                    <View style={styles.bannerOrb} />
                    <Text style={styles.bannerEmoji}>{b.emoji}</Text>
                    <View>
                      <Text style={styles.bannerTitle}>{b.title}</Text>
                      <Text style={styles.bannerSub}>{b.sub}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Category chips */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
                contentContainerStyle={{ paddingHorizontal: 14 }}
              >
                {CATEGORIES.map((cat) => {
                  const info = CATEGORY_MAP[cat];
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => handleCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipEmoji}>{info.icon}</Text>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionHead}>
                  {category === "all"
                    ? "🌟 All Fresh Produce"
                    : `${CATEGORY_MAP[category].icon} ${CATEGORY_MAP[category].label}`}
                </Text>
                <Text style={styles.sectionCount}>{products.length} items</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🌱</Text>
              <Text style={styles.emptyTitle}>No produce found</Text>
              <Text style={styles.emptySub}>Try a different category or check back soon!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.93}
              >
                <View style={styles.freshTag}>
                  <Text style={styles.freshTagText}>🥬 Fresh</Text>
                </View>
                <View style={styles.imageBox}>
                  {item.image_base64 ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                      style={styles.productImage}
                    />
                  ) : (
                    <Text style={{ fontSize: 44 }}>🌿</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.cardBody}>
                <TouchableOpacity
                  onPress={() => router.push(`/product/${item.id}`)}
                  activeOpacity={0.93}
                >
                  <View style={styles.deliveryPill}>
                    <Ionicons name="flash" size={9} color={theme.colors.secondary} />
                    <Text style={styles.deliveryPillText}> {getDummyDelivery(item.id)}</Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.farmerName} numberOfLines={1}>🧑‍🌾 {item.farmer_name}</Text>
                </TouchableOpacity>
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => router.push(`/product/${item.id}`)}
                    activeOpacity={0.93}
                    style={{ flex: 1 }}
                  >
                    <Text style={styles.price}>₹{item.price}</Text>
                    <Text style={styles.unit}>/{item.unit}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>ADD</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      </View>

      {/* ---------- ADDRESS ONBOARDING MODAL ---------- */}
      <Modal visible={addressModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setAddressModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="location" size={26} color={theme.colors.primary} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Where should we deliver?</Text>
            <Text style={styles.modalSub}>
              Enter your home or office address so we know where to deliver your fresh produce.
            </Text>

            <View style={styles.addressInputWrap}>
              <Ionicons name="home-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.addressTextInput}
                placeholder="House no., Building, Street, Area…"
                value={addressInput}
                onChangeText={setAddressInput}
                multiline
                numberOfLines={2}
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
              />
            </View>

            <View style={styles.quickAddresses}>
              <Text style={styles.quickLabel}>Quick fill:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["Home", "Office", "Parents' Home", "Others"].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quickChip}
                    onPress={() => setAddressInput(addressInput ? addressInput + " " + q : q)}
                  >
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.saveAddrBtn} onPress={saveAddress} activeOpacity={0.88}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveAddrBtnText}> Save Address & Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => setAddressModal(false)}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFD13B",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...theme.shadow.sm,
    zIndex: 10,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  locationRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  locationIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  locationTitle: { fontSize: 12, fontWeight: "800", color: "#1E293B" },
  locationSub: { fontSize: 11, color: "#475569", fontWeight: "500", maxWidth: 200 },
  profileBtn: { marginLeft: 8 },
  profileAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)",
  },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 13,
    paddingHorizontal: 13, height: 44,
    marginBottom: 9, ...theme.shadow.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, fontWeight: "500" },
  promoStrip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.38)",
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4,
    alignSelf: "flex-start",
  },
  promoText: { fontSize: 10, color: "#78350F", fontWeight: "800", letterSpacing: 0.3 },

  banner: {
    width: 320, marginRight: 10, borderRadius: 16, padding: 18,
    flexDirection: "row", alignItems: "center",
    overflow: "hidden", ...theme.shadow.md,
    marginLeft: 4,
  },
  bannerOrb: {
    position: "absolute", top: -20, right: -20,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  bannerEmoji: { fontSize: 40, marginRight: 14 },
  bannerTitle: { fontSize: 16, fontWeight: "900", color: "#fff", marginBottom: 2 },
  bannerSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  chip: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
    marginRight: 8, backgroundColor: "#fff", ...theme.shadow.xs,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipEmoji: { marginRight: 4, fontSize: 14 },
  chipText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  sectionHeadRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14,
    marginTop: 14, marginBottom: 10,
  },
  sectionHead: { fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary },
  sectionCount: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" },

  grid: { paddingHorizontal: 10, paddingBottom: 30 },
  row: { justifyContent: "space-between", marginBottom: 10 },

  card: {
    width: "48.5%", backgroundColor: "#fff",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: theme.colors.borderLight,
    position: "relative", ...theme.shadow.sm,
  },
  freshTag: {
    position: "absolute", top: 7, left: 7,
    backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 5, zIndex: 10,
  },
  freshTagText: { fontSize: 9, color: "#059669", fontWeight: "800" },
  imageBox: {
    height: 110, backgroundColor: "#F8FAFC",
    alignItems: "center", justifyContent: "center", paddingTop: 16,
  },
  productImage: { width: "88%", height: "90%", resizeMode: "contain" },
  cardBody: { padding: 9 },
  deliveryPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.secondarySoft,
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: "flex-start", marginBottom: 4,
  },
  deliveryPillText: { fontSize: 9, color: theme.colors.secondaryDark, fontWeight: "700" },
  productName: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 2 },
  farmerName: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 7 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 15, fontWeight: "900", color: theme.colors.textPrimary },
  unit: { fontSize: 9, color: theme.colors.textMuted, fontWeight: "600", marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    ...theme.shadow.xs,
  },
  addBtnText: { color: "#fff", fontSize: 11, fontWeight: "800", marginLeft: 2 },

  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 6, marginTop: 10 },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    ...theme.shadow.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center", marginBottom: 18,
  },
  modalIconRow: { alignItems: "center", marginBottom: 14 },
  modalIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: theme.colors.primaryLight + "30",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 8 },
  modalSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  addressInputWrap: {
    flexDirection: "row", alignItems: "flex-start",
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderRadius: 14, backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  addressTextInput: {
    flex: 1, fontSize: 15, color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  quickAddresses: { marginBottom: 20 },
  quickLabel: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 8 },
  quickChip: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    marginRight: 8, backgroundColor: "#fff",
  },
  quickChipText: { fontSize: 12, fontWeight: "600", color: theme.colors.textSecondary },
  saveAddrBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 14,
    height: 52, flexDirection: "row", alignItems: "center",
    justifyContent: "center", ...theme.shadow.xl, marginBottom: 12,
  },
  saveAddrBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  skipBtn: { alignItems: "center", paddingVertical: 6 },
  skipText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: "600" },
  
  cartHeaderBtn: { marginLeft: 8 },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  }
});
