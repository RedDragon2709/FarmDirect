import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/theme";

export default function ConsumerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 6,
        },
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse Produce",
          tabBarLabel: "Browse",
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
