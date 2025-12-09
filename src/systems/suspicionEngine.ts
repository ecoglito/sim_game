import type { GameState } from '../core/GameState';
import type { EngagementAction, AlgorithmRuleSet, Account } from '../core/types';

/**
 * Suspicion Engine
 * 
 * Calculates suspicion scores based on engagement patterns
 * and applies the current algorithm rule set weights.
 */

// Suspicion thresholds
export const SUSPICION_THRESHOLDS = {
  warning: 40,
  elevated: 60,
  critical: 80,
  maximum: 100,
};

// Base suspicion values per action type
const BASE_SUSPICION = {
  like: 0.5,
  reply: 1.5,
  retweet: 1.0,
  quote: 2.0,
  profileVisit: 0.2,
};

// Time window for cluster detection (in-game minutes)
const CLUSTER_WINDOW = 5;

// ============================================================================
// Core Suspicion Calculations
// ============================================================================

/**
 * Calculate suspicion delta for an engagement action
 */
export function calculateSuspicionDelta(
  action: EngagementAction,
  state: GameState,
  ruleSet: AlgorithmRuleSet
): number {
  const account = state.accounts.find(a => a.id === action.accountId);
  if (!account) return 0;

  let suspicion = BASE_SUSPICION[action.type] || 1;

  // Factor 1: Cluster synchrony
  const clusterFactor = calculateClusterSynchrony(action.tweetId, state, CLUSTER_WINDOW);
  suspicion += clusterFactor * ruleSet.weightClusterSynchrony;

  // Factor 2: Repetition (same account engaging same tweet's author repeatedly)
  const repetitionFactor = calculateRepetitionFactor(action.accountId, action.tweetId, state);
  suspicion += repetitionFactor * ruleSet.weightRepeatReplyTone;

  // Factor 3: Persona mismatch
  const mismatchFactor = calculatePersonaMismatch(account, action);
  suspicion += mismatchFactor * ruleSet.weightGeoLanguageMismatch;

  // Factor 4: High-value account overuse
  if (account.riskClass === 'frontline') {
    const overuseFactor = calculateHighValueOveruse(action.accountId, state, 30);
    suspicion += overuseFactor * ruleSet.weightHighValueAccountOveruse;
  }

  // Account's existing risk affects suspicion
  suspicion *= (1 + account.hiddenBanRiskScore * 0.5);

  return Math.max(0, suspicion);
}

/**
 * Calculate cluster synchrony factor
 * (many accounts engaging same tweet in narrow window)
 */
export function calculateClusterSynchrony(
  tweetId: string,
  state: GameState,
  windowMinutes: number
): number {
  const currentMinute = state.inGameMinutes;
  const recentEngagements = state.engagements.filter(e =>
    e.tweetId === tweetId &&
    e.inGameMinute >= currentMinute - windowMinutes &&
    e.inGameMinute <= currentMinute
  );

  // More than 5 engagements in window is suspicious
  if (recentEngagements.length > 10) return 3.0;
  if (recentEngagements.length > 5) return 1.5;
  if (recentEngagements.length > 3) return 0.5;
  return 0;
}

/**
 * Calculate repetition factor
 * (same accounts repeatedly engaging same author's content)
 */
export function calculateRepetitionFactor(
  accountId: string,
  tweetId: string,
  state: GameState
): number {
  const tweet = state.tweets.find(t => t.id === tweetId);
  if (!tweet) return 0;

  // Count how many times this account has engaged this author's tweets
  const authorTweets = state.tweets.filter(t => t.authorType === tweet.authorType);
  const authorTweetIds = new Set(authorTweets.map(t => t.id));
  
  const engagementCount = state.engagements.filter(e =>
    e.accountId === accountId && authorTweetIds.has(e.tweetId)
  ).length;

  if (engagementCount > 10) return 2.0;
  if (engagementCount > 5) return 1.0;
  if (engagementCount > 2) return 0.3;
  return 0;
}

/**
 * Calculate persona mismatch factor
 * (e.g., normie persona replying with high-signal CT critique)
 */
