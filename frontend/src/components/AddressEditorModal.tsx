import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { parseAddress, StructuredAddress } from "../utils/address";

interface AddressEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (addressString: string) => void;
  initialAddressString?: string;
}

export default function AddressEditorModal({
  visible,
  onClose,
  onSave,
  initialAddressString,
}: AddressEditorModalProps) {
  const [flat, setFlat] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [tag, setTag] = useState<"Home" | "Work" | "Other">("Home");

  useEffect(() => {
    if (visible) {
      const parsed = parseAddress(initialAddressString);
      setFlat(parsed.flat);
      setStreet(parsed.street);
      setLandmark(parsed.landmark);
      setCity(parsed.city);
      setPincode(parsed.pincode);
      setTag(parsed.tag);
    }
  }, [visible, initialAddressString]);

  const handleSave = () => {
    if (!flat.trim()) {
      Alert.alert("Required Field", "Please enter flat/house/building details.");
      return;
    }
    if (!street.trim()) {
      Alert.alert("Required Field", "Please enter street/area/locality details.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Required Field", "Please enter city.");
      return;
    }
    const cleanPin = pincode.trim();
    if (!cleanPin || cleanPin.length !== 6 || isNaN(Number(cleanPin))) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit pincode.");
      return;
    }

    const addrObject: StructuredAddress = {
      flat: flat.trim(),
      street: street.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      pincode: cleanPin,
      tag: tag,
    };

    onSave(JSON.stringify(addrObject));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Flat/House */}
            <Text style={styles.label}>Flat, House no., Building, Apartment *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat 302, Green Villa"
                placeholderTextColor={theme.colors.textMuted}
                value={flat}
                onChangeText={setFlat}
              />
            </View>

            {/* Area/Street */}
            <Text style={styles.label}>Area, Street, Sector, Locality *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="map-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. MG Road, Indiranagar"
                placeholderTextColor={theme.colors.textMuted}
                value={street}
                onChangeText={setStreet}
              />
            </View>

            {/* Landmark */}
            <Text style={styles.label}>Landmark (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="flag-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Near Metro Station"
                placeholderTextColor={theme.colors.textMuted}
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>

            {/* Row for City and Pincode */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>City *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Bangalore"
                    placeholderTextColor={theme.colors.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Pincode *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="pin-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="6 digits"
                    placeholderTextColor={theme.colors.textMuted}
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
            </View>

            {/* Tag selector */}
            <Text style={styles.label}>Save Address As</Text>
            <View style={styles.tagRow}>
              {(["Home", "Work", "Other"] as const).map((t) => {
                const isActive = tag === t;
                const iconName = t === "Home" ? "home" : t === "Work" ? "briefcase" : "location";
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.tagButton,
                      isActive && {
                        backgroundColor: theme.colors.primarySoft,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setTag(t)}
                  >
                    <Ionicons
                      name={isActive ? (iconName as any) : (`${iconName}-outline` as any)}
                      size={15}
                      color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    height: "100%",
  },
  row: {
    flexDirection: "row",
  },
  tagRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  tagButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tagTextActive: {
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
