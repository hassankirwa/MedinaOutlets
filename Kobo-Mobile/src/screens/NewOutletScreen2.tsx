import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletFormScreen } from "../components/NewOutletFormScreen";
import { NewOutletInputField } from "../components/NewOutletFields";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import {
  isValidKenyaLocalPhone,
  phoneValidationMessage,
  sanitizePhoneInput,
} from "../utils/phoneValidation";

export function NewOutletScreen2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();
  const {
    facilityName,
    ownerName,
    businessPhone,
    alternativePhone,
    email,
  } = draft;
  const [businessPhoneError, setBusinessPhoneError] = useState(false);
  const [alternativePhoneError, setAlternativePhoneError] = useState(false);

  const businessPhoneValid = isValidKenyaLocalPhone(businessPhone);
  const alternativePhoneValid =
    alternativePhone.trim().length === 0 || isValidKenyaLocalPhone(alternativePhone);

  const canGoNext =
    facilityName.trim().length > 1 &&
    ownerName.trim().length > 1 &&
    businessPhoneValid &&
    alternativePhoneValid;

  const handleNext = () => {
    if (!businessPhoneValid) {
      setBusinessPhoneError(true);
      Alert.alert("Invalid phone number", phoneValidationMessage);
      return;
    }
    if (!alternativePhoneValid) {
      setAlternativePhoneError(true);
      Alert.alert("Invalid phone number", phoneValidationMessage);
      return;
    }
    setBusinessPhoneError(false);
    setAlternativePhoneError(false);
    onNext();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={2} />
      <NewOutletFormScreen contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Outlet Identity</Text>
        <Text style={styles.subtitle}>Enter identity information.</Text>
        <NewOutletInputField
          label="Facility / Outlet Name"
          value={facilityName}
          onChangeText={(t) => updateDraft({ facilityName: t })}
          required
        />
        <NewOutletInputField
          label="Owner / Contact Person"
          value={ownerName}
          onChangeText={(t) => updateDraft({ ownerName: t })}
          required
        />
        <NewOutletInputField
          label="Business / Office Line"
          value={businessPhone}
          onChangeText={(t) => {
            const sanitized = sanitizePhoneInput(t);
            if (businessPhoneError && isValidKenyaLocalPhone(sanitized)) setBusinessPhoneError(false);
            updateDraft({ businessPhone: sanitized });
          }}
          keyboardType="phone-pad"
          required
        />
        {businessPhoneError ? (
          <Text style={styles.fieldError}>{phoneValidationMessage}</Text>
        ) : null}
        <NewOutletInputField
          label="Alternative Phone"
          value={alternativePhone}
          onChangeText={(t) => {
            const sanitized = sanitizePhoneInput(t);
            if (alternativePhoneError && (sanitized.length === 0 || isValidKenyaLocalPhone(sanitized))) {
              setAlternativePhoneError(false);
            }
            updateDraft({ alternativePhone: sanitized });
          }}
          keyboardType="phone-pad"
        />
        {alternativePhoneError ? (
          <Text style={styles.fieldError}>{phoneValidationMessage}</Text>
        ) : null}
        <NewOutletInputField
          label="Email Address"
          value={email}
          onChangeText={(t) => updateDraft({ email: t })}
          keyboardType="email-address"
        />
      </NewOutletFormScreen>
      <NewOutletFooterButtons onBack={onBack} onNext={handleNext} nextDisabled={!canGoNext} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB", overflow: "hidden" },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 14 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 19, marginBottom: 6, fontFamily: font.regular },
  fieldError: { color: "#DC2626", fontSize: 14, fontFamily: font.semiBold, marginTop: -8 },
});
