import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { outletPhotoSource } from "../utils/outletPhotoSource";

/**
 * Outlet thumbnails often use Bearer-protected API URLs (`/api/outlets/:id/photos/:index`).
 * React Native's built-in `Image` does not reliably attach custom headers on Android; expo-image does.
 */
export function OutletPhotoImage({
  uri,
  token,
  style,
  placeholderIconSize = 22,
}: {
  uri: string | undefined | null;
  token: string | null;
  style?: StyleProp<ImageStyle>;
  placeholderIconSize?: number;
}) {
  const [broken, setBroken] = useState(false);
  const trimmed = typeof uri === "string" ? uri.trim() : "";

  if (!trimmed || broken) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="image-outline" size={placeholderIconSize} color="#94A3B8" />
      </View>
    );
  }

  return (
    <Image
      source={outletPhotoSource(trimmed, token)}
      style={style}
      contentFit="cover"
      transition={150}
      onError={() => setBroken(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
});
