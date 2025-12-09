import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IScene } from '../core/Game';
import type { GameState } from '../core/GameState';
import type { Account, SimTweet, EngagementActionType } from '../core/types';
import { generateAccounts, generateTweets } from '../data/generators';
import { 
  initChapter1, 
  updateChapter1, 
} from '../systems/chapter1Logic';
import {
  scheduleEngagement,
  scheduleEngagementWave,
  getSystemNotices,
  hasAccountEngagedTweet,
} from '../systems/engagementSystem';
import { Tutorial, getChapter1Tutorial } from '../ui/components/Tutorial';
import { ToastManager, showEngagementToast, showToast } from '../ui/components/Toast';
import { Sound } from '../core/SoundManager';

/**
 * Chapter1Scene - Swarm Orchestration
 * Now with real-time engagement feedback, toasts, and sounds!
 */
export class Chapter1Scene implements IScene {
  public readonly container: Container;
  private readonly app: Application;
  private readonly state: GameState;

  // Layout
  private screenWidth: number = 1280;
  private screenHeight: number = 720;
  private rightPanelWidth: number = 360;
  private headerHeight: number = 60;
  private tweetSectionHeight: number = 200;

  // UI Containers
  private headerBar!: Container;
  private tweetTimeline!: Container;
  private accountGrid!: Container;
  private rightPanel!: Container;
  private queueDisplayPanel!: Container;
  private queueDisplayHeight: number = 80;

  // State
  private selectedTweet: SimTweet | null = null;
  private selectedAccounts: Set<string> = new Set();
  private tweetCards: Map<string, Container> = new Map();
  private accountCards: Map<string, Container> = new Map();
  
  // Engagement queue - toggle multiple actions before submitting
  private queuedActions: Set<EngagementActionType> = new Set();
  private actionToggleButtons: Map<EngagementActionType, { container: Container; bg: Graphics; text: Text }> = new Map();
  private submitButton: Container | null = null;
  private queuePreviewText: Text | null = null;
  
  // Track previous metrics for change detection
  private previousMetrics: Map<string, { imp: number; depth: number; likes: number; rts: number; replies: number }> = new Map();

  // UI Elements
  private suspicionBar!: Graphics;
  private suspicionText!: Text;
  private timeText!: Text;
  private noticesText!: Text;
  private selectedInfoText!: Text;
  private objectivesText!: Text;
  private scoreText!: Text;
  
  // Tooltip
  private tooltip!: Container;
  private tooltipBg!: Graphics;
  private tooltipText!: Text;

  // Scoring targets
  private readonly TARGET_REACH = 50000;
  private readonly TARGET_DEPTH = 100;
  private readonly MAX_SUSPICION = 60;

  // Chapter timing
  private chapterDuration = 180;
  private isComplete = false;
  private tutorial: Tutorial | null = null;

  constructor(app: Application, state: GameState) {
    this.app = app;
    this.state = state;
    this.container = new Container();
    this.screenWidth = app.screen.width;
    this.screenHeight = app.screen.height;
    this.calculateLayout();
  }

  public init(): void {
    if (this.state.accounts.length === 0) {
      this.state.accounts = generateAccounts(36);
    }
    if (this.state.tweets.length === 0) {
      // More tweets = more targets to engage with
      // Since each account can only like/rt/reply once per tweet,
      // we need enough tweets to hit the score targets
      this.state.tweets = generateTweets(12);
    }
    
    // Store initial metrics
    this.state.tweets.forEach(t => {
      this.previousMetrics.set(t.id, {
        imp: t.liveMetrics.impressions,
        depth: t.liveMetrics.depthScore,
        likes: t.liveMetrics.likes || 0,
        rts: t.liveMetrics.retweets || 0,
        replies: t.liveMetrics.replies || 0,
      });
    });
    
    initChapter1(this.state);
    this.buildUI();
    
    // Setup toast manager
    ToastManager.getInstance().setContainer(this.container, this.screenWidth, this.screenHeight);
    
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    this.showTutorial();
  }

  private calculateLayout(): void {
    this.screenWidth = this.app.screen.width;
    this.screenHeight = this.app.screen.height;
    this.rightPanelWidth = this.screenWidth < 1200 ? 320 : 380;
  }

  private handleResize = (): void => {
    this.calculateLayout();
    this.rebuildUI();
  };

  private rebuildUI(): void {
    this.container.removeChildren();
    this.tweetCards.clear();
    this.accountCards.clear();
    this.actionToggleButtons.clear();
    this.queuedActions.clear();
    this.buildUI();
    ToastManager.getInstance().setContainer(this.container, this.screenWidth, this.screenHeight);
    if (this.tutorial) this.container.addChild(this.tutorial);
  }

  private buildUI(): void {
    this.buildHeaderBar();
    this.buildTweetTimeline();
    this.buildAccountGrid();
    this.buildRightPanel();
    this.buildQueueDisplay();
    this.buildTooltip();
  }

