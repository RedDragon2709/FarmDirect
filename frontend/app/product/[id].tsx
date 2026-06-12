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
import { formatAddress, parseAddress } from "../../src/utils/address";
import AddressEditorModal from "../../src/components/AddressEditorModal";


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
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  
  // ML Prediction state
  const [mlData, setMlData] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Save state
  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  // Stored Addresses state
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);

  // Cart banner state
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  const refreshCartState = async () => {
    const { getCart } = await import("../../src/cart");
    const cartItems = await getCart();
    let total = 0;
    let count = 0;
    cartItems.forEach((item) => {
      total += item.price * item.quantity;
      count += item.quantity;
    });
    setCartCount(count);
    setCartTotal(total);
  };

  useEffect(() => {
    refreshCartState();
    const { subscribeToCart } = require("../../src/cart");
    return subscribeToCart(() => { refreshCartState(); });
  }, []);

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
    if (!id) return;
    // Only check save status if logged in as consumer
    AsyncStorage.getItem("token").then((tok) => {
      if (!tok) return;
      api.checkSaved(id).then((res: any) => {
        if (res) setIsSaved(res.saved);
      }).catch(() => {});
    });
  }, [id]);


  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getProduct(id),
      api.getProductReviews(id)
    ])
      .then(([data, revs]: [any, any]) => {
        setProduct(data);
        setReviews(revs || []);
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
      const sharedTxnId = transactionId || `COD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await api.createOrder({
        product_id: id!,
        quantity: qty,
        delivery_address: trimmedAddress,
        payment_method: method,
        payment_status: method === "COD" ? "pending" : "paid",
        transaction_id: sharedTxnId
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
        "Added to Cart!",
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

  const handleToggleSave = async () => {
    if (!product) return;
    setSavingToggle(true);
    try {
      const res: any = await api.toggleSaved({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        unit: product.unit,
        farmer_name: product.farmer_name,
        image_base64: product.image_base64 || "",
      });
      setIsSaved(res.saved);
    } catch {}
    finally { setSavingToggle(false); }
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
        badge: "Fair Price",
        badgeIcon: "checkmark-circle",
        color: "#10B981",
        bgColor: "#ECFDF5",
        text: `Priced standard locally. Mandi median is \u20b9${median}/${product.unit}.`
      };
    } else if (product.price < mlData.suggested_min) {
      return {
        badge: "Super Deal",
        badgeIcon: "flame",
        color: "#E2B800",
        bgColor: "#FFFDF0",
        text: `Bargain! ${Math.abs(diffPercent).toFixed(0)}% cheaper than local mandi median.`
      };
    } else {
      return {
        badge: "Premium Quality",
        badgeIcon: "diamond",
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
      {/* Floating back + save header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.floatingBtn, isSaved && { backgroundColor: "#FEF2F2" }]}
          onPress={handleToggleSave}
          activeOpacity={0.8}
          disabled={savingToggle}
        >
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={20}
            color={isSaved ? theme.colors.error : theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
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
              <Ionicons name="person" size={20} color={theme.colors.primary} />
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

          {/* Reviews & Ratings Section */}
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsTitle}>Customer Reviews ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <View style={styles.reviewsEmpty}>
                <Ionicons name="chatbox-outline" size={24} color={theme.colors.textMuted} />
                <Text style={styles.reviewsEmptyText}>No reviews yet</Text>
                <Text style={styles.reviewsEmptySub}>Be the first to buy and share your feedback!</Text>
              </View>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitials}>
                          {rev.consumer_name?.charAt(0).toUpperCase() || "C"}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{rev.consumer_name}</Text>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name={s <= rev.rating ? "star" : "star-outline"}
                              size={12}
                              color={s <= rev.rating ? "#F59E0B" : theme.colors.border}
                              style={{ marginRight: 2 }}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(rev.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })}
                    </Text>
                  </View>
                  {rev.comment ? (
                    <Text style={styles.reviewComment}>"{rev.comment}"</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

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
                <Ionicons name={analysis.badgeIcon as any} size={14} color={analysis.color} style={{ marginLeft: 4 }} />
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
                {savedAddresses.map((addrOption, idx) => {
                  const parsedOpt = parseAddress(addrOption);
                  const chipIcon = parsedOpt.tag === "Home" ? "home" : parsedOpt.tag === "Work" ? "briefcase" : "location";
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.addressChip,
                        address.trim() === addrOption.trim() && styles.addressChipActive
                      ]}
                      onPress={() => setAddress(addrOption)}
                    >
                      <Ionicons 
                        name={chipIcon} 
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
                        {formatAddress(addrOption).length > 20 ? formatAddress(addrOption).slice(0, 20) + "..." : formatAddress(addrOption)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Structured Address Display Card */}
          <View style={styles.addressDisplayCard}>
            <View style={styles.addressCardHeader}>
              <Ionicons name="location" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.addressCardTitle}>
                {address ? `${parseAddress(address).tag} Address` : "No Address Selected"}
              </Text>
            </View>
            <Text style={styles.addressCardText}>
              {address ? formatAddress(address) : "Please select a stored address or enter a new one to continue."}
            </Text>
            <TouchableOpacity
              style={styles.addressEditBtn}
              onPress={() => setAddressModalOpen(true)}
            >
              <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.addressEditBtnText}> {address ? "Edit Delivery Address" : "Add Delivery Address"}</Text>
            </TouchableOpacity>
          </View>

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
          {cartCount > 0 && <View style={{ height: 85 }} />}
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

      {/* ---------- FLOATING CART BANNER ---------- */}
      {cartCount > 0 && (
        <View style={styles.cartBannerContainer}>
          <TouchableOpacity
            style={styles.cartBanner}
            onPress={() => router.push("/consumer/cart")}
            activeOpacity={0.9}
          >
            <View style={styles.cartBannerLeft}>
              <View style={styles.cartIconBadgeWrap}>
                <Ionicons name="cart" size={18} color="#fff" />
                <View style={styles.cartBannerBadge}>
                  <Text style={styles.cartBannerBadgeText}>{cartCount}</Text>
                </View>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.cartBannerPrice}>₹{cartTotal}</Text>
                <Text style={styles.cartBannerSub}>Subtotal (excl. delivery)</Text>
              </View>
            </View>
            <View style={styles.cartBannerRight}>
              <Text style={styles.cartBannerAction}>View Cart</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <AddressEditorModal
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={async (newAddr) => {
          setAddress(newAddr);
          let updated = [...savedAddresses];
          if (!updated.includes(newAddr)) {
            updated.push(newAddr);
            if (updated.length > 5) updated.shift();
            setSavedAddresses(updated);
            try {
              await api.updateProfile({ addresses: updated });
            } catch {}
          }
          await AsyncStorage.setItem("delivery_address", newAddr);
        }}
        initialAddressString={address}
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
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
  addressDisplayCard: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    ...theme.shadow.xs,
  },
  addressCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  addressCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressCardText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  addressEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight + "20",
  },
  addressEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
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
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 12,
    zIndex: 100,
  },
  floatingBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  reviewsSection: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...theme.shadow.sm,
  },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  reviewsEmpty: {
    alignItems: "center",
    paddingVertical: 20,
  },
  reviewsEmptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  reviewsEmptySub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reviewerInitials: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  reviewStars: {
    flexDirection: "row",
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  reviewComment: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 16,
    paddingLeft: 40,
  },
  cartBannerContainer: {
    position: "absolute",
    bottom: 20,
    left: 14,
    right: 14,
    zIndex: 99,
  },
  cartBanner: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    ...theme.shadow.md,
  },
  cartBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartIconBadgeWrap: {
    position: "relative",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBannerBadge: {
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
  cartBannerBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  cartBannerPrice: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  cartBannerSub: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  cartBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  cartBannerAction: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
