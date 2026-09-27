/**
 * Helper to format a string into a clean, URL-safe slug.
 * Fully supports Unicode letters (Persian, Arabic, Latin) and numbers.
 */
export function formatSlug(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // Convert spaces and underscores to hyphens
    .replace(/[^\p{L}\p{N}-]+/gu, '') // Keep Unicode letters, numbers, and hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens into one
    .replace(/^-|-$/g, ''); // Trim leading and trailing hyphens
}

/**
 * Extracts a clean plain-text excerpt from raw Markdown
 */
export function extractExcerpt(markdown: string, maxLength: number = 100): string {
  if (!markdown) return '';
  const clean = markdown
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text only
    .replace(/[#*`_~>]/g, '') // Remove markdown formatting marks
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength).trim() + '...';
}

