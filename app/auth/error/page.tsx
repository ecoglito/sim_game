"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification link may have expired or already been used.",
    Default: "An unexpected error occurred.",
  };

  const message = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 grid-pattern">
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="glass-panel p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-display font-bold text-white mb-3">
            Authentication Error
          </h1>
          <p className="text-white/50 mb-6">{message}</p>

          <Link href="/auth/signin" className="block btn-primary">
            Try Again
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-white/50">Loading...</div>
        </main>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}

