import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="onboarding/select-type" />
        <Stack.Screen name="consumer" />
        <Stack.Screen name="farmer" />
        <Stack.Screen name="product/[id]" options={{ presentation: "card" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
