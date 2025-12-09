import type {
  SceneId,
  Account,
  SimTweet,
  EngagementAction,
  TriageDecision,
  AlgorithmRuleSet,
  ChapterMetrics,
  TelemetryEvent,
  DerivedScores,
  GameRun,
  ScheduledEngagement,
} from './types';

/**
 * GameState - Central state management for the simulation.
 * 
 * Stores the current scene, all game data arrays, and provides
 * helper methods for scene switching and run management.
 */
export class GameState {
  // Current scene
  public currentSceneId: SceneId = 'intro';

  // Run identification
  public runId: string = '';
  public startedAt: number = 0;
  public endedAt: number = 0;

  // Core data arrays
  public accounts: Account[] = [];
  public tweets: SimTweet[] = [];
  public engagements: EngagementAction[] = [];
  public triageDecisions: TriageDecision[] = [];
  public ruleSets: AlgorithmRuleSet[] = [];
  public chapterMetrics: ChapterMetrics[] = [];

  // Telemetry log
  public telemetryLog: TelemetryEvent[] = [];

  // Derived scores (computed at end)
  public derivedScores: DerivedScores = {
    patternRealism: 0,
    riskDiscipline: 0,
    strategicSensitivity: 0,
    operationalPrioritization: 0,
    autonomySignals: 0,
  };

  // In-game time tracking
  public inGameMinutes: number = 0;

  // Global suspicion meter (0-100)
  public suspicionMeter: number = 0;

  // Engagement system state (shared between chapters)
  public engagementQueue: ScheduledEngagement[] = [];
  public systemNotices: string[] = [];
  public actionIdCounter: number = 0;

  // Scene change callback
  private onSceneChange?: (newSceneId: SceneId) => void;

  constructor() {
    this.initNewRun();
  }

  /**
   * Initialize a new game run with fresh state
   */
  public initNewRun(): void {
    this.runId = this.generateRunId();
    this.startedAt = Date.now();
    this.endedAt = 0;
    this.currentSceneId = 'intro';

    // Clear all data
    this.accounts = [];
    this.tweets = [];
    this.engagements = [];
    this.triageDecisions = [];
    this.chapterMetrics = [];
    this.telemetryLog = [];

    // Initialize rule sets
    this.ruleSets = [
      {
        id: 'baseline',
        weightClusterSynchrony: 1.0,
        weightRepeatReplyTone: 1.0,
        weightGeoLanguageMismatch: 1.0,
        weightHighValueAccountOveruse: 1.0,
      },
      {
        id: 'post_change',
        weightClusterSynchrony: 2.0,
        weightRepeatReplyTone: 1.5,
        weightGeoLanguageMismatch: 1.8,
        weightHighValueAccountOveruse: 2.0,
      },
    ];

    // Reset metrics
    this.derivedScores = {
      patternRealism: 0,
      riskDiscipline: 0,
      strategicSensitivity: 0,
      operationalPrioritization: 0,
      autonomySignals: 0,
    };

    this.inGameMinutes = 0;
    this.suspicionMeter = 0;

    // Reset engagement system state
    this.engagementQueue = [];
    this.systemNotices = [];
    this.actionIdCounter = 0;
  }

  /**
   * Reset state for a new run
   */
  public reset(): void {
    this.initNewRun();
  }

  /**
   * Set callback for scene changes
   */
  public setSceneChangeCallback(callback: (newSceneId: SceneId) => void): void {
    this.onSceneChange = callback;
  }

  /**
   * Switch to a new scene
   */
  public switchScene(sceneId: SceneId): void {
    this.currentSceneId = sceneId;
    if (this.onSceneChange) {
      this.onSceneChange(sceneId);
    }
  }

  /**
   * Get the next scene in sequence
   */
  public getNextScene(): SceneId | null {
    const order: SceneId[] = ['intro', 'chapter1', 'chapter2', 'chapter3', 'summary'];
    const currentIndex = order.indexOf(this.currentSceneId);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null;
  }

  /**
   * Advance to the next scene
   */
  public advanceToNextScene(): void {
    const nextScene = this.getNextScene();
    if (nextScene) {
      this.switchScene(nextScene);
    }
  }

  /**
   * End the current run
   */
  public endRun(): void {
    this.endedAt = Date.now();
  }

  /**
   * Export the full game run as a JSON-serializable object
   */
  public exportGameRun(): GameRun {
    return {
      runId: this.runId,
      startedAt: this.startedAt,
      endedAt: this.endedAt || Date.now(),
      accounts: this.accounts,
      tweets: this.tweets,
      engagements: this.engagements,
      triageDecisions: this.triageDecisions,
      ruleSets: this.ruleSets,
      chapterMetrics: this.chapterMetrics,
      derivedScores: this.derivedScores,
    };
  }

  /**
   * Generate a unique run ID
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

