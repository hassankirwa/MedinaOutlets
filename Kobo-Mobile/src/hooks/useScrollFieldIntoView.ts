import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from "react-native";

const DEFAULT_PADDING = 24;
const KEYBOARD_EXTRA_PADDING = 48;

type ScrollTarget = React.RefObject<View | null>;

export function useScrollFieldIntoView(defaultBottomPadding = DEFAULT_PADDING) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardBottomPadding, setKeyboardBottomPadding] = useState(defaultBottomPadding);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardBottomPadding(event.endCoordinates.height + KEYBOARD_EXTRA_PADDING);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = null;
      setKeyboardBottomPadding(defaultBottomPadding);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [defaultBottomPadding]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollToEndAfterKeyboard = useCallback(() => {
    const delays = Platform.OS === "android" ? [50, 150, 300, 500] : [50, 150, 300];
    for (const delay of delays) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, delay);
    }
  }, []);

  const scrollFieldIntoView = useCallback(
    (targetRef: ScrollTarget, options?: { bottomRef?: ScrollTarget; padding?: number; scrollToEnd?: boolean }) => {
      const padding = options?.padding ?? DEFAULT_PADDING;
      const measureRef = options?.bottomRef ?? targetRef;
      const useScrollToEnd = options?.scrollToEnd ?? Boolean(options?.bottomRef);

      const scrollToClearKeyboard = (keyboardTop: number) => {
        measureRef.current?.measureInWindow((_x, y, _width, height) => {
          const elementBottom = y + height + padding;
          const overlap = elementBottom - keyboardTop;

          if (overlap > 0) {
            scrollRef.current?.scrollTo({
              y: scrollOffsetRef.current + overlap,
              animated: true,
            });
          } else if (useScrollToEnd) {
            scrollToEndAfterKeyboard();
          }
        });
      };

      const run = (keyboardTop: number) => {
        const delay = Platform.OS === "android" ? 150 : 60;
        setTimeout(() => scrollToClearKeyboard(keyboardTop), delay);
        if (useScrollToEnd) {
          scrollToEndAfterKeyboard();
        }
      };

      const knownTop = keyboardTopRef.current ?? Keyboard.metrics()?.screenY;
      if (knownTop != null && knownTop > 0) {
        run(knownTop);
        return;
      }

      const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const sub = Keyboard.addListener(showEvent, (event) => {
        sub.remove();
        keyboardTopRef.current = event.endCoordinates.screenY;
        setKeyboardBottomPadding(event.endCoordinates.height + KEYBOARD_EXTRA_PADDING);
        run(event.endCoordinates.screenY);
      });
    },
    [scrollToEndAfterKeyboard],
  );

  return { scrollRef, onScroll, scrollFieldIntoView, scrollToEndAfterKeyboard, keyboardBottomPadding };
}
