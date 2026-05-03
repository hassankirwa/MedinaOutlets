import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import type { OutletPhoto } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";

export function NewOutletScreen4({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();
  const photos = draft.photos;
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const setPhotos = (next: OutletPhoto[]) => updateDraft({ photos: next });

  const openCamera = async (replaceIndex?: number) => {
    try {
      setIsOpeningCamera(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Camera Access Needed", "Please allow camera permission to capture facility photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const newPhoto: OutletPhoto = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        uri: asset.uri,
      };

      if (typeof replaceIndex === "number" && photos[replaceIndex]) {
        setPhotos(photos.map((item, idx) => (idx === replaceIndex ? newPhoto : item)));
      } else {
        setPhotos([...photos, newPhoto]);
      }
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter((photo) => photo.id !== id));
  };

  const hasAtLeastOnePhoto = photos.length > 0;
  const coverPhoto = photos[0];

  return (
    <View style={styles.root}>
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={4} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Facility Photo</Text>
        <Text style={styles.subtitle}>Take a photo of the facility</Text>

        <Text style={styles.fieldLabel}>
          Facility Photo<Text style={styles.req}> *</Text>
        </Text>

        <Pressable style={styles.photoBox} onPress={() => openCamera(0)} disabled={isOpeningCamera}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto.uri }} style={styles.coverPhoto} />
          ) : (
            <View style={styles.emptyPhotoState}>
              <View style={styles.cameraIconWrap}>
                <Ionicons name="camera" size={24} color="#334155" />
              </View>
              <Text style={styles.emptyPhotoText}>{isOpeningCamera ? "Opening camera..." : "Tap to capture photo"}</Text>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => openCamera(0)} disabled={isOpeningCamera}>
          <Text style={styles.secondaryButtonText}>Retake Photo</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => openCamera()} disabled={isOpeningCamera}>
          <Text style={styles.secondaryButtonText}>Add Photo</Text>
        </Pressable>

        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.thumbWrap}>
                <Image source={{ uri: photo.uri }} style={styles.thumb} />
                <Pressable style={styles.deleteBtn} onPress={() => removePhoto(photo.id)}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </ScrollView>

      <NewOutletFooterButtons onBack={onBack} onNext={onNext} nextDisabled={!hasAtLeastOnePhoto} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 20, paddingBottom: 100 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 19, marginTop: 6, marginBottom: 16, fontFamily: font.regular },
  fieldLabel: { color: "#334155", fontSize: 18, fontFamily: font.bold, marginBottom: 10 },
  req: { color: "#EF4444" },
  photoBox: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    overflow: "hidden",
    height: 320,
    backgroundColor: "#FFFFFF",
  },
  coverPhoto: { width: "100%", height: "100%" },
  emptyPhotoState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  cameraIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPhotoText: { color: "#64748B", fontSize: 14, fontFamily: font.semiBold },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: { color: "#0F9445", fontSize: 16, fontFamily: font.bold },
  photoRow: { gap: 10, marginTop: 12, paddingRight: 20 },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  thumb: { width: "100%", height: "100%" },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
});
