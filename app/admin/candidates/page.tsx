import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getCandidates() {
  return prisma.user.findMany({
    where: { role: "CANDIDATE" },
    orderBy: { createdAt: "desc" },
    include: {
      gameRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });
}

export default async function CandidatesPage() {
  const candidates = await getCandidates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Candidates
        </h1>
        <p className="text-white/50">
          View all candidates who have accessed the assessment
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr>
              <th className="table-header">Candidate</th>
              <th className="table-header">Email</th>
              <th className="table-header">Joined</th>
              <th className="table-header">Sessions</th>
              <th className="table-header">Latest Score</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell text-center text-white/40">
                  No candidates yet
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => {
                const latestRun = candidate.gameRuns[0];
                const avgScore = latestRun
                  ? Math.round(
                      ((latestRun.patternRealism || 0) +
                        (latestRun.riskDiscipline || 0) +
                        (latestRun.strategicSensitivity || 0) +
                        (latestRun.operationalPrioritization || 0) +
                        (latestRun.autonomySignals || 0)) /
                        5
                    )
                  : null;

                return (
                  <tr key={candidate.id} className="hover:bg-white/5">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {candidate.image ? (
                          <img
                            src={candidate.image}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-electric-500/20 flex items-center justify-center text-electric-400 text-sm font-bold">
                            {(candidate.name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-white">
                          {candidate.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-white/60">
                      {candidate.email}
                    </td>
                    <td className="table-cell text-white/60">
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-electric-400">
                        {candidate.gameRuns.length}
                      </span>
                    </td>
                    <td className="table-cell">
                      {avgScore !== null ? (
                        <span
                          className={`font-mono font-bold ${
                            avgScore >= 70
                              ? "text-green-400"
                              : avgScore >= 50
                              ? "text-amber-400"
                              : "text-crimson-400"
                          }`}
                        >
                          {avgScore}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/admin/candidates/${candidate.id}`}
                        className="text-sm text-electric-400 hover:text-electric-300"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

