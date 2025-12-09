import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GameContainer } from "@/components/GameContainer";

export default async function PlayPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <GameContainer
        userId={session.user.id}
        userName={session.user.name || "Candidate"}
      />
    </div>
  );
}

