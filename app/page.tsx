import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Redirect authenticated users to appropriate page
  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    }
    redirect("/play");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 grid-pattern">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo/Title */}
        <div className="mb-12 animate-float">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-sm font-mono mb-6">
            <span className="w-2 h-2 bg-electric-400 rounded-full animate-pulse" />
            CLASSIFIED ASSESSMENT
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-white mb-4">
            OPERATION
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-400 via-electric-500 to-amber-400">
              BLACK KNIGHTS
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-md mx-auto leading-relaxed">
            X Growth Operations Assessment Simulation. Prove your ability to
            orchestrate, adapt, and execute.
          </p>
        </div>

        {/* Stats preview */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: "Chapters", value: "3" },
            { label: "Duration", value: "45m" },
            { label: "Skills", value: "5" },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel p-4">
              <div className="text-2xl font-bold font-mono text-electric-400">
                {stat.value}
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signin" className="btn-primary">
            Begin Assessment →
          </Link>
        </div>

        <p className="mt-8 text-sm text-white/30">
          Invite code required. Contact admin for access.
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-sm text-white/20">
        <p>© 2024 GTE · Liquid Labs</p>
      </footer>
    </main>
  );
}

