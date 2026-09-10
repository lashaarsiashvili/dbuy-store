/**
 * Utilities for formatting and resolving Instagram URLs and handles
 */

export const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/';

/**
 * Ensures an Instagram URL is a valid, clean web URL.
 * Handles inputs like:
 * - "dbuystore" -> "https://www.instagram.com/dbuystore"
 * - "@dbuystore" -> "https://www.instagram.com/dbuystore"
 * - "instagram.com/dbuystore" -> "https://www.instagram.com/dbuystore"
 * - "https://instagram.com/dbuystore" -> "https://www.instagram.com/dbuystore"
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
 * Extracts a readable handle like "@dbuystore" for badge/card display
 */
export function getInstagramHandle(input?: string): string {
  if (!input || !input.trim() || input.trim() === 'https://www.instagram.com/' || input.trim() === 'https://instagram.com/') {
    return '@dbuystore';
  }
  const clean = input.trim();
  const match = clean.match(/(?:instagram\.com\/|@)?([a-zA-Z0-9._]+)\/?$/);
  if (match && match[1] && match[1] !== 'www' && match[1] !== 'instagram') {
    return `@${match[1]}`;
  }
  return clean.startsWith('@') ? clean : `@${clean}`;
}
