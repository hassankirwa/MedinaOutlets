import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletInputField } from "../components/NewOutletFields";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";

export function NewOutletScreen2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();
  const { facilityName, ownerName, businessPhone, email } = draft;
  const canGoNext = facilityName.trim().length > 1 && ownerName.trim().length > 1;

  return (
    <View style={styles.root}>
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={2} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Outlet Identity</Text>
        <Text style={styles.subtitle}>Enter identity information.</Text>
        <NewOutletInputField label="Facility Name" value={facilityName} onChangeText={(t) => updateDraft({ facilityName: t })} required />
        <NewOutletInputField label="Owner / Director Name" value={ownerName} onChangeText={(t) => updateDraft({ ownerName: t })} required />
        <NewOutletInputField label="Business / Office Line" value={businessPhone} onChangeText={(t) => updateDraft({ businessPhone: t })} keyboardType="phone-pad" />
        <NewOutletInputField label="Email Address" value={email} onChangeText={(t) => updateDraft({ email: t })} keyboardType="email-address" />
      </ScrollView>
      <NewOutletFooterButtons onBack={onBack} onNext={onNext} nextDisabled={!canGoNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  scroll: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120, gap: 14 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 19, marginBottom: 6, fontFamily: font.regular },
});
