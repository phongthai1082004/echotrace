import { Session } from "next-auth";

export interface SessionWithToken extends Session {
  accessToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

export function isAuthenticatedSession(session: Session | null): session is SessionWithToken {
  return !!(session && session.accessToken);
}
