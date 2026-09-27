// Klipy GIF API Integration Client for Binger
// API Key provided by project configuration

export interface KlipyMediaFormat {
  url: string;
  width: number;
  height: number;
  size?: number;
}

export interface KlipyGifItem {
  id: number | string;
  title: string;
  slug?: string;
  blur_preview?: string;
  type?: string;
  file: {
    hd?: {
      gif?: KlipyMediaFormat;
      webp?: KlipyMediaFormat;
      mp4?: KlipyMediaFormat;
      webm?: KlipyMediaFormat;
      jpg?: KlipyMediaFormat;
    };
    md?: {
      gif?: KlipyMediaFormat;
      webp?: KlipyMediaFormat;
      mp4?: KlipyMediaFormat;
      webm?: KlipyMediaFormat;
      jpg?: KlipyMediaFormat;
    };
    sm?: {
      gif?: KlipyMediaFormat;
      webp?: KlipyMediaFormat;
      mp4?: KlipyMediaFormat;
      webm?: KlipyMediaFormat;
      jpg?: KlipyMediaFormat;
    };
    xs?: {
      gif?: KlipyMediaFormat;
      webp?: KlipyMediaFormat;
      mp4?: KlipyMediaFormat;
      webm?: KlipyMediaFormat;
      jpg?: KlipyMediaFormat;
    };
  };
}

export interface KlipyResponse {
  result: boolean;
  data: {
    data: KlipyGifItem[];
    current_page: number;
    per_page: number;
    has_next: boolean;
  };
}

const DEFAULT_KLIPY_KEY = 'kv5phgCJT8yEh2QtzH6qHEzeqxvfbk7Ce4uuhQpJNmT9XTOj0CzLFkHDWlaO8GHo';

export function getKlipyApiKey(): string {
  if (typeof process !== 'undefined') {
    return (
      process.env.NEXT_PUBLIC_KLIPY_API_KEY ||
      process.env.KLIPY_API_KEY ||
      DEFAULT_KLIPY_KEY
    );
  }
  return DEFAULT_KLIPY_KEY;
}

/**
 * Returns optimized lightweight GIF/WebP URL for picker grid display
 */
export function getGifPreviewUrl(item: KlipyGifItem): string {
  return (
    item.file?.sm?.gif?.url ||
    item.file?.sm?.webp?.url ||
    item.file?.xs?.gif?.url ||
    item.file?.md?.gif?.url ||
    ''
  );
}

/**
 * Returns high-quality GIF URL for embedding inside comments
 */
export function getGifFullUrl(item: KlipyGifItem): string {
  return (
    item.file?.md?.gif?.url ||
    item.file?.hd?.gif?.url ||
    item.file?.sm?.gif?.url ||
    ''
  );
}

/**
 * Fetch trending GIFs from Klipy API
 */
export async function getTrendingGifs(limit: number = 24, page: number = 1): Promise<{
  gifs: KlipyGifItem[];
  hasNext: boolean;
  page: number;
}> {
  const apiKey = getKlipyApiKey();
  const url = `https://api.klipy.com/api/v1/${apiKey}/gifs/trending?limit=${limit}&page=${page}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Klipy API error: ${res.status}`);
    }
    const json: KlipyResponse = await res.json();
    return {
      gifs: json.data?.data || [],
      hasNext: Boolean(json.data?.has_next),
      page: json.data?.current_page || page,
    };
  } catch (err) {
    console.error('Error fetching trending GIFs from Klipy:', err);
    return { gifs: [], hasNext: false, page };
  }
}

/**
 * Search GIFs by keyword from Klipy API (supports English & Persian)
 */
export async function searchGifs(query: string, limit: number = 24, page: number = 1): Promise<{
  gifs: KlipyGifItem[];
  hasNext: boolean;
  page: number;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return getTrendingGifs(limit, page);
  }

  const apiKey = getKlipyApiKey();
  const url = `https://api.klipy.com/api/v1/${apiKey}/gifs/search?q=${encodeURIComponent(trimmed)}&limit=${limit}&page=${page}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Klipy search API error: ${res.status}`);
    }
    const json: KlipyResponse = await res.json();
    return {
      gifs: json.data?.data || [],
      hasNext: Boolean(json.data?.has_next),
      page: json.data?.current_page || page,
    };
  } catch (err) {
    console.error('Error searching GIFs on Klipy:', err);
    return { gifs: [], hasNext: false, page };
  }
}

/**
 * Combines comment text and selected GIF URL into a clean string
 */
export function formatCommentWithGif(text: string, gifUrl?: string | null): string {
  const cleanText = text.trim();
  if (!gifUrl) return cleanText;

  if (!cleanText) {
    return `[gif:${gifUrl}]`;
  }
  return `${cleanText}\n\n[gif:${gifUrl}]`;
}

/**
 * Extracts visible text and optional GIF URL from comment content
 */
export function parseCommentContent(content: string = ''): {
  text: string;
  gifUrl: string | null;
} {
  if (!content) return { text: '', gifUrl: null };

  let extractedGif: string | null = null;
  let remainingText = content;

  // 1. Check custom format [gif:URL]
  const customRegex = /\[gif:(https?:\/\/[^\s\]]+)\]/i;
  const customMatch = remainingText.match(customRegex);
  if (customMatch) {
    extractedGif = customMatch[1];
    remainingText = remainingText.replace(customRegex, '').trim();
  }

  // 2. Check markdown format ![...](URL)
  if (!extractedGif) {
    const mdRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i;
    const mdMatch = remainingText.match(mdRegex);
    if (mdMatch) {
      extractedGif = mdMatch[1];
      remainingText = remainingText.replace(mdRegex, '').trim();
    }
  }

  // 3. Check standalone klipy static URL or gif URL on its own line
  if (!extractedGif) {
    const directUrlRegex = /(https?:\/\/(?:static\.klipy\.com\/[^\s]+|[^\s]+\.(?:gif|webp)(?:\?[^\s]*)?))/i;
    const directMatch = remainingText.match(directUrlRegex);
    if (directMatch) {
      extractedGif = directMatch[1];
      remainingText = remainingText.replace(directUrlRegex, '').trim();
    }
  }

  return {
    text: remainingText,
    gifUrl: extractedGif,
  };
}
