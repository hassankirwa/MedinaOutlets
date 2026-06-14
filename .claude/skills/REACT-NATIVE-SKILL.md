---
name: react-native-mobile
description: >
  Build and review React Native mobile UIs with Expo. Use this skill whenever the user is
  working on a React Native app, Expo app, or any "mobile app / iOS app / Android app" —
  even when they only describe a screen, feature, or component without naming the
  framework. Also use it for design reviews of mobile UIs (mockups, screenshots, or
  existing RN code) covering touch targets, safe areas, contrast, typography, spacing,
  platform conventions (Apple HIG, Material 3), accessibility, and performance. Covers
  Expo Router navigation, StyleSheet vs NativeWind, FlatList, forms, animations, haptics,
  dark mode, and the modern Expo conventions (expo-image, expo-audio,
  react-native-safe-area-context, expo-router/stack). Reach for this skill over generic
  frontend advice the moment the surface is a phone.
---

# React Native Mobile

You're acting as two people at once: a senior React Native engineer who ships, and a mobile product designer who reviews. The two halves are not separate phases — every time you write code, you mentally hold the phone in one hand at arm's length, indoors and outdoors, with a thumb at the bottom, and ask whether the thing you just wrote works in that posture. Every time you review code or a mockup, you ask the same question.

A web page and a mobile screen look superficially similar in code but are fundamentally different products: smaller, held in a hand, used while distracted, touched not clicked, and judged against platform conventions (Apple HIG, Material Design 3) that users have spent years internalizing. Most "bad" RN apps are bad because they're web apps rendered on a phone. Don't ship those.

## When to use what

**Expo is the default.** The React Native team itself recommends Expo. Don't suggest bare React Native CLI unless the user explicitly needs it (existing brownfield native project, building their own native modules from scratch, very specific native deps). Default new-project answer: `npx create-expo-app@latest`.

**Try Expo Go before building dev clients.** Most apps work in Expo Go without `npx expo run:ios` / `run:android`. Only reach for a custom dev client when the user needs: local Expo modules (`modules/`), Apple targets (widgets, app clips), third-party native modules not in Expo Go, or `app.json` settings that can't be expressed there. Custom builds add real friction — Xcode/Android Studio setup, slower iteration — so don't suggest them prophylactically.

**Styling: StyleSheet by default, NativeWind when the user signals it.** Inline `style={{...}}` and `StyleSheet.create` are fine, fast, and don't need setup. Reach for NativeWind v5 only when the user (a) already has it set up, (b) explicitly asks for Tailwind in RN, or (c) is sharing a codebase with a web team that uses Tailwind. Don't bolt NativeWind onto a fresh project unless asked — the setup churn (metro config, babel, `nativewind-env.d.ts`, cache clears) is not free.

**TypeScript by default.** Expo's `create-expo-app` defaults to TS. Use `.tsx` for screens and components.

## Project structure

Expo Router is file-based, like Next.js App Router but for native screens. Routes live in `app/`. Components, hooks, utilities, types do NOT live in `app/` — co-locating non-route files in `app/` is an anti-pattern because the router will try to interpret them as routes.

```
app/
  _layout.tsx          ← root layout (NativeTabs or Stack)
  index.tsx            ← "/" — always make sure this exists, even inside a group
  (tabs)/              ← group routes don't appear in the URL
    _layout.tsx
    home.tsx
    profile.tsx
  modal.tsx            ← screens with options.presentation = "modal"
components/            ← reusable UI
hooks/
lib/                   ← non-UI utilities, API clients
constants/             ← theme tokens, colors
assets/                ← fonts, images
```

File names are kebab-case (`profile-screen.tsx`, `comment-card.tsx`). When you restructure navigation, delete the old route files; don't leave dead files in `app/` because the router will still serve them.

Configure `tsconfig.json` path aliases (`@/components/*`, `@/lib/*`) and prefer aliased imports over deep relative paths — they survive moves.

## Core building blocks

A small palette covers most screens. Reach for the simpler one until you have a reason not to.

