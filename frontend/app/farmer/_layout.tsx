import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/theme";

export default function FarmerLayout() {
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-produce"
        options={{
          tabBarLabel: "Produce",
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="price-predict"
        options={{
          tabBarLabel: "Price AI",
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size || 22} color={color} />,
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="earnings" options={{ href: null }} />
    </Tabs>
  );
}
