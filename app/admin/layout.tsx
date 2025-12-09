import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-midnight-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="text-xl font-display font-bold text-white">
                OBK
              </span>
              <span className="text-xs font-mono text-electric-400 px-2 py-1 rounded bg-electric-500/10 border border-electric-500/20">
                ADMIN
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/admin"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/invites"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Invites
              </Link>
              <Link
                href="/admin/candidates"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Candidates
              </Link>
              <Link
                href="/admin/sessions"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Game Sessions
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-white/50">
              {session.user.email}
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

