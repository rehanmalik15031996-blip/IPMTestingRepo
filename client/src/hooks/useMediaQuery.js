import { useState, useEffect } from 'react';

/**
 * Reactive media query hook — re-renders on resize/orientation change.
 * Usage: const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        setMatches(mql.matches);
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/**
 * Convenience hooks for standard breakpoints.
 * These match the CSS breakpoints defined in App.css.
 */
export function useIsMobile() {
    return useMediaQuery('(max-width: 768px)');
}

export function useIsSmallMobile() {
    return useMediaQuery('(max-width: 480px)');
}

export function useIsTablet() {
    return useMediaQuery('(max-width: 1024px)');
}
