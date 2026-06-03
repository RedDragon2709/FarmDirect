import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    api.getProduct(id).then((data: any) => setProduct(data)).catch(() => {
      Alert.alert("Error", "Product not found"); router.back();
    }).finally(() => setLoading(false));
  }, [id]);

  const handleBuyNow = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) { Alert.alert("Error", "Enter a valid quantity"); return; }
    if (!address.trim()) { Alert.alert("Error", "Enter delivery address"); return; }
    if (qty > product.stock) { Alert.alert("Error", `Only ${product.stock} in stock`); return; }

    setOrdering(true);
    try {
      await api.createOrder({ product_id: id, quantity: qty, delivery_address: address.trim() });
      Alert.alert("Order Placed!", "Your COD order has been placed successfully.", [
        { text: "View Orders", onPress: () => router.replace("/consumer/orders") },
        { text: "Keep Browsing", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Order Failed", e.message);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;
  if (!product) return null;

  const total = (parseFloat(quantity) || 0) * product.price;

  return (
    <ScrollView style={styles.container}>
      {/* Image */}
      <View style={styles.imageBox}>
        {product.image_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${product.image_base64}` }}
            style={styles.image}
          />
        ) : (
          <MaterialCommunityIcons name="food-apple-outline" size={80} color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>{product.stock} left</Text>
          </View>
        </View>

        <Text style={styles.category}>{product.category} · per {product.unit}</Text>
        <View style={styles.farmerRow}>
          <Ionicons name="leaf" size={14} color={theme.colors.primary} />
          <Text style={styles.farmer}> by {product.farmer_name}</Text>
        </View>

        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : null}

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>₹{product.price} / {product.unit}</Text>
        </View>

        <Text style={styles.sectionLabel}>Quantity</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1 || 1)))}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.qtyInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            textAlign="center"
          />
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(String(Math.min(product.stock, (parseInt(quantity) || 0) + 1)))}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Delivery Address</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="Enter your full delivery address"
          placeholderTextColor={theme.colors.textMuted}
        />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total (COD)</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, ordering && { opacity: 0.7 }]}
          onPress={handleBuyNow}
          disabled={ordering}
        >
          <Text style={styles.buyBtnText}>
            {ordering ? "Placing Order..." : "Buy Now · Cash on Delivery"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  imageBox: { height: 220, backgroundColor: "#F1F8E9", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  body: { padding: 20 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  name: { fontSize: 24, fontWeight: "800", color: theme.colors.textPrimary, flex: 1, marginRight: 10 },
  stockBadge: { backgroundColor: "#E8F5E9", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  stockText: { color: theme.colors.success, fontSize: 11, fontWeight: "600" },
  category: { fontSize: 13, color: theme.colors.textMuted, textTransform: "capitalize", marginBottom: 4 },
  farmerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  farmer: { fontSize: 13, color: theme.colors.primary, fontWeight: "500" },
  description: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  priceCard: { backgroundColor: "#F1F8E9", borderRadius: theme.borderRadius.md, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  priceLabel: { fontSize: 14, color: theme.colors.textSecondary },
  price: { fontSize: 20, fontWeight: "800", color: theme.colors.primary },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 8 },
  qtyRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary,
    alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  qtyInput: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    padding: 10, fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    padding: 12, fontSize: 14, color: theme.colors.textPrimary, backgroundColor: "#fff", marginBottom: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16, marginBottom: 20 },
  totalLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary },
  totalValue: { fontSize: 22, fontWeight: "800", color: theme.colors.primary },
  buyBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingVertical: 18, alignItems: "center", marginBottom: 40 },
  buyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
