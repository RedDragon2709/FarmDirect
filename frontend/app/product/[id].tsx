import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Image, StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";
import PaymentModal from "../../src/components/PaymentModal";
import { addToCart } from "../../src/cart";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  
  // Payment Modal state
  const [paymentVisible, setPaymentVisible] = useState(false);
  
  // ML Prediction state
  const [mlData, setMlData] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Stored Addresses state
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

  useEffect(() => {
    // Load active address
    AsyncStorage.getItem("delivery_address").then((addr) => {
      if (addr) setAddress(addr);
    });
    // Load stored addresses from backend
    api.me().then((user: any) => {
      if (user && user.addresses) {
        setSavedAddresses(user.addresses);
        if (!address && user.addresses.length > 0) {
          setAddress(user.addresses[0]);
        }
      }
    }).catch(() => {});
  }, []);


  useEffect(() => {
    setLoading(true);
    api.getProduct(id)
      .then((data: any) => {
        setProduct(data);
        // Call ML prediction service using product name
        setMlLoading(true);
        api.predictPrice({
          commodity: data.name,
          state: "Karnataka",
          district: "Bangalore",
          month: 6 // June
        })
        .then((pred: any) => setMlData(pred))
        .catch(() => {})
        .finally(() => setMlLoading(false));
      })
      .catch(() => {
        Alert.alert("Error", "Product not found"); 
        router.back();
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCheckoutTrigger = () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) { Alert.alert("Error", "Enter a valid quantity"); return; }
    if (!address.trim()) { Alert.alert("Error", "Enter delivery address"); return; }
    if (qty > product.stock) { Alert.alert("Error", `Only ${product.stock} in stock`); return; }
    
    // Open payment gateway sheet
    setPaymentVisible(true);
  };

  const handlePaymentSuccess = async (method: string, transactionId: string | null) => {
    setPaymentVisible(false);
    setOrdering(true);
    
    const qty = parseInt(quantity);
    try {
      const trimmedAddress = address.trim();
      await api.createOrder({
        product_id: id!,
        quantity: qty,
        delivery_address: trimmedAddress,
        payment_method: method,
        payment_status: method === "COD" ? "pending" : "paid",
        transaction_id: transactionId || undefined
      });
      
      // Save address locally & to backend profile if new
      await AsyncStorage.setItem("delivery_address", trimmedAddress);
      let updatedAddresses = [...savedAddresses];
      if (!updatedAddresses.includes(trimmedAddress)) {
        updatedAddresses.push(trimmedAddress);
        if (updatedAddresses.length > 5) updatedAddresses.shift();
        try {
          await api.updateProfile({ addresses: updatedAddresses });
        } catch {}
      }

      Alert.alert(
        "Order Placed!", 
        method === "COD" 
          ? "Your cash on delivery order has been placed successfully." 
          : `Payment successful! Txn ID: ${transactionId}. Your order is confirmed.`, 
        [
          { text: "Track Order", onPress: () => router.replace("/consumer/orders") },
          { text: "Keep Browsing", onPress: () => router.replace("/consumer") },
        ]
      );
    } catch (e: any) {
      Alert.alert("Order Failed", e.message || "Something went wrong.");
    } finally {
      setOrdering(false);
    }
  };

  const handleAddToCart = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) { Alert.alert("Error", "Enter a valid quantity"); return; }
    if (qty > product.stock) { Alert.alert("Error", `Only ${product.stock} in stock`); return; }

    try {
      await addToCart(product, qty);
      Alert.alert(
        "Added to Cart! 🛒",
        `${qty} unit(s) of "${product.name}" added.`,
        [
          { text: "Keep Browsing", style: "cancel" },
          { text: "View Cart", onPress: () => router.push("/consumer/cart") }
        ]
      );
    } catch {
      Alert.alert("Error", "Could not add to cart.");
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;
  if (!product) return null;

  const total = (parseFloat(quantity) || 0) * product.price;

  // Evaluate if price is fair compared to ML mandi median
  const getPriceAnalysis = () => {
    if (!mlData || mlData.error) return null;
    const median = mlData.suggested_modal;
    const diffPercent = ((product.price - median) / median) * 100;
    
    if (product.price <= mlData.suggested_max && product.price >= mlData.suggested_min) {
      return {
        badge: "✅ Fair Price",
        color: "#10B981",
        bgColor: "#ECFDF5",
        text: `Priced standard locally. Mandi median is ₹${median}/${product.unit}.`
      };
    } else if (product.price < mlData.suggested_min) {
      return {
        badge: "🔥 Super Deal",
        color: "#E2B800",
        bgColor: "#FFFDF0",
        text: `Bargain! ${Math.abs(diffPercent).toFixed(0)}% cheaper than local mandi median.`
      };
    } else {
      return {
        badge: "💎 Premium Quality",
        color: "#3B82F6",
        bgColor: "#EFF6FF",
        text: `Above average market price. Supports organic farming practices.`
      };
    }
  };

  const analysis = getPriceAnalysis();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container}>
        {/* Image Box */}
        <View style={styles.imageBox}>
          {product.image_base64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${product.image_base64}` }}
              style={styles.image}
            />
          ) : (
            <MaterialCommunityIcons name="leaf" size={80} color={theme.colors.primary} />
          )}
        </View>

        <View style={styles.body}>
          {/* Title and Stock */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.category}>{product.category} • Sold per {product.unit}</Text>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>{product.stock} in stock</Text>
            </View>
          </View>

          {/* Farmer Details */}
          <View style={styles.farmerCard}>
            <View style={styles.farmerAvatar}>
              <Text style={styles.farmerAvatarText}>👨‍🌾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.farmerName}>{product.farmer_name}</Text>
              <Text style={styles.farmerSub}>Verified Direct Farmer • 4.8 ★</Text>
            </View>
            <View style={styles.freshTag}>
              <Text style={styles.freshTagText}>Harvested Today</Text>
            </View>
          </View>

          {product.description ? (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>About Product</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {/* Price Card */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Price per {product.unit}</Text>
              <Text style={styles.price}>₹{product.price}</Text>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Farm Price</Text>
            </View>
          </View>

          {/* Smart Price Advisor (ML integration) */}
          {mlLoading && (
            <View style={styles.mlCard}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.mlLoadingText}>Fetching local mandi price suggestions...</Text>
            </View>
          )}

          {!mlLoading && analysis && (
            <View style={[styles.mlCard, { backgroundColor: analysis.bgColor }]}>
              <View style={styles.mlHeader}>
                <MaterialCommunityIcons name="brain" size={18} color={analysis.color} />
                <Text style={[styles.mlBadge, { color: analysis.color }]}> {analysis.badge}</Text>
              </View>
              <Text style={styles.mlText}>{analysis.text}</Text>
              <Text style={styles.mlFooter}>Confidence: {mlData.confidence} • {mlData.note}</Text>
            </View>
          )}

          {/* Quantity selector */}
          <Text style={styles.sectionLabel}>Select Quantity</Text>
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

          {/* Delivery Address */}
          <Text style={styles.sectionLabel}>Delivery Address</Text>
          {savedAddresses.length > 0 && (
            <View style={styles.chipsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {savedAddresses.map((addrOption, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.addressChip,
                      address.trim() === addrOption.trim() && styles.addressChipActive
                    ]}
                    onPress={() => setAddress(addrOption)}
                  >
                    <Ionicons 
                      name="home" 
                      size={11} 
                      color={address.trim() === addrOption.trim() ? "#fff" : theme.colors.primary} 
                      style={{ marginRight: 4 }}
                    />
                    <Text 
                      style={[
                        styles.addressChipText,
                        address.trim() === addrOption.trim() && styles.addressChipTextActive
                      ]}
                    >
                      {addrOption.length > 20 ? addrOption.slice(0, 20) + "..." : addrOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="Enter your house number, building, street, and area"
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* Checkout Bar */}
          <View style={styles.checkoutBox}>
            <View>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cartBtn}
                onPress={handleAddToCart}
                activeOpacity={0.8}
              >
                <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.cartBtnText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buyBtn, ordering && { opacity: 0.7 }]}
                onPress={handleCheckoutTrigger}
                disabled={ordering}
              >
                <Text style={styles.buyBtnText}>
                  {ordering ? "Ordering..." : "Buy Now"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Payment Gateway Modal */}
      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        amount={total}
        productName={product?.name || ""}
        onSuccess={handlePaymentSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  imageBox: { 
    height: 240, 
    backgroundColor: "#F8FAFC", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  image: { 
    width: "100%", 
    height: "100%",
    resizeMode: "contain"
  },
  body: { 
    padding: 20 
  },
  titleRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    marginBottom: 16 
  },
  name: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: theme.colors.textPrimary,
  },
  category: { 
    fontSize: 13, 
    color: theme.colors.textSecondary, 
    textTransform: "capitalize",
    marginTop: 2 
  },
  stockBadge: { 
    backgroundColor: "#ECFDF5", 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  stockText: { 
    color: "#059669", 
    fontSize: 11, 
    fontWeight: "700" 
  },
  farmerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    ...theme.shadow.sm,
  },
  farmerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  farmerAvatarText: {
    fontSize: 18,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  farmerSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  freshTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freshTagText: {
    fontSize: 9,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  descSection: {
    marginBottom: 16,
  },
  descTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  description: { 
    fontSize: 13, 
    color: theme.colors.textSecondary, 
    lineHeight: 18 
  },
  priceCard: { 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    padding: 16,
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    ...theme.shadow.sm 
  },
  priceLabel: { 
    fontSize: 12, 
    color: theme.colors.textSecondary,
    fontWeight: "600" 
  },
  price: { 
    fontSize: 24, 
    fontWeight: "900", 
    color: theme.colors.textPrimary,
    marginTop: 2
  },
  savingsBadge: { 
    backgroundColor: "#FEF3C7", 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  savingsText: { 
    color: "#D97706", 
    fontSize: 11, 
    fontWeight: "800" 
  },
  mlCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
    flexDirection: "column",
  },
  mlHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  mlBadge: {
    fontSize: 13,
    fontWeight: "800",
  },
  mlText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  mlFooter: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  mlLoadingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: theme.colors.textPrimary, 
    marginBottom: 8 
  },
  qtyRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16, 
    gap: 12 
  },
  qtyBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: theme.colors.primary,
    alignItems: "center", 
    justifyContent: "center" 
  },
  qtyBtnText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  qtyInput: { 
    flex: 1, 
    borderWidth: 1.5, 
    borderColor: theme.colors.border, 
    borderRadius: 12,
    height: 40,
    fontSize: 16, 
    fontWeight: "700", 
    color: theme.colors.textPrimary,
    backgroundColor: "#fff" 
  },
  addressInput: { 
    borderWidth: 1.5, 
    borderColor: theme.colors.border, 
    borderRadius: 12,
    padding: 12, 
    fontSize: 14, 
    color: theme.colors.textPrimary, 
    backgroundColor: "#fff", 
    marginBottom: 24,
    height: 70,
    textAlignVertical: "top"
  },
  checkoutBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 16,
    marginBottom: 20,
  },
  totalLabel: { 
    fontSize: 12, 
    fontWeight: "600", 
    color: theme.colors.textSecondary 
  },
  totalValue: { 
    fontSize: 22, 
    fontWeight: "900", 
    color: theme.colors.primary,
    marginTop: 2 
  },
  buyBtn: { 
    backgroundColor: theme.colors.primary, 
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center", 
    justifyContent: "center",
    ...theme.shadow.sm,
  },
  buyBtnText: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "800" 
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtnText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 6,
  },
  chipsContainer: {
    marginBottom: 8,
  },
  addressChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  addressChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  addressChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  addressChipTextActive: {
    color: "#fff",
  },
});
