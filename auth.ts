import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";

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
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Check if user has a valid invite or is admin
      const adminEmail = process.env.ADMIN_EMAIL;
      const isAdmin = user.email === adminEmail;

      if (isAdmin) {
        // Auto-approve admin
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
          // Prefer email-specific invites
          email: "desc",
        },
      });

      if (!invite) {
        // No valid invite found
        return "/auth/no-invite";
      }

      return true;
    },

    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
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

