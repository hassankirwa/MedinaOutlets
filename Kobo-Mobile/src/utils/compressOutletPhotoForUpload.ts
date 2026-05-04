import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.72;

function imageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

/**
 * Shrinks wide camera photos before multipart upload so reverse proxies (Nginx default 1m)
 * and PHP limits are less likely to return HTTP 413.
 */
export async function compressOutletPhotoForUpload(uri: string): Promise<string> {
  try {
    let actions: ImageManipulator.Action[] = [];
    try {
      const { width: w, height: h } = await imageDimensions(uri);
      const longest = Math.max(w, h);
      if (longest > MAX_EDGE_PX) {
        actions = w >= h ? [{ resize: { width: MAX_EDGE_PX } }] : [{ resize: { height: MAX_EDGE_PX } }];
      }
    } catch {
      actions = [{ resize: { width: MAX_EDGE_PX } }];
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export async function compressDraftPhotosForOutletUpload<T extends { uri: string }>(photos: T[]): Promise<T[]> {
  return Promise.all(
    photos.map(async (p) => ({
      ...p,
      uri: await compressOutletPhotoForUpload(p.uri),
    })),
  );
}
