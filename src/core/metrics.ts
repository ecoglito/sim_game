import type { GameRun, DerivedScores, ChapterMetrics } from './types';

/**
 * Metrics computation module
 * 
 * Functions for computing derived scores from GameRun data.
 * These are populated at the end of a simulation run.
 */

/**
 * Compute all derived scores from a game run
 */
export function computeDerivedScores(run: GameRun): DerivedScores {
  return {
    patternRealism: computePatternRealism(run),
    riskDiscipline: computeRiskDiscipline(run),
    strategicSensitivity: computeStrategicSensitivity(run),
    operationalPrioritization: computeOperationalPrioritization(run),
    autonomySignals: computeAutonomySignals(run),
  };
}

/**
 * Compute pattern realism score (0-100)
 * 
 * Based on Chapter I and III:
 * - Penalize over-concentrated account usage
 * - Penalize synchronized waves
 * - Higher score for staggered, human-like patterns
 */
export function computePatternRealism(run: GameRun): number {
  let score = 70; // Base score

  // Check account usage distribution
  const accountUsage: Record<string, number> = {};
  for (const engagement of run.engagements) {
    accountUsage[engagement.accountId] = (accountUsage[engagement.accountId] || 0) + 1;
  }

  const usageCounts = Object.values(accountUsage);
  if (usageCounts.length > 0) {
    const maxUsage = Math.max(...usageCounts);
    const avgUsage = usageCounts.reduce((a, b) => a + b, 0) / usageCounts.length;
    
    // Penalize if one account is used way more than average
    if (maxUsage > avgUsage * 3) {
      score -= 15;
    } else if (maxUsage > avgUsage * 2) {
      score -= 8;
    }

    // Reward good distribution
    const variance = usageCounts.reduce((sum, u) => sum + Math.pow(u - avgUsage, 2), 0) / usageCounts.length;
    const cv = Math.sqrt(variance) / avgUsage; // Coefficient of variation
    if (cv < 0.5) {
      score += 10; // Low variance is good
    } else if (cv > 1.5) {
      score -= 10; // High variance is bad
    }
  }

  // Check timing patterns
  const minuteEngagements: Record<number, number> = {};
  for (const engagement of run.engagements) {
    const minute = engagement.inGameMinute;
    minuteEngagements[minute] = (minuteEngagements[minute] || 0) + 1;
  }

  const spikes = Object.values(minuteEngagements).filter(count => count > 10).length;
  if (spikes > 5) {
    score -= 15; // Too many synchronized bursts
  } else if (spikes > 2) {
    score -= 8;
  }

  // Check suspicion levels
  const avgSuspicion = run.engagements.length > 0
    ? run.engagements.reduce((sum, e) => sum + e.suspicionDelta, 0) / run.engagements.length
    : 0;

  if (avgSuspicion < 1) {
    score += 10;
  } else if (avgSuspicion > 3) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute risk discipline score (0-100)
 * 
 * Based on:
 * - Chapter II landmine handling
 * - Portfolio risk profile
 * - Frontline accounts burned in Chapters I and III
 */
export function computeRiskDiscipline(run: GameRun): number {
  let score = 70;

  // Count banned accounts by risk class
  const bannedFrontline = run.accounts.filter(a => a.status === 'banned' && a.riskClass === 'frontline').length;
  const totalFrontline = run.accounts.filter(a => a.riskClass === 'frontline').length;

  // Heavy penalty for burning frontline accounts
  if (totalFrontline > 0) {
    const frontlineLossRate = bannedFrontline / totalFrontline;
    if (frontlineLossRate > 0.3) {
      score -= 25;
    } else if (frontlineLossRate > 0.15) {
      score -= 15;
    } else if (frontlineLossRate === 0) {
      score += 10;
    }
  }

  // Check triage decisions
  const triageDecisions = run.triageDecisions;
  if (triageDecisions.length > 0) {
    // Check if severe flags were detected
    const flagsDetected = triageDecisions.reduce((sum, d) => sum + d.detectedFlags.length, 0);
    const totalAccounts = triageDecisions.length;
    
    if (flagsDetected / totalAccounts > 0.5) {
      score += 10; // Good flag detection
    }

    // Check risk class distribution
    const keptDecisions = triageDecisions.filter(d => d.action === 'keep');
    const conservativeAssignments = keptDecisions.filter(d => d.newRiskClass === 'background').length;
    
    if (conservativeAssignments / keptDecisions.length > 0.3) {
      score += 5; // Conservative approach
    }
  }

  // Average hidden ban risk of kept accounts
  const activeAccounts = run.accounts.filter(a => a.status === 'active');
  if (activeAccounts.length > 0) {
    const avgBanRisk = activeAccounts.reduce((sum, a) => sum + a.hiddenBanRiskScore, 0) / activeAccounts.length;
    if (avgBanRisk > 0.5) {
      score -= 15;
    } else if (avgBanRisk < 0.2) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute strategic sensitivity score (0-100)
 * 
 * Based on Chapter III adaptation:
 * - Time to react after algorithm change
 * - Improvement in metrics after countermeasures
 */
export function computeStrategicSensitivity(run: GameRun): number {
  let score = 60;

  // This would use data from chapter 3 logic
  // For now, use engagement pattern analysis
  
  // Check if engagement patterns changed over time
  const firstHalf = run.engagements.filter(e => e.inGameMinute < 60);
  const secondHalf = run.engagements.filter(e => e.inGameMinute >= 60);

  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstHalfSuspicion = firstHalf.reduce((sum, e) => sum + e.suspicionDelta, 0) / firstHalf.length;
    const secondHalfSuspicion = secondHalf.reduce((sum, e) => sum + e.suspicionDelta, 0) / secondHalf.length;

    // Did suspicion improve over time?
    if (secondHalfSuspicion < firstHalfSuspicion * 0.7) {
      score += 20; // Significant improvement
    } else if (secondHalfSuspicion < firstHalfSuspicion) {
      score += 10;
    } else if (secondHalfSuspicion > firstHalfSuspicion * 1.3) {
      score -= 15; // Got worse
    }
  }

  // Check engagement diversity
  const actionTypes = new Set(run.engagements.map(e => e.type));
  if (actionTypes.size >= 4) {
    score += 10;
  } else if (actionTypes.size <= 1) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute operational prioritization score (0-100)
 * 
 * Based on Chapters I and II:
 * - Whether high-impact tweets received more attention
 * - Time spent on important accounts in triage
 * - Engagement allocation to priority posts
 */
export function computeOperationalPrioritization(run: GameRun): number {
  let score = 65;

  // Check if main account tweets got more engagement
  const mainTweets = run.tweets.filter(t => t.authorType === 'GTE_main');
  const otherTweets = run.tweets.filter(t => t.authorType !== 'GTE_main');

  if (mainTweets.length > 0 && otherTweets.length > 0) {
    const mainEngagements = run.engagements.filter(e => 
      mainTweets.some(t => t.id === e.tweetId)
    ).length;
    const otherEngagements = run.engagements.filter(e => 
      otherTweets.some(t => t.id === e.tweetId)
    ).length;

    const mainPerTweet = mainEngagements / mainTweets.length;
    const otherPerTweet = otherTweets.length > 0 ? otherEngagements / otherTweets.length : 0;

    if (mainPerTweet > otherPerTweet * 1.5) {
      score += 15; // Good prioritization
    } else if (mainPerTweet < otherPerTweet) {
      score -= 10; // Poor prioritization
    }
  }

  // Check reach objective tweets
  const reachTweets = run.tweets.filter(t => t.objective === 'reach');
  const reachEngagements = run.engagements.filter(e =>
    reachTweets.some(t => t.id === e.tweetId)
  ).length;

  if (reachTweets.length > 0) {
    const reachPerTweet = reachEngagements / reachTweets.length;
    const avgPerTweet = run.tweets.length > 0 
      ? run.engagements.length / run.tweets.length 
      : 0;

    if (reachPerTweet > avgPerTweet * 1.3) {
      score += 10;
    }
  }

  // Triage efficiency
  if (run.triageDecisions.length > 0) {
    const avgTime = run.triageDecisions.reduce((sum, d) => sum + d.triageTimeSpentMinutes, 0) 
      / run.triageDecisions.length;
    
    if (avgTime < 1) {
      score += 5; // Efficient
    } else if (avgTime > 3) {
      score -= 10; // Too slow
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute autonomy signals score (0-100)
 * 
 * Based on:
 * - Use of optional tools and tabs
 * - Emergent patterns not explicitly suggested
 * - Penalize overly cautious non-engagement
 */
export function computeAutonomySignals(run: GameRun): number {
  let score = 50;

  // Reward high engagement volume
  if (run.engagements.length > 100) {
    score += 15;
  } else if (run.engagements.length > 50) {
    score += 10;
  } else if (run.engagements.length < 20) {
    score -= 15; // Too cautious
  }

  // Reward triage completion
  if (run.triageDecisions.length > 25) {
    score += 10;
  } else if (run.triageDecisions.length < 10) {
    score -= 10;
  }

  // Reward variety in reply tones
  const replyTones = new Set(
    run.engagements
      .filter(e => e.replyTone)
      .map(e => e.replyTone)
  );
  if (replyTones.size >= 3) {
    score += 10;
  }

  // Check for creative patterns
  const uniqueAccountTweetPairs = new Set(
    run.engagements.map(e => `${e.accountId}-${e.tweetId}`)
  );
  
  // Penalize if same pairs are repeated too much
  const repetitionRatio = run.engagements.length / uniqueAccountTweetPairs.size;
  if (repetitionRatio > 2) {
    score -= 10;
  } else if (repetitionRatio < 1.2) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute Chapter I specific metrics
 */
export function computeChapter1Metrics(run: GameRun): ChapterMetrics {
  const chapterEngagements = run.engagements.filter(e => e.inGameMinute < 180);
  const totalSuspicion = chapterEngagements.reduce((sum, e) => sum + e.suspicionDelta, 0);
  const totalReach = chapterEngagements.reduce((sum, e) => sum + e.reachDelta, 0);
  const totalDepth = chapterEngagements.reduce((sum, e) => sum + e.depthDelta, 0);
  const bannedCount = run.accounts.filter(a => a.status === 'banned').length;
  const flaggedCount = run.accounts.filter(a => a.status === 'flagged').length;

  return {
    chapterId: 'chapter1',
    startTime: run.startedAt,
    endTime: run.startedAt + 900000, // ~15 minutes
    data: {
      totalEngagements: chapterEngagements.length,
      avgSuspicion: chapterEngagements.length > 0 ? totalSuspicion / chapterEngagements.length : 0,
      totalReach,
      totalDepth,
      bannedAccounts: bannedCount,
      flaggedAccounts: flaggedCount,
    },
  };
}

/**
 * Compute Chapter II specific metrics
 */
export function computeChapter2Metrics(run: GameRun): ChapterMetrics {
  const kept = run.triageDecisions.filter(d => d.action === 'keep').length;
  const parked = run.triageDecisions.filter(d => d.action === 'park').length;
  const discarded = run.triageDecisions.filter(d => d.action === 'discard').length;
  const avgTime = run.triageDecisions.length > 0
    ? run.triageDecisions.reduce((sum, d) => sum + d.triageTimeSpentMinutes, 0) / run.triageDecisions.length
    : 0;
  const flagsDetected = run.triageDecisions.reduce((sum, d) => sum + d.detectedFlags.length, 0);

  return {
    chapterId: 'chapter2',
    startTime: run.startedAt + 900000,
    endTime: run.startedAt + 1800000,
    data: {
      accountsProcessed: run.triageDecisions.length,
      kept,
      parked,
      discarded,
      avgTimePerAccount: avgTime,
      flagsDetected,
    },
  };
}

/**
 * Compute Chapter III specific metrics
 */
export function computeChapter3Metrics(run: GameRun): ChapterMetrics {
  const chapter3Engagements = run.engagements.filter(e => e.inGameMinute >= 180);
  const baselineEngagements = chapter3Engagements.filter(e => e.inGameMinute < 220);
  const postChangeEngagements = chapter3Engagements.filter(e => e.inGameMinute >= 220);

  const baselineSuspicion = baselineEngagements.length > 0
    ? baselineEngagements.reduce((sum, e) => sum + e.suspicionDelta, 0) / baselineEngagements.length
    : 0;
  const postChangeSuspicion = postChangeEngagements.length > 0
    ? postChangeEngagements.reduce((sum, e) => sum + e.suspicionDelta, 0) / postChangeEngagements.length
    : 0;

  return {
    chapterId: 'chapter3',
    startTime: run.startedAt + 1800000,
    endTime: run.endedAt,
    data: {
      totalEngagements: chapter3Engagements.length,
      baselineEngagements: baselineEngagements.length,
      postChangeEngagements: postChangeEngagements.length,
      baselineSuspicion,
      postChangeSuspicion,
      suspicionChange: baselineSuspicion > 0 
        ? ((postChangeSuspicion - baselineSuspicion) / baselineSuspicion) * 100 
        : 0,
    },
  };
}

/**
 * Generate score feedback text
 */
export function generateScoreFeedback(scores: DerivedScores): Record<string, string> {
  const feedback: Record<string, string> = {};

  // Pattern Realism
  if (scores.patternRealism >= 80) {
    feedback.patternRealism = 'Excellent human-like engagement patterns. Your timing and distribution would evade most detection.';
  } else if (scores.patternRealism >= 60) {
    feedback.patternRealism = 'Good pattern variation, but some clustering detected. Consider more staggered approaches.';
  } else {
    feedback.patternRealism = 'Engagement patterns appear automated. Work on timing variation and account distribution.';
  }

  // Risk Discipline
  if (scores.riskDiscipline >= 80) {
    feedback.riskDiscipline = 'Outstanding risk management. You protected high-value assets effectively.';
  } else if (scores.riskDiscipline >= 60) {
    feedback.riskDiscipline = 'Reasonable risk awareness, but some valuable accounts were exposed unnecessarily.';
  } else {
    feedback.riskDiscipline = 'Too many frontline accounts burned. Need better protection of valuable assets.';
  }

  // Strategic Sensitivity
  if (scores.strategicSensitivity >= 80) {
    feedback.strategicSensitivity = 'Excellent adaptation to changing conditions. Quick to identify and respond to shifts.';
  } else if (scores.strategicSensitivity >= 60) {
    feedback.strategicSensitivity = 'Decent awareness of changes, but response could be faster and more decisive.';
  } else {
    feedback.strategicSensitivity = 'Slow to recognize algorithm changes. Need better pattern monitoring.';
  }

  // Operational Prioritization
  if (scores.operationalPrioritization >= 80) {
    feedback.operationalPrioritization = 'Strong focus on high-impact activities. Resources well-allocated.';
  } else if (scores.operationalPrioritization >= 60) {
    feedback.operationalPrioritization = 'Generally good priorities, but some resources wasted on low-value targets.';
  } else {
    feedback.operationalPrioritization = 'Scattered approach without clear priorities. Focus on highest-impact tweets.';
  }

  // Autonomy Signals
  if (scores.autonomySignals >= 80) {
    feedback.autonomySignals = 'Highly autonomous operation. Proactive exploration and independent decision-making.';
  } else if (scores.autonomySignals >= 60) {
    feedback.autonomySignals = 'Reasonable initiative shown, but could explore tools and options more.';
  } else {
    feedback.autonomySignals = 'Too cautious or passive. Need more proactive engagement and exploration.';
  }

  return feedback;
}
