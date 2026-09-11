/**
 * Utilities for formatting and resolving Instagram URLs and handles
 */

export const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/dbuy.store/';

/**
 * Ensures an Instagram URL is a valid, clean web URL.
 * Handles inputs like:
 * - "dbuy.store" -> "https://www.instagram.com/dbuy.store/"
 * - "@dbuy.store" -> "https://www.instagram.com/dbuy.store/"
 * - "instagram.com/dbuy.store" -> "https://www.instagram.com/dbuy.store/"
 * - "https://instagram.com/dbuy.store" -> "https://www.instagram.com/dbuy.store/"
 */
export function formatInstagramUrl(input?: string): string {
  if (!input || !input.trim()) {
    return DEFAULT_INSTAGRAM_URL;
  }
  let clean = input.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.startsWith('@')) {
    clean = clean.substring(1);
  }
  if (clean.startsWith('instagram.com/')) {
    return `https://www.${clean}`;
  }
  if (clean.startsWith('www.instagram.com/')) {
    return `https://${clean}`;
  }
  return `https://www.instagram.com/${clean}`;
}

/**
 * Extracts a readable handle like "@dbuy.store" for badge/card display
 */
export function getInstagramHandle(input?: string): string {
  if (!input || !input.trim() || input.trim() === 'https://www.instagram.com/' || input.trim() === 'https://instagram.com/' || input.trim() === 'https://www.instagram.com/dbuy.store/' || input.trim() === 'https://instagram.com/dbuy.store') {
    return '@dbuy.store';
  }
  const clean = input.trim();
  const match = clean.match(/(?:instagram\.com\/|@)?([a-zA-Z0-9._]+)\/?$/);
  if (match && match[1] && match[1] !== 'www' && match[1] !== 'instagram') {
    return `@${match[1]}`;
  }
  return clean.startsWith('@') ? clean : `@${clean}`;
}
