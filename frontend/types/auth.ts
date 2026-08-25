import { Session } from 'next-auth';

export interface SessionWithToken extends Session {
  accessToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

export function isAuthenticatedSession(session: Session | null): session is SessionWithToken {
  return !!(session && (session as any).accessToken);
}

export function getSessionToken(session: Session | null): string | null {
  if (!session) return null;
  const withToken = session as any;
  return withToken.accessToken || null;
}

export function isSessionTokenExpired(session: SessionWithToken): boolean {
  if (!session.accessTokenExpires) return false;
  return Date.now() >= session.accessTokenExpires;
}

export function getSessionTokenExpiresIn(session: SessionWithToken): number {
  if (!session.accessTokenExpires) return 0;
  const remaining = session.accessTokenExpires - Date.now();
  return Math.max(0, remaining);
}
