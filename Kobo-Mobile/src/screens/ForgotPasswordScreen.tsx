import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../theme/fonts";
import { bottomSafeInset } from "../utils/safeAreaInsets";

const LOGIN_BG_IMAGE =
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1500&q=80";
const LOGO_IMAGE = "https://cdn-icons-png.flaticon.com/512/854/854878.png";

export function ForgotPasswordScreen({
  onBack,
  onSubmit,
  loading = false,
  error = null,
  successMessage = null,
}: {
  onBack: () => void;
  onSubmit: (email: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  successMessage?: string | null;
}) {
  const [email, setEmail] = useState("");
  const insets = useSafeAreaInsets();

  const canSubmit = useMemo(
    () => email.trim().includes("@") && !loading && !successMessage,
    [email, loading, successMessage],
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    void onSubmit(email.trim());
  };

  return (
    <ImageBackground source={{ uri: LOGIN_BG_IMAGE }} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              style={styles.flex}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: bottomSafeInset(insets) + 160 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Pressable style={styles.backRow} onPress={onBack} hitSlop={12}>
                <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
                <Text style={styles.backText}>Back to sign in</Text>
              </Pressable>

              <View style={styles.logoWrap}>
                <Image source={{ uri: LOGO_IMAGE }} style={styles.logo} />
                <View>
                  <Text style={styles.logoTitle}>OUTLET CENSUS</Text>
                  <Text style={styles.logoTagline}>Track. Collect. Map. Empower.</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.title}>Forgot password</Text>
                <Text style={styles.subtitle}>
                  Enter your account email and we will send you a link to reset your password.
                </Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="collector@outlet.com"
                  placeholderTextColor="#7B8794"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!successMessage}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  textContentType="emailAddress"
                />

                <Pressable
                  style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {successMessage ? "Email sent" : "Send reset link"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={styles.bottomWave} pointerEvents="none" />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: "rgba(0,0,0,0.16)" },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  backText: { color: "#FFFFFF", fontFamily: font.bold, fontSize: 16 },
  logoWrap: { alignItems: "center", justifyContent: "center", marginBottom: 28 },
  logo: { width: 68, height: 68, tintColor: "#0E4B9D", marginBottom: 8 },
  logoTitle: { color: "#FFFFFF", fontSize: 24, fontFamily: font.extraBold, letterSpacing: 0.8 },
  logoTagline: { color: "#EAF2FF", fontSize: 13, marginTop: 3, textAlign: "center", fontFamily: font.regular },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 10,
    marginHorizontal: 6,
  },
  title: { fontSize: 28, fontFamily: font.extraBold, color: "#1B2A41" },
  subtitle: { color: "#65758B", marginBottom: 8, fontFamily: font.regular, lineHeight: 22 },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: font.semiBold,
    marginBottom: 4,
  },
  successText: {
    color: "#0F766E",
    fontSize: 13,
    fontFamily: font.semiBold,
    marginBottom: 4,
    lineHeight: 20,
  },
  inputLabel: { fontSize: 13, fontFamily: font.bold, color: "#334155" },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D5DFEA",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    fontFamily: font.regular,
  },
  primaryBtn: {
    backgroundColor: "#169447",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { backgroundColor: "#8DCFA9" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 17, fontFamily: font.bold },
  bottomWave: {
    position: "absolute",
    left: -10,
    right: -10,
    bottom: -46,
    height: 170,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderTopLeftRadius: 110,
    borderTopRightRadius: 160,
    transform: [{ rotate: "-3deg" }],
  },
});
