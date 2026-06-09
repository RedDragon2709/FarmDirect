import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, StatusBar, ScrollView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { theme } from "../../src/theme";

const { width } = Dimensions.get("window");

const STEPS = [
  { key: "placed",     icon: "receipt-outline",          label: "Order Placed",       desc: "We received your order" },
  { key: "confirmed",  icon: "checkmark-circle-outline", label: "Confirmed",          desc: "Farmer accepted your request" },
  { key: "packed",     icon: "cube-outline",             label: "Harvested & Packed", desc: "Freshly harvested & packaged" },
  { key: "dispatched", icon: "bicycle-outline",          label: "Out for Delivery",   desc: "Rider is heading to you" },
  { key: "delivered",  icon: "home-outline",             label: "Delivered",          desc: "Enjoy your fresh produce!" },
];

const STATUS_ORDER = ["placed", "confirmed", "packed", "dispatched", "delivered"];

// OpenStreetMap HTML with a route marker between two dummy points
// Uses Leaflet.js served via CDN — no API key needed
const buildMapHTML = (fromLat: number, fromLng: number, toLat: number, toLng: number, riderLat: number, riderLng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin:0; padding:0; }
    #map { height:100vh; width:100vw; }
    .custom-icon { font-size:24px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${riderLat}, ${riderLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    var farmIcon = L.divIcon({ html:'<div style="font-size:28px">🌾</div>', className:'', iconAnchor:[14,14] });
    var homeIcon = L.divIcon({ html:'<div style="font-size:28px">🏠</div>', className:'', iconAnchor:[14,14] });
    var riderIcon = L.divIcon({ html:'<div style="font-size:32px; filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.4))">🛵</div>', className:'', iconAnchor:[16,16] });

    L.marker([${fromLat}, ${fromLng}], {icon: farmIcon}).addTo(map).bindPopup('<b>Farm</b><br>Fresh produce pickup');
    L.marker([${toLat}, ${toLng}], {icon: homeIcon}).addTo(map).bindPopup('<b>Your Home</b><br>Delivery destination');
    var riderMarker = L.marker([${riderLat}, ${riderLng}], {icon: riderIcon}).addTo(map).bindPopup('<b>Rider</b><br>On the way!').openPopup();

    var latlngs = [[${fromLat}, ${fromLng}],[${riderLat}, ${riderLng}],[${toLat}, ${toLng}]];
    L.polyline(latlngs, {color:'#0A7A40', weight:4, dashArray:'8,6', opacity:0.8}).addTo(map);
    map.fitBounds([[${fromLat}, ${fromLng}],[${toLat}, ${toLng}]], {padding:[30,30]});
  </script>
</body>
</html>
`;

export default function TrackOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status: string; product: string; address: string; orderId: string;
  }>();
  const status = params.status || "placed";
  const currentIndex = STATUS_ORDER.indexOf(status);

  const lineAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [eta, setEta] = useState((STATUS_ORDER.length - 1 - currentIndex) * 8 + 4);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.5, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();

    Animated.stagger(120, lineAnims.slice(0, currentIndex).map((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 400, delay: i * 120, useNativeDriver: false })
    )).start();

    const iv = setInterval(() => setEta((e) => Math.max(0, e - 1)), 60000);
    return () => clearInterval(iv);
  }, []);

  // Dummy coordinates near Bengaluru
  const farmLat = 12.9650, farmLng = 77.5800;
  const homeLat = 12.9100, homeLng = 77.6400;
  const riderLat = 12.9400 + (currentIndex * 0.007);
  const riderLng = 77.6100 + (currentIndex * 0.007);

  const mapHTML = buildMapHTML(farmLat, farmLng, homeLat, homeLng, riderLat, riderLng);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.primary }} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Order Tracking</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Map */}
          <View style={styles.mapCard}>
            <WebView
              source={{ html: mapHTML }}
              style={styles.map}
              scrollEnabled={false}
              javaScriptEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.mapLoading}>
                  <Text style={{ fontSize: 32 }}>🗺️</Text>
                  <Text style={styles.mapLoadingText}>Loading map…</Text>
                </View>
              )}
            />
            {/* ETA overlay */}
            <View style={styles.etaOverlay}>
              <Ionicons name="time" size={13} color={theme.colors.primary} />
              <Text style={styles.etaText}>
                {status === "delivered" ? " Delivered!" : `  ETA ~${eta} min`}
              </Text>
            </View>
          </View>

          {/* Order info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="cube" size={15} color={theme.colors.primary} />
              <Text style={styles.infoText}>  {params.product || "Your Order"}</Text>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <Ionicons name="location" size={15} color={theme.colors.secondary} />
              <Text style={styles.infoText} numberOfLines={2}>
                {"  "}{params.address || "Your delivery address"}
              </Text>
            </View>
          </View>

          {/* Driver card */}
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={{ fontSize: 26 }}>🧑‍🦱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>Rahul S. · Delivery Partner</Text>
              <View style={styles.driverRatingRow}>
                <Ionicons name="star" size={12} color={theme.colors.secondary} />
                <Text style={styles.driverRating}> 4.8 · On the way 🛵</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.actionIconBtn}>
              <Ionicons name="call" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionIconBtn, { marginLeft: 8 }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Timeline */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Order Progress</Text>
            {STEPS.map((step, i) => {
              const state = i < currentIndex ? "completed" : i === currentIndex ? "active" : "pending";
              const isLast = i === STEPS.length - 1;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepDot,
                      state === "completed" && styles.dotCompleted,
                      state === "active" && styles.dotActive,
                    ]}>
                      {state === "completed"
                        ? <Ionicons name="checkmark" size={11} color="#fff" />
                        : state === "active"
                          ? <View style={styles.dotInner} />
                          : null}
                    </View>
                    {!isLast && (
                      <View style={styles.lineWrap}>
                        <View style={styles.lineBg} />
                        <Animated.View style={[styles.lineFill, {
                          height: lineAnims[i].interpolate({ inputRange: [0,1], outputRange: ["0%","100%"] })
                        }]} />
                      </View>
                    )}
                  </View>
                  <View style={[styles.stepContent, !isLast && { paddingBottom: 20 }]}>
                    <View style={[styles.stepIconBubble, state === "pending" && { backgroundColor: theme.colors.surfaceAlt }]}>
                      <Ionicons
                        name={step.icon as any}
                        size={14}
                        color={state === "pending" ? theme.colors.textMuted : theme.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.stepLabel,
                        state === "active" && { color: theme.colors.primary },
                        state === "pending" && { color: theme.colors.textMuted, fontWeight: "500" },
                      ]}>{step.label}</Text>
                      {state !== "pending" && (
                        <Text style={styles.stepDesc}>{step.desc}</Text>
                      )}
                    </View>
                    {state === "active" && (
                      <View style={styles.liveChip}>
                        <Text style={styles.liveChipText}>LIVE</Text>
                      </View>
                    )}
                    {state === "completed" && (
                      <View style={styles.doneChip}>
                        <Text style={styles.doneChipText}>Done</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace("/consumer")} activeOpacity={0.88}>
            <Ionicons name="leaf" size={15} color={theme.colors.primary} />
            <Text style={styles.browseBtnText}> Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    overflow: "hidden",
  },
  headerOrb: {
    position: "absolute", top: -20, right: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },

  mapCard: {
    margin: 14,
    borderRadius: 20,
    overflow: "hidden",
    height: 220,
    ...theme.shadow.md,
    backgroundColor: "#E8F5E9",
  },
  map: { flex: 1 },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  mapLoadingText: { marginTop: 8, fontSize: 13, color: theme.colors.textMuted, fontWeight: "600" },
  etaOverlay: {
    position: "absolute",
    bottom: 12, alignSelf: "center",
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    ...theme.shadow.md,
  },
  etaText: { fontSize: 14, fontWeight: "800", color: theme.colors.primary },

  infoCard: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: "#fff", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadow.xs,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  infoText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1, fontWeight: "500", lineHeight: 19 },

  driverCard: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: "#fff", borderRadius: 14,
    padding: 14, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadow.xs,
  },
  driverAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  driverName: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  driverRatingRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  driverRating: { fontSize: 12, color: theme.colors.textSecondary },
  actionIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.colors.primaryLight + "30",
  },

  timelineCard: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: "#fff", borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadow.xs,
  },
  timelineTitle: {
    fontSize: 11, fontWeight: "800", color: theme.colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16,
  },
  stepRow: { flexDirection: "row" },
  stepLeft: { width: 26, alignItems: "center" },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: theme.colors.border,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center", zIndex: 2,
  },
  dotCompleted: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dotActive: { borderColor: theme.colors.primary },
  dotInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.primary },
  lineWrap: { width: 2, flex: 1, marginTop: 2, overflow: "hidden" },
  lineBg: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.border },
  lineFill: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: theme.colors.primary },
  stepContent: {
    flex: 1, flexDirection: "row", alignItems: "flex-start", paddingLeft: 12,
  },
  stepIconBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  stepLabel: { fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary },
  stepDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
  liveChip: {
    backgroundColor: theme.colors.primary, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start",
  },
  liveChipText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  doneChip: {
    backgroundColor: theme.colors.successSoft, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start",
  },
  doneChipText: { color: theme.colors.success, fontSize: 9, fontWeight: "900" },

  browseBtn: {
    marginHorizontal: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: theme.colors.primary,
    borderRadius: 14, height: 50, backgroundColor: theme.colors.primarySoft,
  },
  browseBtnText: { color: theme.colors.primary, fontSize: 15, fontWeight: "800" },
});
