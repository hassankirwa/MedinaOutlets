import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { formatOptionLabel } from "../components/NewOutletFields";
import { OutletPhotoImage } from "../components/OutletPhotoImage";
import type { SubmittedOutlet } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import { getSubmissionStatus } from "../utils/submissionStatus";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function SubmissionDetailsScreen({
  submission,
  token,
  onBack,
  onAddNewSubmission,
}: {
  submission: SubmittedOutlet;
  token: string | null;
  onBack: () => void;
  onAddNewSubmission: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  /** Content padding (12) + section padding (12) each side → photos align with section inner width. */
  const photoGalleryWidth = windowWidth - 48;
  const photoGalleryHeight = 300;
  const photos = submission.photos.filter((p) => typeof p.uri === "string" && p.uri.trim().length > 0);
  const cover = photos[0]?.uri;
  const status = getSubmissionStatus(submission);

  return (
    <View style={styles.root}>
      <NewOutletHeader title="Submission Details" topInset={insets.top} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <OutletPhotoImage uri={cover} token={token} style={styles.topThumb} placeholderIconSize={26} />
          <View style={styles.topTextWrap}>
            <Text style={styles.name}>{submission.facilityName || "Unnamed Facility"}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <Text style={styles.location}>{submission.physicalLocation || "No location"}</Text>
            </View>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusPill,
                  status.variant === "pending_sync" && styles.statusPillPending,
                  status.variant === "submitted" && styles.statusPillSubmitted,
                  status.variant === "approved" && styles.statusPillApproved,
                  status.variant === "rejected" && styles.statusPillRejected,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    status.variant === "pending_sync" && styles.statusTextPending,
                    status.variant === "submitted" && styles.statusTextSubmitted,
                    status.variant === "approved" && styles.statusTextApproved,
                    status.variant === "rejected" && styles.statusTextRejected,
                  ]}
                >
                  {status.label}
                </Text>
              </View>
            </View>
            {status.variant === "pending_sync" ? (
              <Text style={styles.pendingNotice}>
                This outlet is stored on your phone only. It will upload when you have a stable internet connection.
              </Text>
            ) : null}
            <Text style={styles.submittedMeta}>
              {status.variant === "pending_sync"
                ? `Saved locally on ${formatDateTime(submission.submittedAt)}`
                : `Submitted on ${formatDateTime(submission.submittedAt)}`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outlet Information</Text>
          {(submission.collectionProjectName ?? "").trim() ? (
            <Row label="Project" value={submission.collectionProjectName ?? ""} />
          ) : null}
          {(submission.wardName ?? "").trim() ? <Row label="Ward" value={submission.wardName ?? ""} /> : null}
          <Row label="Type of Account" value={formatOptionLabel(submission.typeOfAccount)} />
          <Row label="Medical Facility Status" value={formatOptionLabel(submission.medicalFacilityStatus)} />
          <Row label="Outlet Serviced By" value={formatOptionLabel(submission.outletServicedByMed)} />
          <Row label="Category" value={formatOptionLabel(submission.selectedCategory || "—")} />
          <Row label="Facility Name" value={submission.facilityName} />
          <Row label="Owner / Director Name" value={submission.ownerName} />
          <Row label="Business / Office Line" value={submission.businessPhone} />
          <Row label="Email Address" value={submission.email} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          <Row label="Physical Location" value={submission.physicalLocation} />
          <Row label="Nearest Known Landmark" value={submission.landmark} />
          <Row label="GPS Location" value={submission.gps} />
          <View style={styles.mapBox}>
            <Text style={styles.mapText}>Map preview: {submission.latitude.toFixed(5)}, {submission.longitude.toFixed(5)}</Text>
          </View>
          <Row label="Captured on" value={formatDateTime(submission.submittedAt)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{photos.length <= 1 ? "Facility photo" : "Facility photos"}</Text>
          {photos.length === 0 ? (
            <OutletPhotoImage uri={null} token={token} style={{ width: "100%", height: photoGalleryHeight }} placeholderIconSize={36} />
          ) : photos.length === 1 ? (
            <OutletPhotoImage
              uri={photos[0].uri}
              token={token}
              style={{ width: "100%", height: photoGalleryHeight, borderRadius: 10 }}
              placeholderIconSize={36}
            />
          ) : (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator
                decelerationRate="fast"
                style={[styles.photoGalleryScroll, { width: photoGalleryWidth }]}
                contentContainerStyle={styles.photoGalleryContent}
              >
                {photos.map((p, index) => (
                  <View key={p.id || `photo-${index}`} style={{ width: photoGalleryWidth }}>
                    <OutletPhotoImage
                      uri={p.uri}
                      token={token}
                      style={{ width: photoGalleryWidth, height: photoGalleryHeight, borderRadius: 10 }}
                      placeholderIconSize={36}
                    />
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.photoGalleryHint}>Swipe sideways to see all {photos.length} photos</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {status.variant !== "pending_sync" ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable style={styles.addNewButton} onPress={onAddNewSubmission}>
            <Text style={styles.addNewButtonText}>Add New Submission</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 12, gap: 12, paddingBottom: 120 },
  topCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    flexDirection: "row",
    gap: 10,
  },
  topThumb: { width: 110, height: 92, borderRadius: 10, backgroundColor: "#F1F5F9" },
  topTextWrap: { flex: 1 },
  name: { color: "#1E293B", fontSize: 18, fontFamily: font.bold },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  location: { color: "#64748B", fontSize: 14, fontFamily: font.regular, flexShrink: 1 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: "#E8F7EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillPending: { backgroundColor: "#FEF3C7" },
  statusPillSubmitted: { backgroundColor: "#E8F7EE" },
  statusPillApproved: { backgroundColor: "#D1FAE5" },
  statusPillRejected: { backgroundColor: "#FFE4E6" },
  statusText: { color: "#12914A", fontSize: 13, fontFamily: font.semiBold },
  statusTextPending: { color: "#B45309" },
  statusTextSubmitted: { color: "#12914A" },
  statusTextApproved: { color: "#047857" },
  statusTextRejected: { color: "#BE123C" },
  pendingNotice: {
    marginTop: 10,
    color: "#92400E",
    fontSize: 13,
    fontFamily: font.regular,
    lineHeight: 19,
  },
  submittedMeta: { marginTop: 8, color: "#64748B", fontSize: 13, fontFamily: font.regular },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  sectionTitle: { color: "#0F9445", fontSize: 26, fontFamily: font.bold, marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { flex: 1, color: "#475569", fontSize: 20, fontFamily: font.regular },
  rowValue: { flex: 1, color: "#334155", fontSize: 20, fontFamily: font.semiBold, textAlign: "right" },
  mapBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  mapText: { color: "#64748B", fontSize: 13, fontFamily: font.regular, textAlign: "center" },
  photoGalleryScroll: { alignSelf: "center", borderRadius: 10, overflow: "hidden" },
  photoGalleryContent: { alignItems: "center" },
  photoGalleryHint: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: font.regular,
    color: "#64748B",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F6F7FB",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  addNewButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: "#0F9445",
    alignItems: "center",
    justifyContent: "center",
  },
  addNewButtonText: { color: "#FFF", fontSize: 20, fontFamily: font.bold },
});
