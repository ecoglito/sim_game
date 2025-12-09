import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

async function getCandidate(id: string) {
  const candidate = await prisma.user.findUnique({
    where: { id },
    include: {
      gameRuns: {
        orderBy: { startedAt: "desc" },
      },
      invite: true,
    },
  });

  return candidate;
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidate(id);

  if (!candidate) {
    notFound();
  }

  const completedRuns = candidate.gameRuns.filter(
    (r) => r.status === "COMPLETED"
  );
  const bestRun = completedRuns.length > 0
    ? completedRuns.reduce((best, run) => {
        const runAvg =
          ((run.patternRealism || 0) +
            (run.riskDiscipline || 0) +
            (run.strategicSensitivity || 0) +
            (run.operationalPrioritization || 0) +
            (run.autonomySignals || 0)) /
          5;
        const bestAvg =
          ((best.patternRealism || 0) +
            (best.riskDiscipline || 0) +
            (best.strategicSensitivity || 0) +
            (best.operationalPrioritization || 0) +
            (best.autonomySignals || 0)) /
          5;
        return runAvg > bestAvg ? run : best;
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/candidates"
          className="text-white/40 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-display font-bold text-white">
          Candidate Profile
        </h1>
      </div>

      {/* Candidate Info */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-6">
          {candidate.image ? (
            <img
              src={candidate.image}
              alt=""
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-electric-500/20 flex items-center justify-center text-electric-400 text-3xl font-bold">
              {(candidate.name || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-white mb-1">
              {candidate.name || "Unknown"}
            </h2>
            <p className="text-white/50">{candidate.email}</p>
            <p className="text-sm text-white/30 mt-2">
              Joined {new Date(candidate.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono text-electric-400">
              {completedRuns.length}
            </div>
            <div className="text-sm text-white/50">Completed Sessions</div>
          </div>
        </div>
      </div>

      {/* Best Scores */}
      {bestRun && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Best Scores</h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Pattern", value: bestRun.patternRealism },
              { label: "Risk", value: bestRun.riskDiscipline },
              { label: "Strategy", value: bestRun.strategicSensitivity },
              { label: "Ops", value: bestRun.operationalPrioritization },
              { label: "Autonomy", value: bestRun.autonomySignals },
            ].map((score) => (
              <div key={score.label} className="stat-card">
                <div
                  className={`stat-value ${
                    score.value !== null
                      ? score.value >= 70
                        ? "text-green-400"
                        : score.value >= 50
                        ? "text-amber-400"
                        : "text-crimson-400"
                      : ""
                  }`}
                >
                  {score.value !== null ? Math.round(score.value) : "—"}
                </div>
                <div className="stat-label">{score.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Sessions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">All Sessions</h3>
        <div className="glass-panel overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="table-header">Date</th>
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
              {candidate.gameRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-white/40">
                    No sessions yet
                  </td>
                </tr>
              ) : (
                candidate.gameRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-white/5">
                    <td className="table-cell text-white/60">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="table-cell">
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
                    </td>
                    <td className="table-cell">
                      <ScoreCell value={run.patternRealism} />
                    </td>
                    <td className="table-cell">
                      <ScoreCell value={run.riskDiscipline} />
                    </td>
                    <td className="table-cell">
                      <ScoreCell value={run.strategicSensitivity} />
                    </td>
                    <td className="table-cell">
                      <ScoreCell value={run.operationalPrioritization} />
                    </td>
                    <td className="table-cell">
                      <ScoreCell value={run.autonomySignals} />
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/admin/sessions/${run.id}`}
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

