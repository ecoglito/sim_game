import type {
  Account,
  AccountPersonaTags,
  AccountProfile,
  AccountRiskClass,
  AccountStatus,
  SimTweet,
} from '../core/types';

// ============================================================================
// Data Generators - Create realistic mock data for the simulation
// ============================================================================

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sage', 'River', 'Phoenix', 'Dakota', 'Skyler', 'Reese', 'Finley', 'Rowan',
  'Charlie', 'Blake', 'Hayden', 'Emerson', 'Kai', 'Zion', 'Nova', 'Atlas',
];

const LAST_NAMES = [
  'Chen', 'Smith', 'Nakamoto', 'Patel', 'Kim', 'Garcia', 'Müller', 'Sato',
  'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor',
];

const HANDLES_PREFIXES = [
  'crypto', 'defi', 'nft', 'web3', 'based', 'anon', 'dev', 'builder',
  'trade', 'alpha', 'sigma', 'chad', 'ser', 'fren', 'gm', 'wagmi',
];

const HANDLES_SUFFIXES = [
  '_eth', '.sol', '_xyz', '420', '69', '_dao', 'maxi', '_fi',
  'labs', 'cap', '_gg', 'verse', 'punk', '', '', '',
];

const BIOS = [
  'building stuff | not financial advice',
  'anon dev | shipping code daily',
  'defi degen | aping responsibly',
  'nft collector | gm',
  'crypto twitter native | here for the tech',
  'full time shitposter | part time trader',
  'on-chain analyst | data driven',
  'builder | angel investor | coffee addict',
  'ex-tradfi | now full crypto',
  'governance enthusiast | delegate',
  'research | alpha hunting',
  'memes > fundamentals',
  'long term holder | short term vibes',
  'protocol politics enjoyer',
  'making it | slowly',
];

const LOCATIONS = [
  'San Francisco, CA', 'New York, NY', 'Miami, FL', 'Austin, TX',
  'London, UK', 'Singapore', 'Dubai, UAE', 'Lisbon, Portugal',
  'Berlin, Germany', 'Tokyo, Japan', 'Seoul, Korea', 'Sydney, Australia',
  'Toronto, Canada', 'Zug, Switzerland', 'Cayman Islands', '',
];

const HISTORY_FLAGS = {
  severe: [
    'past_political_spam',
    'past_crypto_scam',
    'pump_dump_participation',
    'fake_giveaway_history',
    'mass_dm_spam',
  ],
  moderate: [
    'bottish_follower_pattern',
    'low_quality_followers',
    'engagement_farming_detected',
    'suspicious_follow_ratio',
    'bulk_unfollows',
  ],
  mild: [
    'inactive_period_30d',
    'retweet_heavy_profile',
    'limited_original_content',
    'new_account_rapid_growth',
  ],
};

const TWEET_TOPICS = [
  ['defi', 'governance', 'dao'],
  ['nft', 'art', 'pfp'],
  ['trading', 'alpha', 'ta'],
  ['meme', 'culture', 'drama'],
  ['protocol', 'launch', 'airdrop'],
  ['security', 'audit', 'hack'],
  ['L2', 'scaling', 'rollup'],
  ['staking', 'yield', 'farming'],
];

const TWEET_STUBS = [
  'Just shipped a major update to our protocol. Thread on what changed 🧵',
  'The market structure is shifting. Here\'s what I\'m watching...',
  'Governance proposal going live tomorrow. Important vote incoming.',
  'New partnership announcement coming soon. Bullish.',
  'Unpopular opinion: most L2s are just expensive databases',
  'Alpha leak: major protocol is about to announce something big',
  'Built different. Shipping daily. Wagmi.',
  'The real opportunity is in [redacted]. NFA.',
  'Airdrop farming guide for the next cycle 🧵',
  'Why I\'m bullish on this sector despite the FUD',
];

// ============================================================================
// Generator Functions
// ============================================================================

let accountIdCounter = 0;
let tweetIdCounter = 0;

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateHandle(): string {
  const prefix = randomChoice(HANDLES_PREFIXES);
  const suffix = randomChoice(HANDLES_SUFFIXES);
  const num = Math.random() > 0.5 ? randomInt(1, 999).toString() : '';
  return `${prefix}${num}${suffix}`;
}

function generatePersonaTags(): AccountPersonaTags {
  return {
    defi: Math.random() > 0.6,
    nft: Math.random() > 0.7,
    gaming: Math.random() > 0.85,
    normie: Math.random() > 0.8,
    builder: Math.random() > 0.7,
    trader: Math.random() > 0.6,
    femaleAnon: Math.random() > 0.85,
    devAnon: Math.random() > 0.75,
  };
}

function generateProfile(): AccountProfile {
  const firstName = randomChoice(FIRST_NAMES);
  const lastName = randomChoice(LAST_NAMES);
  const useRealName = Math.random() > 0.7;

  return {
    displayName: useRealName ? `${firstName} ${lastName}` : generateHandle(),
    handle: generateHandle(),
    bio: randomChoice(BIOS),
    location: randomChoice(LOCATIONS),
    language: 'en',
    pfpType: randomChoice(['anon', 'anon', 'realistic', 'meme'] as const),
    bannerType: randomChoice(['generic', 'crypto', 'landscape', 'none'] as const),
    pinnedType: randomChoice(['thread', 'meme', 'valuePost', 'none'] as const),
  };
}

