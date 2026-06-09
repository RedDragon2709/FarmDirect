import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, Animated, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

/**
 * Auto-delivery logic:
 * - When farmer dispatches → backend sets status to "dispatched"
 * - We store a dispatch timestamp locally
 * - After DELIVERY_WINDOW_MS, we auto-call the API to mark "delivered"
 * - This simulates a delivery partner system without needing one
 * - Farmer's only real job: Accept → Pack → Dispatch (3 steps)
 */
const DELIVERY_WINDOW_MS = 30 * 60 * 1000; // 30 min in real, reduced for demo

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; next?: string; actionLabel?: string }> = {
  placed:     { label: "New Order",    color: "#3B82F6", bg: "#EFF6FF",  icon: "receipt-outline",          next: "confirmed",  actionLabel: "Accept Order" },
  confirmed:  { label: "Accepted",     color: "#F59E0B", bg: "#FFFBEB",  icon: "checkmark-circle-outline", next: "packed",     actionLabel: "Mark as Packed" },
  packed:     { label: "Packed",       color: "#8B5CF6", bg: "#F5F3FF",  icon: "cube-outline",             next: "dispatched", actionLabel: "Hand Over to Delivery" },
  dispatched: { label: "Out for Delivery", color: "#FF6B35", bg: "#FFF4EE", icon: "bicycle-outline" },
  delivered:  { label: "Delivered",    color: "#10B981", bg: "#ECFDF5",  icon: "checkmark-done" },
  cancelled:  { label: "Cancelled",    color: "#EF4444", bg: "#FEF2F2",  icon: "close-circle-outline" },
};

const STATUS_ORDER = ["placed", "confirmed", "packed", "dispatched", "delivered"];

const TABS = [
  { key: "action",    label: "Need Action" },
  { key: "active",   label: "In Progress" },
  { key: "done",     label: "Completed" },
];

function PulsingDot({ color = "#3B82F6" }: { color?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.7, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 750, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ scale: pulse }] }]} />;
}

function DeliveryCountdown({ orderId, dispatchedAt }: { orderId: string; dispatchedAt: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - dispatchedAt;
      setRemaining(Math.max(0, DELIVERY_WINDOW_MS - elapsed));
    };
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, [dispatchedAt]);

  const mins = Math.ceil(remaining / 60000);
  if (remaining === 0) return (
    <View style={styles.etaBadge}>
      <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
      <Text style={[styles.etaText, { color: theme.colors.success }]}> Delivered!</Text>
    </View>
  );
  return (
    <View style={styles.etaBadge}>
      <Ionicons name="time-outline" size={12} color="#FF6B35" />
      <Text style={[styles.etaText, { color: "#FF6B35" }]}> ~{mins} min to deliver</Text>
    </View>
  );
}

