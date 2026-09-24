/**
 * Validates a redirect target path to prevent open redirect vulnerabilities.
 * Strictly enforces that redirects stay within the internal application route allowlist.
 */

const ALLOWED_PATH_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/admin',
  '/settings',
  '/explore',
  '/profile',
  '/lists',
  '/category',
  '/favorites',
  '/subscription',
  '/tv',
  '/mood',
];

const DEFAULT_FALLBACK_PATH = '/dashboard';

export function getSafeInternalRedirectPath(nextCandidate: string | null | undefined): string {
  if (!nextCandidate || typeof nextCandidate !== 'string') {
    return DEFAULT_FALLBACK_PATH;
  }

  const trimmed = nextCandidate.trim();

  // Must start with exactly one forward slash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return DEFAULT_FALLBACK_PATH;
  }

  // Reject CRLF or control characters
  if (/[\r\n\t\0]/.test(trimmed)) {
    return DEFAULT_FALLBACK_PATH;
  }

  // Reject explicit protocols or URL schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return DEFAULT_FALLBACK_PATH;
  }

  // Parse path component safely
  let pathname: string;
  try {
    // Construct dummy URL to parse relative path and query
    const parsed = new URL(trimmed, 'http://localhost');
    pathname = parsed.pathname;
  } catch {
    return DEFAULT_FALLBACK_PATH;
  }

  // Check against internal allowlist prefixes
  const isAllowed = ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isAllowed) {
    return DEFAULT_FALLBACK_PATH;
  }

  // Return the sanitized relative path with its safe query string
  try {
    const parsed = new URL(trimmed, 'http://localhost');
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_FALLBACK_PATH;
  }
}
