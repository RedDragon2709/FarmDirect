import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Platform, Modal, TextInput, Alert, ScrollView
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";
import { ThemedEmoji } from "../../src/components/ThemedEmoji";
import { formatAddress, parseAddress } from "../../src/utils/address";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  placed:     { label: "Order Placed",  color: "#3B82F6", icon: "receipt-outline" },
  confirmed:  { label: "Confirmed",     color: "#F59E0B", icon: "checkmark-circle-outline" },
  packed:     { label: "Packed",        color: "#8B5CF6", icon: "cube-outline" },
  dispatched: { label: "On the Way",   color: "#FF9800", icon: "bicycle-outline" },
  delivered:  { label: "Delivered",    color: "#10B981", icon: "home-outline" },
  cancelled:  { label: "Cancelled",   color: "#EF4444", icon: "close-circle-outline" },
};

const TRACKING_STEPS = [
  { key: "placed",     title: "Order Placed",        desc: "We received your order" },
  { key: "confirmed",  title: "Order Confirmed",     desc: "Farmer accepted your request" },
  { key: "packed",     title: "Harvested & Packed",  desc: "Produce freshly harvested & packed" },
  { key: "dispatched", title: "Out for Delivery",    desc: "Rider is heading to your home" },
  { key: "delivered",  title: "Arrived!",            desc: "Delivered fresh from the field" },
];

const STATUS_ORDER = ["placed", "confirmed", "packed", "dispatched", "delivered"];

const getGroupedStatus = (items: any[]) => {
  const statuses = items.map(item => item.status || "placed");
  const uniqueStatuses = Array.from(new Set(statuses));
  if (uniqueStatuses.length === 1) return uniqueStatuses[0];
  
  const activeItems = statuses.filter(s => s !== 'cancelled');
  if (activeItems.length === 0) return 'cancelled';
  
  let minIdx = STATUS_ORDER.length;
  let minStatus = 'placed';
  for (const s of activeItems) {
    const idx = STATUS_ORDER.indexOf(s);
    if (idx !== -1 && idx < minIdx) {
      minIdx = idx;
      minStatus = s;
    }
  }
  return minStatus;
};

const groupOrders = (ordersList: any[]) => {
  const groups: Record<string, any[]> = {};
  const ungrouped: any[] = [];
  
  ordersList.forEach((order) => {
    const txId = order.transaction_id;
    if (txId && txId.trim() !== "") {
      if (!groups[txId]) {
        groups[txId] = [];
      }
      groups[txId].push(order);
    } else {
      ungrouped.push(order);
    }
  });
  
  const groupedList: any[] = [];
  
  Object.keys(groups).forEach((txId) => {
    const items = groups[txId];
    const firstItem = items[0];
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const overallStatus = getGroupedStatus(items);
    
    groupedList.push({
      id: txId,
      transaction_id: txId,
      created_at: firstItem.created_at,
      payment_method: firstItem.payment_method,
      payment_status: firstItem.payment_status,
      delivery_address: firstItem.delivery_address,
      status: overallStatus,
      items: items,
      total: totalAmount
    });
  });
  
  ungrouped.forEach((order) => {
    groupedList.push({
      id: order.id,
      transaction_id: "",
      created_at: order.created_at,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      delivery_address: order.delivery_address,
      status: order.status || "placed",
      items: [order],
      total: order.total
    });
  });
  
  groupedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return groupedList;
};

