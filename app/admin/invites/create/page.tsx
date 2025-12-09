"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateInvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [expiresIn, setExpiresIn] = useState("7"); // days
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{
    code: string;
    link: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || null,
          expiresInDays: parseInt(expiresIn),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invite");
      }

      const data = await res.json();
      setCreatedInvite({
        code: data.code,
        link: `${window.location.origin}/auth/signin?invite=${data.code}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (createdInvite) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Invite Created!
          </h1>
          <p className="text-white/50">
            Share this link with the candidate
          </p>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <div>
            <label className="block text-sm text-white/50 mb-2">
              Invite Code
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-midnight-900/50 border border-white/10 rounded-lg font-mono text-electric-400">
                {createdInvite.code}
              </code>
              <button
                onClick={() => copyToClipboard(createdInvite.code)}
                className="btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-2">
              Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={createdInvite.link}
                className="input-field flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(createdInvite.link)}
                className="btn-primary"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setCreatedInvite(null);
              setEmail("");
            }}
            className="btn-secondary"
          >
            Create Another
          </button>
          <Link href="/admin/invites" className="btn-secondary">
            View All Invites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Create Invite
        </h1>
        <p className="text-white/50">
          Generate a new invite code for a candidate
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-6">
        {error && (
          <div className="p-4 bg-crimson-500/10 border border-crimson-500/30 rounded-lg">
            <p className="text-crimson-400 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm text-white/70 mb-2">
            Email Address{" "}
            <span className="text-white/30">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="candidate@example.com"
            className="input-field"
          />
          <p className="mt-2 text-xs text-white/40">
            Leave empty to allow any email to use this invite
          </p>
        </div>

        <div>
          <label htmlFor="expires" className="block text-sm text-white/70 mb-2">
            Expires In
          </label>
          <select
            id="expires"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            className="input-field"
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex-1"
          >
            {isLoading ? "Creating..." : "Create Invite"}
          </button>
          <Link href="/admin/invites" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

