import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { InviteActions } from "@/components/InviteActions";

async function getInvites() {
  return prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      usedBy: { select: { name: true, email: true } },
    },
  });
}

export default async function InvitesPage() {
  const invites = await getInvites();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Invites
          </h1>
          <p className="text-white/50">
            Manage invite codes for candidate access
          </p>
        </div>
        <Link href="/admin/invites/create" className="btn-primary">
          + Create Invite
        </Link>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr>
              <th className="table-header">Code</th>
              <th className="table-header">Email</th>
              <th className="table-header">Status</th>
              <th className="table-header">Expires</th>
              <th className="table-header">Used By</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invites.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell text-center text-white/40">
                  No invites created yet
                </td>
              </tr>
            ) : (
              invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-white/5">
                  <td className="table-cell">
                    <code className="font-mono text-electric-400 bg-electric-500/10 px-2 py-1 rounded">
                      {invite.code}
                    </code>
                  </td>
                  <td className="table-cell">
                    {invite.email || (
                      <span className="text-white/30">Any email</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`badge-${invite.status.toLowerCase()}`}>
                      {invite.status}
                    </span>
                  </td>
                  <td className="table-cell text-white/60">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    {invite.usedBy ? (
                      <div>
                        <div className="text-white">
                          {invite.usedBy.name || "Unknown"}
                        </div>
                        <div className="text-xs text-white/40">
                          {invite.usedBy.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <InviteActions
                      inviteId={invite.id}
                      code={invite.code}
                      status={invite.status}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