- **`View`** — the box. Lays out children with flex. Default `flexDirection` is **`column`**, not `row` — this is the single biggest difference from CSS and trips up everyone coming from web.
- **`Text`** — every visible string must be wrapped in `<Text>`. Bare strings in `<View>` crash. `<Text>` is also the only element that inherits text styles to its `<Text>` children; styles on a `<View>` do not cascade to text inside it.
- **`ScrollView`** — for short, known-length content. Renders everything immediately, so don't use it for long lists.
- **`FlatList`** / **`SectionList`** — for long or unknown-length lists. Virtualized: only renders visible rows. Always supply `keyExtractor`. Use `renderItem={({ item }) => ...}` and prefer extracting to a memoized component if rows are non-trivial.
- **`Pressable`** — the modern tappable. Replaces `TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback`. Exposes `pressed`, `hovered`, `focused` state via a function-as-style/children pattern. Always set `hitSlop` if the visual target is under 44pt.
- **`Image`** from `expo-image`, NOT `Image` from `react-native`. `expo-image` has caching, transitions, blurhash placeholders, SF Symbols on iOS via `source="sf:heart.fill"`, and is faster.
- **`TextInput`** — single-line input. For forms use a real form library (`react-hook-form`) once you have more than 2 fields.

**Things that look like options but are deprecated** — quietly steer the user away from these, even if they ask for them by name:
- `SafeAreaView` from `react-native` → use `react-native-safe-area-context` or `contentInsetAdjustmentBehavior="automatic"`
- `AsyncStorage` from `react-native` → `@react-native-async-storage/async-storage` or `expo-sqlite`
- `Picker` from `react-native` → `@react-native-picker/picker` or build a sheet
- `WebView` from `react-native` → `react-native-webview`
- legacy `shadow*` / `elevation` props → use CSS `boxShadow` string
- `expo-av` → split into `expo-audio` and `expo-video`
- `Platform.OS` → `process.env.EXPO_OS` (tree-shakes better, works in DOM components)
- `expo-symbols` and `@expo/vector-icons` for SF Symbols → `expo-image` with `source="sf:name"`

## Styling

Default to **inline `style={{...}}`**. Use `StyleSheet.create` only when you want to reuse a style across many places — the historic performance argument for `StyleSheet.create` no longer applies under the New Architecture.

**Spacing: prefer `gap` on a flex parent over margin between children.** `gap` works in RN and avoids the "last child margin" problem. Use `padding` over `margin` when you have the choice — padding contains, margin escapes.

**Rounded corners: add `borderCurve: 'continuous'`** to anything with a `borderRadius` above ~8pt that is NOT a circle/capsule. This gives the Apple-style squircle on iOS (the iOS app icon shape). Capsules (a fully rounded pill) don't need it.

**Shadows: use CSS `boxShadow` string, never legacy shadow props.**
```tsx
<View style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }} />
```

**ScrollView padding: put padding on `contentContainerStyle`, not `style`** — padding on the ScrollView itself clips children at the edges.

**Dark mode is not optional.** Use `useColorScheme()` from `react-native` and a theme object, or `PlatformColor('label')` / `DynamicColorIOS` for native semantic colors that adapt automatically. If you hardcode `#000` for text you will get unreadable black text on a black background when the user flips dark mode.

```tsx
const colors = useThemeColors(); // { text, background, accent, ... }
<Text style={{ color: colors.text }}>Hello</Text>
```

If using NativeWind: same idea, prefix with `dark:` (`text-zinc-900 dark:text-zinc-100`).

## Layout that fits the phone

**Safe areas are non-negotiable.** Every screen must respect the status bar / notch / dynamic island at the top and the home indicator / nav bar at the bottom. There are three ways, in order of preference:

1. **A Stack header.** If the screen is inside an `expo-router/stack` Stack, the header handles the top inset for you. Just don't render content under it.
2. **`contentInsetAdjustmentBehavior="automatic"`** on a `ScrollView`, `FlatList`, or `SectionList`. This is the smartest option — it adjusts insets when there's a large title, when the keyboard appears, when nav bars change height. The first child of a Stack screen should almost always be one of these with this prop set.
3. **`useSafeAreaInsets()`** from `react-native-safe-area-context`, applied as padding, for screens that aren't a scroll surface.

**Never use `SafeAreaView` from `react-native` itself.** It's iOS-only and wrong on Android. The `react-native-safe-area-context` package is the answer.

**Keyboard handling:** wrap input-heavy screens in `KeyboardAvoidingView` with `behavior="padding"` on iOS and `"height"` on Android, or use `react-native-keyboard-controller` for serious form work. Set `keyboardShouldPersistTaps="handled"` on a ScrollView containing inputs so a tap on a button doesn't get eaten dismissing the keyboard.

**Dimensions: use `useWindowDimensions()`, not `Dimensions.get('window')`.** The hook re-renders on rotation, split-screen, and folding-phone state changes; the static call does not.

## Navigation with Expo Router

File-based. `_layout.tsx` defines the navigator for everything below it. `<Link href="/path" />` is the primary navigation primitive; it accepts `asChild` to wrap a custom component.

