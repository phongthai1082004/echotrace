import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "../enum/user.enum";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data?.message?.toLowerCase().includes("banned")) throw new Error("Account has been banned");
          return null;
        }
        if (!data?.data?.user) return null;
        return {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          image: data.data.user.avatar,
          role: data.data.user.role,
          accessToken: data.data.accessToken,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }: any) {
      if (account?.provider === "google" && account.id_token) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: account.id_token }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data?.message?.toLowerCase().includes("banned")) return "/auth?error=banned";
          return false;
        }
        (user as any).accessToken = data.data?.accessToken;
        (user as any).role = data.data?.user?.role || "user";
        user.image = data.data?.user?.avatar || null;
        (user as any).dbId = data.data?.user?.id;
        return data.data?.user?.role === "admin" ? "/admin/analytics" : true;
      }
      return !!user;
    },
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.dbId = user.dbId;
        if (user.image) token.picture = user.image;
      }
      if (trigger === "update" && session?.image) token.picture = session.image;
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role || "user";
        session.user.dbId = token.dbId;
        session.user.image = token.picture || null;
      }
      return session;
    },
  },
  session: { strategy: "jwt" as const },
  pages: { signIn: "/auth" },
};
