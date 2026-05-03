import type { ImageURISource } from "react-native";

/** Proxied outlet photos require Bearer auth (field collector RBAC). */
export function outletPhotoRequiresAuth(uri: string): boolean {
  return uri.includes("/api/outlets/") && uri.includes("/photos/");
}

export function outletPhotoSource(uri: string, token: string | null): ImageURISource {
  if (token && outletPhotoRequiresAuth(uri)) {
    return { uri, headers: { Authorization: `Bearer ${token}` } };
  }
  return { uri };
}
