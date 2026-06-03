import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

// ── Data from ML preprocessing ──────────────────────────────────────────────

const COMMODITIES = [
  "Tomato", "Onion", "Potato", "Brinjal", "Cabbage", "Cauliflower",
  "Carrot", "Beans", "Green Chilli", "Bhindi", "Pumpkin", "Bottle Gourd",
  "Bitter Gourd", "Cucumber", "Peas Wet", "Garlic", "Ginger",
  "Banana", "Apple", "Mango", "Orange", "Papaya", "Pomegranate",
  "Guava", "Water Melon", "Pineapple", "Mosambi", "Lemon", "Sapota", "Grapes",
];

const STATES = [
  "Karnataka", "Maharashtra", "Tamil Nadu", "Uttar Pradesh",
  "Gujarat", "Rajasthan", "Madhya Pradesh", "West Bengal",
  "Andhra Pradesh", "Kerala", "Bihar", "Punjab",
  "Haryana", "Telangana", "Odisha",
];

const MONTHS = [
  { label: "Jan", value: 1 }, { label: "Feb", value: 2 },
  { label: "Mar", value: 3 }, { label: "Apr", value: 4 },
  { label: "May", value: 5 }, { label: "Jun", value: 6 },
  { label: "Jul", value: 7 }, { label: "Aug", value: 8 },
  { label: "Sep", value: 9 }, { label: "Oct", value: 10 },
  { label: "Nov", value: 11 }, { label: "Dec", value: 12 },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface PredictionResult {
  commodity: string;
  state: string;
  district: string;
  suggested_min: number;
  suggested_max: number;
  suggested_modal: number;
  confidence: string;
  used_fallback: boolean;
  note: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const getSeasonIcon = (m: number): { name: keyof typeof Ionicons.glyphMap; label: string } => {
  if ([6, 7, 8, 9, 10].includes(m)) return { name: "rainy-outline", label: "Kharif" };
  if ([11, 12, 1, 2, 3].includes(m)) return { name: "snow-outline", label: "Rabi" };
  return { name: "sunny-outline", label: "Zaid" };
};

// ── Screen ───────────────────────────────────────────────────────────────────

export default function PricePredictScreen() {
  const [commodity, setCommodity] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [searchCommodity, setSearchCommodity] = useState("");
  const [searchState, setSearchState] = useState("");

  const filteredCommodities = COMMODITIES.filter((c) =>
    c.toLowerCase().includes(searchCommodity.toLowerCase())
  );

  const filteredStates = STATES.filter((s) =>
    s.toLowerCase().includes(searchState.toLowerCase())
  );

  const handlePredict = async () => {
    if (!commodity) {
      Alert.alert("Missing Field", "Please select a commodity");
      return;
    }
    if (!state) {
      Alert.alert("Missing Field", "Please select a state");
      return;
    }
    if (!district.trim()) {
      Alert.alert("Missing Field", "Please enter a district");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data: PredictionResult = await api.predictPrice({
        commodity,
        state,
        district: district.trim(),
        month,
      });
      setResult(data);
    } catch (e: any) {
      Alert.alert("Prediction Failed", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return theme.colors.success;
      case "medium": return theme.colors.warning;
      case "low": return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  const season = getSeasonIcon(month);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Ionicons name="bar-chart" size={40} color="#fff" style={{ marginBottom: 8 }} />
        <Text style={styles.headerTitle}>AI Price Predictor</Text>
        <Text style={styles.headerSubtitle}>
          Get ML-powered price suggestions based on mandi data across India
        </Text>
      </View>

      {/* Commodity Selection */}
      <Text style={styles.sectionTitle}>Select Commodity</Text>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search commodities..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchCommodity}
          onChangeText={setSearchCommodity}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {filteredCommodities.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, commodity === c && styles.chipActive]}
            onPress={() => setCommodity(c)}
          >
            <Text
              style={[
                styles.chipText,
                commodity === c && styles.chipTextActive,
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* State Selection */}
      <Text style={styles.sectionTitle}>Select State</Text>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search states..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchState}
          onChangeText={setSearchState}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {filteredStates.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, state === s && styles.chipActive]}
            onPress={() => setState(s)}
          >
            <Text
              style={[styles.chipText, state === s && styles.chipTextActive]}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* District Input */}
      <Text style={styles.label}>District Name *</Text>
      <TextInput
        style={styles.input}
        value={district}
        onChangeText={setDistrict}
        placeholder="e.g. Bangalore, Pune, Lucknow"
        placeholderTextColor={theme.colors.textMuted}
      />

      {/* Month Selection */}
      <View style={styles.monthTitleRow}>
        <Text style={styles.sectionTitle}>Select Month</Text>
        <View style={styles.seasonBadge}>
          <Ionicons name={season.name} size={14} color={theme.colors.textMuted} />
          <Text style={styles.seasonBadgeText}> {season.label}</Text>
        </View>
      </View>
      <View style={styles.monthGrid}>
        {MONTHS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[
              styles.monthChip,
              month === m.value && styles.monthChipActive,
            ]}
            onPress={() => setMonth(m.value)}
          >
            <Text
              style={[
                styles.monthChipText,
                month === m.value && styles.monthChipTextActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Predict Button */}
      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.7 }]}
        onPress={handlePredict}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <View style={styles.btnLoading}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.btnText}>  Analyzing...</Text>
          </View>
        ) : (
          <View style={styles.btnLoading}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.btnText}>  Get Price Prediction</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Results Card */}
      {result && (
        <View style={styles.resultCard}>
          {/* Result Header */}
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleRow}>
              <Ionicons name="bulb-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.resultTitle}>
                {" "}Suggested Price for {result.commodity}
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: getConfidenceColor(result.confidence) },
              ]}
            >
              <View style={styles.confidenceInner}>
                <Ionicons
                  name={result.confidence === "high" ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.confidenceText}>
                  {" "}{result.confidence.toUpperCase()} confidence
                </Text>
              </View>
            </View>
          </View>

          {/* Price Display */}
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Min Price</Text>
              <Text style={[styles.priceValue, { color: theme.colors.warning }]}>
                ₹{result.suggested_min.toFixed(2)}
              </Text>
              <Text style={styles.priceUnit}>/kg</Text>
            </View>

            <View style={[styles.priceBox, styles.priceBoxHighlight]}>
              <Text style={[styles.priceLabel, { color: "rgba(255,255,255,0.8)" }]}>
                Best Price
              </Text>
              <Text style={[styles.priceValue, { color: "#fff", fontSize: 28 }]}>
                ₹{result.suggested_modal.toFixed(2)}
              </Text>
              <Text style={[styles.priceUnit, { color: "rgba(255,255,255,0.7)" }]}>
                /kg
              </Text>
            </View>

            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Max Price</Text>
              <Text style={[styles.priceValue, { color: theme.colors.success }]}>
                ₹{result.suggested_max.toFixed(2)}
              </Text>
              <Text style={styles.priceUnit}>/kg</Text>
            </View>
          </View>

          {/* Location Info */}
          <View style={styles.resultMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}> {result.district}, {result.state}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>
                {" "}{MONTHS.find((m) => m.value === month)?.label} · {season.label}
              </Text>
            </View>
          </View>

          {/* Note */}
          {result.note && (
            <View style={styles.noteBox}>
              <View style={styles.noteInner}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primaryDark} />
                <Text style={styles.noteText}> {result.note}</Text>
              </View>
            </View>
          )}

          {/* Fallback Warning */}
          {result.used_fallback && (
            <View style={styles.fallbackBox}>
              <View style={styles.fallbackInner}>
                <Ionicons name="warning-outline" size={16} color="#E65100" />
                <Text style={styles.fallbackText}>
                  {" "}Exact location data was not available. Price is estimated from
                  overall commodity trends.
                </Text>
              </View>
            </View>
          )}

          {/* Tip */}
          <View style={styles.tipBox}>
            <View style={styles.tipInner}>
              <Ionicons name="bulb-outline" size={16} color={theme.colors.secondary} />
              <Text style={styles.tipText}>
                {" "}<Text style={{ fontWeight: "700" }}>Tip:</Text> Set your product
                price close to the "Best Price" for maximum sales while staying
                competitive in your area.
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },

  // Header Card
  headerCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    ...theme.shadow.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 19,
  },

  // Sections
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 16,
  },
  monthTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
  },
  seasonBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  seasonBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },

  // Search
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },

  // Chips
  chipScroll: {
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
  },

  // Inputs
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: "#fff",
  },

  // Month Grid
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthChip: {
    width: "22%",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  monthChipActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  monthChipTextActive: {
    color: "#fff",
  },

  // Button
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnLoading: {
    flexDirection: "row",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Result Card
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginTop: 20,
    ...theme.shadow.md,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  confidenceBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  confidenceInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  confidenceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Price Display
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  priceBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 3,
  },
  priceBoxHighlight: {
    backgroundColor: theme.colors.primary,
    ...theme.shadow.sm,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  priceUnit: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  // Meta
  resultMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  // Note
  noteBox: {
    backgroundColor: "#E8F5E9",
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    marginTop: 8,
  },
  noteInner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    lineHeight: 18,
    flex: 1,
  },

  // Fallback Warning
  fallbackBox: {
    backgroundColor: "#FFF3E0",
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    marginTop: 8,
  },
  fallbackInner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  fallbackText: {
    fontSize: 12,
    color: "#E65100",
    lineHeight: 18,
    flex: 1,
  },

  // Tip
  tipBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  tipInner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
});
