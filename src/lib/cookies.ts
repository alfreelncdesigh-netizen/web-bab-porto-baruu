/**
 * Cookie Management Utilities for ALFREELNC
 * Provides full cookie read, write, and deletion support with secure defaults.
 */

export interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

export interface CookieConsentPreferences {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  portfolioImagesOnly?: boolean;
  cacheLevel?: 'all' | 'essential_images';
  timestamp: string;
}

export const COOKIE_CONSENT_KEY = 'alfreelnc_cookie_consent';

/**
 * Set a cookie in document.cookie
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const {
    days = 365,
    path = '/',
    sameSite = 'Lax',
    secure = window.location.protocol === 'https:',
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;

  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${date.toUTCString()}`;
  }

  if (secure) {
    cookieString += '; Secure';
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = `${encodeURIComponent(name)}=`;
  const ca = document.cookie.split(';');

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Check if a cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Retrieve parsed cookie consent preferences
 */
export function getStoredCookieConsent(): CookieConsentPreferences | null {
  const cookieValue = getCookie(COOKIE_CONSENT_KEY);
  if (!cookieValue) return null;

  try {
    return JSON.parse(cookieValue) as CookieConsentPreferences;
  } catch {
    return null;
  }
}

/**
 * Save user cookie consent preferences
 */
export function saveCookieConsent(prefs: Partial<CookieConsentPreferences>): void {
  const isEssentialOnly = prefs.portfolioImagesOnly === true || prefs.cacheLevel === 'essential_images';
  
  const fullPreferences: CookieConsentPreferences = {
    essential: true,
    preferences: isEssentialOnly ? false : (prefs.preferences ?? true),
    analytics: isEssentialOnly ? false : (prefs.analytics ?? true),
    portfolioImagesOnly: isEssentialOnly,
    cacheLevel: isEssentialOnly ? 'essential_images' : 'all',
    timestamp: new Date().toISOString(),
  };

  setCookie(COOKIE_CONSENT_KEY, JSON.stringify(fullPreferences), { days: 365 });
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: fullPreferences }));
  }
}
