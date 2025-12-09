import type { GameState } from '../core/GameState';
import type { AlgorithmRuleSet } from '../core/types';
import { logEvent } from '../core/telemetry';
import { getSuspicionStats } from './suspicionEngine';
import {
  initEngagementSystem,
  updateEngagementSystem,
} from './engagementSystem';

/**
 * Chapter 3 Logic - Algorithm Countermeasures
 * 
 * Builds on the shared engagement system, adding:
 * - Algorithm rule changes mid-chapter
 * - Countermeasure application
 * - Analytics and comparison metrics
 */

// Rule change timing (in-game minutes)
export const RULE_CHANGE_MINUTE = 40;
export const CHAPTER_DURATION = 120; // 120 in-game minutes

// Maximum countermeasure updates allowed
export const MAX_COUNTERMEASURE_UPDATES = 3;

// Chapter state (could also be moved to GameState if needed for persistence)
interface Chapter3State {
  currentPhase: 'baseline' | 'post_change';
  countermeasureUpdatesUsed: number;
  ruleChangeTriggered: boolean;
  ruleChangeTime: number;
  firstCountermeasureTime: number | null;
  baselineMetrics: {
    suspicionPerEngagement: number;
    bansPerEngagement: number;
    avgReach: number;
    totalEngagements: number;
  };
  postChangeMetrics: {
    suspicionPerEngagement: number;
    bansPerEngagement: number;
    avgReach: number;
    totalEngagements: number;
  };
  currentSettings: CountermeasureSettings;
}

let chapter3State: Chapter3State = createDefaultState();

function createDefaultState(): Chapter3State {
  return {
    currentPhase: 'baseline',
    countermeasureUpdatesUsed: 0,
    ruleChangeTriggered: false,
    ruleChangeTime: 0,
    firstCountermeasureTime: null,
    baselineMetrics: {
      suspicionPerEngagement: 0,
      bansPerEngagement: 0,
      avgReach: 0,
      totalEngagements: 0,
    },
    postChangeMetrics: {
      suspicionPerEngagement: 0,
      bansPerEngagement: 0,
      avgReach: 0,
      totalEngagements: 0,
    },
    currentSettings: {
      maxActionsPerAccountPerHour: 10,
      minDelayBetweenActions: 2,
      likeRatio: 0.5,
      replyRatio: 0.3,
      retweetRatio: 0.2,
      silentBrowsingCount: 0,
    },
  };
}

// Countermeasure settings
export interface CountermeasureSettings {
  maxActionsPerAccountPerHour: number;
  minDelayBetweenActions: number;
  likeRatio: number;
  replyRatio: number;
  retweetRatio: number;
  silentBrowsingCount: number;
}

/**
 * Initialize Chapter 3
 * Uses the shared engagement system but resets chapter-specific state
 */
export function initChapter3(state: GameState): void {
  // Reset chapter-specific state
  chapter3State = createDefaultState();
  
  // Initialize the shared engagement system
  initEngagementSystem(state);
  
  logEvent(state, 'chapter3', 'chapter_start', {
    ruleChangeMinute: RULE_CHANGE_MINUTE,
    maxCountermeasures: MAX_COUNTERMEASURE_UPDATES,
  });
}

/**
 * Process a single tick of Chapter 3 simulation
 * Uses the shared engagement system with the appropriate rule set
 */
export function updateChapter3(state: GameState, deltaMs: number): {
  notices: string[];
  processedActions: number;
} {
  // Get the appropriate rule set based on current phase
  const ruleSet = getCurrentRuleSet(state);
  
  // Use the shared engagement system
  return updateEngagementSystem(state, deltaMs, ruleSet);
}

/**
 * Get current phase
 */
export function getCurrentPhase(): 'baseline' | 'post_change' {
  return chapter3State.currentPhase;
}

/**
 * Check if the algorithm rule change should trigger
 */
export function shouldTriggerRuleChange(state: GameState): boolean {
  return state.inGameMinutes >= RULE_CHANGE_MINUTE && !chapter3State.ruleChangeTriggered;
}

/**
 * Apply the post-change rule set
 */
