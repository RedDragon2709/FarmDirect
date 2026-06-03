import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const CATEGORIES = ["all", "vegetable", "fruit", "grain", "dairy", "herb", "other"];

export default function BrowseScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (s = search, c = category) => {
    try {
      const data: any = await api.listProducts(s || undefined, c === "all" ? undefined : c);
      setProducts(data);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleSearch = (text: string) => {
    setSearch(text);
    load(text, category);
  };

  const handleCategory = (cat: string) => {
    setCategory(cat);
    load(search, cat);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search produce..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        style={styles.catList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => handleCategory(item)}
          >
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Products grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ padding: 10, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No produce available</Text>
            <Text style={styles.emptySubtext}>Check back soon — farmers are listing!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/product/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.imageBox}>
              {item.image_base64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                  style={styles.productImage}
                />
              ) : (
                <MaterialCommunityIcons name="food-apple-outline" size={48} color={theme.colors.primary} />
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.farmerName} numberOfLines={1}>by {item.farmer_name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{item.price}/{item.unit}</Text>
                <Text style={styles.stock}>{item.stock} left</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchBar: { flexDirection: "row", alignItems: "center", margin: 12,
    backgroundColor: "#fff", borderRadius: theme.borderRadius.full, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: theme.colors.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: theme.colors.textPrimary },
  catList: { paddingHorizontal: 12, marginBottom: 4, flexGrow: 0 },
  chip: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, color: theme.colors.textSecondary, textTransform: "capitalize", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  card: { flex: 1, backgroundColor: "#fff", borderRadius: theme.borderRadius.md, overflow: "hidden", ...theme.shadow.sm },
  imageBox: { height: 110, backgroundColor: "#F1F8E9", alignItems: "center", justifyContent: "center" },
  productImage: { width: "100%", height: "100%" },
  cardBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 2 },
  farmerName: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 13, fontWeight: "700", color: theme.colors.primary },
  stock: { fontSize: 10, color: theme.colors.textMuted },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 6, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" },
});
