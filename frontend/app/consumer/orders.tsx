import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const STATUS_COLORS: Record<string, string> = {
  accepted: "#1565C0",
  dispatched: "#E65100",
  delivered: "#2E7D32",
  cancelled: "#B71C1C",
};

export default function ConsumerOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Browse produce and place your first order!</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.productName}>{item.product_name}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || "#666" }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.detail}>Qty: {item.quantity} · ₹{item.total}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.detail}> {item.delivery_address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.detail}> {item.payment_method}</Text>
          </View>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
          })}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: theme.borderRadius.md, padding: 16,
    marginBottom: 12, ...theme.shadow.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  productName: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, flex: 1, marginRight: 8 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  detail: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 3 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  date: { fontSize: 11, color: theme.colors.textMuted, marginTop: 8 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 6, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted },
});
