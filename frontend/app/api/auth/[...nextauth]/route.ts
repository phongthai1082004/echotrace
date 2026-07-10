import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.data?.user) return null;

        return {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
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
        return true;
      }
      return !!user;
    },

    async jwt({ token, user }) {
      if (user) {
        (token as any).accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      if (session.user) (session.user as any).id = token.sub;
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
})

export { handler as GET, handler as POST }
