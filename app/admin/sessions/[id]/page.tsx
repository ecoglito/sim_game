import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadButton } from "@/components/DownloadButton";

async function getSession(id: string) {
  const session = await prisma.gameRun.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
  });

  return session;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  const scores = [
    { label: "Pattern Realism", value: session.patternRealism },
    { label: "Risk Discipline", value: session.riskDiscipline },
    { label: "Strategic Sensitivity", value: session.strategicSensitivity },
    { label: "Operational Prioritization", value: session.operationalPrioritization },
    { label: "Autonomy Signals", value: session.autonomySignals },
  ];

  const avgScore =
    scores.every((s) => s.value !== null)
      ? Math.round(
          scores.reduce((acc, s) => acc + (s.value || 0), 0) / scores.length
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/sessions"
          className="text-white/40 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-display font-bold text-white">
          Session Details
        </h1>
      </div>

      {/* Candidate Info */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-4">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt=""
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-electric-500/20 flex items-center justify-center text-electric-400 text-2xl font-bold">
              {(session.user.name || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-white">
              {session.user.name || "Unknown"}
            </h2>
            <p className="text-white/50">{session.user.email}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-white/50">Session Started</div>
            <div className="text-white">
              {new Date(session.startedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card col-span-1">
          <div
            className={`stat-value ${
              avgScore !== null
                ? avgScore >= 70
                  ? "text-green-400"
                  : avgScore >= 50
                  ? "text-amber-400"
                  : "text-crimson-400"
                : ""
            }`}
          >
            {avgScore ?? "—"}
          </div>
          <div className="stat-label">Overall</div>
        </div>
        {scores.map((score) => (
          <div key={score.label} className="stat-card">
            <div
              className={`stat-value text-2xl ${
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
            <div className="stat-label text-xs">{score.label}</div>
          </div>
        ))}
      </div>

      {/* Telemetry Data */}
      {session.telemetryData && (
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Telemetry Data
            </h3>
            <DownloadButton
              data={session.telemetryData}
              filename={`session-${session.runId}.json`}
            />
          </div>
          <pre className="bg-midnight-900/50 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono text-white/70">
            {JSON.stringify(session.telemetryData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

