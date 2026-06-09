import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Dimensions, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const { width } = Dimensions.get("window");

// Popular quick-selects — just top ones shown as chips, rest typed
const QUICK_PICKS = ["Tomato", "Onion", "Potato", "Carrot", "Cauliflower", "Cabbage", "Beans", "Brinjal", "Mango", "Banana", "Apple"];

const STATES = [
  "Karnataka", "Maharashtra", "Tamil Nadu", "Uttar Pradesh",
  "Gujarat", "Rajasthan", "Madhya Pradesh", "West Bengal",
  "Andhra Pradesh", "Kerala", "Bihar", "Punjab",
  "Haryana", "Telangana", "Odisha", "Assam", "Jharkhand", "Chhattisgarh",
];

const MONTHS = [
  { label: "Jan", value: 1 }, { label: "Feb", value: 2 }, { label: "Mar", value: 3 },
  { label: "Apr", value: 4 }, { label: "May", value: 5 }, { label: "Jun", value: 6 },
  { label: "Jul", value: 7 }, { label: "Aug", value: 8 }, { label: "Sep", value: 9 },
  { label: "Oct", value: 10 }, { label: "Nov", value: 11 }, { label: "Dec", value: 12 },
];

const getSeasonInfo = (m: number) => {
  if ([6,7,8,9,10].includes(m)) return { emoji: "🌧️", label: "Kharif", color: "#3B82F6" };
  if ([11,12,1,2,3].includes(m)) return { emoji: "❄️", label: "Rabi", color: "#8B5CF6" };
  return { emoji: "☀️", label: "Zaid", color: "#F59E0B" };
};

const CONFIDENCE_COLORS = {
  high:   { text: theme.colors.success, bg: theme.colors.successSoft },
  medium: { text: "#D97706", bg: "#FFFBEB" },
  low:    { text: theme.colors.error,   bg: theme.colors.errorSoft },
};

interface PredictionResult {
  commodity: string; state: string; district: string;
  suggested_min: number; suggested_max: number; suggested_modal: number;
  confidence: string; used_fallback: boolean; note: string;
}