  private buildTooltip(): void {
    this.tooltip = new Container();
    this.tooltip.visible = false;
    this.tooltip.zIndex = 1000;

    this.tooltipBg = new Graphics();
    this.tooltip.addChild(this.tooltipBg);

    this.tooltipText = new Text('', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 220,
      lineHeight: 16,
    }));
    this.tooltipText.position.set(10, 8);
    this.tooltip.addChild(this.tooltipText);

    this.container.addChild(this.tooltip);
  }

  private showTooltip(text: string, x: number, y: number): void {
    this.tooltipText.text = text;
    
    const padding = 10;
    const width = Math.min(240, this.tooltipText.width + padding * 2);
    const height = this.tooltipText.height + padding * 2;

    this.tooltipBg.clear();
    this.tooltipBg.beginFill(0x1a1a2e, 0.95);
    this.tooltipBg.lineStyle(1, 0x4dabf7, 0.8);
    this.tooltipBg.drawRoundedRect(0, 0, width, height, 6);
    this.tooltipBg.endFill();

    // Position tooltip - keep on screen
    let posX = x + 10;
    let posY = y - height - 5;
    if (posX + width > this.screenWidth) posX = this.screenWidth - width - 10;
    if (posY < 0) posY = y + 20;

    this.tooltip.position.set(posX, posY);
    this.tooltip.visible = true;
  }

  private hideTooltip(): void {
    this.tooltip.visible = false;
  }

  private buildHeaderBar(): void {
    this.headerBar = new Container();

    const bg = new Graphics();
    bg.beginFill(0x16161e);
    bg.drawRect(0, 0, this.screenWidth, this.headerHeight);
    bg.endFill();
    this.headerBar.addChild(bg);

    const border = new Graphics();
    border.beginFill(0x4dabf7);
    border.drawRect(0, this.headerHeight - 3, this.screenWidth, 3);
    border.endFill();
    this.headerBar.addChild(border);

    const title = new Text('CHAPTER I: SWARM ORCHESTRATION', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0x4dabf7,
      letterSpacing: 2,
    }));
    title.position.set(24, (this.headerHeight - title.height) / 2);
    this.headerBar.addChild(title);

    this.timeText = new Text('0:00 / 3:00', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xffffff,
    }));
    this.timeText.anchor.set(1, 0.5);
    this.timeText.position.set(this.screenWidth - 24, this.headerHeight / 2);
    this.headerBar.addChild(this.timeText);

    this.container.addChild(this.headerBar);
  }

  private buildTweetTimeline(): void {
    const mainWidth = this.screenWidth - this.rightPanelWidth;
    
    this.tweetTimeline = new Container();
    this.tweetTimeline.position.set(0, this.headerHeight);

    const bg = new Graphics();
    bg.beginFill(0x0e0e14);
    bg.drawRect(0, 0, mainWidth, this.tweetSectionHeight);
    bg.endFill();
    this.tweetTimeline.addChild(bg);

    const label = new Text('TARGET TWEETS - Click to select, engage to boost metrics', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0x888888,
      letterSpacing: 1,
    }));
    label.position.set(20, 14);
    this.tweetTimeline.addChild(label);

    const cardContainer = new Container();
    cardContainer.position.set(20, 44);
    this.tweetTimeline.addChild(cardContainer);

    const cardWidth = 220;
    const cardHeight = 140;
    const gap = 12;
    
    this.state.tweets.forEach((tweet, i) => {
      const card = this.createTweetCard(tweet, cardWidth, cardHeight);
      card.position.set(i * (cardWidth + gap), 0);
      cardContainer.addChild(card);
      this.tweetCards.set(tweet.id, card);
    });

    this.container.addChild(this.tweetTimeline);
  }

  private buildAccountGrid(): void {
    const mainWidth = this.screenWidth - this.rightPanelWidth;
    const gridTop = this.headerHeight + this.tweetSectionHeight;
    const gridHeight = this.screenHeight - gridTop - this.queueDisplayHeight;

    this.accountGrid = new Container();
    this.accountGrid.position.set(0, gridTop);

    const bg = new Graphics();
    bg.beginFill(0x0a0a0f);
    bg.drawRect(0, 0, mainWidth, gridHeight);
    bg.endFill();
    this.accountGrid.addChild(bg);

    const headerBg = new Graphics();
    headerBg.beginFill(0x0e0e14);
    headerBg.drawRect(0, 0, mainWidth, 40);
    headerBg.endFill();
    this.accountGrid.addChild(headerBg);

    const label = new Text('YOUR ACCOUNT FLEET - Click to select multiple', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0x888888,
      letterSpacing: 1,
    }));
    label.position.set(20, 11);
    this.accountGrid.addChild(label);

    const cardWidth = 170;
    const cardHeight = 65;
    const gapX = 10;
    const gapY = 8;
    const padding = 20;
    const availableWidth = mainWidth - padding * 2;
    const cols = Math.max(1, Math.floor((availableWidth + gapX) / (cardWidth + gapX)));

    const cardContainer = new Container();
    cardContainer.position.set(padding, 50);
    this.accountGrid.addChild(cardContainer);

    this.state.accounts.forEach((account, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const card = this.createAccountCard(account, cardWidth, cardHeight);
      card.position.set(col * (cardWidth + gapX), row * (cardHeight + gapY));
      cardContainer.addChild(card);
      this.accountCards.set(account.id, card);
    });

    this.container.addChild(this.accountGrid);
  }

  private createTweetCard(tweet: SimTweet, width: number, height: number): Container {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(0x1c1c28);
    bg.lineStyle(2, 0x2e2e3e);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    card.addChild(bg);

    const authorColors: Record<string, number> = {
      'GTE_main': 0x4dabf7,
      'affiliate': 0x51cf66,
      'team_member': 0xffc078
    };
    const authorColor = authorColors[tweet.authorType] || 0xffffff;

    // Author indicator
    const dot = new Graphics();
    dot.beginFill(authorColor);
    dot.drawCircle(14, 14, 6);
    dot.endFill();
    card.addChild(dot);

    const authorText = new Text(tweet.authorType.replace('_', ' ').toUpperCase(), new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fontWeight: 'bold',
      fill: authorColor,
      letterSpacing: 1
    }));
    authorText.position.set(26, 8);
    card.addChild(authorText);

    // Objective badge
    const objBadge = new Graphics();
    objBadge.beginFill(0x333344);
    objBadge.drawRoundedRect(8, 30, width - 16, 20, 4);
    objBadge.endFill();
    card.addChild(objBadge);

    const objText = new Text(tweet.objective.toUpperCase(), new TextStyle({
      fontFamily: 'Arial',
      fontSize: 9,
      fontWeight: 'bold',
      fill: 0xaaaaaa,
      letterSpacing: 1
    }));
    objText.position.set(width / 2, 40);
    objText.anchor.set(0.5);
    card.addChild(objText);

    // Main metrics row
    const impText = new Text(`📊 ${this.formatNumber(tweet.liveMetrics.impressions)}`, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xffffff
    }));
    impText.position.set(12, 58);
    impText.name = 'impressions';
    card.addChild(impText);

    const depthText = new Text(`💬 ${tweet.liveMetrics.depthScore}`, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xffffff
    }));
    depthText.position.set(120, 58);
    depthText.name = 'depth';
    card.addChild(depthText);

    // Engagement counts row - this shows your impact!
    const engBg = new Graphics();
    engBg.beginFill(0x252538);
    engBg.drawRoundedRect(8, 82, width - 16, 28, 4);
    engBg.endFill();
    card.addChild(engBg);

    const likes = tweet.liveMetrics.likes || 0;
    const rts = tweet.liveMetrics.retweets || 0;
    const replies = tweet.liveMetrics.replies || 0;
    const quotes = tweet.liveMetrics.quotes || 0;

    const engText = new Text(`❤️ ${likes}   🔄 ${rts}   💬 ${replies}   📝 ${quotes}`, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0xcccccc
    }));
    engText.position.set(width / 2, 96);
    engText.anchor.set(0.5);
    engText.name = 'engagements';
    card.addChild(engText);

    // Time
    const timeText = new Text(`${Math.floor(tweet.liveMetrics.timeSincePostMinutes)}m ago`, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0x666666
    }));
    timeText.position.set(12, 118);
    card.addChild(timeText);

    // Interactions
    card.on('pointerdown', () => {
      Sound.playClick();
      this.selectTweet(tweet, width, height);
    });
    card.on('pointerover', () => {
      if (this.selectedTweet?.id !== tweet.id) {
        bg.clear();
        bg.beginFill(0x252538);
        bg.lineStyle(2, 0x3e3e4e);
        bg.drawRoundedRect(0, 0, width, height, 8);
        bg.endFill();
      }
    });
    card.on('pointerout', () => {
      if (this.selectedTweet?.id !== tweet.id) {
        bg.clear();
        bg.beginFill(0x1c1c28);
        bg.lineStyle(2, 0x2e2e3e);
        bg.drawRoundedRect(0, 0, width, height, 8);
        bg.endFill();
      }
    });

    return card;
  }

  private createAccountCard(account: Account, width: number, height: number): Container {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const bg = new Graphics();
    this.drawAccountBg(bg, account, false, width, height);
    card.addChild(bg);

    const riskColors: Record<string, number> = {
      'frontline': 0xffd43b,
      'mid': 0x4dabf7,
      'background': 0x666666
    };
    const riskBar = new Graphics();
    riskBar.beginFill(riskColors[account.riskClass]);
    riskBar.drawRoundedRect(0, 0, 4, height, 2);
    riskBar.endFill();
    card.addChild(riskBar);

    const statusColors: Record<string, number> = {
      'active': 0x51cf66,
      'flagged': 0xffc078,
      'banned': 0xff6b6b,
      'parked': 0x748ffc,
      'discarded': 0x555555
    };
    const statusDot = new Graphics();
    statusDot.beginFill(statusColors[account.status]);
    statusDot.drawCircle(width - 12, 12, 5);
    statusDot.endFill();
    card.addChild(statusDot);

    const handleText = new Text(`@${account.profile.handle.slice(0, 13)}`, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: account.status === 'active' ? 0xffffff : 0x666666
    }));
    handleText.position.set(12, 10);
    card.addChild(handleText);

    const statsText = new Text(`${this.formatNumber(account.followers)} · ${account.riskClass.charAt(0).toUpperCase()}`, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0x999999
    }));
    statsText.position.set(12, 32);
    card.addChild(statsText);

    const tags = Object.entries(account.persona).filter(([, v]) => v).slice(0, 2);
    if (tags.length > 0) {
      const tagText = new Text(tags.map(([k]) => k).join(' · '), new TextStyle({
        fontFamily: 'Arial',
        fontSize: 9,
        fill: 0x666666
      }));
      tagText.position.set(12, 48);
      card.addChild(tagText);
    }

    card.on('pointerdown', (e) => {
      this.toggleAccountSelection(account, e.shiftKey, width, height);
    });
    card.on('pointerover', () => {
      if (!this.selectedAccounts.has(account.id) && account.status === 'active') {
        bg.clear();
        this.drawAccountBg(bg, account, false, width, height, true);
      }
    });
    card.on('pointerout', () => {
      if (!this.selectedAccounts.has(account.id)) {
        bg.clear();
        this.drawAccountBg(bg, account, false, width, height, false);
      }
    });

    return card;
  }

  private drawAccountBg(bg: Graphics, account: Account, selected: boolean, width: number, height: number, hover: boolean = false): void {
    const isBanned = account.status === 'banned';
    const isInactive = account.status !== 'active';
    let fillColor = 0x18181f;
    let strokeColor = 0x2a2a3a;
    
    if (isBanned) {
      // Red styling for banned accounts
      fillColor = 0x2a1010;
      strokeColor = 0xff6b6b;
    } else if (isInactive) {
      fillColor = 0x101014;
      strokeColor = 0x1a1a24;
    } else if (selected) {
      fillColor = 0x1a2a3a;
      strokeColor = 0x4dabf7;
    } else if (hover) {
      fillColor = 0x1e1e2a;
      strokeColor = 0x3a3a4a;
    }
    
    bg.beginFill(fillColor);
    bg.lineStyle(isBanned ? 2 : (selected ? 2 : 1), strokeColor);
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
  }

  private buildRightPanel(): void {
    this.rightPanel = new Container();
    this.rightPanel.position.set(this.screenWidth - this.rightPanelWidth, this.headerHeight);

    const panelHeight = this.screenHeight - this.headerHeight;
    const padding = 20;
    const innerWidth = this.rightPanelWidth - padding * 2;

    const bg = new Graphics();
    bg.beginFill(0x101018);
    bg.drawRect(0, 0, this.rightPanelWidth, panelHeight);
    bg.endFill();
    this.rightPanel.addChild(bg);

    const border = new Graphics();
    border.beginFill(0x2a2a3a);
    border.drawRect(0, 0, 2, panelHeight);
    border.endFill();
    this.rightPanel.addChild(border);

    let yPos = padding;

    // ========== OBJECTIVES (with tooltips) ==========
    const objHeader = new Text('🎯 OBJECTIVES (hover for info)', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0x51cf66,
      letterSpacing: 1
    }));
    objHeader.position.set(padding, yPos);
    this.rightPanel.addChild(objHeader);

    yPos += 26;

    // Individual objective rows with tooltips
    const objectives = [
      { 
        label: '📊 Reach', 
        tooltip: 'REACH = Total impressions across all tweets.\n\nEach engagement adds reach:\n• Like: +5 base\n• Reply: +20 base\n• Retweet: +50 base\n• Quote: +30 base\n\nFrontline accounts give 3x reach.\nFresher tweets = more impact.',
        getValue: () => `${this.formatNumber(this.state.tweets.reduce((s, t) => s + t.liveMetrics.impressions, 0))} / ${this.formatNumber(this.TARGET_REACH)}`
      },
      { 
        label: '💬 Depth', 
        tooltip: 'DEPTH = Quality of engagement.\n\nReplies and quotes add depth:\n• High-signal CT reply: +5\n• Technical critique: +4\n• Quote tweet: +3\n• Normie question: +2\n• Retweet: +1\n\nDepth shows genuine community building.',
        getValue: () => `${this.state.tweets.reduce((s, t) => s + t.liveMetrics.depthScore, 0)} / ${this.TARGET_DEPTH}`
      },
      { 
        label: '⚠️ Suspicion', 
        tooltip: 'SUSPICION = Platform detection risk.\n\nKeep under 60 to avoid penalties!\n\n• 40+: Warning\n• 60+: Accounts get flagged\n• 80+: Accounts get BANNED\n\nSuspicion decays slowly over time.\nSee Algorithm Rules below.',
        getValue: () => `${Math.floor(this.state.suspicionMeter)} / ${this.MAX_SUSPICION} (max)`
      }
    ];

    objectives.forEach((obj, i) => {
      const row = new Container();
      row.position.set(padding, yPos + i * 24);
      row.eventMode = 'static';
      row.cursor = 'help';

      const rowBg = new Graphics();
      rowBg.beginFill(0x1a1a24, 0.01); // Nearly invisible but captures events
      rowBg.drawRect(-4, -2, innerWidth + 8, 22);
      rowBg.endFill();
      row.addChild(rowBg);

      const text = new Text(`${obj.label}: ${obj.getValue()}`, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xcccccc,
      }));
      text.name = `obj_${i}`;
      row.addChild(text);

      row.on('pointerover', (e) => {
        rowBg.clear();
        rowBg.beginFill(0x2a2a3a, 0.5);
        rowBg.drawRect(-4, -2, innerWidth + 8, 22);
        rowBg.endFill();
        this.showTooltip(obj.tooltip, e.global.x, e.global.y);
      });
      row.on('pointermove', (e) => {
        this.showTooltip(obj.tooltip, e.global.x, e.global.y);
      });
      row.on('pointerout', () => {
        rowBg.clear();
        rowBg.beginFill(0x1a1a24, 0.01);
        rowBg.drawRect(-4, -2, innerWidth + 8, 22);
        rowBg.endFill();
        this.hideTooltip();
      });

      this.rightPanel.addChild(row);
    });

    // Store for updates
    this.objectivesText = new Text('', new TextStyle({ fontSize: 1, fill: 0x000000 }));
    this.objectivesText.visible = false;
    this.objectivesText.name = 'objectivesPlaceholder';
    this.rightPanel.addChild(this.objectivesText);

    yPos += 80;

    this.scoreText = new Text('SCORE: 0', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xffd43b
    }));
    this.scoreText.position.set(padding, yPos);
    this.rightPanel.addChild(this.scoreText);

    yPos += 32;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== SUSPICION ==========
    const suspicionHeader = new Text('SUSPICION LEVEL', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0x888888,
      letterSpacing: 1
    }));
    suspicionHeader.position.set(padding, yPos);
    this.rightPanel.addChild(suspicionHeader);

    this.suspicionText = new Text('0', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xffffff
    }));
    this.suspicionText.anchor.set(1, 0);
    this.suspicionText.position.set(this.rightPanelWidth - padding, yPos);
    this.rightPanel.addChild(this.suspicionText);

    yPos += 26;

    const barBg = new Graphics();
    barBg.beginFill(0x1a1a24);
    barBg.drawRoundedRect(padding, yPos, innerWidth, 14, 7);
    barBg.endFill();
    this.rightPanel.addChild(barBg);

    this.suspicionBar = new Graphics();
    this.rightPanel.addChild(this.suspicionBar);

    yPos += 30;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 16;

    // ========== ENGAGEMENT ==========
    const engHeader = new Text('ENGAGEMENT PLANNER', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0x888888,
      letterSpacing: 1
    }));
    engHeader.position.set(padding, yPos);
    this.rightPanel.addChild(engHeader);

    yPos += 28;

    this.selectedInfoText = new Text('Select a tweet and accounts to engage', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xaaaaaa,
      wordWrap: true,
      wordWrapWidth: innerWidth
    }));
    this.selectedInfoText.position.set(padding, yPos);
    this.rightPanel.addChild(this.selectedInfoText);

    yPos += 48;

    // Action toggle buttons - select multiple before submitting
    const btnGap = 8;
    const btnWidth = (innerWidth - btnGap) / 2;
    const btnHeight = 40;

    const actions: [string, EngagementActionType, number][] = [
      ['👍 LIKE', 'like', 0x51cf66],
      ['💬 REPLY', 'reply', 0x4dabf7],
      ['🔄 RT', 'retweet', 0xffc078],
      ['📝 QUOTE', 'quote', 0x9775fa]
    ];

    actions.forEach(([label, type, color], i) => {
      const toggleBtn = this.createToggleButton(label, type, color, btnWidth, btnHeight);
      toggleBtn.container.position.set(
        padding + (i % 2) * (btnWidth + btnGap),
        yPos + Math.floor(i / 2) * (btnHeight + btnGap)
      );
      this.rightPanel.addChild(toggleBtn.container);
      this.actionToggleButtons.set(type, toggleBtn);
    });

    yPos += 2 * (btnHeight + btnGap) + 10;

    // Queue preview text
    this.queuePreviewText = new Text('Select actions to queue...', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0x888888,
      fontStyle: 'italic',
    }));
    this.queuePreviewText.position.set(padding, yPos);
    this.rightPanel.addChild(this.queuePreviewText);

    yPos += 24;

    // Submit/Deploy button
    this.submitButton = this.createSubmitButton('⚡ DEPLOY ORDER', innerWidth, 44);
    this.submitButton.position.set(padding, yPos);
    this.submitButton.on('pointerdown', () => this.executeQueuedEngagements());
    this.rightPanel.addChild(this.submitButton);

    yPos += 56;

    // Pattern buttons
    const patternLabel = new Text('PATTERNS (automated timing)', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0x666666,
      letterSpacing: 1
    }));
    patternLabel.position.set(padding, yPos);
    this.rightPanel.addChild(patternLabel);

    yPos += 24;

    const patterns: [string, 'burst' | 'staggered' | 'slowBurn'][] = [
      ['⚡ Burst', 'burst'],
      ['📈 Stagger', 'staggered'],
      ['🐢 Slow', 'slowBurn']
    ];
    const patBtnWidth = (innerWidth - 2 * btnGap) / 3;

    patterns.forEach(([label, pattern], i) => {
      const btn = this.createButton(label, 0x666666, patBtnWidth, 34);
      btn.position.set(padding + i * (patBtnWidth + btnGap), yPos);
      btn.on('pointerdown', () => this.executePattern(pattern));
      this.rightPanel.addChild(btn);
    });

    yPos += 50;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== ALGORITHM RULES ==========
    const rulesHeader = new Text('📋 ALGORITHM RULES', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fontWeight: 'bold',
      fill: 0xff922b,
      letterSpacing: 1
    }));
    rulesHeader.position.set(padding, yPos);
    this.rightPanel.addChild(rulesHeader);

    yPos += 20;

    // Rules content - compact display
    const rulesContent = new Container();
    rulesContent.position.set(padding, yPos);
    this.rightPanel.addChild(rulesContent);

    const ruleItems = [
      { icon: '❤️', label: 'Like', value: '+0.5 sus', color: 0x51cf66 },
      { icon: '🔄', label: 'RT', value: '+1.0 sus', color: 0xffc078 },
      { icon: '💬', label: 'Reply', value: '+1.5 sus', color: 0x4dabf7 },
      { icon: '📝', label: 'Quote', value: '+2.0 sus', color: 0x9775fa },
    ];

    // First row - action costs
    ruleItems.forEach((item, i) => {
      const col = i % 4;
      const itemWidth = (innerWidth - 12) / 4;
      
      const text = new Text(`${item.icon}${item.value}`, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 9,
        fill: item.color,
      }));
      text.position.set(col * itemWidth, 0);
      rulesContent.addChild(text);
    });

    yPos += 18;

    // Penalty rules
    const penaltyRules = [
      { text: '⚡ Burst (>5 same tweet/5min): +1.5 sus', color: 0xff6b6b },
      { text: '🔁 Repeat (same author often): +1.0 sus', color: 0xffc078 },
      { text: '⭐ Frontline overuse (>3/30min): +1.0 sus', color: 0xffd43b },
    ];

    penaltyRules.forEach((rule, i) => {
      const ruleText = new Text(rule.text, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 9,
        fill: rule.color,
      }));
      ruleText.position.set(padding, yPos + i * 14);
      this.rightPanel.addChild(ruleText);
    });

    yPos += 44;

    // Threshold warnings
    const thresholdBg = new Graphics();
    thresholdBg.beginFill(0x1a1a24);
    thresholdBg.drawRoundedRect(padding, yPos, innerWidth, 36, 4);
    thresholdBg.endFill();
    this.rightPanel.addChild(thresholdBg);

    const thresholdText = new Text('THRESHOLDS: 40=⚠️ Warning  60=🟠 Flags  80=🔴 Bans', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 9,
      fill: 0xcccccc,
      wordWrap: true,
      wordWrapWidth: innerWidth - 12,
      lineHeight: 14,
    }));
    thresholdText.position.set(padding + 6, yPos + 6);
    this.rightPanel.addChild(thresholdText);

    const decayText = new Text('📉 Suspicion decays -0.5/min naturally', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 9,
      fill: 0x51cf66,
    }));
    decayText.position.set(padding + 6, yPos + 22);
    this.rightPanel.addChild(decayText);

    yPos += 46;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== NOTICES ==========
    const noticesHeader = new Text('SYSTEM NOTICES', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0x888888,
      letterSpacing: 1
    }));
    noticesHeader.position.set(padding, yPos);
    this.rightPanel.addChild(noticesHeader);

    yPos += 26;

    this.noticesText = new Text('Ready to engage...', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0x666666,
      wordWrap: true,
      wordWrapWidth: innerWidth,
      lineHeight: 20
    }));
    this.noticesText.position.set(padding, yPos);
    this.rightPanel.addChild(this.noticesText);

    this.container.addChild(this.rightPanel);
  }

  private buildQueueDisplay(): void {
    const mainWidth = this.screenWidth - this.rightPanelWidth;
    const queueTop = this.screenHeight - this.queueDisplayHeight;
    
    this.queueDisplayPanel = new Container();
    this.queueDisplayPanel.position.set(0, queueTop);

    // Background
    const bg = new Graphics();
    bg.beginFill(0x12121a);
    bg.lineStyle(1, 0x2a2a3a, 1, 0);
    bg.drawRect(0, 0, mainWidth, this.queueDisplayHeight);
    bg.endFill();
    this.queueDisplayPanel.addChild(bg);

    // Top border accent
    const topBorder = new Graphics();
    topBorder.beginFill(0x4dabf7, 0.5);
    topBorder.drawRect(0, 0, mainWidth, 2);
    topBorder.endFill();
    this.queueDisplayPanel.addChild(topBorder);

    // Header
    const header = new Text('⏳ PENDING QUEUE', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fontWeight: 'bold',
      fill: 0x4dabf7,
      letterSpacing: 1,
    }));
    header.position.set(16, 8);
    this.queueDisplayPanel.addChild(header);

    // Queue items container (will be populated in updateQueueDisplay)
    const queueItemsContainer = new Container();
    queueItemsContainer.name = 'queueItems';
    queueItemsContainer.position.set(16, 28);
    this.queueDisplayPanel.addChild(queueItemsContainer);

    // Empty state text
    const emptyText = new Text('No engagements queued. Select accounts and actions, then deploy!', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0x555555,
      fontStyle: 'italic',
    }));
    emptyText.name = 'emptyText';
    emptyText.position.set(16, 32);
    this.queueDisplayPanel.addChild(emptyText);

    this.container.addChild(this.queueDisplayPanel);
  }

  private updateQueueDisplay(): void {
    if (!this.queueDisplayPanel) return;

    const queueItemsContainer = this.queueDisplayPanel.children.find(c => c.name === 'queueItems') as Container;
    const emptyText = this.queueDisplayPanel.children.find(c => c.name === 'emptyText') as Text;
    
    if (!queueItemsContainer) return;

    // Clear existing items
    queueItemsContainer.removeChildren();

    const queue = this.state.engagementQueue;
    const currentMinute = Math.floor(this.state.inGameMinutes);

    if (queue.length === 0) {
      if (emptyText) emptyText.visible = true;
      return;
    }

    if (emptyText) emptyText.visible = false;

    // Group by action type for cleaner display
    const actionGroups: Map<EngagementActionType, { accounts: string[]; tweetId: string; minute: number }[]> = new Map();
    
    for (const item of queue) {
      const account = this.state.accounts.find(a => a.id === item.accountId);
      if (!account) continue;

      const key = item.type;
      if (!actionGroups.has(key)) {
        actionGroups.set(key, []);
      }
      
      // Group by tweet and minute
      const group = actionGroups.get(key)!;
      let existingGroup = group.find(g => g.tweetId === item.tweetId && g.minute === item.scheduledMinute);
      if (!existingGroup) {
        existingGroup = { accounts: [], tweetId: item.tweetId, minute: item.scheduledMinute };
        group.push(existingGroup);
      }
      existingGroup.accounts.push(`@${account.profile.handle.slice(0, 8)}`);
    }

    const actionIcons: Record<string, string> = {
      like: '❤️',
      retweet: '🔄',
      reply: '💬',
      quote: '📝',
      profileVisit: '👁️',
    };

    const actionColors: Record<string, number> = {
      like: 0x51cf66,
      retweet: 0xffc078,
      reply: 0x4dabf7,
      quote: 0x9775fa,
      profileVisit: 0x888888,
    };

    let xOffset = 0;
    const maxWidth = this.screenWidth - this.rightPanelWidth - 32;
    const itemGap = 12;

    // Create compact queue items
    actionGroups.forEach((groups, actionType) => {
      for (const group of groups) {
        if (xOffset > maxWidth - 150) break; // Don't overflow

        const tweet = this.state.tweets.find(t => t.id === group.tweetId);
        const tweetLabel = tweet ? tweet.authorType.replace('_', ' ').slice(0, 6) : '???';
        const accountCount = group.accounts.length;
        const minutesUntil = group.minute - currentMinute;
        const timeLabel = minutesUntil <= 0 ? 'now' : `${minutesUntil}m`;

        // Create item container
        const itemContainer = new Container();
        itemContainer.position.set(xOffset, 0);

        // Item background
        const itemBg = new Graphics();
        const itemWidth = 140;
        itemBg.beginFill(actionColors[actionType], 0.15);
        itemBg.lineStyle(1, actionColors[actionType], 0.4);
        itemBg.drawRoundedRect(0, 0, itemWidth, 42, 4);
        itemBg.endFill();
        itemContainer.addChild(itemBg);

        // Action icon and count
        const actionText = new Text(`${actionIcons[actionType]} ${accountCount}x ${actionType}`, new TextStyle({
          fontFamily: 'Arial',
          fontSize: 11,
          fontWeight: 'bold',
          fill: actionColors[actionType],
        }));
        actionText.position.set(6, 4);
        itemContainer.addChild(actionText);

        // Target and timing
        const detailText = new Text(`→ ${tweetLabel} (${timeLabel})`, new TextStyle({
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0x888888,
        }));
        detailText.position.set(6, 22);
        itemContainer.addChild(detailText);

        queueItemsContainer.addChild(itemContainer);
        xOffset += itemWidth + itemGap;
      }
    });

    // Show overflow indicator if needed
    if (queue.length > 0 && xOffset > maxWidth - 50) {
      const moreText = new Text(`+${queue.length} more...`, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0x666666,
        fontStyle: 'italic',
      }));
      moreText.position.set(xOffset, 14);
      queueItemsContainer.addChild(moreText);
    }
  }

  private addDivider(y: number, width: number, padding: number): void {
    const divider = new Graphics();
    divider.beginFill(0x2a2a3a);
    divider.drawRect(padding, y, width, 1);
    divider.endFill();
    this.rightPanel.addChild(divider);
  }

  private createButton(label: string, color: number, width: number, height: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(color, 0.18);
    bg.lineStyle(2, color, 0.6);
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
    btn.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 13,
      fontWeight: 'bold',
      fill: color
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    btn.addChild(text);

    btn.on('pointerover', () => {
      bg.clear();
      bg.beginFill(color, 0.35);
      bg.lineStyle(2, color, 1);
      bg.drawRoundedRect(0, 0, width, height, 6);
      bg.endFill();
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.beginFill(color, 0.18);
      bg.lineStyle(2, color, 0.6);
      bg.drawRoundedRect(0, 0, width, height, 6);
      bg.endFill();
    });

    return btn;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  private selectTweet(tweet: SimTweet, width: number, height: number): void {
    if (this.selectedTweet) {
      const prevCard = this.tweetCards.get(this.selectedTweet.id);
      if (prevCard) {
        const bg = prevCard.getChildAt(0) as Graphics;
        bg.clear();
        bg.beginFill(0x1c1c28);
        bg.lineStyle(2, 0x2e2e3e);
        bg.drawRoundedRect(0, 0, width, height, 8);
        bg.endFill();
      }
    }

    this.selectedTweet = tweet;
    const card = this.tweetCards.get(tweet.id);
    if (card) {
      const bg = card.getChildAt(0) as Graphics;
      bg.clear();
      bg.beginFill(0x1a2a3a);
      bg.lineStyle(3, 0x4dabf7);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
    }
    this.updateSelectedInfo();
  }

  private toggleAccountSelection(account: Account, _multiSelect: boolean, width: number, height: number): void {
    if (account.status !== 'active') {
      showToast(`@${account.profile.handle} is ${account.status}`, 'warning', '⚠️');
      Sound.playError();
      return;
    }

    // Always additive/toggle behavior (no single-select mode)
    if (this.selectedAccounts.has(account.id)) {
      this.selectedAccounts.delete(account.id);
      const card = this.accountCards.get(account.id);
      if (card) {
        const bg = card.getChildAt(0) as Graphics;
        bg.clear();
        this.drawAccountBg(bg, account, false, width, height);
      }
      Sound.playToggle(false);
    } else {
      this.selectedAccounts.add(account.id);
      const card = this.accountCards.get(account.id);
      if (card) {
        const bg = card.getChildAt(0) as Graphics;
        bg.clear();
        this.drawAccountBg(bg, account, true, width, height);
      }
      Sound.playToggle(true);
    }
    this.updateSelectedInfo();
  }

  private updateSelectedInfo(): void {
    const count = this.selectedAccounts.size;
    const tweetInfo = this.selectedTweet
      ? `Tweet: ${this.selectedTweet.authorType.replace('_', ' ')}`
      : 'No tweet selected';
    const accountInfo = count > 0
      ? `\n${count} account${count > 1 ? 's' : ''} selected`
      : '\nNo accounts selected';
    this.selectedInfoText.text = tweetInfo + accountInfo;
  }

  private createToggleButton(label: string, type: EngagementActionType, color: number, width: number, height: number): { container: Container; bg: Graphics; text: Text } {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(color, 0.1);
    bg.lineStyle(2, color, 0.4);
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
    container.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 13,
      fontWeight: 'bold',
      fill: color,
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    container.addChild(text);

    container.on('pointerdown', () => {
      this.toggleAction(type);
      Sound.playToggle(this.queuedActions.has(type));
    });

    container.on('pointerover', () => {
      if (!this.queuedActions.has(type)) {
        bg.clear();
        bg.beginFill(color, 0.2);
        bg.lineStyle(2, color, 0.6);
        bg.drawRoundedRect(0, 0, width, height, 6);
        bg.endFill();
      }
    });

    container.on('pointerout', () => {
      if (!this.queuedActions.has(type)) {
        bg.clear();
        bg.beginFill(color, 0.1);
        bg.lineStyle(2, color, 0.4);
        bg.drawRoundedRect(0, 0, width, height, 6);
        bg.endFill();
      }
    });

    return { container, bg, text };
  }

  private toggleAction(type: EngagementActionType): void {
    const colors: Record<EngagementActionType, number> = {
      like: 0x51cf66,
      reply: 0x4dabf7,
      retweet: 0xffc078,
      quote: 0x9775fa,
      profileVisit: 0x888888,
    };
    const color = colors[type];
    const btnData = this.actionToggleButtons.get(type);
    if (!btnData) return;

    const { bg, text } = btnData;
    const btnWidth = (this.rightPanelWidth - 40 - 8) / 2;
    const btnHeight = 40;

    if (this.queuedActions.has(type)) {
      // Deselect
      this.queuedActions.delete(type);
      bg.clear();
      bg.beginFill(color, 0.1);
      bg.lineStyle(2, color, 0.4);
      bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 6);
      bg.endFill();
      text.style.fill = color;
    } else {
      // Select
      this.queuedActions.add(type);
      bg.clear();
      bg.beginFill(color, 0.5);
      bg.lineStyle(3, color, 1);
      bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 6);
      bg.endFill();
      text.style.fill = 0xffffff;
    }

    this.updateQueuePreview();
  }

  private updateQueuePreview(): void {
    if (!this.queuePreviewText) return;

    if (this.queuedActions.size === 0) {
      this.queuePreviewText.text = 'Select actions to queue...';
      this.queuePreviewText.style.fill = 0x888888;
    } else {
      const actionNames: Record<EngagementActionType, string> = {
        like: '👍 Like',
        reply: '💬 Reply', 
        retweet: '🔄 RT',
        quote: '📝 Quote',
        profileVisit: '👁️ Visit',
      };
      const queued = Array.from(this.queuedActions).map(a => actionNames[a]).join(' + ');
      this.queuePreviewText.text = `Queued: ${queued}`;
      this.queuePreviewText.style.fill = 0xffd43b;
    }
  }

  private createSubmitButton(label: string, width: number, height: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(0xffd43b, 0.15);
    bg.lineStyle(2, 0xffd43b, 0.6);
    bg.drawRoundedRect(0, 0, width, height, 8);
    bg.endFill();
    btn.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 15,
      fontWeight: 'bold',
      fill: 0xffd43b,
      letterSpacing: 2,
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    btn.addChild(text);

    btn.on('pointerover', () => {
      bg.clear();
      bg.beginFill(0xffd43b, 0.35);
      bg.lineStyle(3, 0xffd43b, 1);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
    });

    btn.on('pointerout', () => {
      bg.clear();
      bg.beginFill(0xffd43b, 0.15);
      bg.lineStyle(2, 0xffd43b, 0.6);
      bg.drawRoundedRect(0, 0, width, height, 8);
      bg.endFill();
    });

    return btn;
  }

  private executeQueuedEngagements(): void {
    if (!this.selectedTweet) {
      showToast('Select a tweet first', 'warning', '📢');
      Sound.playError();
      return;
    }
    if (this.selectedAccounts.size === 0) {
      showToast('Select at least one account', 'warning', '👤');
      Sound.playError();
      return;
    }
    if (this.queuedActions.size === 0) {
      showToast('Toggle at least one action (Like, RT, etc.)', 'warning', '⚡');
      Sound.playError();
      return;
    }

    const currentMinute = Math.floor(this.state.inGameMinutes) + 1;
    let totalScheduled = 0;
    let duplicatesSkipped = 0;
    const actionCounts: Record<string, number> = {};

    // Schedule all queued actions for all selected accounts
    this.queuedActions.forEach(actionType => {
      let scheduled = 0;
      this.selectedAccounts.forEach(accountId => {
        const account = this.state.accounts.find(a => a.id === accountId);
        if (!account) return;
        
        // Check if this would be a duplicate
        if (hasAccountEngagedTweet(this.state, accountId, this.selectedTweet!.id, actionType)) {
          duplicatesSkipped++;
          return;
        }
        
        if (scheduleEngagement(this.state, accountId, this.selectedTweet!.id, actionType, currentMinute)) {
          scheduled++;
          showEngagementToast(actionType, this.selectedTweet!.authorType, account.profile.handle);
        }
      });
      actionCounts[actionType] = scheduled;
      totalScheduled += scheduled;
    });

    // Show feedback
    if (totalScheduled > 0) {
      Sound.playSuccess();
      const actionSummary = Object.entries(actionCounts)
        .filter(([, count]) => count > 0)
        .map(([action, count]) => `${count} ${action}${count > 1 ? 's' : ''}`)
        .join(', ');
      showToast(`Order deployed!`, 'success', '⚡', `${actionSummary} scheduled`);
    } else if (duplicatesSkipped > 0) {
      Sound.playError();
      showToast(`Already engaged!`, 'warning', '🔄', `${duplicatesSkipped} duplicate action(s) skipped`);
    }

    // Clear the queue and selection
    this.clearQueue();
    this.clearSelection();
  }

  private clearQueue(): void {
    const colors: Record<EngagementActionType, number> = {
      like: 0x51cf66,
      reply: 0x4dabf7,
      retweet: 0xffc078,
      quote: 0x9775fa,
      profileVisit: 0x888888,
    };
    const btnWidth = (this.rightPanelWidth - 40 - 8) / 2;
    const btnHeight = 40;

    this.queuedActions.forEach(type => {
      const btnData = this.actionToggleButtons.get(type);
      if (btnData) {
        const color = colors[type];
        btnData.bg.clear();
        btnData.bg.beginFill(color, 0.1);
        btnData.bg.lineStyle(2, color, 0.4);
        btnData.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 6);
        btnData.bg.endFill();
        btnData.text.style.fill = color;
      }
    });
    
    this.queuedActions.clear();
    this.updateQueuePreview();
  }

  private executePattern(pattern: 'burst' | 'staggered' | 'slowBurn'): void {
    if (!this.selectedTweet) {
      showToast('Select a tweet first', 'warning', '📢');
      Sound.playError();
      return;
    }
    if (this.selectedAccounts.size === 0) {
      showToast('Select at least one account', 'warning', '👤');
      Sound.playError();
      return;
    }
    
    const currentMinute = Math.floor(this.state.inGameMinutes) + 1;
    // Filter out accounts that have already engaged this tweet with these actions
    const accountIds = Array.from(this.selectedAccounts).filter(accountId => {
      const alreadyLiked = hasAccountEngagedTweet(this.state, accountId, this.selectedTweet!.id, 'like');
      const alreadyRTd = hasAccountEngagedTweet(this.state, accountId, this.selectedTweet!.id, 'retweet');
      // Include account if it hasn't done BOTH actions
      return !alreadyLiked || !alreadyRTd;
    });
    
    if (accountIds.length === 0) {
      showToast('All selected accounts already engaged!', 'warning', '🔄');
      Sound.playError();
      return;
    }
    
    // Schedule both likes and retweets with the pattern
    const likesScheduled = scheduleEngagementWave(this.state, accountIds, this.selectedTweet.id, 'like', pattern, currentMinute);
    const rtsScheduled = scheduleEngagementWave(this.state, accountIds, this.selectedTweet.id, 'retweet', pattern, currentMinute);
    const totalScheduled = likesScheduled + rtsScheduled;
    
    if (totalScheduled > 0) {
      Sound.playSuccess();
      const patternNames = { burst: 'Burst', staggered: 'Staggered', slowBurn: 'Slow Burn' };
      showToast(`${patternNames[pattern]} pattern scheduled`, 'success', '⚡', `${likesScheduled} likes + ${rtsScheduled} RTs across ${accountIds.length} accounts`);
    } else {
      Sound.playError();
      showToast('No new engagements to schedule', 'warning', '🔄');
    }
    
    this.clearSelection();
  }

  private clearSelection(): void {
    const width = 170;
    const height = 65;
    
    this.selectedAccounts.forEach(id => {
      const card = this.accountCards.get(id);
      const acc = this.state.accounts.find(a => a.id === id);
      if (card && acc) {
        const bg = card.getChildAt(0) as Graphics;
        bg.clear();
        this.drawAccountBg(bg, acc, false, width, height);
      }
    });
    this.selectedAccounts.clear();
    this.updateSelectedInfo();
  }

  private updateTweetCards(): void {
    // Update tweet card displays with latest metrics
    this.state.tweets.forEach(tweet => {
      const card = this.tweetCards.get(tweet.id);
      if (!card) return;

      // Find text elements by name
      const impText = card.children.find(c => c.name === 'impressions') as Text;
      const depthText = card.children.find(c => c.name === 'depth') as Text;
      const engText = card.children.find(c => c.name === 'engagements') as Text;

      if (impText) {
        impText.text = `📊 ${this.formatNumber(tweet.liveMetrics.impressions)}`;
      }
      if (depthText) {
        depthText.text = `💬 ${tweet.liveMetrics.depthScore}`;
      }
      if (engText) {
        const likes = tweet.liveMetrics.likes || 0;
        const rts = tweet.liveMetrics.retweets || 0;
        const replies = tweet.liveMetrics.replies || 0;
        const quotes = tweet.liveMetrics.quotes || 0;
        engText.text = `❤️ ${likes}   🔄 ${rts}   💬 ${replies}   📝 ${quotes}`;
      }

      // Check for metric changes and show feedback
      const prev = this.previousMetrics.get(tweet.id);
      if (prev) {
        const currentLikes = tweet.liveMetrics.likes || 0;
        const currentRts = tweet.liveMetrics.retweets || 0;
        const currentReplies = tweet.liveMetrics.replies || 0;
        
        if (currentLikes > prev.likes || currentRts > prev.rts || currentReplies > prev.replies) {
          // Flash the engagement background
          const engBg = card.children.find(c => c instanceof Graphics && (c as any)._fillStyle?.color === 0x252538) as Graphics;
          if (engBg) {
            engBg.clear();
            engBg.beginFill(0x2a4a3a);
            engBg.drawRoundedRect(8, 82, 220 - 16, 28, 4);
            engBg.endFill();
            
            // Reset after flash
            setTimeout(() => {
              engBg.clear();
              engBg.beginFill(0x252538);
              engBg.drawRoundedRect(8, 82, 220 - 16, 28, 4);
              engBg.endFill();
            }, 300);
          }
          
          Sound.playMetricUp();
        }
        
        // Update previous metrics
        this.previousMetrics.set(tweet.id, {
          imp: tweet.liveMetrics.impressions,
          depth: tweet.liveMetrics.depthScore,
          likes: currentLikes,
          rts: currentRts,
          replies: currentReplies,
        });
      }
    });
  }

  public update(deltaMs: number): void {
    if (this.isComplete) return;
    
    const result = updateChapter1(this.state, deltaMs);
    
    // Show notices as toasts
    result.notices.forEach(notice => {
      if (notice.includes('banned') || notice.includes('flagged')) {
        showToast(notice, 'error', '🚨');
        Sound.playWarning();
      } else if (notice.includes('skipped')) {
        showToast(notice, 'warning', '⏭️');
      }
    });
    
    // Update toast manager
    ToastManager.getInstance().update();
    
    if (this.state.inGameMinutes >= this.chapterDuration) {
      this.isComplete = true;
      Sound.playSuccess();
      showToast('Chapter Complete!', 'success', '🎉');
      setTimeout(() => this.state.advanceToNextScene(), 2000);
      return;
    }

    // Update timer
    const minutes = Math.floor(this.state.inGameMinutes);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    this.timeText.text = `${hours}:${mins.toString().padStart(2, '0')} / 3:00`;

    // Update suspicion
    const suspicion = this.state.suspicionMeter;
    this.suspicionText.text = Math.floor(suspicion).toString();
    
    const padding = 20;
    const innerWidth = this.rightPanelWidth - padding * 2;
    const barY = padding + 30 + 90 + 40 + 16 + 26;
    
    this.suspicionBar.clear();
    const barWidth = Math.max(0, (suspicion / 100) * innerWidth);
    let color = 0x51cf66;
    if (suspicion >= 80) color = 0xff6b6b;
    else if (suspicion >= 60) color = 0xff922b;
    else if (suspicion >= 40) color = 0xffd43b;
    
    if (barWidth > 0) {
      this.suspicionBar.beginFill(color);
      this.suspicionBar.drawRoundedRect(padding, barY, barWidth, 14, 7);
      this.suspicionBar.endFill();
    }

    // Update objectives (find and update the individual rows)
    const totalReach = this.state.tweets.reduce((sum, t) => sum + t.liveMetrics.impressions, 0);
    const totalDepth = this.state.tweets.reduce((sum, t) => sum + t.liveMetrics.depthScore, 0);
    
    const reachIcon = totalReach >= this.TARGET_REACH ? '✅' : '📊';
    const depthIcon = totalDepth >= this.TARGET_DEPTH ? '✅' : '💬';
    const suspicionIcon = suspicion <= this.MAX_SUSPICION ? '✅' : '❌';
    
    // Update individual objective row texts
    this.rightPanel.children.forEach(child => {
      if (child instanceof Container) {
        const obj0 = child.children.find(c => c.name === 'obj_0') as Text;
        const obj1 = child.children.find(c => c.name === 'obj_1') as Text;
        const obj2 = child.children.find(c => c.name === 'obj_2') as Text;
        if (obj0) obj0.text = `${reachIcon} Reach: ${this.formatNumber(totalReach)} / ${this.formatNumber(this.TARGET_REACH)}`;
        if (obj1) obj1.text = `${depthIcon} Depth: ${totalDepth} / ${this.TARGET_DEPTH}`;
        if (obj2) obj2.text = `${suspicionIcon} Suspicion: ${Math.floor(suspicion)} / ${this.MAX_SUSPICION}`;
      }
    });

    // Calculate score
    const reachScore = Math.min(100, (totalReach / this.TARGET_REACH) * 100);
    const depthScore = Math.min(100, (totalDepth / this.TARGET_DEPTH) * 100);
    const suspicionPenalty = Math.max(0, suspicion - this.MAX_SUSPICION) * 2;
    const score = Math.max(0, Math.round((reachScore * 0.4 + depthScore * 0.4 + (100 - suspicion) * 0.2) - suspicionPenalty));
    this.scoreText.text = `SCORE: ${score}`;

    // Update notices
    const notices = getSystemNotices(this.state, 3);
    if (notices.length > 0) {
      this.noticesText.text = notices.map(n => `• ${n}`).join('\n');
      this.noticesText.style.fill = 0xffc078;
    } else {
      this.noticesText.text = 'Ready to engage...';
      this.noticesText.style.fill = 0x666666;
    }
    
    // Update tweet card displays
    this.updateTweetCards();
    
    // Update queue display
    this.updateQueueDisplay();
  }

  private showTutorial(): void {
    const steps = getChapter1Tutorial(this.screenWidth, this.screenHeight);
    this.tutorial = new Tutorial(
      this.screenWidth,
      this.screenHeight,
      steps,
      () => this.closeTutorial(),
      () => this.closeTutorial()
    );
    this.container.addChild(this.tutorial);
  }

  private closeTutorial(): void {
    if (this.tutorial) {
      this.container.removeChild(this.tutorial);
      this.tutorial.destroy();
      this.tutorial = null;
    }
    Sound.playSuccess();
    showToast('Tutorial complete! Start engaging.', 'info', '🚀');
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      this.clearSelection();
    } else if (event.code === 'KeyN') {
      this.state.advanceToNextScene();
    }
  };

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    ToastManager.getInstance().clear();
    this.container.destroy({ children: true });
  }
}