export default function ConsumerOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Reviews
  const [reviewModal, setReviewModal] = useState<{ order: any } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [existingReviews, setExistingReviews] = useState<Record<string, any>>({}); // keyed by order_id

  const load = async () => {
    try {
      const data: any = await api.consumerOrders();
      setOrders(data);
      // Load reviews for delivered orders
      const deliveredOrders = data.filter((o: any) => o.status === "delivered");
      const reviewMap: Record<string, any> = {};
      await Promise.all(
        deliveredOrders.map(async (o: any) => {
          try {
            const r: any = await api.getOrderReview(o.id);
            if (r) reviewMap[o.id] = r;
          } catch {}
        })
      );
      setExistingReviews(reviewMap);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setSubmittingReview(true);
    try {
      const res: any = await api.postReview({
        order_id: reviewModal.order.id,
        product_id: reviewModal.order.product_id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setExistingReviews((prev) => ({ ...prev, [reviewModal.order.id]: res }));
      setReviewModal(null);
      setReviewRating(5);
      setReviewComment("");
      Alert.alert("Review Submitted!", "Thank you for your feedback.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const openReviewModal = (order: any) => {
    setReviewRating(5);
    setReviewComment("");
    setReviewModal({ order });
  };

  const getStepState = (orderStatus: string, stepKey: string): "completed" | "active" | "pending" => {
    if (orderStatus === "cancelled") return "pending";
    const currentIndex = STATUS_ORDER.indexOf(orderStatus);
    const stepIndex = STATUS_ORDER.indexOf(stepKey);
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 40 }}
        data={groupOrders(orders)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedEmoji name="cart" size={54} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>Place your first order from fresh farm produce!</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.replace("/consumer")} activeOpacity={0.88}>
              <Text style={styles.shopBtnText}>Browse Produce</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: groupedOrder }) => {
          const statusVal = groupedOrder.status || "placed";
          const config = STATUS_CONFIG[statusVal] || { label: statusVal, color: "#666", icon: "alert-circle-outline" };
          const isExpanded = expandedOrder === groupedOrder.id;
          const itemsSummary = groupedOrder.items.map((it: any) => `${it.product_name} (${it.quantity})`).join(", ");
          const totalQty = groupedOrder.items.reduce((sum: number, it: any) => sum + it.quantity, 0);

          return (
            <View style={styles.card}>
              {/* Header */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedOrder(isExpanded ? null : groupedOrder.id)}
                activeOpacity={0.75}
              >
                {/* Clean Grocery Bag/Box Icon */}
                <View style={styles.storeIconWrap}>
                  <Ionicons name="basket-outline" size={20} color={theme.colors.textSecondary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>
                    Order #{groupedOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={styles.ordDate}>
                    {new Date(groupedOrder.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Text>
                </View>

                <View style={styles.headerRight}>
                  <View style={[styles.statusBadge, { backgroundColor: config.color + "12" }]}>
                    <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={15}
                    color={theme.colors.textMuted}
                    style={{ marginTop: 2 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Summary */}
              <View style={styles.summary}>
                <Text style={styles.itemsSummary} numberOfLines={1}>{itemsSummary}</Text>
                
                <View style={styles.summaryFooter}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>₹{groupedOrder.total}</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.qtyText}>{totalQty} {totalQty === 1 ? 'item' : 'items'}</Text>
                  </View>
                  
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} style={{ marginRight: 3 }} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {formatAddress(groupedOrder.delivery_address)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expanded: Items List + timeline */}
              {isExpanded && (
                <View style={styles.timeline}>
                  {/* Sub-items block */}
                  <Text style={styles.timelineTitle}>ITEMS IN THIS ORDER</Text>
                  {groupedOrder.items.map((subItem: any) => {
                    const subStatus = subItem.status || "placed";
                    const subConfig = STATUS_CONFIG[subStatus] || { label: subStatus, color: "#666", icon: "alert-circle-outline" };
                    const subIsActive = subStatus !== "cancelled" && subStatus !== "delivered";
                    const subExistingReview = existingReviews[subItem.id];
                    
                    return (
                      <View key={subItem.id} style={styles.subItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subItemName}>{subItem.product_name}</Text>
                          <Text style={styles.subItemMeta}>
                            Qty: {subItem.quantity} · Price: ₹{subItem.price} · Total: <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>₹{subItem.total}</Text>
                          </Text>
                        </View>
                        
                        <View style={{ alignItems: "flex-end", gap: 6 }}>
                          <View style={[styles.subStatusBadge, { backgroundColor: subConfig.color + "15" }]}>
                            <Text style={[styles.subStatusText, { color: subConfig.color }]}>{subConfig.label}</Text>
                          </View>
                          
                          {subIsActive && (
                            <TouchableOpacity
                              style={styles.subTrackBtn}
                              onPress={() => router.push({
                                pathname: "/consumer/track-order",
                                params: {
                                  status: subStatus,
                                  product: subItem.product_name,
                                  address: subItem.delivery_address,
                                  orderId: subItem.id,
                                }
                              })}
                            >
                              <Ionicons name="navigate-outline" size={12} color="#fff" />
                              <Text style={styles.subTrackText}> Track</Text>
                            </TouchableOpacity>
                          )}
                          
                          {subStatus === "delivered" && (
                            <View style={{ marginTop: 2 }}>
                              {subExistingReview ? (
                                <View style={styles.subExistingReview}>
                                  <Text style={styles.subReviewRating}>★ {subExistingReview.rating}/5</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.subReviewBtn}
                                  onPress={() => openReviewModal(subItem)}
                                >
                                  <Ionicons name="star" size={11} color={theme.colors.secondary} style={{ marginRight: 2 }} />
                                  <Text style={styles.subReviewText}>Review</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  <Text style={[styles.timelineTitle, { marginTop: 20 }]}>ORDER JOURNEY</Text>

                  {statusVal === "cancelled" ? (
                    <View style={styles.cancelledBox}>
                      <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                      <Text style={styles.cancelledText}>  This order was cancelled.</Text>
                    </View>
                  ) : (
                    TRACKING_STEPS.map((step, idx) => {
                      const state = getStepState(statusVal, step.key);
                      const isLast = idx === TRACKING_STEPS.length - 1;
                      return (
                        <View key={step.key} style={styles.timelineRow}>
                          <View style={styles.timelineLeft}>
                            <View style={[
                              styles.dot,
                              state === "completed" && styles.dotCompleted,
                              state === "active" && styles.dotActive,
                            ]}>
                              {state === "completed" ? (
                                <Ionicons name="checkmark" size={11} color="#fff" />
                              ) : state === "active" ? (
                                <View style={styles.dotInner} />
                              ) : null}
                            </View>
                            {!isLast && (
                              <View style={[
                                styles.connector,
                                state === "completed" && styles.connectorFilled,
                              ]} />
                            )}
                          </View>
                          <View style={[styles.timelineContent, !isLast && { paddingBottom: 16 }]}>
                            <Text style={[
                              styles.stepTitle,
                              state === "active" && { color: theme.colors.primary },
                              state === "pending" && { color: theme.colors.textMuted },
                            ]}>{step.title}</Text>
                            {state !== "pending" && (
                              <Text style={styles.stepDesc}>{step.desc}</Text>
                            )}
                          </View>
                          {state === "active" && (
                            <View style={styles.nowChip}>
                              <Text style={styles.nowChipText}>LIVE</Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}

                  {/* Payment info */}
                  <View style={styles.payBox}>
                    <View style={styles.payRow}>
                      <Text style={styles.payLabel}>Payment</Text>
                      <View style={[
                        styles.payStatus,
                        { backgroundColor: groupedOrder.payment_status === "paid" ? "#ECFDF5" : "#FFFBEB" }
                      ]}>
                        <Text style={[
                          styles.payStatusText,
                          { color: groupedOrder.payment_status === "paid" ? "#059669" : "#D97706" }
                        ]}>
                          {groupedOrder.payment_status === "paid" ? "✓ Paid" : "Cash Pending"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.payMethod}>{groupedOrder.payment_method || "COD"}</Text>
                    {groupedOrder.transaction_id && (
                      <Text style={styles.txnId}>Txn: {groupedOrder.transaction_id}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* ── Review Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={!!reviewModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.reviewModalHeader}>
          <Text style={styles.reviewModalTitle}>Write a Review</Text>
          <TouchableOpacity
            onPress={() => setReviewModal(null)}
            style={styles.reviewModalClose}
          >
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {reviewModal && (
            <>
              <Text style={styles.reviewProductName}>{reviewModal.order.product_name}</Text>
              <Text style={styles.reviewSubLabel}>How would you rate this product?</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setReviewRating(s)} activeOpacity={0.7}>
                    <Ionicons
                      name={s <= reviewRating ? "star" : "star-outline"}
                      size={38}
                      color={s <= reviewRating ? "#F59E0B" : theme.colors.border}
                      style={{ marginHorizontal: 4 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {["Terrible", "Poor", "Okay", "Good", "Excellent!"][reviewRating - 1]}
              </Text>
              <Text style={styles.reviewSubLabel}>Share your experience (optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Tell others about the quality, freshness, packaging…"
                placeholderTextColor={theme.colors.textMuted}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.submitReviewBtn, submittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
                activeOpacity={0.88}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.submitReviewBtnText}> Submit Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  list: { flex: 1, padding: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadow.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  storeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  productName: { fontSize: 14, fontWeight: "800", color: theme.colors.textPrimary },
  ordDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: "500" },
  headerRight: { alignItems: "flex-end", gap: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },

  summary: { paddingHorizontal: 14, paddingVertical: 12 },
  itemsSummary: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceText: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  dotSeparator: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginHorizontal: 6,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    marginLeft: 16,
  },
  addressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "500",
    maxWidth: 160,
  },

  trackBtn: {
    margin: 12,
    marginTop: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.xs,
  },
  trackBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  timeline: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    padding: 14,
    paddingTop: 12,
  },
  timelineTitle: {
    fontSize: 11, fontWeight: "800",
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  cancelledBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.errorSoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  cancelledText: { color: theme.colors.error, fontSize: 13, fontWeight: "600" },

  timelineRow: { flexDirection: "row", alignItems: "flex-start" },
  timelineLeft: { width: 24, alignItems: "center" },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: theme.colors.border,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    zIndex: 2,
  },
  dotCompleted: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dotActive: { borderColor: theme.colors.primary },
  dotInner: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  connector: {
    width: 2, flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 2,
  },
  connectorFilled: { backgroundColor: theme.colors.primary },

  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 4,
  },
  stepTitle: { fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary },
  stepDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  nowChip: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, alignSelf: "flex-start",
    marginTop: 2,
  },
  nowChipText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  payBox: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  payLabel: { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" },
  payStatus: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  payStatusText: { fontSize: 11, fontWeight: "800" },
  payMethod: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "600" },
  txnId: {
    fontSize: 10, color: theme.colors.textMuted, marginTop: 4, fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  empty: { alignItems: "center", paddingTop: 100, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center", marginBottom: 24 },
  shopBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 28, paddingVertical: 14,
    ...theme.shadow.sm,
  },
  shopBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // ── Review section ──────────────────────────────────────────────────────────
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  writeReviewText: { fontSize: 13, fontWeight: "800", color: "#B45309" },
  existingReview: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewStarsRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  reviewRatingText: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted },
  existingReviewText: { fontSize: 12, color: theme.colors.textSecondary, fontStyle: "italic", lineHeight: 17 },

  // ── Review Modal ─────────────────────────────────────────────────────────────
  reviewModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    backgroundColor: "#fff",
  },
  reviewModalTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary },
  reviewModalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  reviewProductName: {
    fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary,
    marginBottom: 6, textAlign: "center",
  },
  reviewSubLabel: {
    fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary,
    marginBottom: 12, textAlign: "center",
  },
  starRow: {
    flexDirection: "row", justifyContent: "center",
    marginBottom: 10,
  },
  ratingLabel: {
    fontSize: 15, fontWeight: "800", color: "#F59E0B",
    textAlign: "center", marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 14, padding: 14, fontSize: 14,
    color: theme.colors.textPrimary, backgroundColor: "#fff",
    height: 110, marginBottom: 20,
  },
  submitReviewBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 14,
    height: 52, flexDirection: "row", alignItems: "center",
    justifyContent: "center", ...theme.shadow.sm,
  },
  submitReviewBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  subItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  subItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  subItemMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-end",
  },
  subStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  subTrackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subTrackText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  subReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.secondarySoft,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subReviewText: {
    color: theme.colors.secondaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  subExistingReview: {
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subReviewRating: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
});

