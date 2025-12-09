"use client";

import { useEffect, useRef, useState } from "react";

interface GameContainerProps {
  userId: string;
  userName: string;
}

export function GameContainer({ userId, userName }: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameInitialized = useRef(false);

  useEffect(() => {
    if (gameInitialized.current || !containerRef.current) return;
    gameInitialized.current = true;

    const initGame = async () => {
      try {
        // Dynamically import the game modules
        const [
          { GameState },
          { Game },
          { IntroScene },
          { Chapter1Scene },
          { Chapter2Scene },
          { Chapter3Scene },
          { SummaryScene },
        ] = await Promise.all([
          import("@/game/core/GameState"),
          import("@/game/core/Game"),
          import("@/game/scenes/IntroScene"),
          import("@/game/scenes/Chapter1Scene"),
          import("@/game/scenes/Chapter2Scene"),
          import("@/game/scenes/Chapter3Scene"),
          import("@/game/scenes/SummaryScene"),
        ]);

        // Create game state with user info
        const state = new GameState();

        // Attach user info to state for telemetry
        (state as any).userId = userId;
        (state as any).userName = userName;

        // Create game instance
        const game = new Game(state);

        // Register all scenes
        game.registerScene("intro", IntroScene);
        game.registerScene("chapter1", Chapter1Scene);
        game.registerScene("chapter2", Chapter2Scene);
        game.registerScene("chapter3", Chapter3Scene);
        game.registerScene("summary", SummaryScene);

        // Attach canvas to container
        const canvas = game.getCanvas();
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        containerRef.current?.appendChild(canvas);

        // Start the game
        game.start();

        // Set up telemetry callback to save to server
        (state as any).onGameComplete = async (gameRun: any) => {
          try {
            await fetch("/api/game/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(gameRun),
            });
          } catch (err) {
            console.error("Failed to save game run:", err);
          }
        };

        setIsLoading(false);
        console.log("[Operation Black Knights] Game initialized");
        console.log(`[Operation Black Knights] Run ID: ${state.runId}`);
      } catch (err) {
        console.error("Failed to initialize game:", err);
        setError("Failed to initialize game. Please refresh the page.");
        setIsLoading(false);
      }
    };

    initGame();
  }, [userId, userName]);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-midnight-900">
        <div className="glass-panel p-8 text-center max-w-md">
          <div className="text-crimson-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-midnight-900 z-50">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 border-4 border-electric-500/30 border-t-electric-500 rounded-full animate-spin mx-auto" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              Initializing Simulation
            </h2>
            <p className="text-white/50">Preparing assessment environment...</p>
          </div>
        </div>
      )}
    </div>
  );
}

