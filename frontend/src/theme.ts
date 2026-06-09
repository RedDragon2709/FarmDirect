export const theme = {
  colors: {
    // Brand
    primary: "#0A7A40",         // deep forest green
    primaryLight: "#16A34A",    // mid green
    primaryDark: "#054D27",     // darkest green
    primarySoft: "#F0FDF4",     // ultra-light green tint

    // Accent
    secondary: "#F59E0B",       // gold/amber — organic warmth
    secondaryLight: "#FCD34D",  // lighter gold
    secondaryDark: "#B45309",   // dark amber
    secondarySoft: "#FFFBEB",   // ultra-light amber

    // Backgrounds
    background: "#F8FAF9",      // very soft off-white
    surface: "#FFFFFF",
    surfaceAlt: "#F1F7F4",      // slightly tinted surface
    dark: "#0D1F14",            // near-black green for headers

    // Status — full set (color + soft bg)
    error: "#EF4444",
    errorSoft: "#FEF2F2",
    success: "#10B981",
    successSoft: "#ECFDF5",
    warning: "#F59E0B",
    warningSoft: "#FFFBEB",
    info: "#3B82F6",
    infoSoft: "#EFF6FF",

    // Text
    textPrimary: "#111827",     // near-black
    textSecondary: "#4B5563",   // medium gray
    textMuted: "#9CA3AF",       // light gray
    textInverse: "#FFFFFF",

    // UI
    border: "#E5E7EB",
    borderLight: "#F3F4F6",     // very subtle divider / separator
    card: "#FFFFFF",
    overlay: "rgba(0,0,0,0.5)",

    // Tab bar
    tabBar: "#FFFFFF",
    tabBarActive: "#0A7A40",
    tabBarInactive: "#9CA3AF",

    // Gradient seeds (used as string arrays for LinearGradient)
    gradientGreen:   ["#054D27", "#0A7A40", "#16A34A"] as string[],
    gradientGold:    ["#B45309", "#F59E0B", "#FCD34D"] as string[],
    gradientSunrise: ["#0A7A40", "#1A8A4E", "#F59E0B"] as string[],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 38,
  },
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
    black: "900" as const,
  },
  shadow: {
    xs: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 8,
    },
    xl: {
      shadowColor: "#0A7A40",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 12,
    },
  },
};