export default function PricePredictScreen() {
  const [commodity, setCommodity] = useState("");
  const [commodityInput, setCommodityInput] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const filteredStates = STATES.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase()));
  const season = getSeasonInfo(month);

  const handlePredict = async () => {
    const finalCommodity = commodity || commodityInput.trim();
    if (!finalCommodity) { Alert.alert("Enter Commodity", "Type or select a crop/vegetable name."); return; }
    if (!state) { Alert.alert("Select State", "Please choose a state."); return; }
    if (!district.trim()) { Alert.alert("Enter District", "Please enter the district name."); return; }
    setLoading(true);
    setResult(null);
    try {
      const data: PredictionResult = await api.predictPrice({ commodity: finalCommodity, state, district: district.trim(), month });
      setResult(data);
    } catch (e: any) {
      Alert.alert("Prediction Failed", e.message || "ML service unavailable. Please try again.");
    } finally { setLoading(false); }
  };

  const confidenceColors = result
    ? (CONFIDENCE_COLORS[result.confidence as keyof typeof CONFIDENCE_COLORS] || CONFIDENCE_COLORS.low)
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.header}>
            <View style={styles.headerOrb1} />
            <View style={styles.headerOrb2} />
            <View style={styles.headerIcon}><Text style={{ fontSize: 30 }}>🤖</Text></View>
            <Text style={styles.headerTitle}>AI Price Predictor</Text>
            <Text style={styles.headerSub}>ML-powered mandi price suggestions across India</Text>
          </View>

          <View style={styles.body}>
            {/* Commodity — searchable text field */}
            <Text style={styles.sectionLabel}>Crop / Vegetable Name</Text>
            <View style={[styles.inputWrap, focusedInput === "commodity" && styles.inputFocused]}>
              <Ionicons name="search-outline" size={18} color={focusedInput === "commodity" ? theme.colors.primary : theme.colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={commodityInput}
                onChangeText={(t) => { setCommodityInput(t); setCommodity(""); }}
                placeholder="e.g. Tomato, Wheat, Mango…"
                placeholderTextColor={theme.colors.textMuted}
                onFocus={() => setFocusedInput("commodity")}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
              />
              {(commodityInput || commodity) && (
                <TouchableOpacity onPress={() => { setCommodity(""); setCommodityInput(""); }}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick pick chips */}
            <Text style={styles.quickLabel}>Quick pick:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {QUICK_PICKS.map((q) => {
                const active = commodity === q;
                return (
                  <TouchableOpacity
                    key={q}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                    onPress={() => { setCommodity(active ? "" : q); setCommodityInput(active ? "" : q); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.quickChipText, active && { color: "#fff" }]}>{q}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* State */}
            <Text style={styles.sectionLabel}>State</Text>
            <TouchableOpacity
              style={[styles.inputWrap, { justifyContent: "space-between" }]}
              onPress={() => setShowStateModal(true)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="location-outline" size={18} color={state ? theme.colors.primary : theme.colors.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.input, !state && { color: theme.colors.textMuted }]}>
                  {state || "Tap to choose state…"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* District */}
            <Text style={styles.sectionLabel}>District</Text>
            <View style={[styles.inputWrap, focusedInput === "district" && styles.inputFocused]}>
              <Ionicons name="business-outline" size={18} color={focusedInput === "district" ? theme.colors.primary : theme.colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={district}
                onChangeText={setDistrict}
                placeholder="e.g. Bangalore, Pune, Lucknow"
                placeholderTextColor={theme.colors.textMuted}
                onFocus={() => setFocusedInput("district")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Month */}
            <View style={styles.monthHeadRow}>
              <Text style={styles.sectionLabel}>Month</Text>
              <View style={[styles.seasonBadge, { backgroundColor: season.color + "18" }]}>
                <Text style={{ fontSize: 12 }}>{season.emoji}</Text>
                <Text style={[styles.seasonText, { color: season.color }]}>  {season.label}</Text>
              </View>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((m) => {
                const sel = month === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.monthChip, sel && { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary }]}
                    onPress={() => setMonth(m.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.monthChipText, sel && { color: "#fff" }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Predict button */}
            <TouchableOpacity style={[styles.predictBtn, loading && { opacity: 0.75 }]} onPress={handlePredict} disabled={loading} activeOpacity={0.88}>
              {loading
                ? <><ActivityIndicator size="small" color="#fff" /><Text style={[styles.predictBtnText, { marginLeft: 10 }]}>Analysing Data…</Text></>
                : <><Text style={{ fontSize: 16 }}>✨</Text><Text style={[styles.predictBtnText, { marginLeft: 8 }]}>Get Price Prediction</Text></>}
            </TouchableOpacity>

            {/* Result Card */}
            {result && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View>
                    <Text style={styles.resultTitle}>{result.commodity}</Text>
                    <Text style={styles.resultLocation}>📍 {result.district}, {result.state}</Text>
                  </View>
                  <View style={[styles.confidenceBadge, { backgroundColor: confidenceColors?.bg }]}>
                    <Text style={[styles.confidenceText, { color: confidenceColors?.text }]}>
                      {result.confidence.toUpperCase()} CONFIDENCE
                    </Text>
                  </View>
                </View>

                {/* Price range bars */}
                <View style={styles.priceBarsRow}>
                  <View style={styles.priceBarItem}>
                    <Text style={styles.priceBarLabel}>Min</Text>
                    <View style={[styles.priceBar, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={[styles.priceBarValue, { color: "#D97706" }]}>
                        ₹{result.suggested_min.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.priceBarItem, { flex: 1.4 }]}>
                    <Text style={[styles.priceBarLabel, { color: theme.colors.primary }]}>Best Price</Text>
                    <View style={[styles.priceBar, { backgroundColor: theme.colors.primarySoft, borderWidth: 2, borderColor: theme.colors.primary }]}>
                      <Text style={[styles.priceBarValue, { color: theme.colors.primary, fontSize: 20 }]}>
                        ₹{result.suggested_modal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.priceBarItem}>
                    <Text style={styles.priceBarLabel}>Max</Text>
                    <View style={[styles.priceBar, { backgroundColor: theme.colors.successSoft }]}>
                      <Text style={[styles.priceBarValue, { color: theme.colors.success }]}>
                        ₹{result.suggested_max.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.perKg}>
                  per kg · {MONTHS.find(m => m.value === month)?.label} · {season.label} Season
                </Text>

                {result.note ? (
                  <View style={styles.noteBox}>
                    <Ionicons name="information-circle-outline" size={14} color={theme.colors.primaryDark} />
                    <Text style={styles.noteText}>  {result.note}</Text>
                  </View>
                ) : null}

                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    💡 <Text style={{ fontWeight: "800" }}>Tip:</Text> Price near ₹{result.suggested_modal.toFixed(2)} for best conversion. Go higher for organic/premium quality.
                  </Text>
                </View>

                {result.used_fallback && (
                  <View style={styles.fallbackNote}>
                    <Ionicons name="alert-circle-outline" size={13} color="#92400E" />
                    <Text style={styles.fallbackText}>  Based on regional averages — local mandi data unavailable.</Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>

        {/* State picker bottom sheet */}
        {showStateModal && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowStateModal(false)} />
            <View style={styles.stateSheet}>
              <View style={styles.stateHandle} />
              <Text style={styles.stateSheetTitle}>Choose State</Text>
              <View style={styles.stateSearchWrap}>
                <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.stateSearchInput}
                  placeholder="Search state…"
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholderTextColor={theme.colors.textMuted}
                  autoFocus
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredStates.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.stateRow, state === s && styles.stateRowActive]}
                    onPress={() => { setState(s); setShowStateModal(false); setStateSearch(""); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location" size={14} color={state === s ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.stateRowText, state === s && { color: theme.colors.primary, fontWeight: "700" }]}> {s}</Text>
                    {state === s && <Ionicons name="checkmark" size={14} color={theme.colors.primary} style={{ marginLeft: "auto" }} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 16, paddingBottom: 24, paddingHorizontal: 24,
    alignItems: "center", overflow: "hidden",
  },
  headerOrb1: { position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.07)" },
  headerOrb2: { position: "absolute", bottom: 0, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(245,158,11,0.1)" },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff", marginBottom: 6 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", textAlign: "center", fontWeight: "500" },

  body: { padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 10, marginTop: 16 },

  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md, backgroundColor: "#fff",
    paddingHorizontal: 14, height: 50, ...theme.shadow.xs,
  },
  inputFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  input: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },

  quickLabel: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 8, marginTop: 8 },
  quickChip: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginRight: 8, backgroundColor: "#fff",
  },
  quickChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  quickChipText: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },

  monthHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 10 },
  seasonBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  seasonText: { fontSize: 12, fontWeight: "700" },

  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthChip: {
    width: (width - 80) / 6,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 8, paddingVertical: 10,
    alignItems: "center", backgroundColor: "#fff",
  },
  monthChipText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },

  predictBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    height: 54, flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginTop: 22, ...theme.shadow.xl,
  },
  predictBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  resultCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginTop: 20, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.md },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  resultTitle: { fontSize: 20, fontWeight: "900", color: theme.colors.textPrimary, marginBottom: 2 },
  resultLocation: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  confidenceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },

  priceBarsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  priceBarItem: { flex: 1, alignItems: "center" },
  priceBarLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 6, textTransform: "uppercase" },
  priceBar: { width: "100%", borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", minHeight: 56 },
  priceBarValue: { fontSize: 16, fontWeight: "900" },
  perKg: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "600", textAlign: "center", marginBottom: 12 },

  noteBox: { flexDirection: "row", backgroundColor: theme.colors.primarySoft, borderRadius: 10, padding: 10, marginBottom: 8, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 12, color: theme.colors.primaryDark, lineHeight: 18 },
  tipBox: { backgroundColor: theme.colors.secondarySoft, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.secondary, marginBottom: 8 },
  tipText: { fontSize: 12, color: theme.colors.secondaryDark, lineHeight: 18 },
  fallbackNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFBEB", borderRadius: 8, padding: 10 },
  fallbackText: { flex: 1, fontSize: 11, color: "#92400E", lineHeight: 16 },

  // State modal
  modalOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", zIndex: 100 },
  stateSheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "72%", padding: 20, ...theme.shadow.lg },
  stateHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: "center", marginBottom: 14 },
  stateSheetTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 12 },
  stateSearchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  stateSearchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  stateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  stateRowActive: { backgroundColor: theme.colors.primarySoft, borderRadius: 8, paddingHorizontal: 8 },
  stateRowText: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: "500", flex: 1 },
});
