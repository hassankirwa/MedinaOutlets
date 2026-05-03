/**
 * Font binary requires only — avoids `@expo-google-fonts/.../index.js`, which
 * re-exports useFonts and can trigger Metro failing to resolve `expo-font`
 * from inside that package on some Android setups.
 */
export const PlusJakartaSans_400Regular = require("@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf");
export const PlusJakartaSans_500Medium = require("@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf");
export const PlusJakartaSans_600SemiBold = require("@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf");
export const PlusJakartaSans_700Bold = require("@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf");
export const PlusJakartaSans_800ExtraBold = require("@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf");
