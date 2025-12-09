import type { GameState } from '../core/GameState';
import type { EngagementAction, EngagementActionType, ReplyTone, SimTweet, AlgorithmRuleSet } from '../core/types';
import { calculateSuspicionDelta, updateSuspicionMeter, decaySuspicion, checkSuspicionThresholds, applySuspicionPenalties } from './suspicionEngine';
import { logEvent } from '../core/telemetry';

/**
 * Shared Engagement System
 * 
 * Core engagement logic shared between Chapter 1 and Chapter 3.
 * All state is stored in GameState for proper sharing.
 */

// Time conversion: 1 real second = 0.2 in-game minutes (so 10 real min = 120 game min)
export const REAL_MS_TO_GAME_MINUTES = 0.2 / 1000;

// Pacing constraints
export const MAX_ACTIONS_PER_MINUTE = 15;
export const MAX_ACTIONS_PER_ACCOUNT_PER_HOUR = 10;

/**
 * Initialize the engagement system (resets queue, notices, counters)
 */
export function initEngagementSystem(state: GameState): void {
  state.engagementQueue = [];
  state.systemNotices = [];
  state.actionIdCounter = 0;
  state.inGameMinutes = 0;
  state.suspicionMeter = 0;
}

/**
 * Process a single tick of engagement simulation
 * @param state - The game state
 * @param deltaMs - Time since last update in milliseconds
 * @param ruleSet - The algorithm rule set to use for suspicion calculation (optional, defaults to baseline)
 */
export function updateEngagementSystem(
  state: GameState,
  deltaMs: number,
  ruleSet?: AlgorithmRuleSet
): {
  notices: string[];
  processedActions: number;
} {
  // Convert deltaMs to in-game minutes
  const deltaMinutes = deltaMs * REAL_MS_TO_GAME_MINUTES;
  const previousMinute = Math.floor(state.inGameMinutes);
  state.inGameMinutes += deltaMinutes;
  const currentMinute = Math.floor(state.inGameMinutes);

  const notices: string[] = [];
  let processedActions = 0;

  // Use provided ruleSet or default to baseline
  const activeRuleSet = ruleSet || state.ruleSets.find(r => r.id === 'baseline') || state.ruleSets[0];

  // Process scheduled engagements for any minutes that have passed
  if (currentMinute > previousMinute) {
    for (let minute = previousMinute + 1; minute <= currentMinute; minute++) {
      const result = processEngagementsForMinute(state, minute, activeRuleSet);
      processedActions += result.processedCount;
      notices.push(...result.notices);
    }
  }

  // Update tweet metrics over time
  updateTweetMetrics(state, deltaMinutes);

  // Natural suspicion decay
  decaySuspicion(state, deltaMinutes);

  // Check for threshold penalties (only once per minute to avoid spam)
  if (currentMinute > previousMinute) {
    const level = checkSuspicionThresholds(state);
    if (level !== 'none') {
      const penaltyNotices = applySuspicionPenalties(state, level);
      notices.push(...penaltyNotices);
      addSystemNotice(state, ...penaltyNotices);
    }
  }

  return { notices, processedActions };
}

/**
 * Process scheduled engagements for a specific minute
 */
