import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";

type Role = "ADMIN" | "CANDIDATE";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: Role;
    };
  }

  interface User {
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" }, // Use JWT sessions - no DB needed in middleware
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Check if user is admin (auto-approve)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (user.email === adminEmail) {
        return true;
      }

      // Check for valid invite
      const invite = await prisma.invite.findFirst({
        where: {
          OR: [
            { email: user.email },
            { email: null }, // Generic invite
          ],
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        orderBy: {
          email: "desc",
        },
      });

      if (!invite) {
        return "/auth/no-invite";
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch the latest role from DB
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CANDIDATE";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "CANDIDATE";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Set admin role for admin email
      const adminEmail = process.env.ADMIN_EMAIL;
      if (user.email === adminEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }

      // Mark invite as used
      if (user.email) {
        const invite = await prisma.invite.findFirst({
          where: {
            OR: [
              { email: user.email },
              { email: null },
            ],
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          orderBy: {
            email: "desc",
          },
        });

        if (invite) {
          await prisma.invite.update({
            where: { id: invite.id },
            data: {
              status: "USED",
              usedById: user.id,
              usedAt: new Date(),
            },
          });
        }
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
