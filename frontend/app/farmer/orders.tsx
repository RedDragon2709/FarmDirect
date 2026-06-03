import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator,
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

const NEXT_STATUS: Record<string, string> = {
  accepted: "dispatched",
  dispatched: "delivered",
};

export default function FarmerOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data: any = await api.farmerOrders();
      setOrders(data);
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
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="mail-open-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Orders will appear here once consumers buy</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.productName}>{item.product_name}</Text>
              <View style={styles.inlineRow}>
                <Ionicons name="person-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={styles.consumer}> {item.consumer_name}</Text>
              </View>
              <Text style={styles.qty}>Qty: {item.quantity} · ₹{item.total}</Text>
              <View style={styles.inlineRow}>
                <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.address}> {item.delivery_address}</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || "#666" }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>

          {NEXT_STATUS[item.status] && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => updateStatus(item.id, NEXT_STATUS[item.status])}
            >
              <Text style={styles.actionBtnText}>
                Mark as {NEXT_STATUS[item.status]}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: theme.borderRadius.md, padding: 16, marginBottom: 12, ...theme.shadow.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
  inlineRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  productName: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 4 },
  consumer: { fontSize: 13, color: theme.colors.textSecondary },
  qty: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 2 },
  address: { fontSize: 12, color: theme.colors.textMuted },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  actionBtn: { marginTop: 12, backgroundColor: theme.colors.primary, borderRadius: 8,
    paddingVertical: 8, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 6, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted },
});
