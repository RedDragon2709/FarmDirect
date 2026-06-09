import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

export default function MyProduceScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data: any = await api.myProducts();
      setProducts(data);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <Text style={styles.headerTitle}>My Listed Produce</Text>
      </View>

      <FlatList
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No produce listed yet</Text>
            <Text style={styles.emptySubtext}>Head to Add Produce tab to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productCategory}>{item.category} · {item.unit}</Text>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>₹{item.price}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.stockRow}>
                <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.stockText}> Stock: {item.stock}</Text>
              </View>
              <TouchableOpacity style={styles.deleteRow} onPress={() => handleDelete(item.id, item.name)}>
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                <Text style={styles.deleteBtn}> Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: theme.borderRadius.md, padding: 16,
    marginBottom: 12, ...theme.shadow.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  productName: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  productCategory: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, textTransform: "capitalize" },
  priceTag: { backgroundColor: theme.colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  priceText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stockRow: { flexDirection: "row", alignItems: "center" },
  stockText: { fontSize: 13, color: theme.colors.textSecondary },
  deleteRow: { flexDirection: "row", alignItems: "center" },
  deleteBtn: { fontSize: 13, color: theme.colors.error, fontWeight: "500" },
  empty: { flex: 1, alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 6, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted },
});
