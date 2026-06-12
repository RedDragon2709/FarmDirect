import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../src/theme";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardAnim  = useRef(new Animated.Value(60)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const pulse1    = useRef(new Animated.Value(0.85)).current;
  const leaf1Y    = useRef(new Animated.Value(0)).current;
  const leaf2Y    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse1, { toValue: 1.15, duration: 2800, useNativeDriver: true }),
      Animated.timing(pulse1, { toValue: 0.85, duration: 2800, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(leaf1Y, { toValue: -12, duration: 2200, useNativeDriver: true }),
      Animated.timing(leaf1Y, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(leaf2Y, { toValue: 10, duration: 2800, useNativeDriver: true }),
      Animated.timing(leaf2Y, { toValue: 0, duration: 2800, useNativeDriver: true }),
    ])).start();

    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(cardAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Green hero */}
      <View style={styles.hero}>
        <Animated.View style={[styles.orb1, { transform: [{ scale: pulse1 }] }]} />
        <View style={styles.orb2} />
        <Animated.View style={[styles.leafFloat1, { transform: [{ translateY: leaf1Y }] }]}>
          <Ionicons name="leaf" size={20} color="rgba(255,255,255,0.15)" />
        </Animated.View>
        <Animated.View style={[styles.leafFloat2, { transform: [{ translateY: leaf2Y }] }]}>
          <Ionicons name="flower-outline" size={16} color="rgba(245,158,11,0.2)" />
        </Animated.View>

        <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoBadge}>
            <Ionicons name="leaf" size={38} color="#fff" />
          </View>
          <Text style={styles.logoText}>FarmDirect</Text>
          <Text style={styles.tagline}>
            Farm-fresh, delivered in{" "}
            <Text style={styles.taglineGold}>minutes</Text>
          </Text>

          <View style={styles.trustRow}>
            {[
              { icon: "flash",            label: "Instant" },
              { icon: "leaf",             label: "Organic" },
              { icon: "shield-checkmark", label: "Verified" },
            ].map((f) => (
              <View key={f.label} style={styles.trustChip}>
                <Ionicons name={f.icon as any} size={12} color={theme.colors.secondaryLight} />
                <Text style={styles.trustChipText}>{f.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Bottom card */}
      <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardAnim }] }]}>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { num: "500+", label: "Farmers" },
            { num: "12 hr", label: "Fresh Cycle" },
            { num: "4.9", label: "Rating" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* DIVIDER */}
        <View style={styles.sectionDivider}>
          <View style={styles.divLine} />
          <Text style={styles.divLabel}>I want to</Text>
          <View style={styles.divLine} />
        </View>

        {/* Consumer block */}
        <View style={styles.roleBlock}>
          <View style={styles.roleBlockHeader}>
            <View style={styles.roleBlockIconWrap}>
              <Ionicons name="cart-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.roleBlockTitle}>Buy fresh produce</Text>
          </View>
          <Text style={styles.roleBlockDesc}>
            Browse vegetables, fruits & more directly from farmers near you — zero middlemen.
          </Text>
          <View style={styles.authBtnRow}>
            <TouchableOpacity
              style={[styles.authBtn, styles.authBtnPrimary]}
              onPress={() => router.push("/login")}
              activeOpacity={0.87}
            >
              <Ionicons name="log-in-outline" size={16} color="#fff" />
              <Text style={styles.authBtnPrimaryText}> Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authBtn, styles.authBtnOutline]}
              onPress={() => router.push("/register")}
              activeOpacity={0.87}
            >
              <Ionicons name="person-add-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.authBtnOutlineText}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Farmer block */}
        <View style={[styles.roleBlock, styles.roleBlockAlt]}>
          <View style={styles.roleBlockHeader}>
            <View style={[styles.roleBlockIconWrap, styles.roleBlockIconWrapGold]}>
              <Ionicons name="leaf-outline" size={20} color={theme.colors.secondaryDark} />
            </View>
            <Text style={styles.roleBlockTitle}>Sell my harvest</Text>
          </View>
          <Text style={styles.roleBlockDesc}>
            List your produce, get direct orders & earn more — manage everything from your phone.
          </Text>
          <View style={styles.authBtnRow}>
            <TouchableOpacity
              style={[styles.authBtn, styles.authBtnGold]}
              onPress={() => router.push("/login")}
              activeOpacity={0.87}
            >
              <Ionicons name="log-in-outline" size={16} color="#fff" />
              <Text style={styles.authBtnPrimaryText}> Farmer Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authBtn, styles.authBtnOutlineGold]}
              onPress={() => router.push("/register")}
              activeOpacity={0.87}
            >
              <Ionicons name="leaf-outline" size={16} color={theme.colors.secondaryDark} />
              <Text style={styles.authBtnOutlineGoldText}> Join as Farmer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={11} color={theme.colors.textMuted} />
          <Text style={styles.footerText}> Secure · Private · No spam</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.primaryDark },

  hero: {
    height: height * 0.40,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  orb1: {
    position: "absolute", top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  orb2: {
    position: "absolute", top: 60, left: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(245,158,11,0.07)",
  },
  leafFloat1: { position: "absolute", top: "15%", right: 28 },
  leafFloat2: { position: "absolute", top: "55%", right: 55 },
  heroContent: { alignItems: "center" },
  logoBadge: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.26)",
  },
  logoText: {
    fontSize: 36, fontWeight: "900", color: "#fff",
    letterSpacing: -1.2, marginBottom: 8,
  },
  tagline: {
    fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: "500",
  },
  taglineGold: { color: theme.colors.secondaryLight, fontWeight: "800" },
  trustRow: { flexDirection: "row", marginTop: 20, gap: 8 },
  trustChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  trustChipText: { color: "#fff", fontSize: 10, fontWeight: "700", marginLeft: 4 },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 16, fontWeight: "900", color: theme.colors.primary },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2, fontWeight: "600" },

  sectionDivider: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 16,
  },
  divLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  divLabel: {
    marginHorizontal: 10, fontSize: 12,
    color: theme.colors.textMuted, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  roleBlock: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 18, padding: 16, marginBottom: 12,
    backgroundColor: "#fff",
  },
  roleBlockAlt: {
    borderColor: theme.colors.secondaryLight + "60",
    backgroundColor: "#FFFDF5",
  },
  roleBlockHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  roleBlockIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  roleBlockIconWrapGold: {
    backgroundColor: "#FFFBEB",
  },
  roleBlockTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary },
  roleBlockDesc: {
    fontSize: 12, color: theme.colors.textSecondary,
    lineHeight: 18, marginBottom: 14,
  },
  authBtnRow: { flexDirection: "row", gap: 10 },
  authBtn: {
    flex: 1, height: 42, borderRadius: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  authBtnPrimary: { backgroundColor: theme.colors.primary },
  authBtnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  authBtnOutline: {
    borderWidth: 2, borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  authBtnOutlineText: { color: theme.colors.primary, fontSize: 14, fontWeight: "800" },
  authBtnGold: { backgroundColor: theme.colors.secondary },
  authBtnOutlineGold: {
    borderWidth: 2, borderColor: theme.colors.secondaryDark,
    backgroundColor: "#FFFBEB",
  },
  authBtnOutlineGoldText: { color: theme.colors.secondaryDark, fontSize: 14, fontWeight: "800" },

  footer: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8,
  },
  footerText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: "500" },
});
