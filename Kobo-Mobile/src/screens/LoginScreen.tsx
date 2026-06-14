import { useMemo, useRef, useState } from "react";
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
import { useScrollFieldIntoView } from "../hooks/useScrollFieldIntoView";
import { font } from "../theme/fonts";
import { bottomSafeInset } from "../utils/safeAreaInsets";

const LOGIN_BG_IMAGE =
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1500&q=80";
const LOGO_IMAGE = "https://cdn-icons-png.flaticon.com/512/854/854878.png";

export function LoginScreen({
  onSubmit,
  onForgotPassword,
  loading = false,
  error = null,
  onDevShowOnboarding,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  loading?: boolean;
  error?: string | null;
  /** Dev-only: reopen intro slides (Expo Go / dev builds). */
  onDevShowOnboarding?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const insets = useSafeAreaInsets();
  const { scrollRef, onScroll, scrollFieldIntoView, keyboardBottomPadding } = useScrollFieldIntoView(32);
  const emailFieldRef = useRef<View>(null);
  const passwordFieldRef = useRef<View>(null);
  const signInActionsRef = useRef<View>(null);

  const scrollLoginFormIntoView = (fieldRef: React.RefObject<View | null>) =>
    scrollFieldIntoView(fieldRef, {
      bottomRef: signInActionsRef,
      padding: 16,
      scrollToEnd: true,
    });

  const canSubmit = useMemo(
    () => email.trim().includes("@") && password.trim().length > 3 && !loading,
    [email, password, loading],
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    void onSubmit(email.trim(), password);
  };

  return (
    <ImageBackground source={{ uri: LOGIN_BG_IMAGE }} style={styles.loginBackground}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomSafeInset(insets) + keyboardBottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
          >
              <View style={styles.logoWrap}>
                <Image source={{ uri: LOGO_IMAGE }} style={styles.logo} />
                <View>
                  <Text style={styles.logoTitle}>OUTLET CENSUS</Text>
                  <Text style={styles.logoTagline}>Track. Collect. Map. Empower.</Text>
                </View>
                <Text style={styles.secureText}>Secure. Reliable. Everywhere.</Text>
              </View>

              <View style={styles.loginCard}>
                <Text style={styles.welcomeTitle}>Welcome Back!</Text>
                <Text style={styles.welcomeText}>Sign in with your account email</Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View ref={emailFieldRef}>
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
                    returnKeyType="next"
                    textContentType="emailAddress"
                    onFocus={() => scrollLoginFormIntoView(emailFieldRef)}
                  />
                </View>

                <View ref={passwordFieldRef}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordFieldWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor="#7B8794"
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                      textContentType="password"
                      onFocus={() => scrollLoginFormIntoView(passwordFieldRef)}
                    />
                  <Pressable
                    style={styles.eyeToggle}
                    onPress={() => setPasswordVisible((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#65758B"
                    />
                  </Pressable>
                  </View>
                </View>

                <View ref={signInActionsRef}>
                  <View style={styles.rowBetween}>
                    <Pressable style={styles.rowCenter} onPress={() => setRememberMe((prev) => !prev)}>
                      <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]} />
                      <Text style={styles.rememberText}>Remember me</Text>
                    </Pressable>
                    <Pressable onPress={onForgotPassword} hitSlop={8} disabled={!onForgotPassword}>
                      <Text style={[styles.forgotText, !onForgotPassword && styles.forgotTextDisabled]}>
                        Forgot password?
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.signInBtn, !canSubmit && styles.signInBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.signInText}>Sign In</Text>
                    )}
                  </Pressable>
                </View>

                {onDevShowOnboarding ? (
                  <Pressable onPress={onDevShowOnboarding} style={styles.devOnboardingBtn}>
                    <Text style={styles.devOnboardingText}>Show onboarding (dev)</Text>
                  </Pressable>
                ) : null}
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
  loginBackground: { flex: 1 },
  safe: { flex: 1, backgroundColor: "rgba(0,0,0,0.16)" },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  logoWrap: { alignItems: "center", justifyContent: "center", marginBottom: 32 },
  logo: { width: 68, height: 68, tintColor: "#0E4B9D", marginBottom: 8 },
  logoTitle: { color: "#FFFFFF", fontSize: 24, fontFamily: font.extraBold, letterSpacing: 0.8 },
  logoTagline: { color: "#EAF2FF", fontSize: 13, marginTop: 3, textAlign: "center", fontFamily: font.regular },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 10,
    marginHorizontal: 6,
  },
  welcomeTitle: { fontSize: 31, fontFamily: font.extraBold, color: "#1B2A41" },
  welcomeText: { color: "#65758B", marginBottom: 8, fontFamily: font.regular },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: font.semiBold,
    marginBottom: 4,
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
  passwordFieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "#D5DFEA",
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontFamily: font.regular,
    paddingVertical: 0,
  },
  eyeToggle: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: "#0C9448" },
  checkboxChecked: { backgroundColor: "#0C9448" },
  rememberText: { color: "#3B4758", fontFamily: font.regular },
  forgotText: { color: "#0C9448", fontFamily: font.bold },
  forgotTextDisabled: { opacity: 0.5 },
  signInBtn: {
    backgroundColor: "#169447",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtnDisabled: { backgroundColor: "#8DCFA9" },
  signInText: { color: "#FFFFFF", fontSize: 17, fontFamily: font.bold },
  secureText: {
    marginTop: 16,
    textAlign: "center",
    color: "#EAF2FF",
    fontFamily: font.semiBold,
  },
  devOnboardingBtn: { marginTop: 14, alignSelf: "center", paddingVertical: 6, paddingHorizontal: 10 },
  devOnboardingText: {
    fontSize: 12,
    fontFamily: font.medium,
    color: "#64748B",
    textDecorationLine: "underline",
  },
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
