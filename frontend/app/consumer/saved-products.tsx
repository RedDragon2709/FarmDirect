import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

export default function SavedProductsScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data: any = await api.getSaved();
      setSaved(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleUnsave = async (item: any) => {
    Alert.alert(
      "Remove from Saved?",
      `Remove "${item.product_name}" from your saved products?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: async () => {
            try {
              await api.toggleSaved({
                product_id: item.product_id,
                product_name: item.product_name,
                price: item.price,
                unit: item.unit,
                farmer_name: item.farmer_name,
                image_base64: item.image_base64,
              });
              setSaved((prev) => prev.filter((s) => s.product_id !== item.product_id));
            } catch {
              Alert.alert("Error", "Could not unsave product.");
            }
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Products</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{saved.length} items</Text>
        </View>
      </View>

      <FlatList
        data={saved}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-outline" size={44} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No saved products yet</Text>
            <Text style={styles.emptySub}>
              Tap the ♡ on any product to save it for later
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.replace("/consumer")}
              activeOpacity={0.88}
            >
              <Ionicons name="leaf" size={16} color="#fff" />
              <Text style={styles.browseBtnText}> Browse Produce</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/product/${item.product_id}`)}
            activeOpacity={0.88}
          >
            {/* Image */}
            <View style={styles.imageBox}>
              {item.image_base64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                  style={styles.image}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="leaf-outline" size={32} color={theme.colors.textMuted} />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.cardBody}>
              <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.farmerName}>
                <Ionicons name="person-outline" size={11} color={theme.colors.textMuted} /> {item.farmer_name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{item.price}</Text>
                <Text style={styles.unit}>/{item.unit}</Text>
              </View>
              <Text style={styles.savedDate}>
                Saved on {new Date(item.saved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.buyNowBtn}
                onPress={() => router.push(`/product/${item.product_id}`)}
                activeOpacity={0.85}
              >
                <Text style={styles.buyNowText}>Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unsaveBtn}
                onPress={() => handleUnsave(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: "#fff",
    ...theme.shadow.xs,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary },
  headerRight: {},
  headerCount: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...theme.shadow.sm,
  },
  imageBox: {
    width: 90, height: 90,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },

  cardBody: { flex: 1, padding: 12 },
  productName: { fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 2 },
  farmerName: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: { fontSize: 16, fontWeight: "900", color: theme.colors.primary },
  unit: { fontSize: 10, color: theme.colors.textMuted, marginLeft: 2, fontWeight: "600" },
  savedDate: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4, fontWeight: "500" },

  cardActions: {
    padding: 10,
    alignItems: "center",
    gap: 8,
  },
  buyNowBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...theme.shadow.xs,
  },
  buyNowText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  unsaveBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.errorSoft,
    alignItems: "center", justifyContent: "center",
  },

  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center", marginBottom: 24, lineHeight: 19 },
  browseBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    flexDirection: "row", alignItems: "center",
    ...theme.shadow.sm,
  },
  browseBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
