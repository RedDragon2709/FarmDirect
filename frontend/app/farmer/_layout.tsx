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
          title: "Add Produce",
          tabBarLabel: "Add",
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="price-predict"
        options={{
          title: "Price Predict",
          tabBarLabel: "Price AI",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-produce"
        options={{
          title: "My Produce",
          tabBarLabel: "My Produce",
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarLabel: "Earnings",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
