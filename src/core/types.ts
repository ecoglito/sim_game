// ============================================================================
// Operation Black Knights - Core Types
// All interfaces from the PRD
// ============================================================================

// --- Account Types ---

export type AccountRiskClass = "frontline" | "mid" | "background";
export type AccountStatus = "active" | "flagged" | "banned" | "parked" | "discarded";

export interface AccountPersonaTags {
  defi: boolean;
  nft: boolean;
  gaming: boolean;
  normie: boolean;
  builder: boolean;
  trader: boolean;
  femaleAnon: boolean;
  devAnon: boolean;
}

export interface AccountProfile {
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  language: string;
  pfpType: "anon" | "realistic" | "brand" | "meme";
  bannerType: "generic" | "crypto" | "landscape" | "none";
  pinnedType: "thread" | "meme" | "valuePost" | "none";
}

export interface Account {
  id: string;
  ageDays: number;
  followers: number;
  region: "US" | "EU" | "Asia" | "LatAm" | "Other";
  langPrimary: "en" | "es" | "pt" | "other";
  riskClass: AccountRiskClass;
  status: AccountStatus;
  persona: AccountPersonaTags;
  profile: AccountProfile;
  historyFlags: string[]; // e.g. ["past_political_spam", "low_quality_followers"]
  hiddenBanRiskScore: number; // 0-1 internal, not shown to player
}

// --- Tweet Types ---

export type TweetObjective = "reach" | "depth" | "reputationRepair" | "partnerSupport";

export interface SimTweet {
  id: string;
  authorType: "GTE_main" | "affiliate" | "team_member";
  topicTags: string[]; // e.g. ["defi", "governance", "drama"]
  targetAudience: "ct_core" | "normie" | "builders" | "partners";
  objective: TweetObjective;
  baseOrganicReach: number; // baseline impressions
  baseOrganicDepth: number; // baseline replies, bookmarks etc
  liveMetrics: {
    impressions: number;
    depthScore: number;
    timeSincePostMinutes: number;
    // Engagement counts for display
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
}

// --- Engagement Types ---

export type EngagementActionType = "like" | "reply" | "retweet" | "quote" | "profileVisit";

export type ReplyTone =
  | "highSignalCT"
  | "farming"
  | "normieQuestion"
  | "subtleShill"
  | "technicalCritique";

export interface EngagementAction {
  id: string;
  inGameMinute: number;
  accountId: string;
  tweetId: string;
  type: EngagementActionType;
  replyTone?: ReplyTone;
  // Computed consequences (not shown to player)
  suspicionDelta: number;
  reachDelta: number;
  depthDelta: number;
}

// Scheduled engagement (queued for future execution)
export interface ScheduledEngagement {
  accountId: string;
  tweetId: string;
  type: EngagementActionType;
  replyTone?: ReplyTone;
  scheduledMinute: number;
}

// --- Triage Types ---

export interface TriageDecision {
  accountId: string;
  action: "keep" | "park" | "discard";
  newProfile?: Partial<AccountProfile>;
  newPersona?: Partial<AccountPersonaTags>;
  newRiskClass?: AccountRiskClass;
  triageTimeSpentMinutes: number;
  detectedFlags: string[]; // what the player clicked / acknowledged
}

// --- Algorithm Types ---

export interface AlgorithmRuleSet {
  id: "baseline" | "post_change";
  // approximate weights for internal scoring
  weightClusterSynchrony: number;
  weightRepeatReplyTone: number;
  weightGeoLanguageMismatch: number;
  weightHighValueAccountOveruse: number;
}

// --- Metrics Types ---

export type ChapterId = "chapter1" | "chapter2" | "chapter3";

export interface ChapterMetrics {
  chapterId: ChapterId;
  startTime: number;
  endTime: number;
  // Chapter specific metrics defined later
  data: Record<string, number>;
}

// --- Game Run Types ---

export interface DerivedScores {
  patternRealism: number;
  riskDiscipline: number;
  strategicSensitivity: number;
  operationalPrioritization: number;
  autonomySignals: number;
}

export interface GameRun {
  runId: string;
  startedAt: number;
  endedAt: number;
  accounts: Account[];
  tweets: SimTweet[];
  engagements: EngagementAction[];
  triageDecisions: TriageDecision[];
  ruleSets: AlgorithmRuleSet[];
  chapterMetrics: ChapterMetrics[];
  derivedScores: DerivedScores;
}

// --- Telemetry Types ---

export interface TelemetryEvent {
  t: number; // timestamp
  chapterId: string;
  type: string; // "engagement_scheduled", "triage_decision", "rule_change", etc.
  payload: unknown;
}

// --- Scene Types ---

export type SceneId = "intro" | "chapter1" | "chapter2" | "chapter3" | "summary";

