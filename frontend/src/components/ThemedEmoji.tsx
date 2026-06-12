import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";

export type EmojiName =
  | "cart"
  | "basket"
  | "all"
  | "vegetable"
  | "fruit"
  | "grain"
  | "dairy"
  | "herb"
  | "other"
  | "sprout"
  | "sprout_large"
  | "lightning"
  | "middlemen"
  | "shakehands"
  | "user"
  | "farmer"
  | "success"
  | "star"
  | "rating"
  | "delivery"
  | "rider"
  | "map"
  | "home"
  | "location"
  | "pin"
  | "fresh"
  | "photo"
  | "gallery"
  | "cow"
  | "chicken"
  | "poultry"
  | "egg"
  | "driver"
  | "alert"
  | "box"
  | "welcome"
  | "listed"
  | "check";

interface ThemedEmojiProps {
  name: EmojiName;
  inline?: boolean;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const EMOJI_MAP: Record<
  EmojiName,
  {
    library: "Ionicons" | "MaterialCommunityIcons";
    name: string;
    bg: string;
    color: string;
  }
> = {
  cart: { library: "Ionicons", name: "cart", bg: theme.colors.infoSoft, color: theme.colors.info },
  basket: { library: "Ionicons", name: "basket", bg: theme.colors.primarySoft, color: theme.colors.primary },
  all: { library: "Ionicons", name: "basket", bg: theme.colors.primarySoft, color: theme.colors.primary },
  vegetable: { library: "MaterialCommunityIcons", name: "carrot", bg: "#FEF3C7", color: "#D97706" }, // Amber/carrot theme
  fruit: { library: "MaterialCommunityIcons", name: "apple", bg: "#FEE2E2", color: "#EF4444" }, // Red theme
  grain: { library: "MaterialCommunityIcons", name: "barley", bg: "#FEF3C7", color: "#B45309" }, // Amber/wheat theme
  dairy: { library: "MaterialCommunityIcons", name: "cheese", bg: "#F1F5F9", color: "#475569" }, // Gray theme
  herb: { library: "MaterialCommunityIcons", name: "sprout", bg: "#DCFCE7", color: "#16A34A" }, // Green theme
  other: { library: "MaterialCommunityIcons", name: "package-variant-closed", bg: "#F3E8FF", color: "#7C3AED" }, // Purple theme
  box: { library: "MaterialCommunityIcons", name: "package-variant-closed", bg: "#F3E8FF", color: "#7C3AED" },
  sprout: { library: "MaterialCommunityIcons", name: "sprout", bg: "#DCFCE7", color: "#16A34A" },
  sprout_large: { library: "MaterialCommunityIcons", name: "sprout", bg: "#DCFCE7", color: "#16A34A" },
  lightning: { library: "Ionicons", name: "flash", bg: "#FEF3C7", color: "#F59E0B" },
  middlemen: { library: "MaterialCommunityIcons", name: "handshake", bg: "#F3E8FF", color: "#7C3AED" },
  shakehands: { library: "MaterialCommunityIcons", name: "handshake", bg: "#F3E8FF", color: "#7C3AED" },
  user: { library: "Ionicons", name: "person", bg: "#E2E8F0", color: "#475569" },
  farmer: { library: "Ionicons", name: "person", bg: "#DCFCE7", color: "#0A7A40" },
  success: { library: "Ionicons", name: "checkmark-circle", bg: "#DCFCE7", color: "#16A34A" },
  check: { library: "Ionicons", name: "checkmark-circle", bg: "#DCFCE7", color: "#16A34A" },
  star: { library: "Ionicons", name: "star", bg: "#FEF3C7", color: "#F59E0B" },
  rating: { library: "Ionicons", name: "star", bg: "#FEF3C7", color: "#F59E0B" },
  delivery: { library: "MaterialCommunityIcons", name: "motorbike", bg: "#FEF3C7", color: "#D97706" },
  rider: { library: "MaterialCommunityIcons", name: "motorbike", bg: "#FEF3C7", color: "#D97706" },
  map: { library: "Ionicons", name: "map", bg: "#E0F2FE", color: "#0284C7" },
  home: { library: "Ionicons", name: "home", bg: "#E0F2FE", color: "#0284C7" },
  location: { library: "Ionicons", name: "pin", bg: "#FEE2E2", color: "#EF4444" },
  pin: { library: "Ionicons", name: "pin", bg: "#FEE2E2", color: "#EF4444" },
  fresh: { library: "MaterialCommunityIcons", name: "leaf", bg: "#DCFCE7", color: "#16A34A" },
  photo: { library: "Ionicons", name: "camera", bg: "#E2E8F0", color: "#475569" },
  gallery: { library: "Ionicons", name: "image", bg: "#E2E8F0", color: "#475569" },
  cow: { library: "MaterialCommunityIcons", name: "cow", bg: "#F1F5F9", color: "#475569" },
  chicken: { library: "MaterialCommunityIcons", name: "food-chicken", bg: "#FEF3C7", color: "#D97706" },
  poultry: { library: "MaterialCommunityIcons", name: "food-chicken", bg: "#FEF3C7", color: "#D97706" },
  egg: { library: "MaterialCommunityIcons", name: "egg-olive", bg: "#FEF3C7", color: "#D97706" },
  driver: { library: "Ionicons", name: "person-circle", bg: "#E2E8F0", color: "#475569" },
  alert: { library: "Ionicons", name: "alert-circle", bg: "#FEE2E2", color: "#EF4444" },
  welcome: { library: "Ionicons", name: "ribbon", bg: "#DCFCE7", color: "#0A7A40" },
  listed: { library: "Ionicons", name: "checkmark-done-circle", bg: "#DCFCE7", color: "#0A7A40" },
};

export const ThemedEmoji: React.FC<ThemedEmojiProps> = ({
  name,
  inline = false,
  size,
  color,
  style,
}) => {
  const config = EMOJI_MAP[name] || {
    library: "Ionicons",
    name: "help-circle",
    bg: "#F1F5F9",
    color: "#475569",
  };

  const IconLib =
    config.library === "Ionicons" ? Ionicons : MaterialCommunityIcons;
  const iconColor = color || config.color;

  if (inline) {
    const defaultInlineSize = size || 16;
    return (
      <IconLib
        name={config.name as any}
        size={defaultInlineSize}
        color={iconColor}
        style={style as any}
      />
    );
  }

  const defaultBadgeSize = size || 24;
  const containerSize = defaultBadgeSize * 1.8;
  const iconSize = defaultBadgeSize;

  return (
    <View
      style={[
        styles.badge,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: config.bg,
        },
        style,
      ]}
    >
      <IconLib name={config.name as any} size={iconSize} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.xs,
  },
});
