import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/sanitize";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  // ⚠️ IMPORTANTE: desactivar secure cookies porque estás en HTTP
  useSecureCookies: false,

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = normalizeEmail(credentials.email);
        if (!email) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword,
        );

        if (!isValid) return null;

        if (user.role === "ADMIN" && user.twoFactorEnabled) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            twoFAPending: true,
            twoFactorEnabled: true,
          };
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          twoFAPending: false,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          email: string;
          name?: string | null;
          role: string;
          twoFAPending?: boolean;
          twoFactorEnabled?: boolean;
        };

        token.sub = u.id;
        token.id = u.id;
        token.email = u.email;
        token.name = u.name ?? undefined;

        if (u.twoFAPending) {
          token.role = "USER";
          token.pendingRole = "ADMIN";
          token.twoFAPending = true;
          token.twoFAVerified = false;
        } else {
          token.role = u.role;
          token.twoFAPending = false;
          token.twoFAVerified =
            u.role !== "ADMIN" || !u.twoFactorEnabled;
          delete token.pendingRole;
        }
        return token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) || (token.id as string);
        session.user.email = token.email as string;
        session.user.name = (token.name as string) || null;
        session.user.role = token.role as string;
        session.user.twoFAPending = !!token.twoFAPending;
        if (token.twoFAPending) {
          session.user.twoFAVerified = false;
        } else if (token.role === "ADMIN") {
          session.user.twoFAVerified = token.twoFAVerified !== false;
        } else {
          session.user.twoFAVerified = true;
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
  },

  secret: process.env.NEXTAUTH_SECRET,

  // 🔥 FORZAR CONFIG DE COOKIES (CLAVE)
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // ⚠️ porque estás en HTTP
      },
    },
  },
};
