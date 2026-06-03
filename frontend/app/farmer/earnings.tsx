import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, Dimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const BAR_MAX_HEIGHT = 80;
const { width } = Dimensions.get("window");

export default function EarningsScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res: any = await api.earningsSummary();
      setData(res);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;
  if (!data) return null;

  const maxAmount = Math.max(...data.chart.map((c: any) => c.amount), 1);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={styles.summaryValue}>₹{data.total.toFixed(0)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.secondary }]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryValue}>₹{data.pending.toFixed(0)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#388E3C" }]}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={styles.summaryValue}>₹{data.paid.toFixed(0)}</Text>
        </View>
      </View>

      {/* 7-day bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days</Text>
        <View style={styles.chart}>
          {data.chart.map((entry: any, i: number) => {
            const barH = maxAmount > 0 ? (entry.amount / maxAmount) * BAR_MAX_HEIGHT : 0;
            const day = new Date(entry.date).toLocaleDateString("en-IN", { weekday: "short" });
            return (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barAmount}>
                  {entry.amount > 0 ? `₹${entry.amount}` : ""}
                </Text>
                <View style={[styles.bar, { height: Math.max(barH, 4) }]} />
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent orders */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {data.recent.length === 0 && (
        <Text style={styles.noData}>No transactions yet</Text>
      )}
      {data.recent.map((order: any) => (
        <View key={order.id} style={styles.transactionCard}>
          <View>
            <Text style={styles.txProduct}>{order.product_name}</Text>
            <Text style={styles.txMeta}>
              {order.consumer_name} · Qty {order.quantity}
            </Text>
            <Text style={styles.txDate}>
              {new Date(order.created_at).toLocaleDateString("en-IN")}
            </Text>
          </View>
          <View style={styles.txRight}>
            <Text style={styles.txAmount}>₹{order.total}</Text>
            <Text style={[styles.txStatus, { color: order.status === "delivered" ? "#2E7D32" : "#E65100" }]}>
              {order.status}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: theme.borderRadius.md, padding: 14, alignItems: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600", marginBottom: 4 },
  summaryValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  chartCard: { backgroundColor: "#fff", borderRadius: theme.borderRadius.md, padding: 16, marginBottom: 20, ...theme.shadow.sm },
  chartTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 16 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: BAR_MAX_HEIGHT + 40 },
  barWrapper: { alignItems: "center", flex: 1 },
  barAmount: { fontSize: 9, color: theme.colors.textMuted, marginBottom: 2 },
  bar: { width: 22, backgroundColor: theme.colors.primary, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 12 },
  noData: { color: theme.colors.textMuted, textAlign: "center", paddingVertical: 20 },
  transactionCard: { backgroundColor: "#fff", borderRadius: theme.borderRadius.md, padding: 14,
    marginBottom: 10, flexDirection: "row", justifyContent: "space-between", ...theme.shadow.sm },
  txProduct: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  txMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  txDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 16, fontWeight: "700", color: theme.colors.primary },
  txStatus: { fontSize: 11, fontWeight: "500", marginTop: 2, textTransform: "capitalize" },
});
