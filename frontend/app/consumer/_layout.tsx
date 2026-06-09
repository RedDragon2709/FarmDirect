import React, { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/theme";
import { getCartCount, subscribeToCart } from "../../src/cart";

export default function ConsumerLayout() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    getCartCount().then(setCartCount);
    return subscribeToCart(() => {
      getCartCount().then(setCartCount);
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800", fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "FarmDirect",
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Shopping Cart",
          headerShown: false,
          tabBarLabel: "Cart",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="track-order"
        options={{
          href: null,  // hidden from tab bar
          title: "Track Order",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          headerShown: false,
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
