import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Image, StatusBar, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";
import { getCart, removeFromCart, updateCartQuantity, clearCart, subscribeToCart, CartItem } from "../../src/cart";
import PaymentModal from "../../src/components/PaymentModal";

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);

  useEffect(() => {
    loadCart();
    loadAddresses();
    return subscribeToCart(() => {
      loadCart();
    });
  }, []);

  const loadCart = async () => {
    const items = await getCart();
    setCartItems(items);
    setLoading(false);
  };

  const loadAddresses = async () => {
    try {
      // 1. Get from backend profile
      const user: any = await api.me();
      if (user && user.addresses && user.addresses.length > 0) {
        setSavedAddresses(user.addresses);
      }
      
      // 2. Get active address from AsyncStorage
      const activeAddr = await AsyncStorage.getItem("delivery_address");
      if (activeAddr) {
        setAddress(activeAddr);
      } else if (user && user.addresses && user.addresses.length > 0) {
        setAddress(user.addresses[0]);
      }
    } catch {}
  };

  const handleQtyChange = async (productId: string, currentQty: number, change: number, stock: number) => {
    const nextQty = currentQty + change;
    if (nextQty < 1) {
      handleRemove(productId);
    } else if (nextQty > stock) {
      Alert.alert("Out of Stock", `Only ${stock} units are available.`);
    } else {
      await updateCartQuantity(productId, nextQty);
    }
  };

  const handleRemove = (productId: string) => {
    Alert.alert("Remove Item", "Remove this item from your cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeFromCart(productId);
        }
      }
    ]);
  };

  const grandTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckoutTrigger = () => {
    if (cartItems.length === 0) return;
    if (!address.trim()) {
      Alert.alert("Address Required", "Please enter a delivery address.");
      return;
    }
    setPaymentVisible(true);
  };

  const handlePaymentSuccess = async (method: string, transactionId: string | null) => {
    setPaymentVisible(false);
    setSubmitting(true);

    try {
      const trimmedAddress = address.trim();
      
      // 1. Place order for each product in the cart
      const orderPromises = cartItems.map((item) =>
        api.createOrder({
          product_id: item.product_id,
          quantity: item.quantity,
          delivery_address: trimmedAddress,
          payment_method: method,
          payment_status: method === "COD" ? "pending" : "paid",
          transaction_id: transactionId || undefined
        })
      );

      await Promise.all(orderPromises);

      // 2. Save address to AsyncStorage & DB profile if not already present
      await AsyncStorage.setItem("delivery_address", trimmedAddress);
      
      let updatedAddresses = [...savedAddresses];
      if (!updatedAddresses.includes(trimmedAddress)) {
        updatedAddresses.push(trimmedAddress);
        // Only keep last 5 addresses
        if (updatedAddresses.length > 5) updatedAddresses.shift();
        
        try {
          await api.updateProfile({ addresses: updatedAddresses });
        } catch {}
      }

      // 3. Clear cart and finish
      await clearCart();
      
      Alert.alert(
        "Order Successful! 🎉",
        "Your orders have been placed successfully.",
        [
          { text: "View Orders", onPress: () => router.push("/consumer/orders") }
        ]
      );
    } catch (e: any) {
      Alert.alert("Checkout Failed", e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerOrb} />
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 72 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySub}>Add farm-fresh produce to your cart and get it delivered directly to your doorstep.</Text>
          <TouchableOpacity 
            style={styles.browseBtn}
            onPress={() => router.push("/consumer")}
          >
            <Text style={styles.browseBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{cartItems.length} items</Text>
        </View>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.product_id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        ListFooterComponent={
          <View style={styles.footerSection}>
            {/* Delivery address */}
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            
            {/* Saved Address Chips */}
            {savedAddresses.length > 0 && (
              <View style={styles.chipsContainer}>
                <Text style={styles.chipsLabel}>Select Stored Address:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
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
                        size={12} 
                        color={address.trim() === addrOption.trim() ? "#fff" : theme.colors.primary} 
                        style={{ marginRight: 4 }}
                      />
                      <Text 
                        style={[
                          styles.addressChipText,
                          address.trim() === addrOption.trim() && styles.addressChipTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {addrOption.length > 25 ? addrOption.slice(0, 25) + "..." : addrOption}
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
              placeholder="Enter your house number, building, street, and area..."
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Billing details */}
            <View style={styles.billCard}>
              <Text style={styles.billHeader}>Payment Details</Text>
              
              {cartItems.map((item) => (
                <View key={item.product_id} style={styles.billRow}>
                  <Text style={styles.billItemName} numberOfLines={1}>
                    {item.name} (x{item.quantity})
                  </Text>
                  <Text style={styles.billItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}

              <View style={styles.billDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
              </View>
            </View>

            {/* Place order button */}
            <TouchableOpacity 
              style={[styles.checkoutBtn, submitting && { opacity: 0.7 }]}
              onPress={handleCheckoutTrigger}
              disabled={submitting}
            >
              <Text style={styles.checkoutBtnText}>
                {submitting ? "Placing Orders..." : `Proceed to Pay  ₹${grandTotal.toFixed(2)}`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cartCard}>
            {/* Image Box */}
            <View style={styles.imageBox}>
              {item.image_base64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                  style={styles.productImage}
                />
              ) : (
                <Text style={{ fontSize: 28 }}>🌿</Text>
              )}
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.farmerName}>🧑‍🌾 {item.farmer_name}</Text>
              
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{item.price}</Text>
                <Text style={styles.unit}>/{item.unit}</Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsColumn}>
              <TouchableOpacity
                onPress={() => handleRemove(item.product_id)}
                style={styles.removeBtn}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
              </TouchableOpacity>

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleQtyChange(item.product_id, item.quantity, -1, item.stock)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.qtyVal}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleQtyChange(item.product_id, item.quantity, 1, item.stock)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        amount={grandTotal}
        productName={`${cartItems.length} Produce items`}
        onSuccess={handlePaymentSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", overflow: "hidden",
  },
  headerOrb: {
    position: "absolute", top: -20, right: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff", flex: 1 },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4
  },
  headerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  
  cartCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    ...theme.shadow.sm,
  },
  imageBox: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden"
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  cardBody: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  farmerName: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  unit: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  
  controlsColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 68,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 8,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800"
  },
  qtyVal: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primaryDark,
    minWidth: 16,
    textAlign: "center"
  },

  footerSection: {
    marginTop: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  addressInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: "#fff",
    marginBottom: 18,
    height: 70,
    textAlignVertical: "top"
  },
  chipsContainer: {
    marginBottom: 10,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
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
    alignSelf: "flex-start",
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

  billCard: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...theme.shadow.sm,
  },
  billHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  billItemName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 16,
  },
  billItemPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  billDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.primary,
  },

  checkoutBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.md,
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.sm,
  },
  browseBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  }
});
