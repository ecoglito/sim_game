import type { GameState } from '../core/GameState';
import type { Account, TriageDecision, AccountRiskClass, AccountProfile, AccountPersonaTags } from '../core/types';
import { logEvent } from '../core/telemetry';
import { isSevereFlag, isModerateFlag } from '../data/generators';

/**
 * Chapter 2 Logic - Account Triage and Reconstruction
 * 
 * Handles the simulation of account triage,
 * time budget management, and portfolio tracking.
 */

// Time costs for various actions (in-game minutes)
export const TIME_COSTS = {
  openAccountDetail: 1.0,
  changeProfileField: 0.5,
  togglePersonaTag: 0.5,
  revealHistoryFlag: 0.75,
  makeTriageDecision: 0.5,
  changeRiskClass: 0.5,
};

// Chapter state
let timeBudget = 60; // 60 in-game minutes
let currentAccountIndex = 0;
let triageQueue: Account[] = [];
let processedAccounts: Set<string> = new Set();

/**
 * Initialize Chapter 2
 */
export function initChapter2(state: GameState): void {
  timeBudget = 60;
  currentAccountIndex = 0;
  processedAccounts = new Set();
  
  // Create a queue of accounts to triage (use existing or generate new)
  triageQueue = [...state.accounts].filter(a => 
    a.status === 'active' || a.status === 'flagged'
  );
  
  // Shuffle the queue
  triageQueue.sort(() => Math.random() - 0.5);
  
  logEvent(state, 'chapter2', 'chapter_start', {
    accountsToTriage: triageQueue.length,
    timeBudget,
  });
}

/**
 * Get remaining time budget
 */
export function getTimeBudget(): number {
  return timeBudget;
}

/**
 * Get current account being triaged
 */
export function getCurrentAccount(): Account | null {
  if (currentAccountIndex >= triageQueue.length) return null;
  return triageQueue[currentAccountIndex];
}

/**
 * Get all accounts in triage queue
 */
export function getTriageQueue(): Account[] {
  return triageQueue;
}

/**
 * Get count of processed accounts
 */
export function getProcessedCount(): number {
  return processedAccounts.size;
}

/**
 * Apply time cost for an action
 */
export function applyTimeCost(actionType: keyof typeof TIME_COSTS): boolean {
  const cost = TIME_COSTS[actionType];
  if (timeBudget < cost) return false;
  timeBudget -= cost;
  return true;
}

/**
 * Check if time is exhausted
 */
export function isTimeExhausted(): boolean {
  return timeBudget <= 0;
}

/**
 * Open account for detailed view
 */
export function openAccountDetail(_accountId: string): boolean {
  if (!applyTimeCost('openAccountDetail')) return false;
  return true;
}

/**
 * Reveal a history flag (costs time)
 */
export function revealHistoryFlag(account: Account, flagIndex: number): string | null {
  if (!applyTimeCost('revealHistoryFlag')) return null;
  if (flagIndex >= account.historyFlags.length) return null;
  return account.historyFlags[flagIndex];
}

/**
 * Update an account's profile field
 */
export function updateProfileField(
  account: Account,
  field: keyof AccountProfile,
  value: string
): boolean {
  if (!applyTimeCost('changeProfileField')) return false;
  (account.profile as any)[field] = value;
  return true;
}

/**
 * Toggle a persona tag
 */
export function togglePersonaTag(
  account: Account,
  tag: keyof AccountPersonaTags
): boolean {
  if (!applyTimeCost('togglePersonaTag')) return false;
  account.persona[tag] = !account.persona[tag];
  return true;
}

/**
 * Change risk class
 */
export function changeRiskClass(
  account: Account,
  newRiskClass: AccountRiskClass
): boolean {
  if (!applyTimeCost('changeRiskClass')) return false;
  account.riskClass = newRiskClass;
  return true;
}

/**
 * Make a triage decision for an account
 */
export function makeTriageDecision(
  state: GameState,
  accountId: string,
  action: 'keep' | 'park' | 'discard',
  detectedFlags: string[] = [],
  timeSpent: number = 0
): boolean {
  if (!applyTimeCost('makeTriageDecision')) return false;

  const account = state.accounts.find(a => a.id === accountId);
  if (!account) return false;

  // Update account status based on decision
  switch (action) {
    case 'keep':
      account.status = 'active';
      break;
    case 'park':
      account.status = 'parked';
      break;
    case 'discard':
      account.status = 'discarded';
      break;
  }

  // Record the decision
  const decision: TriageDecision = {
    accountId,
    action,
    newProfile: { ...account.profile },
    newPersona: { ...account.persona },
    newRiskClass: account.riskClass,
    triageTimeSpentMinutes: timeSpent,
    detectedFlags,
  };

  state.triageDecisions.push(decision);
  processedAccounts.add(accountId);
  
  // Move to next account
  currentAccountIndex++;

  logEvent(state, 'chapter2', 'triage_decision', {
    accountId,
    action,
    detectedFlags,
    timeSpent,
  });

  return true;
}

