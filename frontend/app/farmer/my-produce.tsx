import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, StatusBar,
  Modal, ScrollView, TextInput, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const CATEGORY_LABELS: Record<string, string> = {
  vegetable: "Vegetable", fruit: "Fruit", grain: "Grain",
  dairy: "Dairy", herb: "Herb", other: "Other",
};
const CATEGORY_COLORS: Record<string, string> = {
  vegetable: "#10B981", fruit: "#F59E0B", grain: "#D97706",
  dairy: "#3B82F6", herb: "#8B5CF6", other: "#6B7280",
};

export default function MyProduceScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reviews modal
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Edit modal
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);

  const openEditModal = (item: any) => {
    setEditProduct(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditStock(String(item.stock));
    setEditDesc(item.description || "");
    setEditImage(item.image_base64 || undefined);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to change the image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, base64: true, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setEditImage(result.assets[0].base64);
    }
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    const price = parseFloat(editPrice);
    const stock = parseInt(editStock);
    if (!editName.trim()) return Alert.alert("Validation", "Product name is required.");
    if (isNaN(price) || price <= 0) return Alert.alert("Validation", "Enter a valid price.");
    if (isNaN(stock) || stock < 0) return Alert.alert("Validation", "Enter a valid stock quantity.");

    setEditSaving(true);
    try {
      const updated: any = await api.updateProduct(editProduct.id, {
        name: editName.trim(),
        price,
        stock,
        description: editDesc.trim(),
        ...(editImage !== editProduct.image_base64 ? { image_base64: editImage || "" } : {}),
      });
      setProducts(prev => prev.map(p => p.id === editProduct.id ? updated : p));
      setEditProduct(null);
      Alert.alert("Updated!", "Your produce listing has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update product.");
    } finally {
      setEditSaving(false);
    }
  };

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
    Alert.alert("Remove Listing", `Remove "${name}" from the marketplace?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
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

  const avgRating = (reviews: any[]) => {
    if (!reviews.length) return null;
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
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
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{products.length} items</Text>
        </View>
      </View>

      <FlatList
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={54} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No produce listed yet</Text>
            <Text style={styles.emptySubtext}>Head to the Add Produce tab to get started</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catColor = CATEGORY_COLORS[item.category] || "#6B7280";
          const isLowStock = item.stock > 0 && item.stock <= 5;
          const isOutOfStock = item.stock === 0;

          return (
            <View style={styles.card}>
              {/* Image Strip */}
              <View style={styles.imageStrip}>
                {item.image_base64 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: catColor + "18" }]}>
                    <Ionicons name="leaf" size={36} color={catColor} />
                  </View>
                )}

                {/* Category badge */}
                <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
                  <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[item.category] || item.category}</Text>
                </View>

                {/* Stock badge */}
                {isOutOfStock ? (
                  <View style={styles.stockBadgeOut}>
                    <Text style={styles.stockBadgeOutText}>OUT OF STOCK</Text>
                  </View>
                ) : isLowStock ? (
                  <View style={styles.stockBadgeLow}>
                    <Ionicons name="warning" size={10} color="#B45309" />
                    <Text style={styles.stockBadgeLowText}> Low: {item.stock} left</Text>
                  </View>
                ) : null}
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.unitLine}>₹{item.price} / {item.unit}</Text>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>₹{item.price}</Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                ) : null}

                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Ionicons name="cube-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.statText}> {item.stock} in stock</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.statText}> Reviews</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.editBtnText}> Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reviewsBtn}
                    onPress={() => openReviewsModal(item.id, item.name)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="star-outline" size={14} color="#D97706" />
                    <Text style={styles.reviewsBtnText}> Reviews</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.name)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                    <Text style={styles.deleteBtnText}> Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── Edit Modal ─────────────────────────────────────────────────────────── */}
      <Modal visible={!!editProduct} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Edit Listing</Text>
          <TouchableOpacity onPress={() => setEditProduct(null)} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
          {/* Image picker */}
          <Text style={styles.fieldLabel}>Product Photo</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.85}>
            {editImage ? (
              <Image source={{ uri: `data:image/jpeg;base64,${editImage}` }} style={styles.imagePickerPreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePickerEmpty}>
                <Ionicons name="camera-outline" size={28} color={theme.colors.textMuted} />
                <Text style={styles.imagePickerText}>Tap to change photo</Text>
              </View>
            )}
            <View style={styles.imagePickerOverlay}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.imagePickerOverlayText}> Change Photo</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Product Name</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="e.g. Fresh Tomatoes"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Stock (qty)</Text>
              <TextInput
                style={styles.input}
                value={editStock}
                onChangeText={setEditStock}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: "top" }]}
            value={editDesc}
            onChangeText={setEditDesc}
            multiline
            placeholder="Describe freshness, harvest date, certifications…"
            placeholderTextColor={theme.colors.textMuted}
          />

          <TouchableOpacity
            style={[styles.saveBtn, editSaving && { opacity: 0.7 }]}
            onPress={handleSaveEdit}
            disabled={editSaving}
            activeOpacity={0.87}
          >
            {editSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.saveBtnText}> Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* ── Reviews Modal ──────────────────────────────────────────────────────── */}
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
              <Text style={styles.reviewsEmptyText}>No reviews yet</Text>
            </View>
          ) : (
            productReviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitials}>{rev.consumer_name?.charAt(0).toUpperCase() || "C"}</Text>
                    </View>
                    <View>
                      <Text style={styles.reviewerName}>{rev.consumer_name}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons key={s} name={s <= rev.rating ? "star" : "star-outline"} size={12}
                            color={s <= rev.rating ? "#F59E0B" : theme.colors.border} style={{ marginRight: 2 }} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString("en-IN")}</Text>
                </View>
                {rev.comment ? <Text style={styles.reviewComment}>"{rev.comment}"</Text> : null}
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
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  listContainer: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 28 },

  card: {
    backgroundColor: "#fff", borderRadius: 18, marginBottom: 14,
    overflow: "hidden", borderWidth: 1, borderColor: theme.colors.borderLight,
    ...theme.shadow.sm,
  },

  // Image area
  imageStrip: { height: 160, width: "100%", position: "relative" },
  productImage: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  categoryBadge: {
    position: "absolute", top: 10, left: 10,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  stockBadgeOut: {
    position: "absolute", top: 10, right: 10,
    backgroundColor: theme.colors.error,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  stockBadgeOutText: { fontSize: 10, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  stockBadgeLow: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: "#F59E0B",
  },
  stockBadgeLowText: { fontSize: 10, fontWeight: "800", color: "#B45309" },

  // Card body
  cardContent: { padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  productName: { fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 2 },
  unitLine: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "500" },
  priceTag: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: theme.colors.primaryLight + "40",
  },
  priceTagText: { color: theme.colors.primary, fontWeight: "900", fontSize: 15 },

  descText: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10, lineHeight: 17 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  statText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" },

  actionsRow: { flexDirection: "row", gap: 8 },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.primarySoft, borderRadius: 10,
    paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.primaryLight + "55",
  },
  editBtnText: { fontSize: 13, color: theme.colors.primary, fontWeight: "800" },
  reviewsBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFBEB", borderRadius: 10,
    paddingVertical: 9, borderWidth: 1, borderColor: "#F59E0B",
  },
  reviewsBtnText: { fontSize: 13, color: "#B45309", fontWeight: "800" },
  deleteBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.errorSoft, borderRadius: 10,
    paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.error + "40",
  },
  deleteBtnText: { fontSize: 13, color: theme.colors.error, fontWeight: "800" },

  empty: { flex: 1, alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 6, marginTop: 14 },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted },

  // Modal shared
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    backgroundColor: "#fff",
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary, flex: 1, marginRight: 10 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },

  // Edit modal fields
  fieldLabel: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: theme.colors.textPrimary, backgroundColor: "#fff",
  },
  imagePicker: {
    height: 160, borderRadius: 14, overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt, borderWidth: 1.5,
    borderColor: theme.colors.border, position: "relative",
    alignItems: "center", justifyContent: "center",
  },
  imagePickerPreview: { width: "100%", height: "100%", position: "absolute" },
  imagePickerEmpty: { alignItems: "center", gap: 8 },
  imagePickerText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: "600" },
  imagePickerOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.52)", flexDirection: "row",
    alignItems: "center", justifyContent: "center", paddingVertical: 8,
  },
  imagePickerOverlayText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  saveBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 14,
    height: 52, flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginTop: 24, marginBottom: 30,
    ...theme.shadow.sm,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Reviews modal
  reviewsEmpty: { alignItems: "center", paddingVertical: 40 },
  reviewsEmptyText: { fontSize: 14, fontWeight: "700", color: theme.colors.textMuted, marginTop: 10 },
  reviewCard: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingVertical: 14 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  reviewerInfo: { flexDirection: "row", alignItems: "center" },
  reviewerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 10 },
  reviewerInitials: { fontSize: 13, fontWeight: "900", color: theme.colors.primary },
  reviewerName: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  reviewStars: { flexDirection: "row", marginTop: 2 },
  reviewDate: { fontSize: 10, color: theme.colors.textMuted, fontWeight: "600" },
  reviewComment: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: "italic", lineHeight: 18, paddingLeft: 44 },
});