function processEngagementsForMinute(
  state: GameState,
  minute: number,
  ruleSet: AlgorithmRuleSet
): {
  processedCount: number;
  notices: string[];
} {
  const notices: string[] = [];
  const toProcess = state.engagementQueue.filter(e => e.scheduledMinute === minute);
  
  // Remove processed items from queue
  state.engagementQueue = state.engagementQueue.filter(e => e.scheduledMinute !== minute);

  // Check pacing constraint
  if (toProcess.length > MAX_ACTIONS_PER_MINUTE) {
    notices.push(`Too many actions scheduled for minute ${minute}. Some were dropped.`);
  }

  const actionsToProcess = toProcess.slice(0, MAX_ACTIONS_PER_MINUTE);

  for (const scheduled of actionsToProcess) {
    const account = state.accounts.find(a => a.id === scheduled.accountId);
    const tweet = state.tweets.find(t => t.id === scheduled.tweetId);

    if (!account || !tweet) continue;
    if (account.status !== 'active') {
      notices.push(`Action skipped: @${account.profile.handle} is ${account.status}`);
      continue;
    }

    // Create the engagement action
    const action: EngagementAction = {
      id: `eng_${++state.actionIdCounter}`,
      inGameMinute: minute,
      accountId: scheduled.accountId,
      tweetId: scheduled.tweetId,
      type: scheduled.type,
      replyTone: scheduled.replyTone,
      suspicionDelta: 0,
      reachDelta: 0,
      depthDelta: 0,
    };

    // Calculate effects
    action.suspicionDelta = calculateSuspicionDelta(action, state, ruleSet);
    action.reachDelta = calculateReachDelta(action, tweet, account.riskClass);
    action.depthDelta = calculateDepthDelta(action, tweet);

    // Apply effects
    updateSuspicionMeter(state, action.suspicionDelta);
    tweet.liveMetrics.impressions += action.reachDelta;
    tweet.liveMetrics.depthScore += action.depthDelta;

    // Update engagement counts
    switch (action.type) {
      case 'like':
        tweet.liveMetrics.likes = (tweet.liveMetrics.likes || 0) + 1;
        break;
      case 'retweet':
        tweet.liveMetrics.retweets = (tweet.liveMetrics.retweets || 0) + 1;
        break;
      case 'reply':
        tweet.liveMetrics.replies = (tweet.liveMetrics.replies || 0) + 1;
        break;
      case 'quote':
        tweet.liveMetrics.quotes = (tweet.liveMetrics.quotes || 0) + 1;
        break;
    }

    // Store the engagement
    state.engagements.push(action);

    // Log telemetry
    logEvent(state, 'engagement', 'engagement_executed', {
      accountId: action.accountId,
      tweetId: action.tweetId,
      type: action.type,
      suspicionDelta: action.suspicionDelta,
    });
  }

  return { processedCount: actionsToProcess.length, notices };
}

/**
 * Check if an account has already performed a specific action on a tweet
 * (either executed or scheduled in the queue)
 */
export function hasAccountEngagedTweet(
  state: GameState,
  accountId: string,
  tweetId: string,
  type: EngagementActionType
): boolean {
  // Check executed engagements
  const alreadyExecuted = state.engagements.some(
    e => e.accountId === accountId && e.tweetId === tweetId && e.type === type
  );
  if (alreadyExecuted) return true;

  // Check pending queue
  const alreadyQueued = state.engagementQueue.some(
    e => e.accountId === accountId && e.tweetId === tweetId && e.type === type
  );
  return alreadyQueued;
}

/**
 * Schedule an engagement action
 */
export function scheduleEngagement(
  state: GameState,
  accountId: string,
  tweetId: string,
  type: EngagementActionType,
  scheduledMinute: number,
  replyTone?: ReplyTone
): boolean {
  // Check if this account has already engaged this tweet with this action type
  // (can't like the same tweet twice, can't reply twice, etc.)
  if (hasAccountEngagedTweet(state, accountId, tweetId, type)) {
    return false;
  }

  // Check per-account pacing
  const accountActionsInHour = state.engagementQueue.filter(
    e => e.accountId === accountId && 
    e.scheduledMinute >= scheduledMinute - 60 &&
    e.scheduledMinute <= scheduledMinute
  ).length;

  if (accountActionsInHour >= MAX_ACTIONS_PER_ACCOUNT_PER_HOUR) {
    return false;
  }

  state.engagementQueue.push({
    accountId,
    tweetId,
    type,
    replyTone,
    scheduledMinute,
  });

  return true;
}

/**
 * Schedule multiple accounts for an engagement pattern
 */
export function scheduleEngagementWave(
  state: GameState,
  accountIds: string[],
  tweetId: string,
  type: EngagementActionType,
  pattern: 'burst' | 'staggered' | 'slowBurn',
  startMinute: number
): number {
  let scheduled = 0;

  accountIds.forEach((accountId, index) => {
    let delay: number;
    
    switch (pattern) {
      case 'burst':
        delay = Math.floor(index / 3); // 3 per minute
        break;
      case 'staggered':
        delay = index * 2; // Every 2 minutes
        break;
      case 'slowBurn':
        delay = index * 5; // Every 5 minutes
        break;
    }

    if (scheduleEngagement(state, accountId, tweetId, type, startMinute + delay)) {
      scheduled++;
    }
  });

  return scheduled;
}

/**
 * Get pending engagements
 */
export function getPendingEngagements(state: GameState): typeof state.engagementQueue {
  return [...state.engagementQueue];
}

