import type { GameState } from './GameState';
import type { TelemetryEvent } from './types';

/**
 * Telemetry API - Logging helper for game events
 * 
 * All user actions that affect state are logged here for later analysis.
 */

/**
 * Log a telemetry event to the game state
 */
export function logEvent(
  state: GameState,
  chapterId: string,
  type: string,
  payload: unknown
): void {
  const event: TelemetryEvent = {
    t: Date.now(),
    chapterId,
    type,
    payload,
  };
  state.telemetryLog.push(event);
}

/**
 * Log an engagement scheduled event
 */
export function logEngagementScheduled(
  state: GameState,
  accountId: string,
  tweetId: string,
  actionType: string
): void {
  logEvent(state, state.currentSceneId, 'engagement_scheduled', {
    accountId,
    tweetId,
    actionType,
  });
}

/**
 * Log a triage decision event
 */
export function logTriageDecision(
  state: GameState,
  accountId: string,
  action: string,
  timeSpent: number
): void {
  logEvent(state, state.currentSceneId, 'triage_decision', {
    accountId,
    action,
    timeSpent,
  });
}

/**
 * Log a countermeasure change event
 */
export function logCountermeasureChange(
  state: GameState,
  changes: Record<string, unknown>
): void {
  logEvent(state, state.currentSceneId, 'countermeasure_change', changes);
}

/**
 * Log analytics panel viewed event
 */
export function logAnalyticsViewed(
  state: GameState,
  duration: number
): void {
  logEvent(state, state.currentSceneId, 'analytics_viewed', {
    duration,
  });
}

/**
 * Log scene transition event
 */
export function logSceneTransition(
  state: GameState,
  fromScene: string,
  toScene: string
): void {
  logEvent(state, 'global', 'scene_transition', {
    fromScene,
    toScene,
  });
}

/**
 * Get all events for a specific chapter
 */
export function getChapterEvents(
  state: GameState,
  chapterId: string
): TelemetryEvent[] {
  return state.telemetryLog.filter((event) => event.chapterId === chapterId);
}

/**
 * Get all events of a specific type
 */
export function getEventsByType(
  state: GameState,
  type: string
): TelemetryEvent[] {
  return state.telemetryLog.filter((event) => event.type === type);
}

