"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InviteActionsProps {
  inviteId: string;
  code: string;
  status: string;
}

export function InviteActions({ inviteId, code, status }: InviteActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const copyLink = () => {
    const link = `${window.location.origin}/auth/signin?invite=${code}`;
    navigator.clipboard.writeText(link);
  };

  const revokeInvite = async () => {
    if (!confirm("Are you sure you want to revoke this invite?")) return;

    setIsLoading(true);
    try {
      await fetch(`/api/admin/invites/${inviteId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to revoke invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === "PENDING" && (
        <>
          <button
            onClick={copyLink}
            className="text-xs text-electric-400 hover:text-electric-300"
          >
            Copy Link
          </button>
          <button
            onClick={revokeInvite}
            disabled={isLoading}
            className="text-xs text-crimson-400 hover:text-crimson-300"
          >
            {isLoading ? "..." : "Revoke"}
          </button>
        </>
      )}
    </div>
  );
}