/**
 * Clear pending engagements for an account
 */
export function clearAccountEngagements(state: GameState, accountId: string): number {
  const before = state.engagementQueue.length;
  state.engagementQueue = state.engagementQueue.filter(e => e.accountId !== accountId);
  return before - state.engagementQueue.length;
}

/**
 * Get recent system notices
 */
export function getSystemNotices(state: GameState, limit: number = 5): string[] {
  return state.systemNotices.slice(-limit);
}

/**
 * Add system notices
 */
export function addSystemNotice(state: GameState, ...notices: string[]): void {
  state.systemNotices.push(...notices);
  // Keep max 20 notices
  while (state.systemNotices.length > 20) {
    state.systemNotices.shift();
  }
}

/**
 * Calculate reach delta for an engagement action
 */
function calculateReachDelta(
  action: EngagementAction,
  tweet: SimTweet,
  riskClass: string
): number {
  let base = 0;

  switch (action.type) {
    case 'like':
      base = 15;  // Increased from 5
      break;
    case 'reply':
      base = 60;  // Increased from 20
      break;
    case 'retweet':
      base = 120; // Increased from 50
      break;
    case 'quote':
      base = 80;  // Increased from 30
      break;
    case 'profileVisit':
      base = 5;   // Increased from 2
      break;
  }

  // Higher value accounts provide more reach
  const riskMultiplier = riskClass === 'frontline' ? 3 : riskClass === 'mid' ? 1.5 : 1;
  
  // Time decay: less impact as tweet ages
  const ageMinutes = tweet.liveMetrics.timeSincePostMinutes;
  const timeMultiplier = Math.max(0.3, 1 - (ageMinutes / 180));

  return Math.floor(base * riskMultiplier * timeMultiplier);
}

/**
 * Calculate depth delta for an engagement action
 */
function calculateDepthDelta(
  action: EngagementAction,
  _tweet: SimTweet
): number {
  switch (action.type) {
    case 'reply':
      // Reply tone affects depth
      if (action.replyTone === 'highSignalCT') return 5;
      if (action.replyTone === 'technicalCritique') return 4;
      if (action.replyTone === 'normieQuestion') return 2;
      if (action.replyTone === 'subtleShill') return 1;
      if (action.replyTone === 'farming') return 0;
      return 2;
    case 'quote':
      return 3;
    case 'retweet':
      return 1;
    default:
      return 0;
  }
}

/**
 * Update tweet metrics over time (organic growth/decay)
 */
function updateTweetMetrics(state: GameState, deltaMinutes: number): void {
  for (const tweet of state.tweets) {
    // Age the tweet
    tweet.liveMetrics.timeSincePostMinutes += deltaMinutes;

    // Organic impression growth (diminishing over time)
    const ageMinutes = tweet.liveMetrics.timeSincePostMinutes;
    if (ageMinutes < 120) {
      const organicGrowth = (tweet.baseOrganicReach / 120) * deltaMinutes * Math.max(0.1, 1 - ageMinutes / 120);
      tweet.liveMetrics.impressions += Math.floor(organicGrowth);
    }
  }
}

/**
 * Get engagement stats for display
 */
export function getEngagementStats(state: GameState): {
  inGameMinutes: number;
  totalEngagements: number;
  pendingEngagements: number;
  activeAccounts: number;
  flaggedAccounts: number;
  bannedAccounts: number;
  avgReach: number;
  avgDepth: number;
} {
  const activeAccounts = state.accounts.filter(a => a.status === 'active').length;
  const flaggedAccounts = state.accounts.filter(a => a.status === 'flagged').length;
  const bannedAccounts = state.accounts.filter(a => a.status === 'banned').length;

  const totalReach = state.tweets.reduce((sum, t) => sum + t.liveMetrics.impressions, 0);
  const totalDepth = state.tweets.reduce((sum, t) => sum + t.liveMetrics.depthScore, 0);

  return {
    inGameMinutes: Math.floor(state.inGameMinutes),
    totalEngagements: state.engagements.length,
    pendingEngagements: state.engagementQueue.length,
    activeAccounts,
    flaggedAccounts,
    bannedAccounts,
    avgReach: state.tweets.length > 0 ? Math.floor(totalReach / state.tweets.length) : 0,
    avgDepth: state.tweets.length > 0 ? Math.floor(totalDepth / state.tweets.length) : 0,
  };
}