/**
 * Skip to next account without decision
 */
export function skipAccount(): void {
  currentAccountIndex++;
}

/**
 * Check if an account has severe history flags
 */
export function hasSevereFlags(account: Account): boolean {
  return account.historyFlags.some(f => isSevereFlag(f));
}

/**
 * Check if an account has moderate history flags
 */
export function hasModerateFlags(account: Account): boolean {
  return account.historyFlags.some(f => isModerateFlag(f));
}

/**
 * Get portfolio statistics
 */
export function getPortfolioStats(state: GameState): {
  total: number;
  kept: number;
  parked: number;
  discarded: number;
  pending: number;
  byRiskClass: Record<AccountRiskClass, number>;
  byPersona: Record<string, number>;
  avgBanRisk: number;
  diversityIndex: number;
} {
  const decisions = state.triageDecisions;
  const kept = decisions.filter(d => d.action === 'keep').length;
  const parked = decisions.filter(d => d.action === 'park').length;
  const discarded = decisions.filter(d => d.action === 'discard').length;
  const pending = triageQueue.length - processedAccounts.size;

  // Count by risk class (among kept accounts)
  const byRiskClass: Record<AccountRiskClass, number> = {
    frontline: 0,
    mid: 0,
    background: 0,
  };

  const byPersona: Record<string, number> = {
    defi: 0,
    nft: 0,
    gaming: 0,
    normie: 0,
    builder: 0,
    trader: 0,
  };

  let totalBanRisk = 0;
  let keptCount = 0;

  for (const account of state.accounts) {
    if (account.status === 'active') {
      byRiskClass[account.riskClass]++;
      keptCount++;
      totalBanRisk += account.hiddenBanRiskScore;

      if (account.persona.defi) byPersona.defi++;
      if (account.persona.nft) byPersona.nft++;
      if (account.persona.gaming) byPersona.gaming++;
      if (account.persona.normie) byPersona.normie++;
      if (account.persona.builder) byPersona.builder++;
      if (account.persona.trader) byPersona.trader++;
    }
  }

  // Calculate diversity index (0-1, higher is more diverse)
  const personaValues = Object.values(byPersona);
  const maxPersona = Math.max(...personaValues, 1);
  const minPersona = Math.min(...personaValues);
  const diversityIndex = keptCount > 0 
    ? 1 - ((maxPersona - minPersona) / keptCount)
    : 0;

  return {
    total: triageQueue.length,
    kept,
    parked,
    discarded,
    pending,
    byRiskClass,
    byPersona,
    avgBanRisk: keptCount > 0 ? totalBanRisk / keptCount : 0,
    diversityIndex: Math.max(0, Math.min(1, diversityIndex)),
  };
}

/**
 * Get upcoming narrative needs (briefing info)
 */
export function getNarrativeNeeds(): string[] {
  return [
    'Heavy DeFi governance content expected this week',
    'Partner collaborations need normie-friendly accounts',
    'Technical threads require builder/dev personas',
    'NFT launch coming - need art-focused accounts',
  ];
}

/**
 * Calculate efficiency metrics for scoring
 */
export function getEfficiencyMetrics(state: GameState): {
  avgTimePerAccount: number;
  flagDetectionRate: number;
  severeAccountsKept: number;
  appropriateRiskAssignment: number;
} {
  const decisions = state.triageDecisions;
  if (decisions.length === 0) {
    return {
      avgTimePerAccount: 0,
      flagDetectionRate: 0,
      severeAccountsKept: 0,
      appropriateRiskAssignment: 0,
    };
  }

  const totalTime = decisions.reduce((sum, d) => sum + d.triageTimeSpentMinutes, 0);
  const avgTimePerAccount = totalTime / decisions.length;

  // Check flag detection
  let totalFlags = 0;
  let detectedFlags = 0;
  let severeKept = 0;
  let appropriateRisk = 0;

  for (const decision of decisions) {
    const account = state.accounts.find(a => a.id === decision.accountId);
    if (!account) continue;

    totalFlags += account.historyFlags.length;
    detectedFlags += decision.detectedFlags.length;

    // Count severe accounts that were kept as active
    if (hasSevereFlags(account) && decision.action === 'keep') {
      severeKept++;
    }

    // Check if risk class is appropriate given flags
    const shouldBeConservative = hasSevereFlags(account) || hasModerateFlags(account);
    if (shouldBeConservative && account.riskClass === 'background') {
      appropriateRisk++;
    } else if (!shouldBeConservative && account.riskClass !== 'background') {
      appropriateRisk++;
    }
  }

  return {
    avgTimePerAccount,
    flagDetectionRate: totalFlags > 0 ? detectedFlags / totalFlags : 1,
    severeAccountsKept: severeKept,
    appropriateRiskAssignment: decisions.length > 0 ? appropriateRisk / decisions.length : 0,
  };
}
