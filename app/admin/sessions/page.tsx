import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getGameSessions() {
  return prisma.gameRun.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
  });
}

export default async function SessionsPage() {
  const sessions = await getGameSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Game Sessions
        </h1>
        <p className="text-white/50">
          View all assessment sessions and their results
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr>
              <th className="table-header">Candidate</th>
              <th className="table-header">Started</th>
              <th className="table-header">Status</th>
              <th className="table-header">Pattern</th>
              <th className="table-header">Risk</th>
              <th className="table-header">Strategy</th>
              <th className="table-header">Ops</th>
              <th className="table-header">Autonomy</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-cell text-center text-white/40">
                  No sessions yet
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-white/5">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-electric-500/20 flex items-center justify-center text-electric-400 text-sm font-bold">
                          {(session.user.name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-white">
                          {session.user.name || "Unknown"}
                        </div>
                        <div className="text-xs text-white/40">
                          {session.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-white/60">
                    {new Date(session.startedAt).toLocaleString()}
                  </td>
                  <td className="table-cell">
                    <span
                      className={
                        session.status === "COMPLETED"
                          ? "badge-used"
                          : session.status === "IN_PROGRESS"
                          ? "badge-pending"
                          : "badge-expired"
                      }
                    >
                      {session.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-cell">
                    <ScoreCell value={session.patternRealism} />
                  </td>
                  <td className="table-cell">
                    <ScoreCell value={session.riskDiscipline} />
                  </td>
                  <td className="table-cell">
                    <ScoreCell value={session.strategicSensitivity} />
                  </td>
                  <td className="table-cell">
                    <ScoreCell value={session.operationalPrioritization} />
                  </td>
                  <td className="table-cell">
                    <ScoreCell value={session.autonomySignals} />
                  </td>
                  <td className="table-cell">
                    <Link
                      href={`/admin/sessions/${session.id}`}
                      className="text-sm text-electric-400 hover:text-electric-300"
                    >
                      View
                    </Link>
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

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-white/30">—</span>;
  }

  const score = Math.round(value);
  const color =
    score >= 70
      ? "text-green-400"
      : score >= 50
      ? "text-amber-400"
      : "text-crimson-400";

  return <span className={`font-mono font-bold ${color}`}>{score}</span>;
}

