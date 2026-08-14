import { Session } from 'next-auth';

/**
 * Extended Session type that includes authentication token
 * Provides type-safe access to accessToken without need for 'as any' casts
 */
export interface SessionWithToken extends Session {
  accessToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

/**
 * Type guard to check if session has required authentication token
 * @param session - Session object to check
 * @returns true if session has valid accessToken
 * 
 * @example
 * ```typescript
 * const { data: session } = useSession();
 * if (!isAuthenticatedSession(session)) {
 *   return <LoginPrompt />;
 * }
 * // Now session is typed as SessionWithToken
 * const token = session.accessToken; // Type-safe!
 * ```
 */
export function isAuthenticatedSession(session: Session | null): session is SessionWithToken {
  return !!(session && (session as any).accessToken);
}

/**
 * Extract token from session safely
 * @param session - Session object
 * @returns Token string or null if not available
 * 
 * @example
 * ```typescript
 * const token = getSessionToken(session);
 * if (!token) {
 *   showToast('Authentication required', 'error');
 *   return;
 * }
 * ```
 */
export function getSessionToken(session: Session | null): string | null {
  if (!session) return null;
  const withToken = session as any;
  return withToken.accessToken || null;
}

/**
 * Check if session token has expired
 * @param session - Session with token
 * @returns true if token has expired
 */
export function isSessionTokenExpired(session: SessionWithToken): boolean {
  if (!session.accessTokenExpires) return false;
  return Date.now() >= session.accessTokenExpires;
}

/**
 * Get remaining time until token expires (in milliseconds)
 * @param session - Session with token
 * @returns Milliseconds remaining, or 0 if expired
 */
export function getSessionTokenExpiresIn(session: SessionWithToken): number {
  if (!session.accessTokenExpires) return 0;
  const remaining = session.accessTokenExpires - Date.now();
  return Math.max(0, remaining);
}
