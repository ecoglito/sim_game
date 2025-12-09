import Link from "next/link";

export default function NoInvitePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 grid-pattern">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-crimson-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="glass-panel p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-crimson-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-crimson-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-10V7a4 4 0 00-8 0v4m12-1a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-display font-bold text-white mb-3">
            Access Restricted
          </h1>
          <p className="text-white/50 mb-6">
            You don't have a valid invite to access this assessment. Contact the
            administrator to request access.
          </p>

          <div className="space-y-3">
            <Link href="/auth/signin" className="block btn-secondary">
              Try Again
            </Link>
            <Link href="/" className="block text-sm text-white/40 hover:text-white/60">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