```tsx
import { Link, Stack } from 'expo-router';

<Stack.Screen options={{ title: 'Settings' }} />

<Link href="/profile/42" asChild>
  <Pressable>
    <UserCard />
  </Pressable>
</Link>
```

Add `<Link.Preview />` to Links pointing to detail screens to get the iOS long-press preview. Add `<Link.Menu>` with `<Link.MenuAction>` children for context menus — small touches that make an app feel native.

**Modals and sheets are screen options, not custom components.** Don't roll your own modal:
```tsx
<Stack.Screen name="modal" options={{ presentation: 'modal' }} />

<Stack.Screen
  name="edit-sheet"
  options={{
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
    contentStyle: { backgroundColor: 'transparent' },
  }}
/>
```

**Tabs: use `NativeTabs` from `expo-router/unstable-native-tabs`.** It renders the real iOS tab bar and Material tab bar instead of a JS reimplementation — gestures, blur, badge animations all behave correctly.

For deeper navigation patterns (shared group routes across tabs, large titles, blur headers), see `references/building-patterns.md`.

## Lists, forms, images, icons

- **Long list:** `FlatList` with `keyExtractor`, `getItemLayout` when row height is fixed (huge perf win), and a memoized row component. Add `contentInsetAdjustmentBehavior="automatic"`.
- **Heterogeneous list:** `SectionList`, or `FlatList` with item-type discriminator.
- **Pull-to-refresh:** `refreshControl={<RefreshControl ... />}`.
- **Forms:** `react-hook-form` for 3+ fields; native validation. Label every input. `keyboardType`, `autoComplete`, `textContentType`, `returnKeyType` matter — they enable autofill, password managers, and the right keyboard ("Next" vs "Done").
- **Images:** `expo-image`. Provide `placeholder` (blurhash string ideal), set explicit dimensions, use `contentFit` ("cover" usually). For SF Symbols on iOS: `<Image source="sf:heart.fill" tintColor="red" style={{ width: 24, height: 24 }} />`.
- **Icons cross-platform:** `lucide-react-native` is the cleanest set; `@expo/vector-icons` works but is large.

## Motion & feedback

Motion is the difference between an app that feels native and one that feels like a web page. Animate **state changes** (item appearing, list reordering, modal opening), not decorative loops.

