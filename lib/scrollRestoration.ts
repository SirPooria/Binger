// Binger Scroll Restoration System
// Ensures scroll position is flawlessly preserved and restored across navigations,
// particularly when navigating from Explore/Home/Lists to TV Series details and back.

const SCROLL_PREFIX = 'binger_scroll_';
const PREV_ROUTE_KEY = 'binger_last_route';
const PREV_TV_KEY = 'binger_came_from_tv';

const inMemoryScroll = new Map<string, number>();

export function getSavedScroll(pathname: string): number {
  if (typeof window === 'undefined') return 0;
  
  // 1. Try memory map first (fastest)
  if (inMemoryScroll.has(pathname)) {
    return inMemoryScroll.get(pathname) || 0;
  }
  
  // 2. Try sessionStorage
  try {
    const raw = sessionStorage.getItem(`${SCROLL_PREFIX}${pathname}`);
    if (raw) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= 0) {
        inMemoryScroll.set(pathname, val);
        return val;
      }
    }
  } catch {
    // sessionStorage disabled or unavailable
  }

  return 0;
}

export function saveCurrentScroll(pathname: string, y?: number): void {
  if (typeof window === 'undefined' || !pathname) return;
  
  const scrollY = typeof y === 'number' ? y : window.scrollY;
  inMemoryScroll.set(pathname, scrollY);

  try {
    sessionStorage.setItem(`${SCROLL_PREFIX}${pathname}`, String(scrollY));
  } catch {
    // ignore
  }
}

export function resetScrollPosition(pathname: string): void {
  if (typeof window === 'undefined' || !pathname) return;
  inMemoryScroll.set(pathname, 0);
  try {
    sessionStorage.setItem(`${SCROLL_PREFIX}${pathname}`, '0');
  } catch {
    // ignore
  }
}

let activeRestorationTimer: any = null;
let userInteracted = false;

function onUserInteraction() {
  userInteracted = true;
  if (activeRestorationTimer) {
    clearInterval(activeRestorationTimer);
    activeRestorationTimer = null;
  }
}

export function restoreScrollPosition(pathname: string): void {
  if (typeof window === 'undefined') return;

  const targetY = getSavedScroll(pathname);
  if (targetY <= 0) return;

  userInteracted = false;
  if (activeRestorationTimer) {
    clearInterval(activeRestorationTimer);
    activeRestorationTimer = null;
  }

  // Bind one-time user interaction listeners to abort restoration if user starts scrolling
  window.addEventListener('wheel', onUserInteraction, { passive: true, once: true });
  window.addEventListener('touchstart', onUserInteraction, { passive: true, once: true });
  window.addEventListener('keydown', onUserInteraction, { passive: true, once: true });

  // 1. Immediate attempt
  window.scrollTo({ top: targetY, behavior: 'instant' });

  // 2. Resilient check loop (handles async image decoding, card expansion, layout shifts)
  let attempts = 0;
  const maxAttempts = 25; // 25 * 40ms = 1000ms

  activeRestorationTimer = setInterval(() => {
    attempts++;

    if (userInteracted || attempts >= maxAttempts) {
      clearInterval(activeRestorationTimer);
      activeRestorationTimer = null;
      return;
    }

    const docHeight = document.documentElement.scrollHeight;
    const currentY = window.scrollY;

    // If the document has grown tall enough to satisfy targetY
    if (docHeight > targetY) {
      if (Math.abs(currentY - targetY) > 8) {
        window.scrollTo({ top: targetY, behavior: 'instant' });
      } else {
        // Successfully positioned within tolerance
        clearInterval(activeRestorationTimer);
        activeRestorationTimer = null;
      }
    }
  }, 40);
}
