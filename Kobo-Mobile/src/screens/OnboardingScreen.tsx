import { useCallback, useState, type ReactNode } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../theme/fonts";
import { bottomSafeInset } from "../utils/safeAreaInsets";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  primaryGreen: "#0F9445",
  accentGreen: "#28a745",
  darkGreen: "#1e5631",
  navy: "#1a2b3c",
  navyDeep: "#001D3D",
  white: "#FFFFFF",
  dotInactive: "#D1D5DB",
};

type Slide = {
  key: string;
  backgroundColor: string;
  renderBody: () => ReactNode;
};

function PageDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={styles.dotsRow} accessibilityRole="adjustable" accessibilityLabel="Onboarding pages">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

const FALLBACK_FOOTER_H = 148;

export function OnboardingScreen({ onComplete }: { onComplete: () => void | Promise<void> }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [footerHeight, setFooterHeight] = useState(FALLBACK_FOOTER_H);

  const effectiveFooter = footerHeight > 0 ? footerHeight : FALLBACK_FOOTER_H;
  const slidePaneHeight = Math.max(
    320,
    windowHeight - insets.top - insets.bottom - effectiveFooter,
  );

  const slides: Slide[] = [
    {
      key: "1",
      backgroundColor: COLORS.white,
      renderBody: () => (
        <View style={styles.slide1Root}>
          <View style={styles.slide1Header}>
            <Image
              source={require("../../assets/onboarding/slide1-hero-icon.jpg")}
              style={styles.slide1HeroIcon}
              contentFit="contain"
            />
            <Text style={styles.titleSplit}>
              <Text style={styles.titleDark}>OUTLET </Text>
              <Text style={styles.titleGreen}>CENSUS</Text>
            </Text>
            <Text style={styles.tagline}>Track. Collect. Map. Empower.</Text>
          </View>
          <View style={styles.slide1BottomWrap}>
            <Image
              source={require("../../assets/onboarding/slide1-bottom-illustration.jpg")}
              style={styles.slide1BottomImage}
              contentFit="cover"
              contentPosition="bottom center"
            />
          </View>
        </View>
      ),
    },
    {
      key: "2",
      backgroundColor: COLORS.white,
      renderBody: () => (
        <View style={styles.slide2Root}>
          <View style={styles.slide2CenterBlock}>
            <Image
              source={require("../../assets/onboarding/slide2-hero.jpg")}
              style={styles.slide2HeroImage}
              contentFit="contain"
            />
            <Text style={styles.slide2Headline}>Collect Accurate Data</Text>
            <Text style={styles.slide2Subtext}>
              Capture outlet information quickly and accurately in the field.
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: "3",
      backgroundColor: COLORS.white,
      renderBody: () => (
        <View style={styles.slide2Root}>
          <View style={styles.slide2CenterBlock}>
            <Image
              source={require("../../assets/onboarding/slide3-hero.jpg")}
              style={styles.slide3HeroImage}
              contentFit="contain"
            />
            <Text style={styles.slide2Headline}>Map. Analyze. Empower.</Text>
            <Text style={styles.slide2Subtext}>
              Visualize insights and empower better decisions.
            </Text>
          </View>
        </View>
      ),
    },
  ];

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / SCREEN_WIDTH);
    setIndex(Math.max(0, Math.min(next, slides.length - 1)));
  }, [slides.length]);

  const handleGetStarted = useCallback(() => {
    void Promise.resolve(onComplete()).catch(() => {
      // Parent handles errors; keep UI responsive
    });
  }, [onComplete]);

  const footerBackground = COLORS.white;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: bottomSafeInset(insets) }]}>
      <FlatList
        data={slides}
        style={styles.listFlex}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.key}
        extraData={slidePaneHeight}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View
            style={[
              styles.page,
              {
                width: SCREEN_WIDTH,
                height: slidePaneHeight,
                backgroundColor: item.backgroundColor,
              },
            ]}
          >
            {item.renderBody()}
          </View>
        )}
      />

      <View
        style={[styles.footer, { backgroundColor: footerBackground }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - footerHeight) > 0.5) {
            setFooterHeight(h);
          }
        }}
      >
        <PageDots count={slides.length} activeIndex={index} />
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleGetStarted}
          accessibilityRole="button"
          accessibilityLabel="Get started, go to sign in"
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  listFlex: { flex: 1 },
  listContent: { flexGrow: 1 },
  page: {},
  slide1Root: {
    flex: 1,
    width: SCREEN_WIDTH,
    minHeight: 0,
  },
  slide1Header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 12,
  },
  slide1HeroIcon: {
    width: 128,
    height: 128,
    marginBottom: 18,
  },
  slide1BottomWrap: {
    flex: 1,
    width: SCREEN_WIDTH,
    minHeight: 0,
    marginBottom: 0,
    paddingBottom: 0,
    overflow: "hidden",
    position: "relative",
  },
  slide1BottomImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
  },
  slide2Root: {
    flex: 1,
    minHeight: 0,
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  slide2CenterBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    width: "100%",
  },
  slide2HeroImage: {
    width: "100%",
    maxWidth: 520,
    height: 420,
    alignSelf: "center",
    marginBottom: 20,
  },
  slide3HeroImage: {
    width: "100%",
    maxWidth: 560,
    height: 450,
    alignSelf: "center",
    marginBottom: 8,
  },
  slide2Headline: {
    fontFamily: font.bold,
    fontSize: 22,
    color: COLORS.navyDeep,
    textAlign: "center",
    marginTop: 0,
  },
  slide2Subtext: {
    marginTop: 10,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    textAlign: "center",
  },
  titleSplit: { textAlign: "center" },
  titleDark: {
    fontFamily: font.extraBold,
    fontSize: 26,
    letterSpacing: 1,
    color: COLORS.navy,
  },
  titleGreen: {
    fontFamily: font.extraBold,
    fontSize: 26,
    letterSpacing: 1,
    color: COLORS.accentGreen,
  },
  tagline: {
    marginTop: 10,
    fontFamily: font.regular,
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    zIndex: 2,
    elevation: 8,
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: COLORS.primaryGreen },
  dotInactive: { backgroundColor: COLORS.dotInactive },
  cta: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.92 },
  ctaText: {
    fontFamily: font.bold,
    fontSize: 17,
    color: "#FFFFFF",
  },
});