export function calculatePersonaMismatch(
  account: Account,
  action: EngagementAction
): number {
  // Check for mismatches
  let mismatch = 0;

  // Normie account with technical reply tone
  if (account.persona.normie && action.replyTone === 'technicalCritique') {
    mismatch += 1.5;
  }

  // Non-defi account engaging heavily with defi content
  if (!account.persona.defi && action.replyTone === 'highSignalCT') {
    mismatch += 0.5;
  }

  // Farming tone from builder/dev account
  if ((account.persona.builder || account.persona.devAnon) && action.replyTone === 'farming') {
    mismatch += 1.0;
  }

  return mismatch;
}

/**
 * Calculate high-value account overuse factor
 */
export function calculateHighValueOveruse(
  accountId: string,
  state: GameState,
  windowMinutes: number
): number {
  const currentMinute = state.inGameMinutes;
  const recentActions = state.engagements.filter(e =>
    e.accountId === accountId &&
    e.inGameMinute >= currentMinute - windowMinutes
  );

  // Frontline accounts should be used sparingly
  if (recentActions.length > 5) return 2.0;
  if (recentActions.length > 3) return 1.0;
  if (recentActions.length > 1) return 0.3;
  return 0;
}

/**
 * Update global suspicion meter
 */
export function updateSuspicionMeter(
  state: GameState,
  delta: number
): void {
  state.suspicionMeter = Math.max(0, Math.min(100, state.suspicionMeter + delta));
}

/**
 * Apply natural decay to suspicion (called each tick)
 */
export function decaySuspicion(state: GameState, deltaMinutes: number): void {
  // Decay rate: lose 0.5 suspicion per in-game minute
  const decay = deltaMinutes * 0.5;
  state.suspicionMeter = Math.max(0, state.suspicionMeter - decay);
}

/**
 * Check if suspicion level triggers penalties
 */
export function checkSuspicionThresholds(
  state: GameState
): 'none' | 'warning' | 'elevated' | 'critical' {
  if (state.suspicionMeter >= SUSPICION_THRESHOLDS.critical) return 'critical';
  if (state.suspicionMeter >= SUSPICION_THRESHOLDS.elevated) return 'elevated';
  if (state.suspicionMeter >= SUSPICION_THRESHOLDS.warning) return 'warning';
  return 'none';
}

/**
 * Apply penalties based on suspicion level
 */
export function applySuspicionPenalties(
  state: GameState,
  level: 'warning' | 'elevated' | 'critical'
): string[] {
  const notices: string[] = [];

  if (level === 'critical') {
    // Ban a random active frontline account
    const frontlineAccounts = state.accounts.filter(
      a => a.status === 'active' && a.riskClass === 'frontline'
    );
    if (frontlineAccounts.length > 0) {
      const victim = frontlineAccounts[Math.floor(Math.random() * frontlineAccounts.length)];
      victim.status = 'banned';
      notices.push(`CRITICAL: Account @${victim.profile.handle} has been banned!`);
    }
  } else if (level === 'elevated') {
    // Flag a random active account
    const activeAccounts = state.accounts.filter(a => a.status === 'active');
    if (activeAccounts.length > 0) {
      const victim = activeAccounts[Math.floor(Math.random() * activeAccounts.length)];
      victim.status = 'flagged';
      notices.push(`WARNING: Account @${victim.profile.handle} has been flagged.`);
    }
  } else if (level === 'warning') {
    notices.push('Suspicion levels rising. Consider varying your engagement patterns.');
  }

  return notices;
}

/**
 * Get stats for analytics
 */
export function getSuspicionStats(state: GameState): {
  current: number;
  avgPerEngagement: number;
  totalEngagements: number;
  bannedCount: number;
  flaggedCount: number;
} {
  const totalSuspicion = state.engagements.reduce((sum, e) => sum + e.suspicionDelta, 0);
  
  return {
    current: state.suspicionMeter,
    avgPerEngagement: state.engagements.length > 0 
      ? totalSuspicion / state.engagements.length 
      : 0,
    totalEngagements: state.engagements.length,
    bannedCount: state.accounts.filter(a => a.status === 'banned').length,
    flaggedCount: state.accounts.filter(a => a.status === 'flagged').length,
  };
}
