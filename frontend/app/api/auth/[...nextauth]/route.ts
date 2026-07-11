import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserRole } from "../../../../enum/user.enum"

const handler = NextAuth({
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
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.data?.user) return null;

        return {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          image: data.data.user.avatar,
          role: data.data.user.role,
          // @ts-ignore
          accessToken: data.data.accessToken,
        };
      },
    })
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider === "google" && account.id_token) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: account.id_token }), 
        });
        if (!res.ok) return false;
        const data = await res.json();
        (user as any).accessToken = data.data?.accessToken;
        (user as any).role = data.data?.user?.role || "user";
        user.image = data.data?.user?.avatar || null;
        (user as any).dbId = data.data?.user?.id;
        const role = data.data?.user?.role;
        if (role === "admin") return "/admin/analytics";
        return true;
      }
      return !!user;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        (token as any).accessToken = (user as any).accessToken;
        (token as any).role = (user as any).role;
        (token as any).dbId = (user as any).dbId;
        if (user.image) token.picture = user.image;
      }
      if (trigger === "update" && (session as any)?.image) {
        token.picture = (session as any).image;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role || "user";
        (session.user as any).dbId = (token as any).dbId;
        session.user.image = (token.picture as string) || null;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
})

export { handler as GET, handler as POST }