export function applyRuleChange(state: GameState): void {
  if (chapter3State.ruleChangeTriggered) return;
  
  // Capture baseline metrics
  captureBaselineMetrics(state);
  
  chapter3State.currentPhase = 'post_change';
  chapter3State.ruleChangeTriggered = true;
  chapter3State.ruleChangeTime = state.inGameMinutes;
  
  logEvent(state, 'chapter3', 'rule_change', {
    atMinute: state.inGameMinutes,
    baselineMetrics: chapter3State.baselineMetrics,
  });
}

/**
 * Capture baseline metrics before rule change
 */
function captureBaselineMetrics(state: GameState): void {
  const stats = getSuspicionStats(state);
  const totalReach = state.tweets.reduce((sum, t) => sum + t.liveMetrics.impressions, 0);
  
  chapter3State.baselineMetrics = {
    suspicionPerEngagement: stats.avgPerEngagement,
    bansPerEngagement: stats.totalEngagements > 0 
      ? stats.bannedCount / stats.totalEngagements 
      : 0,
    avgReach: state.tweets.length > 0 ? totalReach / state.tweets.length : 0,
    totalEngagements: stats.totalEngagements,
  };
}

/**
 * Capture post-change metrics
 */
export function capturePostChangeMetrics(state: GameState): void {
  const stats = getSuspicionStats(state);
  const totalReach = state.tweets.reduce((sum, t) => sum + t.liveMetrics.impressions, 0);
  
  // Only count engagements after rule change
  const postChangeEngagements = state.engagements.filter(
    e => e.inGameMinute >= RULE_CHANGE_MINUTE
  );
  
  const postSuspicion = postChangeEngagements.reduce((sum, e) => sum + e.suspicionDelta, 0);
  
  chapter3State.postChangeMetrics = {
    suspicionPerEngagement: postChangeEngagements.length > 0 
      ? postSuspicion / postChangeEngagements.length 
      : 0,
    bansPerEngagement: postChangeEngagements.length > 0 
      ? stats.bannedCount / postChangeEngagements.length 
      : 0,
    avgReach: state.tweets.length > 0 ? totalReach / state.tweets.length : 0,
    totalEngagements: postChangeEngagements.length,
  };
}

/**
 * Get the current active rule set
 */
export function getCurrentRuleSet(state: GameState): AlgorithmRuleSet {
  const id = chapter3State.currentPhase === 'baseline' ? 'baseline' : 'post_change';
  return state.ruleSets.find(r => r.id === id) || state.ruleSets[0];
}

/**
 * Get remaining countermeasure updates
 */
export function getCountermeasureUpdatesRemaining(): number {
  return MAX_COUNTERMEASURE_UPDATES - chapter3State.countermeasureUpdatesUsed;
}

/**
 * Get current countermeasure settings
 */
export function getCountermeasureSettings(): CountermeasureSettings {
  return { ...chapter3State.currentSettings };
}

/**
 * Apply a countermeasure update
 */
export function applyCountermeasure(
  state: GameState,
  settings: Partial<CountermeasureSettings>
): boolean {
  if (chapter3State.countermeasureUpdatesUsed >= MAX_COUNTERMEASURE_UPDATES) {
    return false;
  }
  
  chapter3State.countermeasureUpdatesUsed++;
  chapter3State.currentSettings = { ...chapter3State.currentSettings, ...settings };
  
  // Track first countermeasure time
  if (chapter3State.firstCountermeasureTime === null && chapter3State.ruleChangeTriggered) {
    chapter3State.firstCountermeasureTime = state.inGameMinutes;
  }
  
  logEvent(state, 'chapter3', 'countermeasure_applied', {
    updateNumber: chapter3State.countermeasureUpdatesUsed,
    settings: chapter3State.currentSettings,
    timeSinceRuleChange: chapter3State.ruleChangeTriggered ? state.inGameMinutes - chapter3State.ruleChangeTime : null,
  });
  
  return true;
}

/**
 * Get analytics data for display
 */
