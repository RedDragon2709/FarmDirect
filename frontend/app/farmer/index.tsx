import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { theme } from "../../src/theme";

const CATEGORIES = ["vegetable", "fruit", "grain", "dairy", "herb", "other"];
const UNITS = ["kg", "g", "litre", "dozen", "piece", "bunch"];

export default function AddProduceScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("vegetable");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("kg");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || "");
    }
  };

  const handleSubmit = async () => {
    if (!name || !price || !stock) {
      Alert.alert("Error", "Name, price, and stock are required");
      return;
    }
    setLoading(true);
    try {
      await api.createProduct({
        name,
        category,
        price: parseFloat(price),
        stock: parseInt(stock),
        unit,
        description,
        image_base64: imageBase64,
      });
      Alert.alert("Success!", `${name} listed successfully`);
      setName(""); setPrice(""); setStock(""); setDescription("");
      setImageBase64(""); setImageUri("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Product Details</Text>

      <Text style={styles.label}>Product Name *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName}
        placeholder="e.g. Fresh Tomatoes" placeholderTextColor={theme.colors.textMuted} />

      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice}
            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Stock *</Text>
          <TextInput style={styles.input} value={stock} onChangeText={setStock}
            keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} />
        </View>
      </View>

      <Text style={styles.label}>Unit</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {UNITS.map((u) => (
          <TouchableOpacity key={u} style={[styles.chip, unit === u && styles.chipActive]}
            onPress={() => setUnit(u)}>
            <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={description}
        onChangeText={setDescription} multiline placeholder="Optional notes about your produce"
        placeholderTextColor={theme.colors.textMuted} />

      <Text style={styles.label}>Photo</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePickerContent}>
            <Ionicons name="camera-outline" size={24} color={theme.colors.textMuted} />
            <Text style={styles.imagePickerText}>  Tap to pick from gallery</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? "Listing..." : "List Produce"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 16, marginTop: 8 },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    padding: 12, fontSize: 15, color: theme.colors.textPrimary, backgroundColor: "#fff" },
  row: { flexDirection: "row" },
  chip: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.full,
    paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  imagePicker: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    height: 120, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", marginBottom: 4 },
  imagePickerContent: { flexDirection: "row", alignItems: "center" },
  imagePickerText: { color: theme.colors.textMuted, fontSize: 14 },
  imagePreview: { width: "100%", height: "100%", borderRadius: theme.borderRadius.md },
  btn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingVertical: 16, alignItems: "center", marginTop: 24, marginBottom: 40 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
