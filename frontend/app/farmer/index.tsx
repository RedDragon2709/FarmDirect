import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Image, Animated, Modal, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";
import { ThemedEmoji, EmojiName } from "../../src/components/ThemedEmoji";

const CATEGORIES = ["vegetable", "fruit", "grain", "dairy", "herb", "other"];
const UNITS = ["kg", "g", "litre", "dozen", "piece", "bunch"];
const CAT_ICONS: Record<string, EmojiName> = {
  vegetable: "vegetable", fruit: "fruit", grain: "grain",
  dairy: "dairy", herb: "herb", other: "other",
};

const FARM_TYPES = [
  { id: "organic",  label: "Organic",      emoji: "sprout" as EmojiName },
  { id: "mixed",    label: "Mixed",        emoji: "grain" as EmojiName },
  { id: "dairy",    label: "Dairy Farm",   emoji: "cow" as EmojiName },
  { id: "poultry",  label: "Poultry",      emoji: "poultry" as EmojiName },
  { id: "orchard",  label: "Orchard",      emoji: "fruit" as EmojiName },
  { id: "other",    label: "Other",        emoji: "home" as EmojiName },
];

export default function FarmerDashboardScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("vegetable");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("kg");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Farmer");
  const [stats, setStats] = useState({ products: 0, pending: 0 });
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmType, setFarmType] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("user").then((u) => {
      if (u) {
        const parsed = JSON.parse(u);
        setUserName(parsed.name?.split(" ")[0] || "Farmer");
      }
    });
    // Load existing farm details to prefill the onboarding form
    AsyncStorage.multiGet(["farm_name", "farm_location", "farm_type", "farm_size"]).then((vals) => {
      const map = Object.fromEntries(vals);
      setFarmName(map["farm_name"] || "");
      setFarmLocation(map["farm_location"] || "");
      setFarmType(map["farm_type"] || "");
      setFarmSize(map["farm_size"] || "");
    });
    checkOnboarding();
    loadStats();

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []));

  const checkOnboarding = async () => {
    try {
      const user: any = await api.me();
      if (user && user.farm_name) {
        // Already onboarded on DB: save locally and skip popup
        await AsyncStorage.multiSet([
          ["farmer_onboarded", "true"],
          ["farm_name", user.farm_name],
          ["farm_location", user.farm_location || ""],
          ["farm_type", user.farm_type || ""],
          ["farm_size", user.farm_size || ""],
        ]);
        return;
      }
    } catch {}

    const done = await AsyncStorage.getItem("farmer_onboarded");
    if (!done) setTimeout(() => setShowOnboarding(true), 700);
  };

  const loadStats = async () => {
    try {
      const [prods, orders]: any = await Promise.all([api.myProducts(), api.farmerOrders()]);
      const pending = orders.filter((o: any) => ["placed", "confirmed"].includes(o.status)).length;
      setStats({ products: prods.length, pending });
    } catch {}
  };

  const saveOnboarding = async () => {
    if (!farmName.trim()) { Alert.alert("Farm Name", "Please enter your farm name."); return; }
    if (!farmLocation.trim()) { Alert.alert("Location", "Please enter your farm location."); return; }
    if (!farmType) { Alert.alert("Farm Type", "Please select your farm type."); return; }
    setOnboardingLoading(true);
    try {
      // 1. Save to DB
      await api.updateProfile({
        farm_name: farmName.trim(),
        farm_location: farmLocation.trim(),
        farm_type: farmType,
        farm_size: farmSize.trim(),
      });

      // 2. Save locally
      await AsyncStorage.multiSet([
        ["farmer_onboarded", "true"],
        ["farm_name", farmName.trim()],
        ["farm_location", farmLocation.trim()],
        ["farm_type", farmType],
        ["farm_size", farmSize.trim()],
      ]);

      setShowOnboarding(false);
      Alert.alert("Welcome aboard!", `Your farm "${farmName}" is now registered. Start listing your produce!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save farm details.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission Denied", "Allow gallery access to add product photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, quality: 0.65,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || "");
    }
  };

  const pickImageFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission Denied", "Allow camera access to take a product photo."); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, quality: 0.65,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || "");
    }
  };

  const showImageOptions = () => {
    Alert.alert("Product Photo", "Choose a photo source", [
      { text: "Take Photo", onPress: pickImageFromCamera },
      { text: "Choose from Gallery", onPress: pickImageFromGallery },
      { text: "Remove Photo", style: "destructive", onPress: () => { setImageUri(""); setImageBase64(""); } },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    if (!name || !price || !stock) {
      Alert.alert("Missing Fields", "Name, price, and stock are required."); return;
    }
    setLoading(true);
    try {
      await api.createProduct({ name, category, price: parseFloat(price), stock: parseInt(stock), unit, description, image_base64: imageBase64 });
      Alert.alert("Listed!", `"${name}" is now live on the marketplace.`);
      setName(""); setPrice(""); setStock(""); setDescription(""); setImageBase64(""); setImageUri("");
      loadStats();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Dashboard Header */}
        <View style={styles.dashHeader}>
          <View style={styles.dashOrb1} />
          <View style={styles.dashOrb2} />
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.greetRow}>
              <View>
                <Text style={styles.greetText}>{greeting}, {userName}!</Text>
                <Text style={styles.greetSub}>Your farm dashboard</Text>
              </View>
              <View style={styles.greetAvatar}>
                <ThemedEmoji name="farmer" size={22} />
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.products}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, stats.pending > 0 && { color: theme.colors.secondaryLight }]}>
                  {stats.pending}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>4.8★</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </Animated.View>
          <View style={styles.dashWave} />
        </View>

        {/* Form */}
        <Animated.View style={[styles.formSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionHeading}>List New Produce</Text>

          <Text style={styles.label}>Product Name *</Text>
          <View style={[styles.inputWrap, focusedInput === "name" && styles.inputFocused]}>
            <Ionicons name="leaf-outline" size={17} color={focusedInput === "name" ? theme.colors.primary : theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Fresh Tomatoes"
              placeholderTextColor={theme.colors.textMuted} onFocus={() => setFocusedInput("name")} onBlur={() => setFocusedInput(null)} />
          </View>

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)} activeOpacity={0.8}>
                <ThemedEmoji name={CAT_ICONS[cat]} inline size={13} color={category === cat ? "#fff" : undefined} />
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>  {cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Price (₹) *</Text>
              <View style={[styles.inputWrap, focusedInput === "price" && styles.inputFocused]}>
                <Text style={[styles.currencySymbol, focusedInput === "price" && { color: theme.colors.primary }]}>₹</Text>
                <TextInput style={[styles.input, { flex: 1 }]} value={price} onChangeText={setPrice}
                  keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.colors.textMuted}
                  onFocus={() => setFocusedInput("price")} onBlur={() => setFocusedInput(null)} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stock *</Text>
              <View style={[styles.inputWrap, focusedInput === "stock" && styles.inputFocused]}>
                <TextInput style={styles.input} value={stock} onChangeText={setStock}
                  keyboardType="number-pad" placeholder="Qty" placeholderTextColor={theme.colors.textMuted}
                  onFocus={() => setFocusedInput("stock")} onBlur={() => setFocusedInput(null)} />
              </View>
            </View>
          </View>

          <Text style={styles.label}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {UNITS.map((u) => (
              <TouchableOpacity key={u} style={[styles.chip, unit === u && styles.chipActiveSecondary]} onPress={() => setUnit(u)} activeOpacity={0.8}>
                <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputWrap, { height: "auto" as any, paddingVertical: 10, alignItems: "flex-start" }, focusedInput === "desc" && styles.inputFocused]}>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]} value={description} onChangeText={setDescription}
              multiline placeholder="e.g. Freshly harvested, pesticide-free" placeholderTextColor={theme.colors.textMuted}
              onFocus={() => setFocusedInput("desc")} onBlur={() => setFocusedInput(null)} />
          </View>

          {/* Photo with camera option */}
          <Text style={styles.label}>Product Photo</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.82}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={styles.changePhotoOverlay}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePickerEmpty}>
                <View style={styles.imagePickerIconRow}>
                  <View style={styles.imageActionBtn}>
                    <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.imageActionLabel}>Camera</Text>
                  </View>
                  <View style={[styles.imageActionBtn, { borderLeftWidth: 1, borderLeftColor: theme.colors.border }]}>
                    <Ionicons name="images-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.imageActionLabel}>Gallery</Text>
                  </View>
                </View>
                <Text style={styles.imagePickerHint}>Tap to add a photo of your produce</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.75 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.88}>
            {loading
              ? <Text style={styles.submitBtnText}>Listing…</Text>
              : <><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={[styles.submitBtnText, { marginLeft: 8 }]}>List on Marketplace</Text></>}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* ─── ONBOARDING MODAL ─── */}
      <Modal visible={showOnboarding} animationType="slide" transparent>
        <View style={styles.onboardOverlay}>
          <View style={styles.onboardSheet}>
            <View style={styles.onboardHandle} />
            <View style={styles.onboardIconRow}>
              <View style={styles.onboardIcon}><ThemedEmoji name="welcome" size={32} /></View>
            </View>
            <Text style={styles.onboardTitle}>Welcome, Farmer!</Text>
            <Text style={styles.onboardSub}>
              Tell us a bit about your farm so buyers can discover and trust you.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {[
                { key: "farmName", label: "Farm Name *", placeholder: "e.g. Ravi's Green Farm", val: farmName, setter: setFarmName, icon: "leaf-outline" },
                { key: "farmLocation", label: "Farm Location *", placeholder: "Village, District, State", val: farmLocation, setter: setFarmLocation, icon: "location-outline" },
                { key: "farmSize", label: "Farm Size", placeholder: "e.g. 2 acres, 500 sq m", val: farmSize, setter: setFarmSize, icon: "resize-outline" },
              ].map((f) => (
                <View key={f.key}>
                  <Text style={styles.onboardLabel}>{f.label}</Text>
                  <View style={styles.onboardInputWrap}>
                    <Ionicons name={f.icon as any} size={17} color={theme.colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.onboardInput}
                      value={f.val}
                      onChangeText={f.setter}
                      placeholder={f.placeholder}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              ))}

              <Text style={styles.onboardLabel}>Farm Type *</Text>
              <View style={styles.farmTypeGrid}>
                {FARM_TYPES.map((ft) => (
                  <TouchableOpacity
                    key={ft.id}
                    style={[styles.farmTypeChip, farmType === ft.id && styles.farmTypeChipActive]}
                    onPress={() => setFarmType(ft.id)}
                    activeOpacity={0.8}
                  >
                    <ThemedEmoji name={ft.emoji} inline size={18} color={farmType === ft.id ? theme.colors.primary : undefined} />
                    <Text style={[styles.farmTypeLabel, farmType === ft.id && { color: theme.colors.primary }]}>{ft.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.verificationNote}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                <Text style={styles.verificationText}>
                  {"  "}Your details help buyers verify and trust your produce. We keep this secure.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.onboardBtn, onboardingLoading && { opacity: 0.7 }]}
              onPress={saveOnboarding}
              disabled={onboardingLoading}
              activeOpacity={0.88}
            >
              <Text style={styles.onboardBtnText}>
                {onboardingLoading ? "Saving…" : "Register My Farm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dashHeader: {
    backgroundColor: theme.colors.primary,
    paddingTop: 16, paddingBottom: 10, paddingHorizontal: 20, overflow: "hidden",
  },
  dashOrb1: { position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)" },
  dashOrb2: { position: "absolute", top: 60, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(245,158,11,0.09)" },
  greetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greetText: { fontSize: 20, fontWeight: "900", color: "#fff", marginBottom: 3 },
  greetSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  greetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 17, fontWeight: "900", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.72)", fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.18)", marginHorizontal: 4 },
  dashWave: { position: "absolute", bottom: -2, left: 0, right: 0, height: 28, backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  formSection: { paddingHorizontal: 16, paddingTop: 10 },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 12, marginTop: 6 },
  label: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8, marginTop: 14 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: "#fff", paddingHorizontal: 14, height: 50, ...theme.shadow.xs },
  inputFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  inputIcon: { marginRight: 10 },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: theme.colors.textMuted, marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },
  row: { flexDirection: "row" },
  chip: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipActiveSecondary: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },

  imagePicker: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 14, height: 120, overflow: "hidden", backgroundColor: "#fff", ...theme.shadow.xs },
  imagePickerEmpty: { flex: 1 },
  imagePickerIconRow: { flexDirection: "row", flex: 1 },
  imageActionBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  imageActionLabel: { fontSize: 11, fontWeight: "700", color: theme.colors.primary },
  imagePickerHint: { fontSize: 11, color: theme.colors.textMuted, textAlign: "center", paddingBottom: 8 },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  changePhotoOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 7,
  },
  changePhotoText: { color: "#fff", fontSize: 12, fontWeight: "700", marginLeft: 6 },

  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24, ...theme.shadow.xl },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  // Onboarding Modal
  onboardOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  onboardSheet: { backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40, maxHeight: "90%", ...theme.shadow.lg },
  onboardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 16 },
  onboardIconRow: { alignItems: "center", marginBottom: 10 },
  onboardIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.primaryLight + "30" },
  onboardTitle: { fontSize: 22, fontWeight: "900", color: theme.colors.textPrimary, textAlign: "center", marginBottom: 6 },
  onboardSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  onboardLabel: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8, marginTop: 14 },
  onboardInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 14, height: 48, ...theme.shadow.xs },
  onboardInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  farmTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  farmTypeChip: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff", gap: 6 },
  farmTypeChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  farmTypeLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },
  verificationNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: theme.colors.primarySoft, borderRadius: 10, padding: 12, marginBottom: 6 },
  verificationText: { flex: 1, fontSize: 12, color: theme.colors.primaryDark, lineHeight: 18 },
  onboardBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 14, ...theme.shadow.xl },
  onboardBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
