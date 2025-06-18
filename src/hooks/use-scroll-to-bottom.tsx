import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

interface UseScrollToBottomOptions {
  /**
   * Threshold in pixels to determine if we're "near bottom"
   * When user is within this distance from bottom, auto-scroll will be enabled
   */
  threshold?: number;
  /**
   * Delay in milliseconds before scrolling (useful for smooth animations)
   */
  delay?: number;
  /**
   * Whether to use smooth scrolling behavior
   */
  smooth?: boolean;
}

interface UseScrollToBottomReturn {
  /** Ref to attach to the scrollable container */
  messagesRef: RefObject<HTMLDivElement | null>;
  /** Ref to attach to the bottom element (last message or sentinel) */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Current visibility state of the scroll-to-bottom button */
  isVisible: boolean;
  /** Function to manually scroll to bottom */
  scrollToBottom: () => void;
  /** Whether auto-scroll is currently enabled */
  isAtBottom: boolean;
}

export function useScrollToBottom({
  threshold = 100,
  delay = 0,
  smooth = true,
}: UseScrollToBottomOptions = {}): UseScrollToBottomReturn {
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  const isAtBottomRef = useRef(true);

  // Force re-render when visibility changes
  const [renderCount, setRenderCount] = useState(0);
  const forceUpdate = useCallback(() => {
    setRenderCount((c) => c + 1);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollBehavior = smooth ? "smooth" : "instant";
      scrollRef.current.scrollIntoView({
        behavior: scrollBehavior,
        block: "end",
      });
    }
  }, [smooth]);

  const checkScrollPosition = useCallback(() => {
    const container = messagesRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    const newIsAtBottom = distanceFromBottom <= threshold;
    const newIsVisible = !newIsAtBottom && scrollHeight > clientHeight;

    // Update refs and trigger re-render if visibility changed
    if (
      isAtBottomRef.current !== newIsAtBottom ||
      isVisibleRef.current !== newIsVisible
    ) {
      isAtBottomRef.current = newIsAtBottom;
      isVisibleRef.current = newIsVisible;
      forceUpdate();
    }
  }, [threshold, forceUpdate]);

  // Auto-scroll when new content is added (if user is at bottom)
  const handleAutoScroll = useCallback(() => {
    if (isAtBottomRef.current) {
      if (delay > 0) {
        setTimeout(scrollToBottom, delay);
      } else {
        scrollToBottom();
      }
    }
  }, [scrollToBottom, delay]);

  // Set up intersection observer for better performance
  useEffect(() => {
    const scrollElement = scrollRef.current;
    const messagesElement = messagesRef.current;

    if (!scrollElement || !messagesElement) return;

    // Intersection Observer to detect when the bottom element is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        const newIsAtBottom = entry.isIntersecting;
        const newIsVisible =
          !newIsAtBottom &&
          messagesElement.scrollHeight > messagesElement.clientHeight;

        if (
          isAtBottomRef.current !== newIsAtBottom ||
          isVisibleRef.current !== newIsVisible
        ) {
          isAtBottomRef.current = newIsAtBottom;
          isVisibleRef.current = newIsVisible;
          forceUpdate();
        }
      },
      {
        root: messagesElement,
        rootMargin: `0px 0px ${threshold}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(scrollElement);

    return () => observer.disconnect();
  }, [threshold, forceUpdate]);

  // Listen to scroll events for manual scrolling detection
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkScrollPosition();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkScrollPosition]);

  // Auto-scroll when content changes (via MutationObserver)
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      handleAutoScroll();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [handleAutoScroll]);

  return {
    messagesRef,
    scrollRef,
    isVisible: isVisibleRef.current,
    scrollToBottom,
    isAtBottom: isAtBottomRef.current,
  };
}