export function getAnalyticsData(state: GameState): {
  bansByAge: { young: number; medium: number; old: number };
  bansByRisk: { frontline: number; mid: number; background: number };
  suspicionByActionType: Record<string, number>;
  engagementsByHour: number[];
  currentPhase: 'baseline' | 'post_change';
  timeToFirstCountermeasure: number | null;
} {
  const bansByAge = { young: 0, medium: 0, old: 0 };
  const bansByRisk = { frontline: 0, mid: 0, background: 0 };
  const suspicionByActionType: Record<string, number> = {
    like: 0,
    reply: 0,
    retweet: 0,
    quote: 0,
  };
  const actionCounts: Record<string, number> = {
    like: 0,
    reply: 0,
    retweet: 0,
    quote: 0,
  };
  
  // Count bans by age and risk
  for (const account of state.accounts) {
    if (account.status === 'banned') {
      // By age
      if (account.ageDays < 30) bansByAge.young++;
      else if (account.ageDays < 90) bansByAge.medium++;
      else bansByAge.old++;
      
      // By risk class
      bansByRisk[account.riskClass]++;
    }
  }
  
  // Suspicion by action type
  for (const engagement of state.engagements) {
    suspicionByActionType[engagement.type] = 
      (suspicionByActionType[engagement.type] || 0) + engagement.suspicionDelta;
    actionCounts[engagement.type] = (actionCounts[engagement.type] || 0) + 1;
  }
  
  // Average suspicion by type
  for (const type of Object.keys(suspicionByActionType)) {
    if (actionCounts[type] > 0) {
      suspicionByActionType[type] /= actionCounts[type];
    }
  }
  
  // Engagements by hour
  const engagementsByHour: number[] = new Array(24).fill(0);
  for (const engagement of state.engagements) {
    const hour = Math.floor(engagement.inGameMinute / 60);
    if (hour < 24) {
      engagementsByHour[hour]++;
    }
  }
  
  return {
    bansByAge,
    bansByRisk,
    suspicionByActionType,
    engagementsByHour,
    currentPhase: chapter3State.currentPhase,
    timeToFirstCountermeasure: chapter3State.firstCountermeasureTime !== null 
      ? chapter3State.firstCountermeasureTime - chapter3State.ruleChangeTime 
      : null,
  };
}

/**
 * Get comparison metrics for scoring
 */
export function getComparisonMetrics(): {
  baseline: typeof chapter3State.baselineMetrics;
  postChange: typeof chapter3State.postChangeMetrics;
  improvement: {
    suspicion: number;
    bans: number;
    reach: number;
  };
  timeToReact: number | null;
  countermeasuresUsed: number;
} {
  const suspicionImprovement = chapter3State.baselineMetrics.suspicionPerEngagement > 0
    ? (chapter3State.baselineMetrics.suspicionPerEngagement - chapter3State.postChangeMetrics.suspicionPerEngagement) 
      / chapter3State.baselineMetrics.suspicionPerEngagement
    : 0;
    
  const bansImprovement = chapter3State.baselineMetrics.bansPerEngagement > 0
    ? (chapter3State.baselineMetrics.bansPerEngagement - chapter3State.postChangeMetrics.bansPerEngagement) 
      / chapter3State.baselineMetrics.bansPerEngagement
    : 0;
    
  const reachImprovement = chapter3State.baselineMetrics.avgReach > 0
    ? (chapter3State.postChangeMetrics.avgReach - chapter3State.baselineMetrics.avgReach) 
      / chapter3State.baselineMetrics.avgReach
    : 0;
  
  return {
    baseline: chapter3State.baselineMetrics,
    postChange: chapter3State.postChangeMetrics,
    improvement: {
      suspicion: suspicionImprovement,
      bans: bansImprovement,
      reach: reachImprovement,
    },
    timeToReact: chapter3State.firstCountermeasureTime !== null 
      ? chapter3State.firstCountermeasureTime - chapter3State.ruleChangeTime 
      : null,
    countermeasuresUsed: chapter3State.countermeasureUpdatesUsed,
  };
}

/**
 * Check if chapter should end
 */
export function isChapterComplete(state: GameState): boolean {
  return state.inGameMinutes >= CHAPTER_DURATION;
}