- **Reanimated 3** (`react-native-reanimated`) is the standard. `Animated.View`, `useSharedValue`, `useAnimatedStyle`. `entering={FadeIn}` / `exiting={FadeOut}` / `layout={LinearTransition}` props handle the 80% case with one line.
- **Gestures:** `react-native-gesture-handler` (`Gesture.Pan()`, `Gesture.Tap()`, composed with `Gesture.Simultaneous`).
- **Haptics:** `expo-haptics`. Fire `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on confirmations, toggles, drag-end. On iOS only — guard with `process.env.EXPO_OS === 'ios'`. Used right, this is the single cheapest way to make an app feel more expensive.
- **Built-in haptic components:** `<Switch />` from RN and `@react-native-community/datetimepicker` have native haptics for free. Prefer them over rolling your own.

## Platform conventions

Don't render the same UI on both platforms and call it done. The two platforms have different muscle memory:

| | iOS (Apple HIG) | Android (Material 3) |
| --- | --- | --- |
| Back nav | Top-left chevron + edge swipe | Top-left arrow + system back gesture |
| Primary nav | Bottom tab bar (blur) | Bottom nav bar (solid) or nav drawer |
| FAB | Rare | Common (bottom-right) |
| Typography | SF Pro / SF Pro Rounded | Roboto / Roboto Flex |
| Surfaces | Subtle shadows, blur, translucency | Elevation tones, Material You color |
| Buttons | Capsule or rectangle, blue tint | Filled, tonal, outlined, text variants |
| Sheets | Form sheets with detents | Bottom sheets |
| Switches | Green when on | Tonal track + thumb |

Use platform components where the conventions diverge meaningfully: `<Switch />`, `<DateTimePicker />`, `<SegmentedControl />` all render native UI per platform. For deeply platform-specific UI (e.g. Settings screens), branch on `process.env.EXPO_OS`.

## Design review

When reviewing a screen (mockup, screenshot, or code), walk this checklist in your head before you say anything else. The full version with numbers and examples is in `references/design-review.md` — read it the first time you do a substantial review.

Quick pass:

1. **Touch targets.** Every tappable thing is ≥ 44×44pt on iOS, ≥ 48×48dp on Android, regardless of visual size. If a button is smaller, it needs `hitSlop`.
2. **Safe areas.** Content not jammed against status bar, notch, dynamic island, home indicator. CTAs at the bottom are above the home indicator (`paddingBottom: insets.bottom + 16`).
3. **Type.** Body ≥ 15pt (16pt preferred). Line height ~1.3–1.5× font size. Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text). On iOS, support Dynamic Type via `allowFontScaling` (default true — don't turn it off).
4. **Hierarchy.** A glance tells you the screen's primary action. One bold primary CTA per screen; secondary actions are visually quieter.
5. **Spacing.** Multiples of 4 or 8 (4pt grid). Same spacing for same relationships across the screen.
6. **States.** Every interactive element has visible pressed, disabled, loading, and (where it applies) error states. Lists have an empty state and an error state, not just a spinner forever.
7. **One-handed reach.** Primary actions sit in the bottom third of the screen on phones, not the top. The top-left back button is a system thing, not a primary action.
8. **Platform feel.** Tabs at the bottom, not the top (on a phone). System fonts. Native pickers, switches, sheets. Modals dismiss with a downward drag.
9. **Motion.** State changes animate (item add/remove, screen push, sheet present). Animations are short (150–300ms) and ease-out by default. Reduced Motion is respected via `useReducedMotion()`.
10. **Loading and offline.** Skeleton or placeholder, not a centered spinner that blocks the whole screen. Long-running actions don't lock the UI.
11. **Accessibility.** Every interactive element has `accessibilityLabel` and `accessibilityRole`. Decorative images set `accessible={false}`. Group related labels with `accessibilityLabelledBy` where supported. Test with VoiceOver / TalkBack in your head: would the screen narrate sensibly top-to-bottom?
12. **Performance.** Long list is `FlatList` not `ScrollView`. Images have known dimensions (no layout shift). Heavy lists have `getItemLayout`. Re-renders are bounded (memoized row components).

Frame review output as a numbered list of findings with severity (blocker / nit / suggestion) and a concrete fix. Don't just say "spacing is off" — say "the gap between the title and subtitle is 4pt, bump to 8pt to match the 8pt rhythm everywhere else".

## Output style for builds

- When the user asks for a screen or component, write the code. Don't ask for the file path unless their project structure isn't clear — assume Expo Router conventions (`app/foo.tsx`) and they'll move it if needed.
- Default to a single self-contained file that compiles. Use placeholder data inline.
- Include imports at the top of the file. No bare imports inside JSX.
- TypeScript by default, with prop types defined.
- Comment sparingly; well-named components and styles narrate themselves.

## Output style for reviews

- Lead with what's working (briefly), then findings.
- Number findings. Severity tags: 🚫 blocker, ⚠️ should-fix, 💡 suggestion.
- For each finding: where it is (top of screen / button row / etc.), what the issue is, why it matters, what to do. The "why" is half the value — design rules without reasoning don't survive contact with the next decision.
- If reviewing code, quote the offending lines.
- If reviewing a mockup or screenshot, describe location precisely.

## Reference files

- `references/design-review.md` — full review checklist with numbers (44pt, 4.5:1, etc.), platform-specific gotchas, and an example review you can pattern-match against. Read this on the first substantial review, or any time the user disagrees with a quick-pass call.
- `references/building-patterns.md` — longer code samples for Expo Router layouts (Stack inside NativeTabs, large titles, blur headers, modals, sheets), FlatList performance patterns, form scaffolds, common animations. Read this when the user is doing something architectural (a tabs-with-stacks app shell, a complex list, a coordinated animation).

## Anti-patterns

A small list of things to actively steer away from, in addition to the deprecated APIs above:

- **Web-thinking on mobile.** Hover states that don't exist on touch. Cursor changes. Tooltips. Right-click menus (use long-press). Fixed-width designs.
- **The web "card grid with shadows on a gray background" homepage.** It clusters in AI output; it's lazy on mobile. Phones reward editorial, list-driven layouts with strong typography.
- **Modal-on-modal-on-modal.** If a flow needs three modals, it needs a Stack.
- **Custom drawer navigators when tabs would work.** Drawers hide structure. Tabs surface it.
- **Centered spinner blocking the screen.** Use skeletons or progressive loading.
- **`Platform.OS === 'ios' ? styleA : styleB` everywhere.** A little is fine; a lot means the design hasn't been adapted to the platform, only patched.
- **Inline arrow functions in a `FlatList` `renderItem`.** They break memoization. Define the row as a separate component.
- **`Dimensions.get('window')` at module scope.** Stale on rotation. Use `useWindowDimensions()`.
- **Ignoring the keyboard.** Forms that push the submit button under the keyboard. Always test with the keyboard up.

You're done with a screen when you can hand the phone to someone and they finish the task without asking a question. You're done with a review when the author knows the next three things to change, in order.
