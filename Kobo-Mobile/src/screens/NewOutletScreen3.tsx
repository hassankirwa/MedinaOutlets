import * as Location from "expo-location";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletInputField } from "../components/NewOutletFields";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import { useState } from "react";

export function NewOutletScreen3({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();
  const { physicalLocation, landmark, gps, accuracyMeters, latitude, longitude } = draft;
  const [isCapturing, setIsCapturing] = useState(false);

  const coordinates = { latitude, longitude };
  const canGoNext = physicalLocation.trim().length > 1 && landmark.trim().length > 1;

  const captureCurrentLocation = async () => {
    try {
      setIsCapturing(true);
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
      const nextAccuracy = location.coords.accuracy ? Math.max(1, Math.round(location.coords.accuracy)) : draft.accuracyMeters;
      updateDraft({
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
        gps: `${nextCoords.latitude.toFixed(5)}, ${nextCoords.longitude.toFixed(5)}`,
        accuracyMeters: nextAccuracy,
      });
    } catch {
      Alert.alert("GPS Error", "Failed to fetch current location. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.root}>
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={3} />
      <View style={styles.content}>
        <Text style={styles.title}>Location Details</Text>
        <Text style={styles.subtitle}>Where is this outlet located?</Text>

        <NewOutletInputField label="Physical Location" value={physicalLocation} onChangeText={(t) => updateDraft({ physicalLocation: t })} required />
        <NewOutletInputField label="Nearest Known Landmark" value={landmark} onChangeText={(t) => updateDraft({ landmark: t })} required />

        <View style={styles.field}>
          <Text style={styles.label}>GPS Location</Text>
          <View style={styles.gpsRow}>
            <TextInput
              style={styles.gpsInput}
              value={gps}
              onChangeText={(t) => updateDraft({ gps: t })}
              placeholder="Latitude, longitude"
              placeholderTextColor="#94A3B8"
            />
            <View style={styles.accuracyPill}>
              <Text style={styles.accuracyText}>Accuracy: {accuracyMeters}m</Text>
            </View>
          </View>
          <View style={styles.mapWrap}>
            <WebView
              key={`${coordinates.latitude}-${coordinates.longitude}`}
              source={{ html: getLeafletMapHtml(coordinates.latitude, coordinates.longitude) }}
              style={styles.mapView}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
            />
          </View>
          <View style={styles.mapButtonsRow}>
            <Pressable style={styles.secondaryBtn} onPress={captureCurrentLocation} disabled={isCapturing}>
              <Text style={styles.secondaryText}>{isCapturing ? "Capturing..." : "Capture GPS"}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={captureCurrentLocation} disabled={isCapturing}>
              <Text style={styles.secondaryText}>Refresh</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <NewOutletFooterButtons onBack={onBack} onNext={onNext} nextDisabled={!canGoNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { flex: 1, padding: 20, paddingBottom: 100 },
  title: { fontSize: 39, fontFamily: font.extraBold, color: "#1E293B" },
  subtitle: { marginTop: 8, marginBottom: 8, fontSize: 26, color: "#475569", fontFamily: font.regular },
  field: { marginTop: 10 },
  label: { color: "#334155", fontSize: 22, fontFamily: font.bold, marginBottom: 10, lineHeight: 26 },
  gpsRow: { flexDirection: "row", gap: 8 },
  gpsInput: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D4DEE8",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    color: "#1F2937",
    fontSize: 16,
    fontFamily: font.regular,
  },
  accuracyPill: { alignSelf: "center", backgroundColor: "#E2E8F0", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  accuracyText: { color: "#475569", fontFamily: font.semiBold, fontSize: 12 },
  mapWrap: {
    width: "100%",
    height: 138,
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D4DEE8",
  },
  mapView: { width: "100%", height: "100%" },
  mapButtonsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryText: { color: "#334155", fontSize: 16, fontFamily: font.semiBold },
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
