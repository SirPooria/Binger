"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  saveCurrentScroll,
  restoreScrollPosition,
  getSavedScroll
} from '@/lib/scrollRestoration';

export default function ScrollRestorationWatcher() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);
  const isPopStateRef = useRef<boolean>(false);

  // 1. Configure browser scrollRestoration to manual
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const handlePopState = () => {
      isPopStateRef.current = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 2. Continually track scroll position on the current page (throttled)
  useEffect(() => {
    let scrollTimeout: any = null;

    const handleScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        saveCurrentScroll(pathname, window.scrollY);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      // Immediately save final scroll position when unmounting/leaving route
      saveCurrentScroll(pathname, window.scrollY);
    };
  }, [pathname]);

  // 3. Handle Route Transitions: Restore scroll when returning from TV show or popstate
  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;

    // A: Entering a TV Series details page -> Always start from top
    if (pathname.startsWith('/dashboard/tv/')) {
      // Small timeout ensures layout paints before scrolling to 0
      window.scrollTo({ top: 0, behavior: 'instant' });
      isPopStateRef.current = false;
      return;
    }

    // B: Returning from a TV Series details page -> RESTORE previous page scroll position!
    const cameFromTv = prevPath && prevPath.startsWith('/dashboard/tv/');
    const wasPopState = isPopStateRef.current;
    isPopStateRef.current = false;

    if (cameFromTv || wasPopState) {
      const saved = getSavedScroll(pathname);
      if (saved > 0) {
        restoreScrollPosition(pathname);
      }
    }
  }, [pathname]);

  return null;
}
