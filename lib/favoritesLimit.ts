export const MAX_FAVORITES = 10;

/**
 * Checks if a user is eligible to add another show to their favorites.
 * Enforces a hard limit of MAX_FAVORITES (10 shows).
 */
export function canAddToFavorites(currentCount: number): boolean {
  return currentCount < MAX_FAVORITES;
}

/**
 * Validates and safely slices an array of show IDs to ensure no more than MAX_FAVORITES are stored.
 */
export function sanitizeFavoritesList<T>(shows: T[]): T[] {
  return shows.slice(0, MAX_FAVORITES);
}
