import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../../src/theme";

export default function SelectTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<"farmer" | "consumer" | null>(null);

  const handleContinue = async () => {
    if (!selected) {
      Alert.alert("Choose an option", "Please select Farmer or Consumer");
      return;
    }
    // Update user type in storage
    const userStr = await AsyncStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      user.user_type = selected;
      await AsyncStorage.setItem("user", JSON.stringify(user));
    }
    if (selected === "farmer") router.replace("/farmer");
    else router.replace("/consumer");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How will you use FarmDirect?</Text>
      <Text style={styles.subtitle}>
        You signed in with Google. Tell us your role.
      </Text>

      <TouchableOpacity
        style={[styles.card, selected === "farmer" && styles.cardActive]}
        onPress={() => setSelected("farmer")}
      >
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons name="account-cowboy-hat" size={40} color={selected === "farmer" ? theme.colors.primary : theme.colors.textSecondary} />
        </View>
        <Text style={styles.cardTitle}>Farmer</Text>
        <Text style={styles.cardDesc}>Sell your produce directly</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, selected === "consumer" && styles.cardActive]}
        onPress={() => setSelected("consumer")}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name="cart" size={40} color={selected === "consumer" ? theme.colors.primary : theme.colors.textSecondary} />
        </View>
        <Text style={styles.cardTitle}>Consumer</Text>
        <Text style={styles.cardDesc}>Buy fresh from local farmers</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, !selected && { opacity: 0.5 }]}
        onPress={handleContinue}
      >
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  cardActive: { borderColor: theme.colors.primary, backgroundColor: "#F1F8E9" },
  iconWrapper: { marginBottom: 8 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: { fontSize: 13, color: theme.colors.textSecondary },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
