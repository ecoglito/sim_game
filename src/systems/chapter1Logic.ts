import type { GameState } from '../core/GameState';
import type { EngagementActionType, ReplyTone } from '../core/types';
import {
  initEngagementSystem,
  updateEngagementSystem,
  scheduleEngagement as scheduleEngagementShared,
  scheduleEngagementWave as scheduleEngagementWaveShared,
  getSystemNotices as getSystemNoticesShared,
  addSystemNotice as addSystemNoticeShared,
  getPendingEngagements as getPendingEngagementsShared,
  clearAccountEngagements as clearAccountEngagementsShared,
  getEngagementStats,
  REAL_MS_TO_GAME_MINUTES,
  MAX_ACTIONS_PER_MINUTE,
  MAX_ACTIONS_PER_ACCOUNT_PER_HOUR,
} from './engagementSystem';
import { logEvent } from '../core/telemetry';

/**
 * Chapter 1 Logic - Swarm Orchestration
 * 
 * Thin wrapper around the shared engagement system.
 * Handles Chapter 1 specific initialization and logging.
 */

// Re-export constants for backwards compatibility
export { REAL_MS_TO_GAME_MINUTES, MAX_ACTIONS_PER_MINUTE, MAX_ACTIONS_PER_ACCOUNT_PER_HOUR };

/**
 * Initialize Chapter 1
 */
export function initChapter1(state: GameState): void {
  initEngagementSystem(state);
  
  logEvent(state, 'chapter1', 'chapter_start', { 
    accountCount: state.accounts.length,
    tweetCount: state.tweets.length 
  });
}

/**
 * Process a single tick of Chapter 1 simulation
 */
export function updateChapter1(state: GameState, deltaMs: number): {
  notices: string[];
  processedActions: number;
} {
  // Use baseline rule set for Chapter 1
  const ruleSet = state.ruleSets.find(r => r.id === 'baseline') || state.ruleSets[0];
  return updateEngagementSystem(state, deltaMs, ruleSet);
}

/**
 * Schedule an engagement action
 */
export function scheduleEngagement(
  accountId: string,
  tweetId: string,
  type: EngagementActionType,
  scheduledMinute: number,
  replyTone?: ReplyTone,
  state?: GameState
): boolean {
  // For backwards compatibility, get state from the global game instance
  // This will be called with state from scenes that import it
  if (!state) {
    console.warn('scheduleEngagement called without state - this may not work correctly');
    return false;
  }
  return scheduleEngagementShared(state, accountId, tweetId, type, scheduledMinute, replyTone);
}

/**
 * Schedule multiple accounts for an engagement pattern
 */
export function scheduleEngagementWave(
  accountIds: string[],
  tweetId: string,
  type: EngagementActionType,
  pattern: 'burst' | 'staggered' | 'slowBurn',
  startMinute: number,
  state?: GameState
): number {
  if (!state) {
    console.warn('scheduleEngagementWave called without state - this may not work correctly');
    return 0;
  }
  return scheduleEngagementWaveShared(state, accountIds, tweetId, type, pattern, startMinute);
}

/**
 * Get pending engagements
 */
export function getPendingEngagements(state: GameState) {
  return getPendingEngagementsShared(state);
}

/**
 * Clear pending engagements for an account
 */
export function clearAccountEngagements(state: GameState, accountId: string): number {
  return clearAccountEngagementsShared(state, accountId);
}

/**
 * Get recent system notices
 */
export function getSystemNotices(state: GameState, limit: number = 5): string[] {
  return getSystemNoticesShared(state, limit);
}

/**
 * Add a system notice
 */
export function addSystemNotice(state: GameState, notice: string): void {
  addSystemNoticeShared(state, notice);
}

/**
 * Get Chapter 1 stats for display
 */
export function getChapter1Stats(state: GameState) {
  return getEngagementStats(state);
}
