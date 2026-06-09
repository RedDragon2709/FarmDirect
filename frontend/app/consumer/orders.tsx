import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Platform
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

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

export default function ConsumerOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const load = async () => {
    try {
      const data: any = await api.consumerOrders();
      setOrders(data);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

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
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 54 }}>🛒</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>Place your first order from fresh farm produce!</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.replace("/consumer")} activeOpacity={0.88}>
              <Text style={styles.shopBtnText}>Browse Produce</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const statusVal = item.status || "placed";
          const config = STATUS_CONFIG[statusVal] || { label: statusVal, color: "#666", icon: "alert-circle-outline" };
          const isExpanded = expandedOrder === item.id;
          const currentStepIdx = STATUS_ORDER.indexOf(statusVal);
          const isActive = statusVal !== "cancelled" && statusVal !== "delivered";

          return (
            <View style={styles.card}>
              {/* Header */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
                activeOpacity={0.75}
              >
                {/* Status icon circle */}
                <View style={[styles.statusCircle, { backgroundColor: config.color + "18" }]}>
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={styles.ordDate}>
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Text>
                </View>

                <View style={styles.headerRight}>
                  <View style={[styles.statusBadge, { backgroundColor: config.color + "15" }]}>
                    <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.textMuted}
                    style={{ marginTop: 4 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Summary */}
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  Qty: <Text style={styles.summaryBold}>{item.quantity}</Text>
                  {"  ·  "}
                  Total: <Text style={[styles.summaryBold, { color: theme.colors.primary }]}>₹{item.total}</Text>
                </Text>
                <Text style={styles.summaryText} numberOfLines={1}>📍 {item.delivery_address}</Text>
              </View>

              {/* Track button — only for active orders */}
              {isActive && (
                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => router.push({
                    pathname: "/consumer/track-order",
                    params: {
                      status: statusVal,
                      product: item.product_name,
                      address: item.delivery_address,
                      orderId: item.id,
                    }
                  })}
                  activeOpacity={0.88}
                >
                  <Ionicons name="navigate" size={14} color="#fff" />
                  <Text style={styles.trackBtnText}> Live Track Order</Text>
                </TouchableOpacity>
              )}

              {/* Expanded: full timeline */}
              {isExpanded && (
                <View style={styles.timeline}>
                  <Text style={styles.timelineTitle}>ORDER JOURNEY</Text>

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
                        { backgroundColor: item.payment_status === "paid" ? "#ECFDF5" : "#FFFBEB" }
                      ]}>
                        <Text style={[
                          styles.payStatusText,
                          { color: item.payment_status === "paid" ? "#059669" : "#D97706" }
                        ]}>
                          {item.payment_status === "paid" ? "✓ Paid" : "Cash Pending"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.payMethod}>{item.payment_method || "COD"}</Text>
                    {item.transaction_id && (
                      <Text style={styles.txnId}>Txn: {item.transaction_id}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
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
  statusCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  productName: { fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary },
  ordDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: "500" },
  headerRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },

  summary: { paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  summaryText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  summaryBold: { fontWeight: "700", color: theme.colors.textPrimary },

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
});
