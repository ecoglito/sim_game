import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runId } = await request.json();

    // Create an in-progress game run
    const gameRun = await prisma.gameRun.create({
      data: {
        runId,
        userId: session.user.id,
        startedAt: new Date(),
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json({ success: true, id: gameRun.id });
  } catch (error) {
    console.error("Failed to create game run:", error);
    return NextResponse.json(
      { error: "Failed to create game run" },
      { status: 500 }
    );
  }
}

