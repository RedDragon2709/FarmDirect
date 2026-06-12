import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, StatusBar, Modal, ScrollView
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

  // Reviews state
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const openReviewsModal = async (id: string, name: string) => {
    setSelectedProduct({ id, name });
    setReviewsLoading(true);
    try {
      const data: any = await api.getProductReviews(id);
      setProductReviews(data || []);
    } catch {
      setProductReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

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

              <TouchableOpacity 
                style={styles.reviewsRow} 
                onPress={() => openReviewsModal(item.id, item.name)}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={14} color={theme.colors.secondaryDark} />
                <Text style={styles.reviewsBtn}> Reviews</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteRow} onPress={() => handleDelete(item.id, item.name)}>
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                <Text style={styles.deleteBtn}> Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Reviews Modal */}
      <Modal visible={!!selectedProduct} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle} numberOfLines={1}>
            Reviews: {selectedProduct?.name}
          </Text>
          <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {reviewsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : productReviews.length === 0 ? (
            <View style={styles.reviewsEmpty}>
              <Ionicons name="chatbox-outline" size={36} color={theme.colors.textMuted} />
              <Text style={styles.reviewsEmptyText}>No reviews for this product yet</Text>
            </View>
          ) : (
            productReviews.map((rev) => (
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
                    {new Date(rev.created_at).toLocaleDateString("en-IN")}
                  </Text>
                </View>
                {rev.comment ? (
                  <Text style={styles.reviewComment}>"{rev.comment}"</Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
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
  reviewsRow: { flexDirection: "row", alignItems: "center" },
  reviewsBtn: { fontSize: 13, color: theme.colors.secondaryDark, fontWeight: "600" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    backgroundColor: "#fff",
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary, flex: 1, marginRight: 10 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  reviewsEmpty: { alignItems: "center", paddingVertical: 40 },
  reviewsEmptyText: { fontSize: 14, fontWeight: "700", color: theme.colors.textMuted, marginTop: 10 },
  reviewCard: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingVertical: 12 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  reviewerInfo: { flexDirection: "row", alignItems: "center" },
  reviewerAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 10 },
  reviewerInitials: { fontSize: 12, fontWeight: "800", color: theme.colors.primary },
  reviewerName: { fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary },
  reviewStars: { flexDirection: "row", marginTop: 2 },
  reviewDate: { fontSize: 10, color: theme.colors.textMuted, fontWeight: "500" },
  reviewComment: { fontSize: 12, color: theme.colors.textSecondary, fontStyle: "italic", lineHeight: 16, paddingLeft: 40 },
});
