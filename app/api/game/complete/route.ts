import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gameRun = await request.json();

    // Save the game run to the database
    const savedRun = await prisma.gameRun.create({
      data: {
        runId: gameRun.runId,
        userId: session.user.id,
        startedAt: new Date(gameRun.startedAt),
        endedAt: new Date(gameRun.endedAt),
        status: "COMPLETED",
        patternRealism: gameRun.derivedScores?.patternRealism ?? null,
        riskDiscipline: gameRun.derivedScores?.riskDiscipline ?? null,
        strategicSensitivity: gameRun.derivedScores?.strategicSensitivity ?? null,
        operationalPrioritization: gameRun.derivedScores?.operationalPrioritization ?? null,
        autonomySignals: gameRun.derivedScores?.autonomySignals ?? null,
        telemetryData: gameRun,
      },
    });

    return NextResponse.json({ success: true, id: savedRun.id });
  } catch (error) {
    console.error("Failed to save game run:", error);
    return NextResponse.json(
      { error: "Failed to save game run" },
      { status: 500 }
    );
  }
}