function generateHistoryFlags(): string[] {
  const flags: string[] = [];
  
  // 15% chance of severe flag
  if (Math.random() < 0.15) {
    flags.push(randomChoice(HISTORY_FLAGS.severe));
  }
  
  // 30% chance of moderate flag
  if (Math.random() < 0.30) {
    flags.push(randomChoice(HISTORY_FLAGS.moderate));
  }
  
  // 40% chance of mild flag
  if (Math.random() < 0.40) {
    flags.push(randomChoice(HISTORY_FLAGS.mild));
  }
  
  return flags;
}

export function generateAccount(riskClassOverride?: AccountRiskClass): Account {
  accountIdCounter++;
  
  const historyFlags = generateHistoryFlags();
  const hasSevereFlags = historyFlags.some(f => HISTORY_FLAGS.severe.includes(f));
  
  // Calculate hidden ban risk based on flags
  let hiddenBanRiskScore = randomFloat(0.05, 0.2);
  if (hasSevereFlags) {
    hiddenBanRiskScore += randomFloat(0.3, 0.5);
  }
  if (historyFlags.length > 1) {
    hiddenBanRiskScore += 0.1 * historyFlags.length;
  }
  hiddenBanRiskScore = Math.min(1, hiddenBanRiskScore);

  // Determine risk class
  let riskClass: AccountRiskClass = riskClassOverride || 'mid';
  if (!riskClassOverride) {
    const roll = Math.random();
    if (roll < 0.2) riskClass = 'frontline';
    else if (roll < 0.6) riskClass = 'mid';
    else riskClass = 'background';
  }

  // Followers based on risk class
  let followers: number;
  switch (riskClass) {
    case 'frontline':
      followers = randomInt(5000, 50000);
      break;
    case 'mid':
      followers = randomInt(500, 5000);
      break;
    case 'background':
      followers = randomInt(50, 500);
      break;
  }

  return {
    id: `acc_${accountIdCounter}`,
    ageDays: randomInt(30, 1500),
    followers,
    region: randomChoice(['US', 'EU', 'Asia', 'LatAm', 'Other'] as const),
    langPrimary: randomChoice(['en', 'en', 'en', 'es', 'pt', 'other'] as const),
    riskClass,
    status: 'active' as AccountStatus,
    persona: generatePersonaTags(),
    profile: generateProfile(),
    historyFlags,
    hiddenBanRiskScore,
  };
}

export function generateAccounts(count: number): Account[] {
  const accounts: Account[] = [];
  
  // Ensure good distribution of risk classes
  const frontlineCount = Math.floor(count * 0.15);
  const midCount = Math.floor(count * 0.45);
  const backgroundCount = count - frontlineCount - midCount;

  for (let i = 0; i < frontlineCount; i++) {
    accounts.push(generateAccount('frontline'));
  }
  for (let i = 0; i < midCount; i++) {
    accounts.push(generateAccount('mid'));
  }
  for (let i = 0; i < backgroundCount; i++) {
    accounts.push(generateAccount('background'));
  }

  // Shuffle
  return accounts.sort(() => Math.random() - 0.5);
}

export function generateTweet(timeSincePostMinutes: number = 0): SimTweet {
  tweetIdCounter++;

  const objective = randomChoice(['reach', 'depth', 'reputationRepair', 'partnerSupport'] as const);
  const authorType = randomChoice(['GTE_main', 'GTE_main', 'affiliate', 'team_member'] as const);
  
  // Base metrics depend on author type - kept low so player impact is visible
  let baseReach: number;
  let baseDepth: number;
  
  switch (authorType) {
    case 'GTE_main':
      baseReach = randomInt(2000, 8000);
      baseDepth = randomInt(20, 60);
      break;
    case 'affiliate':
      baseReach = randomInt(500, 2000);
      baseDepth = randomInt(10, 30);
      break;
    case 'team_member':
      baseReach = randomInt(200, 800);
      baseDepth = randomInt(5, 20);
      break;
  }

  return {
    id: `tweet_${tweetIdCounter}`,
    authorType,
    topicTags: randomChoice(TWEET_TOPICS),
    targetAudience: randomChoice(['ct_core', 'normie', 'builders', 'partners'] as const),
    objective,
    baseOrganicReach: baseReach,
    baseOrganicDepth: baseDepth,
    liveMetrics: {
      // Start with very low metrics - player actions will build them up
      impressions: Math.floor(baseReach * randomFloat(0.05, 0.15)),
      depthScore: Math.floor(baseDepth * randomFloat(0.1, 0.2)),
      likes: randomInt(2, 15),
      retweets: randomInt(0, 5),
      replies: randomInt(0, 3),
      quotes: 0,
      timeSincePostMinutes,
    },
  };
}

export function generateTweets(count: number): SimTweet[] {
  const tweets: SimTweet[] = [];
  
  for (let i = 0; i < count; i++) {
    // Stagger tweet times
    const timeSincePost = randomInt(0, 60);
    tweets.push(generateTweet(timeSincePost));
  }

  // Sort by time (newest first)
  return tweets.sort((a, b) => 
    a.liveMetrics.timeSincePostMinutes - b.liveMetrics.timeSincePostMinutes
  );
}

export function getTweetStub(): string {
  return randomChoice(TWEET_STUBS);
}

export function isSevereFlag(flag: string): boolean {
  return HISTORY_FLAGS.severe.includes(flag);
}

export function isModerateFlag(flag: string): boolean {
  return HISTORY_FLAGS.moderate.includes(flag);
}

