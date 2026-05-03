import Constants from "expo-constants";

/** Per-project key so Expo Go’s shared AsyncStorage does not collide with other apps. */
export function getOnboardingDoneStorageKey(): string {
  const slug = Constants.expoConfig?.slug ?? "kobo-mobile";
  return `@${slug}:outlet_census_onboarding_done_v2`;
}
