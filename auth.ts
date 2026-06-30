import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { comparePassword } from "@/lib/auth-utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        loginIdentifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.loginIdentifier || !credentials?.password) {
          return null;
        }

        const loginIdentifier = credentials.loginIdentifier as string;
        const password = credentials.password as string;

        // Find user by email or username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: loginIdentifier.toLowerCase() },
              { username: loginIdentifier.toLowerCase() },
            ],
          },
        });

        if (!user || !user.passwordHash || user.isBanned) {
          return null;
        }

        const isPasswordCorrect = await comparePassword(password, user.passwordHash);
        if (!isPasswordCorrect) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.username || user.email.split("@")[0],
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Query the DB to obtain user role and username
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, username: true },
        });

        let currentRole = dbUser?.role || "USER";

        // Auto-promote specified ADMIN_EMAIL to ADMIN role
        const adminEmail = process.env.ADMIN_EMAIL;
        if (
          user.email &&
          adminEmail &&
          user.email.toLowerCase() === adminEmail.toLowerCase() &&
          currentRole !== "ADMIN"
        ) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
          currentRole = "ADMIN";
        }

        token.role = currentRole;
        token.username = dbUser?.username || user.name || user.email?.split("@")[0];
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
