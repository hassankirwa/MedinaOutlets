import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { font } from "../theme/fonts";

/**
 * Shown while fonts load and while auth + onboarding flags hydrate.
 * Matches Outlet Census onboarding/login branding.
 */
export function BootSplashScreen({ fontsLoaded }: { fontsLoaded: boolean }) {
  const titleDark = fontsLoaded ? { fontFamily: font.extraBold } : { fontWeight: "800" as const };
  const titleGreen = fontsLoaded ? { fontFamily: font.extraBold } : { fontWeight: "800" as const };
  const taglineStyle = fontsLoaded ? { fontFamily: font.regular } : { fontWeight: "400" as const };
  const hintStyle = fontsLoaded ? { fontFamily: font.medium } : { fontWeight: "500" as const };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.titleRow}>
        <Text style={[styles.outlet, titleDark]}>OUTLET </Text>
        <Text style={[styles.census, titleGreen]}>CENSUS</Text>
      </Text>
      <Text style={[styles.tagline, taglineStyle]}>Track. Collect. Map. Empower.</Text>
      <View style={styles.spinnerBlock}>
        <ActivityIndicator size="large" color="#0F9445" />
        <Text style={[styles.hint, hintStyle]}>Loading…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 112,
    height: 112,
    marginBottom: 20,
  },
  titleRow: {
    textAlign: "center",
    marginBottom: 8,
  },
  outlet: {
    fontSize: 26,
    letterSpacing: 1,
    color: "#1a2b3c",
  },
  census: {
    fontSize: 26,
    letterSpacing: 1,
    color: "#28a745",
  },
  tagline: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 40,
  },
  spinnerBlock: {
    alignItems: "center",
    gap: 12,
  },
  hint: {
    fontSize: 14,
    color: "#64748B",
  },
});
