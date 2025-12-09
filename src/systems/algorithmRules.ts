import type { AlgorithmRuleSet } from '../core/types';

/**
 * Algorithm Rules
 * 
 * Defines the baseline and post-change rule sets
 * that control suspicion calculations.
 */

/**
 * Baseline rule set - used in Phase 1 of Chapter 3
 * and throughout Chapters 1 and 2
 */
export const BASELINE_RULES: AlgorithmRuleSet = {
  id: 'baseline',
  weightClusterSynchrony: 1.0,
  weightRepeatReplyTone: 1.0,
  weightGeoLanguageMismatch: 1.0,
  weightHighValueAccountOveruse: 1.0,
};

/**
 * Post-change rule set - activated mid-Chapter 3
 * 
 * Higher weights make detection more aggressive:
 * - Cluster synchrony: 2.0x (was 1.0x)
 * - Repeat reply tone: 1.5x (was 1.0x)
 * - Geo/language mismatch: 1.8x (was 1.0x)
 * - High-value overuse: 2.0x (was 1.0x)
 */
export const POST_CHANGE_RULES: AlgorithmRuleSet = {
  id: 'post_change',
  weightClusterSynchrony: 2.0,
  weightRepeatReplyTone: 1.5,
  weightGeoLanguageMismatch: 1.8,
  weightHighValueAccountOveruse: 2.0,
};

/**
 * Get the default rule sets
 */
export function getDefaultRuleSets(): AlgorithmRuleSet[] {
  return [BASELINE_RULES, POST_CHANGE_RULES];
}

/**
 * Get rule set by ID
 */
export function getRuleSetById(
  id: 'baseline' | 'post_change'
): AlgorithmRuleSet {
  return id === 'baseline' ? BASELINE_RULES : POST_CHANGE_RULES;
}

/**
 * Calculate weighted suspicion score using rule set
 * TODO: Implement full calculation
 */
export function calculateWeightedSuspicion(
  _ruleSet: AlgorithmRuleSet,
  _factors: SuspicionFactors
): number {
  // TODO: Apply weights to factors and sum
  return 0;
}

/**
 * Suspicion factors interface
 */
export interface SuspicionFactors {
  clusterSynchrony: number;
  repeatReplyTone: number;
  geoLanguageMismatch: number;
  highValueAccountOveruse: number;
}

