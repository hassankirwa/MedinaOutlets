import * as Location from "expo-location";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiReverseGeocode } from "../api/client";
import { NewOutletFormScreen } from "../components/NewOutletFormScreen";
import { NewOutletInputField } from "../components/NewOutletFields";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useAuth } from "../context/AuthContext";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";

export function NewOutletScreen3({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { draft, updateDraft } = useNewOutletDraft();
  const {
    physicalLocation,
    landmark,
    gps,
    accuracyMeters,
    latitude,
    longitude,
    gpsCapturedAt,
    road,
    suburb,
    capturedWard,
    capturedCounty,
    region,
    country,
  } = draft;
  const [isCapturing, setIsCapturing] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [physicalLocationError, setPhysicalLocationError] = useState(false);
  const [landmarkError, setLandmarkError] = useState(false);

  const hasGps = gpsCapturedAt.trim().length > 0;
  const hasPhysicalLocation = physicalLocation.trim().length > 1;
  const hasLandmark = landmark.trim().length > 1;
  const canGoNext = hasGps && hasPhysicalLocation && hasLandmark;

  const handleNext = () => {
    if (!hasGps) {
      Alert.alert("GPS required", "Capture GPS location before continuing.");
      return;
    }
    if (!hasPhysicalLocation) {
      setPhysicalLocationError(true);
      Alert.alert("Required field", "Physical Location is required.");
      return;
    }
    if (!hasLandmark) {
      setLandmarkError(true);
      Alert.alert("Required field", "Nearest Known Landmark is required.");
      return;
    }
    setPhysicalLocationError(false);
    setLandmarkError(false);
    onNext();
  };

  const captureCurrentLocation = async () => {
    try {
      setIsCapturing(true);
      setGeocodeFailed(false);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location Access Needed", "Please allow location permission to capture GPS.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const nextCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      const nextAccuracy = location.coords.accuracy ? Math.max(1, Math.round(location.coords.accuracy)) : 0;
      const capturedAt = new Date().toISOString();

      const updates: Parameters<typeof updateDraft>[0] = {
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
        gps: `${nextCoords.latitude.toFixed(5)}, ${nextCoords.longitude.toFixed(5)}`,
        accuracyMeters: nextAccuracy,
        gpsCapturedAt: capturedAt,
      };

      let geocodedOk = false;
      if (token) {
        try {
          const geocoded = await apiReverseGeocode(token, nextCoords.latitude, nextCoords.longitude);
          updates.capturedAddress = geocoded.captured_address ?? "";
          updates.reverseGeocodedAddress = geocoded.reverse_geocoded_address ?? geocoded.captured_address ?? "";
          updates.capturedPlaceName = geocoded.captured_place_name ?? geocoded.captured_address ?? "";
          updates.road = geocoded.road ?? "";
          updates.suburb = geocoded.suburb ?? "";
          updates.capturedWard = geocoded.captured_ward ?? "";
          updates.capturedCounty = geocoded.captured_county ?? "";
          updates.region = geocoded.region ?? "";
          updates.country = geocoded.country ?? "";
          if (geocoded.landmark && draft.landmark.trim().length === 0) {
            updates.landmark = geocoded.landmark;
          }
          const summaryParts = [
            geocoded.landmark,
            geocoded.road,
            geocoded.suburb,
            geocoded.captured_ward,
            geocoded.captured_county,
          ].filter((p): p is string => Boolean(p && String(p).trim()));
          if (summaryParts.length > 0 && draft.physicalLocation.trim().length === 0) {
            updates.physicalLocation = summaryParts.join(", ");
          }
          geocodedOk = Boolean(
            geocoded.landmark ||
              geocoded.road ||
              geocoded.captured_ward ||
              geocoded.captured_county ||
              geocoded.suburb,
          );
        } catch {
          geocodedOk = false;
        }
      }

      updateDraft(updates);
      setGeocodeFailed(!geocodedOk);
    } catch {
      Alert.alert("GPS Error", "Failed to fetch current location. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const osmRows: { label: string; value: string }[] = [
    { label: "Road / Street", value: road },
    { label: "Area / Subcounty", value: suburb },
    { label: "Ward", value: capturedWard },
    { label: "County", value: capturedCounty },
    { label: "Region", value: region },
    { label: "Country", value: country },
  ].filter((row) => row.value.trim().length > 0);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={3} />
      <NewOutletFormScreen contentContainerStyle={styles.content}>
        <Text style={styles.title}>Location Details</Text>
        <Text style={styles.subtitle}>
          Capture GPS to auto-detect coordinates and OpenStreetMap details. You must also enter Physical Location and
          Nearest Known Landmark manually.
        </Text>

        <Pressable
          style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
          onPress={() => void captureCurrentLocation()}
          disabled={isCapturing}
        >
          <Text style={styles.captureBtnText}>
            {isCapturing ? "Capturing GPS…" : hasGps ? "Refresh GPS Location" : "Capture GPS Location"}
          </Text>
        </Pressable>

        {hasGps ? (
          <View style={styles.gpsCard}>
            <Text style={styles.gpsLabel}>GPS Coordinates</Text>
            <Text style={styles.gpsValue}>{gps}</Text>
            <Text style={styles.gpsMeta}>Accuracy: {accuracyMeters > 0 ? `${accuracyMeters} m` : "—"}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>GPS is required before you can continue.</Text>
        )}

        {geocodeFailed && hasGps ? (
          <Text style={styles.geocodeWarning}>
            GPS saved. Address details could not be loaded from OpenStreetMap.
          </Text>
        ) : null}

        <NewOutletInputField
          label="Physical Location"
          value={physicalLocation}
          onChangeText={(t) => {
            if (physicalLocationError && t.trim().length > 1) setPhysicalLocationError(false);
            updateDraft({ physicalLocation: t });
          }}
          required
        />
        {physicalLocationError ? (
          <Text style={styles.fieldError}>Physical Location is required.</Text>
        ) : null}

        <NewOutletInputField
          label="Nearest Known Landmark"
          value={landmark}
          onChangeText={(t) => {
            if (landmarkError && t.trim().length > 1) setLandmarkError(false);
            updateDraft({ landmark: t });
          }}
          required
        />
        {landmarkError ? (
          <Text style={styles.fieldError}>Nearest Known Landmark is required.</Text>
        ) : null}

        {hasGps && osmRows.length > 0 ? (
          <View style={styles.detectedCard}>
            <Text style={styles.detectedLabel}>OpenStreetMap Details</Text>
            {osmRows.map((row) => (
              <View key={row.label} style={styles.osmRow}>
                <Text style={styles.osmRowLabel}>{row.label}</Text>
                <Text style={styles.osmRowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasGps ? (
          <View style={styles.mapWrap}>
            <WebView
              key={`${latitude}-${longitude}`}
              source={{ html: getLeafletMapHtml(latitude, longitude) }}
              style={styles.mapView}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
            />
          </View>
        ) : null}
      </NewOutletFormScreen>
      <NewOutletFooterButtons onBack={onBack} onNext={handleNext} nextDisabled={!canGoNext} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB", overflow: "hidden" },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 39, fontFamily: font.extraBold, color: "#1E293B" },
  subtitle: { fontSize: 18, color: "#475569", fontFamily: font.regular, lineHeight: 24 },
  captureBtn: {
    backgroundColor: "#0F9445",
    borderRadius: 10,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  captureBtnDisabled: { backgroundColor: "#8ECFA8" },
  captureBtnText: { color: "#FFF", fontSize: 17, fontFamily: font.bold },
  hint: { color: "#64748B", fontSize: 15, fontFamily: font.semiBold },
  geocodeWarning: { color: "#B45309", fontSize: 14, fontFamily: font.regular, lineHeight: 20 },
  fieldError: { color: "#DC2626", fontSize: 14, fontFamily: font.semiBold, marginTop: -8 },
  gpsCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
    gap: 4,
  },
  gpsLabel: { fontFamily: font.semiBold, fontSize: 13, color: "#1D4ED8" },
  gpsValue: { fontFamily: font.semiBold, fontSize: 16, color: "#1E3A8A" },
  gpsMeta: { fontFamily: font.regular, fontSize: 13, color: "#1D4ED8" },
  detectedCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 14,
    gap: 8,
  },
  detectedLabel: { fontFamily: font.semiBold, fontSize: 13, color: "#047857", marginBottom: 4 },
  osmRow: { gap: 2 },
  osmRowLabel: { fontFamily: font.semiBold, fontSize: 12, color: "#047857" },
  osmRowValue: { fontFamily: font.regular, fontSize: 14, color: "#064E3B", lineHeight: 20 },
  mapWrap: {
    width: "100%",
    height: 138,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D4DEE8",
  },
  mapView: { width: "100%", height: "100%" },
});

function getLeafletMapHtml(latitude: number, longitude: number): string {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <style>
        html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
        .leaflet-control-attribution { font-size: 10px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map', { zoomControl: false }).setView([${latitude}, ${longitude}], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        L.marker([${latitude}, ${longitude}]).addTo(map);
      </script>
    </body>
  </html>`;
}
