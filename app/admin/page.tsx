import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getStats() {
  const [
    totalInvites,
    pendingInvites,
    usedInvites,
    totalCandidates,
    completedRuns,
    inProgressRuns,
  ] = await Promise.all([
    prisma.invite.count(),
    prisma.invite.count({ where: { status: "PENDING" } }),
    prisma.invite.count({ where: { status: "USED" } }),
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.gameRun.count({ where: { status: "COMPLETED" } }),
    prisma.gameRun.count({ where: { status: "IN_PROGRESS" } }),
  ]);

  return {
    totalInvites,
    pendingInvites,
    usedInvites,
    totalCandidates,
    completedRuns,
    inProgressRuns,
  };
}

async function getRecentActivity() {
  const [recentInvites, recentRuns] = await Promise.all([
    prisma.invite.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { usedBy: true },
    }),
    prisma.gameRun.findMany({
      take: 5,
      orderBy: { startedAt: "desc" },
      include: { user: true },
    }),
  ]);

  return { recentInvites, recentRuns };
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const { recentInvites, recentRuns } = await getRecentActivity();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/50">
          Overview of Operation Black Knights assessment platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="stat-value">{stats.totalInvites}</div>
          <div className="stat-label">Total Invites</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-amber-400">{stats.pendingInvites}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-400">{stats.usedInvites}</div>
          <div className="stat-label">Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCandidates}</div>
          <div className="stat-label">Candidates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-400">{stats.completedRuns}</div>
          <div className="stat-label">Completed Runs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-amber-400">{stats.inProgressRuns}</div>
          <div className="stat-label">In Progress</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/invites/create" className="btn-primary">
            + Create Invite
          </Link>
          <Link href="/admin/invites" className="btn-secondary">
            Manage Invites
          </Link>
          <Link href="/admin/candidates" className="btn-secondary">
            View Candidates
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Invites */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Invites</h2>
            <Link
              href="/admin/invites"
              className="text-sm text-electric-400 hover:text-electric-300"
            >
              View All →
            </Link>
          </div>
          {recentInvites.length === 0 ? (
            <p className="text-white/40 text-sm">No invites yet</p>
          ) : (
            <div className="space-y-3">
              {recentInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-midnight-900/50 rounded-lg"
                >
                  <div>
                    <div className="font-mono text-sm text-white">
                      {invite.code}
                    </div>
                    <div className="text-xs text-white/40">
                      {invite.email || "Any email"}
                    </div>
                  </div>
                  <span
                    className={`badge-${invite.status.toLowerCase()}`}
                  >
                    {invite.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Game Runs */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Sessions</h2>
            <Link
              href="/admin/sessions"
              className="text-sm text-electric-400 hover:text-electric-300"
            >
              View All →
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-white/40 text-sm">No sessions yet</p>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 bg-midnight-900/50 rounded-lg"
                >
                  <div>
                    <div className="text-sm text-white">
                      {run.user.name || run.user.email}
                    </div>
                    <div className="text-xs text-white/40">
                      {new Date(run.startedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={
                      run.status === "COMPLETED"
                        ? "badge-used"
                        : run.status === "IN_PROGRESS"
                        ? "badge-pending"
                        : "badge-expired"
                    }
                  >
                    {run.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