export default function FarmerOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("action");
  // Map orderId → timestamp when it was dispatched
  const [dispatchTimes, setDispatchTimes] = useState<Record<string, number>>({});

  const load = async () => {
    try {
      const data: any = await api.farmerOrders();
      setOrders(data);
      // Auto-mark dispatched orders that have exceeded delivery window
      for (const order of data) {
        if (order.status === "dispatched") {
          const key = `dispatch_time_${order.id}`;
          const storedTime = await AsyncStorage.getItem(key);
          if (storedTime) {
            const elapsed = Date.now() - parseInt(storedTime);
            if (elapsed >= DELIVERY_WINDOW_MS) {
              // Auto-advance to delivered
              try {
                await api.updateOrderStatus(order.id, "delivered");
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "delivered" } : o));
              } catch {}
            } else {
              setDispatchTimes(prev => ({ ...prev, [order.id]: parseInt(storedTime) }));
            }
          } else {
            // No stored time: set now (order was dispatched before app opened)
            const now = Date.now();
            await AsyncStorage.setItem(key, now.toString());
            setDispatchTimes(prev => ({ ...prev, [order.id]: now }));
          }
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updated: any = await api.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      // When dispatching, store timestamp for auto-advance
      if (newStatus === "dispatched") {
        const now = Date.now();
        await AsyncStorage.setItem(`dispatch_time_${orderId}`, now.toString());
        setDispatchTimes(prev => ({ ...prev, [orderId]: now }));
        Alert.alert(
          "🛵 Order Dispatched!",
          "Delivery is in progress. The order will be automatically marked as delivered once the delivery window closes.\n\nNo further action needed from you!"
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update order status.");
    }
  };

  const filterOrders = () => {
    if (tab === "action") return orders.filter(o => ["placed", "confirmed", "packed"].includes(o.status));
    if (tab === "active") return orders.filter(o => o.status === "dispatched");
    return orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  };

  const filteredOrders = filterOrders();
  const newCount = orders.filter(o => o.status === "placed").length;
  const activeCount = orders.filter(o => o.status === "dispatched").length;

  if (loading) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <Text style={styles.headerTitle}>Your Orders</Text>
        {newCount > 0 && (
          <View style={styles.headerBadge}>
            <PulsingDot color="#3B82F6" />
            <Text style={styles.headerBadgeText}> {newCount} new</Text>
          </View>
        )}
      </View>

      {/* Auto-delivery info strip */}
      <View style={styles.infoStrip}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.primaryDark} />
        <Text style={styles.infoStripText}>
          {"  "}Once dispatched, delivery is tracked automatically — no manual confirmation needed.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const count = t.key === "action" ? orders.filter(o => ["placed","confirmed","packed"].includes(o.status)).length
            : t.key === "active" ? activeCount
            : orders.filter(o => ["delivered","cancelled"].includes(o.status)).length;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, tab === t.key ? { backgroundColor: "#fff" } : { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.tabBadgeText, tab === t.key ? { color: theme.colors.primary } : { color: "#fff" }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Explanatory hint per tab */}
      {tab === "action" && filteredOrders.length > 0 && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>
            👇 Accept orders → Pack them → Hand over to delivery partner
          </Text>
        </View>
      )}
      {tab === "active" && filteredOrders.length > 0 && (
        <View style={[styles.hintBanner, { backgroundColor: "#FFF4EE", borderLeftColor: "#FF6B35" }]}>
          <Text style={[styles.hintText, { color: "#9A3412" }]}>
            🛵 These orders are out for delivery. Auto-marked as delivered on arrival.
          </Text>
        </View>
      )}

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
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
            <Text style={{ fontSize: 52 }}>
              {tab === "action" ? "📬" : tab === "active" ? "🛵" : "✅"}
            </Text>
            <Text style={styles.emptyTitle}>
              {tab === "action" ? "No orders pending"
                : tab === "active" ? "No deliveries in progress"
                : "No completed orders yet"}
            </Text>
            <Text style={styles.emptySub}>
              {tab === "action" ? "New orders will appear here for you to accept."
                : tab === "active" ? "Dispatched orders appear here with auto-tracking."
                : "Completed and cancelled orders show up here."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusVal = item.status || "placed";
          const cfg = STATUS_CONFIG[statusVal] || { label: statusVal, color: "#666", bg: "#F8FAFC", icon: "ellipse-outline", next: undefined, actionLabel: undefined };
          const isNew = statusVal === "placed";
          const isDispatched = statusVal === "dispatched";
          const currentIdx = STATUS_ORDER.indexOf(statusVal);

          return (
            <View style={[styles.card, isNew && styles.cardNew, isDispatched && styles.cardDispatched]}>
              {isNew && (
                <View style={styles.newBanner}>
                  <PulsingDot />
                  <Text style={styles.newBannerText}> NEW ORDER</Text>
                </View>
              )}

              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  <Text style={styles.customerLine}>
                    <Ionicons name="person-outline" size={11} color={theme.colors.textMuted} /> {item.consumer_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + "50" }]}>
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Delivery countdown for dispatched */}
              {isDispatched && dispatchTimes[item.id] && (
                <DeliveryCountdown orderId={item.id} dispatchedAt={dispatchTimes[item.id]} />
              )}

              {/* Order details */}
              <View style={styles.detailsRow}>
                <View style={styles.detailChip}>
                  <Ionicons name="cube-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}> {item.quantity} {item.unit || "unit"}</Text>
                </View>
                <View style={styles.detailChip}>
                  <Ionicons name="cash-outline" size={12} color={theme.colors.primary} />
                  <Text style={[styles.detailText, { color: theme.colors.primary, fontWeight: "800" }]}> ₹{item.total}</Text>
                </View>
                <View style={[
                  styles.detailChip,
                  { backgroundColor: item.payment_status === "paid" ? theme.colors.successSoft : "#FFFBEB" },
                ]}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: item.payment_status === "paid" ? theme.colors.success : "#D97706" }}>
                    {item.payment_status === "paid" ? "✓ PAID" : "COD"}
                  </Text>
                </View>
              </View>

              {/* Progress steps (mini timeline) */}
              {statusVal !== "cancelled" && (
                <View style={styles.miniProgress}>
                  {STATUS_ORDER.map((s, i) => {
                    const done = i <= currentIdx;
                    const isLast = i === STATUS_ORDER.length - 1;
                    return (
                      <React.Fragment key={s}>
                        <View style={[styles.miniDot, done && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]} />
                        {!isLast && <View style={[styles.miniLine, i < currentIdx && { backgroundColor: theme.colors.primary }]} />}
                      </React.Fragment>
                    );
                  })}
                </View>
              )}

              {/* Address */}
              <View style={styles.addrRow}>
                <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
                <Text style={styles.addrText} numberOfLines={1}> {item.delivery_address}</Text>
              </View>

              {/* Action buttons — only for "action" tab items */}
              {cfg.next && (
                <View style={styles.actionRow}>
                  {statusVal === "placed" && (
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() =>
                        Alert.alert("Reject Order", "This will cancel the order. Proceed?", [
                          { text: "No" },
                          { text: "Cancel Order", style: "destructive", onPress: () => updateStatus(item.id, "cancelled") },
                        ])
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={14} color={theme.colors.error} />
                      <Text style={styles.rejectBtnText}> Reject</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, statusVal === "placed" && { backgroundColor: "#2563EB" }]}
                    onPress={() => {
                      if (statusVal === "packed") {
                        // Confirm before dispatching — this is the last manual step
                        Alert.alert(
                          "Hand Over to Delivery?",
                          `Confirm that "${item.product_name}" has been handed to the delivery partner. After this, delivery tracks automatically!`,
                          [
                            { text: "Not yet" },
                            { text: "Yes, Dispatch!", onPress: () => updateStatus(item.id, cfg.next!) },
                          ]
                        );
                      } else {
                        updateStatus(item.id, cfg.next!);
                      }
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.actionBtnText}>{cfg.actionLabel}</Text>
                    <Ionicons name="arrow-forward" size={13} color="#fff" style={{ marginLeft: 5 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Dispatched — auto-track note */}
              {isDispatched && (
                <View style={styles.autoTrackNote}>
                  <Ionicons name="shield-checkmark" size={13} color="#FF6B35" />
                  <Text style={styles.autoTrackText}>
                    {"  "}Auto-tracking active · Will mark delivered on arrival
                  </Text>
                </View>
              )}

              {statusVal === "delivered" && (
                <View style={styles.deliveredNote}>
                  <Ionicons name="checkmark-circle" size={13} color={theme.colors.success} />
                  <Text style={styles.deliveredNoteText}> Order completed · ₹{item.total} earned</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },

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
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, color: "#fff", fontWeight: "800" },

  infoStrip: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 9,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
  },
  infoStripText: { flex: 1, fontSize: 11, color: theme.colors.primaryDark, lineHeight: 16, fontWeight: "500" },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingHorizontal: 12, paddingTop: 8,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: "transparent",
    gap: 5,
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.primary },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  tabBadgeText: { fontSize: 10, fontWeight: "900" },

  hintBanner: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 8,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
  },
  hintText: { fontSize: 12, color: theme.colors.primaryDark, fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  cardNew: { borderColor: "#93C5FD", borderWidth: 2 },
  cardDispatched: { borderColor: "#FDBA74", borderWidth: 2 },

  newBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#EFF6FF", alignSelf: "flex-start",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 10,
  },
  newBannerText: { fontSize: 10, fontWeight: "900", color: "#2563EB", letterSpacing: 0.7 },

  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statusIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  productName: { fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 2 },
  customerLine: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  statusBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },

  etaBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF4EE", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 10, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "#FDBA74",
  },
  etaText: { fontSize: 12, fontWeight: "700" },

  detailsRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  detailChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  detailText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" },

  miniProgress: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingHorizontal: 2 },
  miniDot: {
    width: 9, height: 9, borderRadius: 5,
    borderWidth: 2, borderColor: theme.colors.border,
    backgroundColor: "#fff",
  },
  miniLine: { flex: 1, height: 2, backgroundColor: theme.colors.border, marginHorizontal: 2 },

  addrRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  addrText: { flex: 1, fontSize: 11, color: theme.colors.textMuted, fontWeight: "500" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 2, backgroundColor: theme.colors.primary,
    borderRadius: 11, height: 40,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    ...theme.shadow.xs,
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rejectBtn: {
    flex: 1, flexDirection: "row",
    borderWidth: 1.5, borderColor: theme.colors.error,
    borderRadius: 11, height: 40,
    alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.errorSoft,
  },
  rejectBtnText: { color: theme.colors.error, fontSize: 12, fontWeight: "700" },

  autoTrackNote: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF4EE", borderRadius: 8, padding: 9, marginTop: 4,
  },
  autoTrackText: { fontSize: 11, color: "#9A3412", fontWeight: "600", flex: 1 },

  deliveredNote: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.successSoft,
    borderRadius: 8, padding: 9,
  },
  deliveredNoteText: { fontSize: 11, color: theme.colors.success, fontWeight: "700" },

  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 2 },

  empty: { alignItems: "center", paddingTop: 90, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center", lineHeight: 20 },
});
