import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IScene } from '../core/Game';
import type { GameState } from '../core/GameState';
import type { Account, SimTweet, EngagementActionType } from '../core/types';
import { generateAccounts, generateTweets } from '../data/generators';
import {
  initChapter3,
  updateChapter3,
  shouldTriggerRuleChange,
  applyRuleChange,
  getCountermeasureUpdatesRemaining,
  applyCountermeasure,
  getAnalyticsData,
  capturePostChangeMetrics,
  isChapterComplete,
  CountermeasureSettings,
  getCurrentPhase,
} from '../systems/chapter3Logic';
import {
  scheduleEngagement,
  scheduleEngagementWave,
  getSystemNotices,
  hasAccountEngagedTweet,
} from '../systems/engagementSystem';
import { Tutorial, getChapter3Tutorial } from '../ui/components/Tutorial';
import { ToastManager, showToast, showEngagementToast } from '../ui/components/Toast';
import { Sound } from '../core/SoundManager';

/**
 * Chapter3Scene - Algorithm Countermeasures
 * OBJECTIVE: Continue doing engagements, but detect when the algorithm changes
 * and apply countermeasures to adapt. Same mechanics as Chapter 1, with added challenge.
 */
export class Chapter3Scene implements IScene {
  public readonly container: Container;
  private readonly app: Application;
  private readonly state: GameState;

  // Layout
  private screenWidth: number = 1280;
  private screenHeight: number = 720;
  private headerHeight: number = 56;
  private rightPanelWidth: number = 320;
  private tweetSectionHeight: number = 160;

  // UI Containers
  private headerBar!: Container;
  private tweetTimeline!: Container;
  private accountGrid!: Container;
  private rightPanel!: Container;
  private analyticsOverlay!: Container;
  private queueDisplayPanel!: Container;
  private queueDisplayHeight: number = 70;

  // Tweet/Account selection (same as Chapter 1)
  private selectedTweet: SimTweet | null = null;
  private selectedAccounts: Set<string> = new Set();
  private tweetCards: Map<string, Container> = new Map();
  private accountCards: Map<string, Container> = new Map();

  // Engagement queue - toggle multiple actions before submitting
  private queuedActions: Set<EngagementActionType> = new Set();
  private actionToggleButtons: Map<EngagementActionType, { container: Container; bg: Graphics; text: Text }> = new Map();
  private submitButton: Container | null = null;
  private queuePreviewText: Text | null = null;

  // Track previous metrics for change detection (like Chapter 1)
  private previousMetrics: Map<string, { imp: number; depth: number; likes: number; rts: number; replies: number }> = new Map();

  // UI Elements
  private timeText!: Text;
  private phaseText!: Text;
  private suspicionBar!: Graphics;
  private suspicionText!: Text;
  private noticesText!: Text;
  private selectedInfoText!: Text;
  private objectivesText!: Text;
  private scoreText!: Text;
  private analyticsContent!: Text;
  private countermeasuresLeftText!: Text;
  
  // Tooltip
  private tooltip!: Container;
  private tooltipBg!: Graphics;
  private tooltipText!: Text;

  // Scoring targets
  private readonly TARGET_REACH = 30000;
  private readonly MAX_SUSPICION = 50;
  private readonly TARGET_REACTION_TIME = 30; // seconds to react to change

  // State
  private showAnalytics = false;
  private ruleChangeTime: number | null = null;
  private firstCountermeasureTime: number | null = null;
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
    // Generate fresh data for this chapter
    this.state.accounts = generateAccounts(36);
    // More tweets = more targets to engage with
    // Since each account can only like/rt/reply once per tweet,
    // we need enough tweets to hit the score targets
    this.state.tweets = generateTweets(10);

    // Store initial metrics for change detection (like Chapter 1)
    this.state.tweets.forEach(t => {
      this.previousMetrics.set(t.id, {
        imp: t.liveMetrics.impressions,
        depth: t.liveMetrics.depthScore,
        likes: t.liveMetrics.likes || 0,
        rts: t.liveMetrics.retweets || 0,
        replies: t.liveMetrics.replies || 0,
      });
    });

    // Initialize Chapter 3 (includes shared engagement system)
    initChapter3(this.state);

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
    this.rightPanelWidth = this.screenWidth < 1024 ? 300 : 340;
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
    this.buildAnalyticsOverlay();
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
      fontSize: 10,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 200,
      lineHeight: 14,
    }));
    this.tooltipText.position.set(8, 6);
    this.tooltip.addChild(this.tooltipText);

    this.container.addChild(this.tooltip);
  }

  private showTooltip(text: string, x: number, y: number): void {
    this.tooltipText.text = text;
    
    const padding = 8;
    const width = Math.min(220, this.tooltipText.width + padding * 2);
    const height = this.tooltipText.height + padding * 2;

    this.tooltipBg.clear();
    this.tooltipBg.beginFill(0x1a1a2e, 0.95);
    this.tooltipBg.lineStyle(1, 0xff6b6b, 0.8);
    this.tooltipBg.drawRoundedRect(0, 0, width, height, 5);
    this.tooltipBg.endFill();

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
    bg.beginFill(0x1a1220);
    bg.drawRect(0, 0, this.screenWidth, this.headerHeight);
    bg.endFill();
    this.headerBar.addChild(bg);

    const border = new Graphics();
    border.beginFill(0xff6b6b);
    border.drawRect(0, this.headerHeight - 2, this.screenWidth, 2);
    border.endFill();
    this.headerBar.addChild(border);

    const titleFontSize = this.screenWidth < 900 ? 14 : 18;
    const title = new Text('CHAPTER III: ALGORITHM COUNTERMEASURES', new TextStyle({
      fontFamily: 'Arial', fontSize: titleFontSize, fontWeight: 'bold', fill: 0xff6b6b, letterSpacing: 1,
    }));
    title.position.set(20, 8);
    this.headerBar.addChild(title);

    // Phase indicator (important!)
    this.phaseText = new Text('🟢 BASELINE PHASE', new TextStyle({
      fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: 0x51cf66
    }));
    this.phaseText.position.set(20, 32);
    this.headerBar.addChild(this.phaseText);

    // Time
    this.timeText = new Text('0:00 / 2:00', new TextStyle({
      fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fill: 0xffffff,
    }));
    this.timeText.anchor.set(1, 0.5);
    this.timeText.position.set(this.screenWidth - 20, this.headerHeight / 2);
    this.headerBar.addChild(this.timeText);

    this.container.addChild(this.headerBar);
  }

  private buildTweetTimeline(): void {
    const mainWidth = this.screenWidth - this.rightPanelWidth;
    
    this.tweetTimeline = new Container();
    this.tweetTimeline.position.set(0, this.headerHeight);

    const bg = new Graphics();
    bg.beginFill(0x0d0d12);
    bg.drawRect(0, 0, mainWidth, this.tweetSectionHeight);
    bg.endFill();
    this.tweetTimeline.addChild(bg);

    const label = new Text('TARGET TWEETS - Click to select, then engage with accounts below', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1,
    }));
    label.position.set(16, 10);
    this.tweetTimeline.addChild(label);

    const scrollContainer = new Container();
    scrollContainer.position.set(16, 32);
    this.tweetTimeline.addChild(scrollContainer);

    const cardWidth = 180;
    const cardHeight = 110;
    const gap = 10;
    
    this.state.tweets.forEach((tweet, i) => {
      const card = this.createTweetCard(tweet, cardWidth, cardHeight);
      card.position.set(i * (cardWidth + gap), 0);
      scrollContainer.addChild(card);
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
    bg.beginFill(0x08080c);
    bg.drawRect(0, 0, mainWidth, gridHeight);
    bg.endFill();
    this.accountGrid.addChild(bg);

    const headerBg = new Graphics();
    headerBg.beginFill(0x0d0d12);
    headerBg.drawRect(0, 0, mainWidth, 36);
    headerBg.endFill();
    this.accountGrid.addChild(headerBg);

    const label = new Text('YOUR ACCOUNTS - Click to select (Shift+click for multiple)', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1,
    }));
    label.position.set(16, 10);
    this.accountGrid.addChild(label);

    const cardWidth = 150;
    const cardHeight = 52;
    const gap = 8;
    const availableWidth = mainWidth - 32;
    const cols = Math.max(1, Math.floor((availableWidth + gap) / (cardWidth + gap)));

    const scrollContainer = new Container();
    scrollContainer.position.set(16, 44);
    this.accountGrid.addChild(scrollContainer);

    this.state.accounts.forEach((account, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const card = this.createAccountCard(account, cardWidth, cardHeight);
      card.position.set(col * (cardWidth + gap), row * (cardHeight + gap));
      scrollContainer.addChild(card);
      this.accountCards.set(account.id, card);
    });

    this.container.addChild(this.accountGrid);
  }

  private createTweetCard(tweet: SimTweet, width: number, height: number): Container {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(0x1a1a24);
    bg.lineStyle(2, 0x2a2a3a);
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
    card.addChild(bg);

    const authorColors: Record<string, number> = { 'GTE_main': 0x4dabf7, 'affiliate': 0x51cf66, 'team_member': 0xffc078 };
    const authorColor = authorColors[tweet.authorType] || 0xffffff;

    const dot = new Graphics();
    dot.beginFill(authorColor);
    dot.drawCircle(10, 12, 4);
    dot.endFill();
    card.addChild(dot);

    const authorText = new Text(tweet.authorType.replace('_', ' ').toUpperCase(), new TextStyle({
      fontFamily: 'Arial', fontSize: 9, fontWeight: 'bold', fill: authorColor, letterSpacing: 1
    }));
    authorText.position.set(20, 6);
    card.addChild(authorText);

    // Main metrics row
    const impText = new Text(`📊 ${this.formatNumber(tweet.liveMetrics.impressions)}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0xffffff
    }));
    impText.position.set(10, 28);
    impText.name = 'impressions';
    card.addChild(impText);

    const depthText = new Text(`💬 ${tweet.liveMetrics.depthScore}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0xffffff
    }));
    depthText.position.set(95, 28);
    depthText.name = 'depth';
    card.addChild(depthText);

    // Engagement counts row - shows your impact! (like Chapter 1)
    const engBg = new Graphics();
    engBg.beginFill(0x252538);
    engBg.drawRoundedRect(6, 48, width - 12, 22, 4);
    engBg.endFill();
    engBg.name = 'engBg';
    card.addChild(engBg);

    const likes = tweet.liveMetrics.likes || 0;
    const rts = tweet.liveMetrics.retweets || 0;
    const replies = tweet.liveMetrics.replies || 0;

    const engText = new Text(`❤️${likes} 🔄${rts} 💬${replies}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0xcccccc
    }));
    engText.position.set(width / 2, 59);
    engText.anchor.set(0.5);
    engText.name = 'engagements';
    card.addChild(engText);

    // Time
    const timeText = new Text(`${Math.floor(tweet.liveMetrics.timeSincePostMinutes)}m`, new TextStyle({
      fontFamily: 'Arial', fontSize: 9, fill: 0x666666
    }));
    timeText.position.set(10, 76);
    card.addChild(timeText);

    card.on('pointerdown', () => { 
      Sound.playClick(); 
      this.selectTweet(tweet, width, height); 
    });
    card.on('pointerover', () => {
      if (this.selectedTweet?.id !== tweet.id) {
        bg.clear(); bg.beginFill(0x22222e); bg.lineStyle(2, 0x3a3a4a); bg.drawRoundedRect(0, 0, width, height, 6); bg.endFill();
      }
    });
    card.on('pointerout', () => {
      if (this.selectedTweet?.id !== tweet.id) {
        bg.clear(); bg.beginFill(0x1a1a24); bg.lineStyle(2, 0x2a2a3a); bg.drawRoundedRect(0, 0, width, height, 6); bg.endFill();
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

    const riskColors: Record<string, number> = { 'frontline': 0xffd43b, 'mid': 0x4dabf7, 'background': 0x555555 };
    const riskBar = new Graphics();
    riskBar.beginFill(riskColors[account.riskClass]);
    riskBar.drawRoundedRect(0, 0, 3, height, 2);
    riskBar.endFill();
    card.addChild(riskBar);

    const statusColors: Record<string, number> = { 'active': 0x51cf66, 'flagged': 0xffc078, 'banned': 0xff6b6b, 'parked': 0x748ffc, 'discarded': 0x555555 };
    const statusDot = new Graphics();
    statusDot.beginFill(statusColors[account.status]);
    statusDot.drawCircle(width - 10, 10, 4);
    statusDot.endFill();
    card.addChild(statusDot);

    const handleText = new Text(`@${account.profile.handle.slice(0, 11)}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: account.status === 'active' ? 0xffffff : 0x666666
    }));
    handleText.position.set(10, 8);
    card.addChild(handleText);

    const statsLine = new Text(`${this.formatNumber(account.followers)} · ${account.riskClass.slice(0,1).toUpperCase()}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 9, fill: 0x888888
    }));
    statsLine.position.set(10, 26);
    card.addChild(statsLine);

    card.on('pointerdown', (e) => {
      if (account.status === 'active') {
        Sound.playToggle(!this.selectedAccounts.has(account.id));
      } else {
        Sound.playError();
      }
      this.toggleAccountSelection(account, e.shiftKey, width, height);
    });
    card.on('pointerover', () => {
      if (!this.selectedAccounts.has(account.id) && account.status === 'active') {
        bg.clear(); this.drawAccountBg(bg, account, false, width, height, true);
      }
    });
    card.on('pointerout', () => {
      if (!this.selectedAccounts.has(account.id)) {
        bg.clear(); this.drawAccountBg(bg, account, false, width, height);
      }
    });

    return card;
  }

  private drawAccountBg(bg: Graphics, account: Account, selected: boolean, width: number, height: number, hover: boolean = false): void {
    const isBanned = account.status === 'banned';
    const isInactive = account.status !== 'active';
    let fillColor = 0x14141c;
    let strokeColor = 0x2a2a3a;
    
    if (isBanned) {
      // Red styling for banned accounts
      fillColor = 0x2a1010;
      strokeColor = 0xff6b6b;
    } else if (isInactive) {
      fillColor = 0x0c0c10;
      strokeColor = 0x1a1a24;
    } else if (selected) {
      fillColor = 0x1a2a3a;
      strokeColor = 0x4dabf7;
    } else if (hover) {
      fillColor = 0x1a1a28;
      strokeColor = 0x3a3a4a;
    }
    
    bg.beginFill(fillColor);
    bg.lineStyle(isBanned ? 2 : (selected ? 2 : 1), strokeColor);
    bg.drawRoundedRect(0, 0, width, height, 5);
    bg.endFill();
  }

  private buildRightPanel(): void {
    this.rightPanel = new Container();
    this.rightPanel.position.set(this.screenWidth - this.rightPanelWidth, this.headerHeight);

    const panelHeight = this.screenHeight - this.headerHeight;
    const padding = 16;
    const innerWidth = this.rightPanelWidth - padding * 2;

    const bg = new Graphics();
    bg.beginFill(0x0d0d14);
    bg.drawRect(0, 0, this.rightPanelWidth, panelHeight);
    bg.endFill();
    this.rightPanel.addChild(bg);

    const border = new Graphics();
    border.beginFill(0x2a2a3a);
    border.drawRect(0, 0, 1, panelHeight);
    border.endFill();
    this.rightPanel.addChild(border);

    let yPos = padding;

    // ========== OBJECTIVES (with tooltips) ==========
    const objLabel = new Text('🎯 OBJECTIVES (hover)', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0xff6b6b, letterSpacing: 1
    }));
    objLabel.position.set(padding, yPos);
    this.rightPanel.addChild(objLabel);

    yPos += 18;

    // Individual objective rows with tooltips
    const ch3Objectives = [
      { 
        label: '📊 Reach', 
        tooltip: 'REACH = Total impressions.\n\nEngagements add reach based on type.\nFrontline accounts = 3x impact.',
        getValue: () => `${this.formatNumber(this.state.tweets.reduce((s, t) => s + t.liveMetrics.impressions, 0))} / ${this.formatNumber(this.TARGET_REACH)}`
      },
      { 
        label: '⚠️ Suspicion', 
        tooltip: 'SUSPICION = Detection risk.\n\nAfter algorithm change, rules get stricter!\nApply countermeasures to adapt.',
        getValue: () => `${Math.floor(this.state.suspicionMeter)} / ${this.MAX_SUSPICION}`
      },
      { 
        label: '⏱️ Reaction', 
        tooltip: 'REACTION TIME = How fast you apply countermeasures after algorithm change.\n\nFaster reaction = higher score!',
        getValue: () => 'Watch for change!'
      }
    ];

    ch3Objectives.forEach((obj, i) => {
      const row = new Container();
      row.position.set(padding, yPos + i * 18);
      row.eventMode = 'static';
      row.cursor = 'help';

      const rowBg = new Graphics();
      rowBg.beginFill(0x1a1a24, 0.01);
      rowBg.drawRect(-4, -2, innerWidth + 8, 18);
      rowBg.endFill();
      row.addChild(rowBg);

      const text = new Text(`${obj.label}: ${obj.getValue()}`, new TextStyle({
        fontFamily: 'Arial', fontSize: 10, fill: 0xaaaaaa,
      }));
      text.name = `ch3obj_${i}`;
      row.addChild(text);

      row.on('pointerover', (e) => {
        rowBg.clear(); rowBg.beginFill(0x2a2a3a, 0.5); rowBg.drawRect(-4, -2, innerWidth + 8, 18); rowBg.endFill();
        this.showTooltip(obj.tooltip, e.global.x, e.global.y);
      });
      row.on('pointermove', (e) => this.showTooltip(obj.tooltip, e.global.x, e.global.y));
      row.on('pointerout', () => {
        rowBg.clear(); rowBg.beginFill(0x1a1a24, 0.01); rowBg.drawRect(-4, -2, innerWidth + 8, 18); rowBg.endFill();
        this.hideTooltip();
      });

      this.rightPanel.addChild(row);
    });

    // Placeholder for update logic
    this.objectivesText = new Text('', new TextStyle({ fontSize: 1, fill: 0x000000 }));
    this.objectivesText.visible = false;
    this.rightPanel.addChild(this.objectivesText);

    yPos += 58;

    this.scoreText = new Text('SCORE: 0', new TextStyle({
      fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: 0xffd43b
    }));
    this.scoreText.position.set(padding, yPos);
    this.rightPanel.addChild(this.scoreText);

    yPos += 28;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== SUSPICION ==========
    const suspicionLabel = new Text('SUSPICION LEVEL', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    suspicionLabel.position.set(padding, yPos);
    this.rightPanel.addChild(suspicionLabel);

    this.suspicionText = new Text('0', new TextStyle({
      fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0xffffff
    }));
    this.suspicionText.anchor.set(1, 0);
    this.suspicionText.position.set(this.rightPanelWidth - padding, yPos);
    this.rightPanel.addChild(this.suspicionText);

    yPos += 20;

    const barBg = new Graphics();
    barBg.beginFill(0x1a1a24);
    barBg.drawRoundedRect(padding, yPos, innerWidth, 10, 5);
    barBg.endFill();
    this.rightPanel.addChild(barBg);

    this.suspicionBar = new Graphics();
    this.rightPanel.addChild(this.suspicionBar);

    yPos += 22;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== ENGAGEMENT ==========
    const engLabel = new Text('ENGAGEMENT', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    engLabel.position.set(padding, yPos);
    this.rightPanel.addChild(engLabel);

    yPos += 20;

    this.selectedInfoText = new Text('Select tweet + accounts', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fill: 0x888888, wordWrap: true, wordWrapWidth: innerWidth
    }));
    this.selectedInfoText.position.set(padding, yPos);
    this.rightPanel.addChild(this.selectedInfoText);

    yPos += 36;

    // Action toggle buttons - select multiple before submitting
    const btnGap = 6;
    const btnWidth = (innerWidth - btnGap) / 2;
    const btnHeight = 30;

    const actions: [string, EngagementActionType, number][] = [
      ['👍 LIKE', 'like', 0x51cf66], ['💬 REPLY', 'reply', 0x4dabf7],
      ['🔄 RT', 'retweet', 0xffc078], ['📝 QUOTE', 'quote', 0x9775fa]
    ];

    actions.forEach(([label, type, color], i) => {
      const toggleBtn = this.createToggleButton(label, type, color, btnWidth, btnHeight);
      toggleBtn.container.position.set(padding + (i % 2) * (btnWidth + btnGap), yPos + Math.floor(i / 2) * (btnHeight + btnGap));
      this.rightPanel.addChild(toggleBtn.container);
      this.actionToggleButtons.set(type, toggleBtn);
    });

    yPos += 2 * (btnHeight + btnGap) + 6;

    // Queue preview text
    this.queuePreviewText = new Text('Select actions...', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x666666, fontStyle: 'italic',
    }));
    this.queuePreviewText.position.set(padding, yPos);
    this.rightPanel.addChild(this.queuePreviewText);

    yPos += 18;

    // Submit/Deploy button
    this.submitButton = this.createSubmitButton('⚡ DEPLOY', innerWidth, 32);
    this.submitButton.position.set(padding, yPos);
    this.submitButton.on('pointerdown', () => this.executeQueuedEngagements());
    this.rightPanel.addChild(this.submitButton);

    yPos += 38;

    // Pattern buttons (like Chapter 1)
    const patternLabel = new Text('PATTERNS', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x555555, letterSpacing: 1
    }));
    patternLabel.position.set(padding, yPos);
    this.rightPanel.addChild(patternLabel);

    yPos += 16;

    const patterns: [string, 'burst' | 'staggered' | 'slowBurn'][] = [
      ['⚡ Burst', 'burst'],
      ['📈 Stagger', 'staggered'],
      ['🐢 Slow', 'slowBurn']
    ];
    const patBtnWidth = (innerWidth - 2 * 6) / 3;

    patterns.forEach(([label, pattern], i) => {
      const btn = this.createButton(label, 0x666666, patBtnWidth, 26);
      btn.position.set(padding + i * (patBtnWidth + 6), yPos);
      btn.on('pointerdown', () => this.executePattern(pattern));
      this.rightPanel.addChild(btn);
    });

    yPos += 36;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== COUNTERMEASURES ==========
    const cmLabel = new Text('⚙️ COUNTERMEASURES', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0xff922b, letterSpacing: 1
    }));
    cmLabel.position.set(padding, yPos);
    this.rightPanel.addChild(cmLabel);

    this.countermeasuresLeftText = new Text('3 left', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x888888
    }));
    this.countermeasuresLeftText.anchor.set(1, 0);
    this.countermeasuresLeftText.position.set(this.rightPanelWidth - padding, yPos);
    this.rightPanel.addChild(this.countermeasuresLeftText);

    yPos += 20;

    const cmHint = new Text('Use when you detect algorithm changed:', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x666666
    }));
    cmHint.position.set(padding, yPos);
    this.rightPanel.addChild(cmHint);

    yPos += 18;

    const countermeasures: [string, Partial<CountermeasureSettings>][] = [
      ['⏱️ Slow Down', { maxActionsPerAccountPerHour: 4 }],
      ['⏳ More Delay', { minDelayBetweenActions: 5 }],
      ['👍 Likes Only', { likeRatio: 0.9, replyRatio: 0.05, retweetRatio: 0.05 }],
      ['🔍 Add Browse', { silentBrowsingCount: 8 }],
    ];

    const cmBtnWidth = (innerWidth - btnGap) / 2;

    countermeasures.forEach(([label, settings], i) => {
      const btn = this.createButton(label, 0xff922b, cmBtnWidth, 28);
      btn.position.set(padding + (i % 2) * (cmBtnWidth + btnGap), yPos + Math.floor(i / 2) * 34);
      btn.on('pointerdown', () => this.applyCountermeasure(settings));
      this.rightPanel.addChild(btn);
    });

    yPos += 80;

    // Analytics button
    const analyticsBtn = this.createButton('📊 View Analytics (A)', 0x4dabf7, innerWidth, 32);
    analyticsBtn.position.set(padding, yPos);
    analyticsBtn.on('pointerdown', () => this.toggleAnalytics());
    this.rightPanel.addChild(analyticsBtn);

    yPos += 44;
    this.addDivider(yPos, innerWidth, padding);
    yPos += 12;

    // ========== NOTICES ==========
    const noticesLabel = new Text('SYSTEM NOTICES', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    noticesLabel.position.set(padding, yPos);
    this.rightPanel.addChild(noticesLabel);

    yPos += 20;
    this.noticesText = new Text('Monitoring...', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x555555, wordWrap: true, wordWrapWidth: innerWidth, lineHeight: 15
    }));
    this.noticesText.position.set(padding, yPos);
    this.rightPanel.addChild(this.noticesText);

    this.container.addChild(this.rightPanel);
  }

  private buildAnalyticsOverlay(): void {
    this.analyticsOverlay = new Container();
    this.analyticsOverlay.visible = false;

    const mainWidth = this.screenWidth - this.rightPanelWidth;

    // Semi-transparent backdrop
    const backdrop = new Graphics();
    backdrop.beginFill(0x000000, 0.8);
    backdrop.drawRect(0, this.headerHeight, mainWidth, this.screenHeight - this.headerHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.toggleAnalytics());
    this.analyticsOverlay.addChild(backdrop);

    // Analytics panel
    const panelWidth = 500;
    const panelHeight = 400;
    const panelX = (mainWidth - panelWidth) / 2;
    const panelY = this.headerHeight + 60;

    const panel = new Graphics();
    panel.beginFill(0x12121a);
    panel.lineStyle(2, 0x4dabf7);
    panel.drawRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.endFill();
    this.analyticsOverlay.addChild(panel);

    const title = new Text('📊 ANALYTICS DASHBOARD', new TextStyle({
      fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fill: 0x4dabf7
    }));
    title.position.set(panelX + 20, panelY + 16);
    this.analyticsOverlay.addChild(title);

    const closeHint = new Text('Click outside or press A to close', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x666666
    }));
    closeHint.anchor.set(1, 0);
    closeHint.position.set(panelX + panelWidth - 20, panelY + 20);
    this.analyticsOverlay.addChild(closeHint);

    this.analyticsContent = new Text('Loading analytics...', new TextStyle({
      fontFamily: 'Arial', fontSize: 12, fill: 0xcccccc, lineHeight: 22, wordWrap: true, wordWrapWidth: panelWidth - 40
    }));
    this.analyticsContent.position.set(panelX + 20, panelY + 50);
    this.analyticsOverlay.addChild(this.analyticsContent);

    this.container.addChild(this.analyticsOverlay);
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
    topBorder.beginFill(0xff6b6b, 0.5);
    topBorder.drawRect(0, 0, mainWidth, 2);
    topBorder.endFill();
    this.queueDisplayPanel.addChild(topBorder);

    // Header
    const header = new Text('⏳ PENDING QUEUE', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0xff6b6b,
      letterSpacing: 1,
    }));
    header.position.set(12, 6);
    this.queueDisplayPanel.addChild(header);

    // Queue items container
    const queueItemsContainer = new Container();
    queueItemsContainer.name = 'queueItems';
    queueItemsContainer.position.set(12, 24);
    this.queueDisplayPanel.addChild(queueItemsContainer);

    // Empty state text
    const emptyText = new Text('No engagements queued', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0x555555,
      fontStyle: 'italic',
    }));
    emptyText.name = 'emptyText';
    emptyText.position.set(12, 28);
    this.queueDisplayPanel.addChild(emptyText);

    this.container.addChild(this.queueDisplayPanel);
  }

  private updateQueueDisplay(): void {
    if (!this.queueDisplayPanel) return;

    const queueItemsContainer = this.queueDisplayPanel.children.find(c => c.name === 'queueItems') as Container;
    const emptyText = this.queueDisplayPanel.children.find(c => c.name === 'emptyText') as Text;
    
    if (!queueItemsContainer) return;

    queueItemsContainer.removeChildren();

    const queue = this.state.engagementQueue;
    const currentMinute = Math.floor(this.state.inGameMinutes);

    if (queue.length === 0) {
      if (emptyText) emptyText.visible = true;
      return;
    }

    if (emptyText) emptyText.visible = false;

    // Group by action type
    const actionGroups: Map<EngagementActionType, { accounts: string[]; tweetId: string; minute: number }[]> = new Map();
    
    for (const item of queue) {
      const account = this.state.accounts.find(a => a.id === item.accountId);
      if (!account) continue;

      if (!actionGroups.has(item.type)) {
        actionGroups.set(item.type, []);
      }
      
      const group = actionGroups.get(item.type)!;
      let existingGroup = group.find(g => g.tweetId === item.tweetId && g.minute === item.scheduledMinute);
      if (!existingGroup) {
        existingGroup = { accounts: [], tweetId: item.tweetId, minute: item.scheduledMinute };
        group.push(existingGroup);
      }
      existingGroup.accounts.push(`@${account.profile.handle.slice(0, 8)}`);
    }

    const actionIcons: Record<string, string> = { like: '❤️', retweet: '🔄', reply: '💬', quote: '📝', profileVisit: '👁️' };
    const actionColors: Record<string, number> = { like: 0x51cf66, retweet: 0xffc078, reply: 0x4dabf7, quote: 0x9775fa, profileVisit: 0x888888 };

    let xOffset = 0;
    const maxWidth = this.screenWidth - this.rightPanelWidth - 24;

    actionGroups.forEach((groups, actionType) => {
      for (const group of groups) {
        if (xOffset > maxWidth - 120) break;

        const tweet = this.state.tweets.find(t => t.id === group.tweetId);
        const tweetLabel = tweet ? tweet.authorType.replace('_', ' ').slice(0, 5) : '???';
        const accountCount = group.accounts.length;
        const minutesUntil = group.minute - currentMinute;
        const timeLabel = minutesUntil <= 0 ? 'now' : `${minutesUntil}m`;

        const itemContainer = new Container();
        itemContainer.position.set(xOffset, 0);

        const itemBg = new Graphics();
        const itemWidth = 115;
        itemBg.beginFill(actionColors[actionType], 0.15);
        itemBg.lineStyle(1, actionColors[actionType], 0.4);
        itemBg.drawRoundedRect(0, 0, itemWidth, 36, 4);
        itemBg.endFill();
        itemContainer.addChild(itemBg);

        const actionText = new Text(`${actionIcons[actionType]} ${accountCount}x ${actionType}`, new TextStyle({
          fontFamily: 'Arial', fontSize: 10, fontWeight: 'bold', fill: actionColors[actionType],
        }));
        actionText.position.set(5, 3);
        itemContainer.addChild(actionText);

        const detailText = new Text(`→ ${tweetLabel} (${timeLabel})`, new TextStyle({
          fontFamily: 'Arial', fontSize: 9, fill: 0x888888,
        }));
        detailText.position.set(5, 18);
        itemContainer.addChild(detailText);

        queueItemsContainer.addChild(itemContainer);
        xOffset += itemWidth + 8;
      }
    });
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
    bg.beginFill(color, 0.15);
    bg.lineStyle(1, color, 0.5);
    bg.drawRoundedRect(0, 0, width, height, 4);
    bg.endFill();
    btn.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: color
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    btn.addChild(text);

    btn.on('pointerover', () => {
      bg.clear(); bg.beginFill(color, 0.3); bg.lineStyle(2, color, 0.8); bg.drawRoundedRect(0, 0, width, height, 4); bg.endFill();
    });
    btn.on('pointerout', () => {
      bg.clear(); bg.beginFill(color, 0.15); bg.lineStyle(1, color, 0.5); bg.drawRoundedRect(0, 0, width, height, 4); bg.endFill();
    });

    return btn;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // ========== SELECTION & ENGAGEMENT ==========

  private selectTweet(tweet: SimTweet, width: number, height: number): void {
    Sound.playClick();
    if (this.selectedTweet) {
      const prevCard = this.tweetCards.get(this.selectedTweet.id);
      if (prevCard) {
        const bg = prevCard.getChildAt(0) as Graphics;
        bg.clear(); bg.beginFill(0x1a1a24); bg.lineStyle(2, 0x2a2a3a); bg.drawRoundedRect(0, 0, width, height, 6); bg.endFill();
      }
    }
    this.selectedTweet = tweet;
    const card = this.tweetCards.get(tweet.id);
    if (card) {
      const bg = card.getChildAt(0) as Graphics;
      bg.clear(); bg.beginFill(0x1a2a3a); bg.lineStyle(2, 0x4dabf7); bg.drawRoundedRect(0, 0, width, height, 6); bg.endFill();
    }
    this.updateSelectedInfo();
  }

  private toggleAccountSelection(account: Account, multiSelect: boolean, width: number, height: number): void {
    if (account.status !== 'active') {
      Sound.playError();
      showToast(`@${account.profile.handle} is ${account.status}`, 'warning', '⚠️');
      return;
    }

    if (!multiSelect) {
      this.selectedAccounts.forEach(id => {
        const card = this.accountCards.get(id);
        const acc = this.state.accounts.find(a => a.id === id);
        if (card && acc) {
          const bg = card.getChildAt(0) as Graphics;
          bg.clear(); this.drawAccountBg(bg, acc, false, width, height);
        }
      });
      this.selectedAccounts.clear();
    }

    if (this.selectedAccounts.has(account.id)) {
      this.selectedAccounts.delete(account.id);
      Sound.playToggle(false);
      const card = this.accountCards.get(account.id);
      if (card) {
        const bg = card.getChildAt(0) as Graphics;
        bg.clear(); this.drawAccountBg(bg, account, false, width, height);
      }
    } else {
      this.selectedAccounts.add(account.id);
      Sound.playToggle(true);
      const card = this.accountCards.get(account.id);
      if (card) {
        const bg = card.getChildAt(0) as Graphics;
        bg.clear(); this.drawAccountBg(bg, account, true, width, height);
      }
    }
    this.updateSelectedInfo();
  }

  private updateSelectedInfo(): void {
    const count = this.selectedAccounts.size;
    const tweetInfo = this.selectedTweet ? `Tweet: ${this.selectedTweet.authorType.replace('_', ' ')}` : 'No tweet selected';
    const accountInfo = count > 0 ? `\n${count} account${count > 1 ? 's' : ''} selected` : '\nNo accounts selected';
    this.selectedInfoText.text = tweetInfo + accountInfo;
  }

  private createToggleButton(label: string, type: EngagementActionType, color: number, width: number, height: number): { container: Container; bg: Graphics; text: Text } {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(color, 0.1);
    bg.lineStyle(1, color, 0.4);
    bg.drawRoundedRect(0, 0, width, height, 4);
    bg.endFill();
    container.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: color,
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    container.addChild(text);

    container.on('pointerdown', () => {
      Sound.playToggle(!this.queuedActions.has(type));
      this.toggleAction(type);
    });
    container.on('pointerover', () => {
      if (!this.queuedActions.has(type)) {
        bg.clear(); bg.beginFill(color, 0.2); bg.lineStyle(1, color, 0.6); bg.drawRoundedRect(0, 0, width, height, 4); bg.endFill();
      }
    });
    container.on('pointerout', () => {
      if (!this.queuedActions.has(type)) {
        bg.clear(); bg.beginFill(color, 0.1); bg.lineStyle(1, color, 0.4); bg.drawRoundedRect(0, 0, width, height, 4); bg.endFill();
      }
    });

    return { container, bg, text };
  }

  private toggleAction(type: EngagementActionType): void {
    const colors: Record<EngagementActionType, number> = { like: 0x51cf66, reply: 0x4dabf7, retweet: 0xffc078, quote: 0x9775fa, profileVisit: 0x888888 };
    const color = colors[type];
    const btnData = this.actionToggleButtons.get(type);
    if (!btnData) return;

    const padding = 16;
    const innerWidth = this.rightPanelWidth - padding * 2;
    const btnWidth = (innerWidth - 6) / 2;
    const btnHeight = 30;

    if (this.queuedActions.has(type)) {
      this.queuedActions.delete(type);
      btnData.bg.clear(); btnData.bg.beginFill(color, 0.1); btnData.bg.lineStyle(1, color, 0.4); btnData.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 4); btnData.bg.endFill();
      btnData.text.style.fill = color;
    } else {
      this.queuedActions.add(type);
      btnData.bg.clear(); btnData.bg.beginFill(color, 0.5); btnData.bg.lineStyle(2, color, 1); btnData.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 4); btnData.bg.endFill();
      btnData.text.style.fill = 0xffffff;
    }
    this.updateQueuePreview();
  }

  private updateQueuePreview(): void {
    if (!this.queuePreviewText) return;
    if (this.queuedActions.size === 0) {
      this.queuePreviewText.text = 'Select actions...';
      this.queuePreviewText.style.fill = 0x666666;
    } else {
      const names: Record<EngagementActionType, string> = { like: '👍', reply: '💬', retweet: '🔄', quote: '📝', profileVisit: '👁️' };
      const queued = Array.from(this.queuedActions).map(a => names[a]).join(' + ');
      this.queuePreviewText.text = `Queue: ${queued}`;
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
    bg.drawRoundedRect(0, 0, width, height, 6);
    bg.endFill();
    btn.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0xffd43b, letterSpacing: 2,
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    btn.addChild(text);

    btn.on('pointerover', () => {
      bg.clear(); bg.beginFill(0xffd43b, 0.35); bg.lineStyle(2, 0xffd43b, 1); bg.drawRoundedRect(0, 0, width, height, 6); bg.endFill();
    });
    btn.on('pointerout', () => {
      bg.clear(); bg.beginFill(0xffd43b, 0.15); bg.lineStyle(2, 0xffd43b, 0.6); bg.drawRoundedRect(0, 0, width, height, 6); bg.endFill();
    });

    return btn;
  }

  private executeQueuedEngagements(): void {
    if (!this.selectedTweet) {
      Sound.playError();
      showToast('Select a tweet first', 'warning', '📢');
      return;
    }
    if (this.selectedAccounts.size === 0) {
      Sound.playError();
      showToast('Select at least one account', 'warning', '👤');
      return;
    }
    if (this.queuedActions.size === 0) {
      Sound.playError();
      showToast('Toggle at least one action', 'warning', '⚡');
      return;
    }

    const currentMinute = Math.floor(this.state.inGameMinutes) + 1;
    let totalScheduled = 0;
    let duplicatesSkipped = 0;
    const actionCounts: Record<string, number> = {};
    
    // Schedule all queued actions for all selected accounts (like Chapter 1)
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
        
        if (scheduleEngagement(this.state, accountId, this.selectedTweet!.id, actionType, currentMinute, undefined)) {
          scheduled++;
          // Show individual engagement toast (like Chapter 1)
          showEngagementToast(actionType, this.selectedTweet!.authorType, account.profile.handle);
        }
      });
      actionCounts[actionType] = scheduled;
      totalScheduled += scheduled;
    });

    // Show summary feedback
    if (totalScheduled > 0) {
      Sound.playSuccess();
      const actionSummary = Object.entries(actionCounts)
        .filter(([, count]) => count > 0)
        .map(([action, count]) => `${count} ${action}${count > 1 ? 's' : ''}`)
        .join(', ');
      showToast('Order deployed!', 'success', '⚡', `${actionSummary} scheduled`);
    } else if (duplicatesSkipped > 0) {
      Sound.playError();
      showToast(`Already engaged!`, 'warning', '🔄', `${duplicatesSkipped} duplicate action(s) skipped`);
    }

    this.clearQueue();
    this.clearSelection();
  }

  private clearQueue(): void {
    const colors: Record<EngagementActionType, number> = { like: 0x51cf66, reply: 0x4dabf7, retweet: 0xffc078, quote: 0x9775fa, profileVisit: 0x888888 };
    const padding = 16;
    const innerWidth = this.rightPanelWidth - padding * 2;
    const btnWidth = (innerWidth - 6) / 2;
    const btnHeight = 30;

    this.queuedActions.forEach(type => {
      const btnData = this.actionToggleButtons.get(type);
      if (btnData) {
        const color = colors[type];
        btnData.bg.clear(); btnData.bg.beginFill(color, 0.1); btnData.bg.lineStyle(1, color, 0.4); btnData.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 4); btnData.bg.endFill();
        btnData.text.style.fill = color;
      }
    });
    this.queuedActions.clear();
    this.updateQueuePreview();
  }

  private clearSelection(): void {
    const width = 150, height = 52;
    this.selectedAccounts.forEach(id => {
      const card = this.accountCards.get(id);
      const acc = this.state.accounts.find(a => a.id === id);
      if (card && acc) {
        const bg = card.getChildAt(0) as Graphics;
        bg.clear(); this.drawAccountBg(bg, acc, false, width, height);
      }
    });
    this.selectedAccounts.clear();
    this.updateSelectedInfo();
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

  private updateTweetCards(): void {
    // Update tweet card displays with latest metrics (like Chapter 1)
    this.state.tweets.forEach(tweet => {
      const card = this.tweetCards.get(tweet.id);
      if (!card) return;

      // Find text elements by name
      const impText = card.children.find(c => c.name === 'impressions') as Text;
      const depthText = card.children.find(c => c.name === 'depth') as Text;
      const engText = card.children.find(c => c.name === 'engagements') as Text;
      const engBg = card.children.find(c => c.name === 'engBg') as Graphics;

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
        engText.text = `❤️${likes} 🔄${rts} 💬${replies}`;
      }

      // Check for metric changes and show feedback (like Chapter 1)
      const prev = this.previousMetrics.get(tweet.id);
      if (prev) {
        const currentLikes = tweet.liveMetrics.likes || 0;
        const currentRts = tweet.liveMetrics.retweets || 0;
        const currentReplies = tweet.liveMetrics.replies || 0;
        
        if (currentLikes > prev.likes || currentRts > prev.rts || currentReplies > prev.replies) {
          // Flash the engagement background
          if (engBg) {
            engBg.clear();
            engBg.beginFill(0x2a4a3a);
            engBg.drawRoundedRect(6, 48, 180 - 12, 22, 4);
            engBg.endFill();
            
            // Reset after flash
            setTimeout(() => {
              engBg.clear();
              engBg.beginFill(0x252538);
              engBg.drawRoundedRect(6, 48, 180 - 12, 22, 4);
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

  private applyCountermeasure(settings: Partial<CountermeasureSettings>): void {
    if (applyCountermeasure(this.state, settings)) {
      if (this.firstCountermeasureTime === null && this.ruleChangeTime !== null) {
        this.firstCountermeasureTime = this.state.inGameMinutes;
        Sound.playSuccess();
        showToast('Countermeasure applied!', 'success', '⚙️', 'Adapting to algorithm change');
      } else {
        Sound.playPop();
        showToast('Countermeasure applied', 'info', '⚙️');
      }
      this.countermeasuresLeftText.text = `${getCountermeasureUpdatesRemaining()} left`;
    } else {
      Sound.playError();
      showToast('No countermeasures left!', 'error', '❌');
    }
  }

  private toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
    this.analyticsOverlay.visible = this.showAnalytics;
    Sound.playClick();
    if (this.showAnalytics) {
      this.updateAnalyticsDisplay();
    }
  }

  private updateAnalyticsDisplay(): void {
    const data = getAnalyticsData(this.state);
    const lines = [
      `Current Phase: ${data.currentPhase.toUpperCase()}`,
      ``,
      `═══ BAN ANALYSIS ═══`,
      `By Account Age:`,
      `  • Young (<30 days): ${data.bansByAge.young}`,
      `  • Medium (30-90 days): ${data.bansByAge.medium}`,
      `  • Old (>90 days): ${data.bansByAge.old}`,
      ``,
      `By Risk Class:`,
      `  • Frontline: ${data.bansByRisk.frontline}`,
      `  • Mid: ${data.bansByRisk.mid}`,
      `  • Background: ${data.bansByRisk.background}`,
      ``,
      `═══ SUSPICION BY ACTION ═══`,
      `  • Like: ${data.suspicionByActionType.like?.toFixed(1) || '0.0'}`,
      `  • Reply: ${data.suspicionByActionType.reply?.toFixed(1) || '0.0'}`,
      `  • Retweet: ${data.suspicionByActionType.retweet?.toFixed(1) || '0.0'}`,
      `  • Quote: ${data.suspicionByActionType.quote?.toFixed(1) || '0.0'}`,
    ];
    
    if (this.ruleChangeTime !== null) {
      lines.push(``, `⚠️ Algorithm changed at ${this.ruleChangeTime.toFixed(1)} minutes`);
      if (this.firstCountermeasureTime !== null) {
        const reactionTime = this.firstCountermeasureTime - this.ruleChangeTime;
        lines.push(`Reaction time: ${reactionTime.toFixed(1)} minutes`);
      }
    }

    this.analyticsContent.text = lines.join('\n');
  }

  public update(deltaMs: number): void {
    if (this.isComplete) return;

    // Update toast manager
    ToastManager.getInstance().update();

    // Check for rule change
    if (shouldTriggerRuleChange(this.state)) {
      applyRuleChange(this.state);
      this.ruleChangeTime = this.state.inGameMinutes;
      this.phaseText.text = '🔴 POST-CHANGE - Algorithm changed!';
      this.phaseText.style.fill = 0xff6b6b;
      Sound.playWarning();
      showToast('⚠️ Algorithm Changed!', 'error', '🔴', 'Apply countermeasures quickly!');
    }

    // Update game logic
    updateChapter3(this.state, deltaMs);

    // Time
    const minutes = Math.floor(this.state.inGameMinutes);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    this.timeText.text = `${hours}:${mins.toString().padStart(2, '0')} / 2:00`;

    // Suspicion
    const suspicion = this.state.suspicionMeter;
    this.suspicionText.text = Math.floor(suspicion).toString();
    const padding = 16;
    const innerWidth = this.rightPanelWidth - padding * 2;
    this.suspicionBar.clear();
    const barWidth = (suspicion / 100) * innerWidth;
    let color = 0x51cf66;
    if (suspicion >= 80) color = 0xff6b6b;
    else if (suspicion >= 60) color = 0xff922b;
    else if (suspicion >= 40) color = 0xffd43b;
    if (barWidth > 0) {
      this.suspicionBar.beginFill(color);
      this.suspicionBar.drawRoundedRect(padding, padding + 22 + 60 + 28 + 12 + 20, barWidth, 10, 5);
      this.suspicionBar.endFill();
    }

    // Objectives
    const totalReach = this.state.tweets.reduce((sum, t) => sum + t.liveMetrics.impressions, 0);
    
    const reachIcon = totalReach >= this.TARGET_REACH ? '✅' : '📊';
    const suspicionIcon = suspicion <= this.MAX_SUSPICION ? '✅' : '❌';
    
    let reactionText = '⏱️ Reaction: Waiting...';
    if (this.ruleChangeTime !== null) {
      if (this.firstCountermeasureTime !== null) {
        const reactionTime = this.firstCountermeasureTime - this.ruleChangeTime;
        const reactionIcon = reactionTime <= this.TARGET_REACTION_TIME / 60 ? '✅' : '⏱️';
        reactionText = `${reactionIcon} Reaction: ${(reactionTime * 60).toFixed(0)}s`;
      } else {
        reactionText = '⚠️ Reaction: ACT NOW!';
      }
    }

    // Update individual objective row texts  
    this.rightPanel.children.forEach(child => {
      if (child instanceof Container) {
        const obj0 = child.children.find(c => c.name === 'ch3obj_0') as Text;
        const obj1 = child.children.find(c => c.name === 'ch3obj_1') as Text;
        const obj2 = child.children.find(c => c.name === 'ch3obj_2') as Text;
        if (obj0) obj0.text = `${reachIcon} Reach: ${this.formatNumber(totalReach)} / ${this.formatNumber(this.TARGET_REACH)}`;
        if (obj1) obj1.text = `${suspicionIcon} Suspicion: ${Math.floor(suspicion)} / ${this.MAX_SUSPICION}`;
        if (obj2) obj2.text = reactionText;
      }
    });

    // Score
    const reachScore = Math.min(100, (totalReach / this.TARGET_REACH) * 100);
    const suspicionPenalty = Math.max(0, suspicion - this.MAX_SUSPICION) * 2;
    let reactionBonus = 0;
    if (this.ruleChangeTime !== null && this.firstCountermeasureTime !== null) {
      const reactionTime = (this.firstCountermeasureTime - this.ruleChangeTime) * 60;
      reactionBonus = Math.max(0, 30 - reactionTime);
    }
    const score = Math.max(0, Math.round(reachScore * 0.5 + reactionBonus + (100 - suspicion) * 0.2 - suspicionPenalty));
    this.scoreText.text = `SCORE: ${score}`;

    // Notices
    const notices = getSystemNotices(this.state, 3);
    if (notices.length > 0) {
      this.noticesText.text = notices.map(n => `• ${n}`).join('\n');
      this.noticesText.style.fill = 0xffc078;
      
      // Play warning for ban/flag notices
      notices.forEach(notice => {
        if (notice.includes('banned') || notice.includes('flagged')) {
          Sound.playWarning();
        }
      });
    } else {
      this.noticesText.text = 'Monitoring...';
      this.noticesText.style.fill = 0x555555;
    }

    // Update tweet card displays (like Chapter 1)
    this.updateTweetCards();

    // Update queue display
    this.updateQueueDisplay();

    // Post-change metrics
    if (getCurrentPhase() === 'post_change') {
      capturePostChangeMetrics(this.state);
    }

    // Check completion
    if (isChapterComplete(this.state)) {
      this.isComplete = true;
      Sound.playSuccess();
      showToast('Chapter Complete!', 'success', '🎉');
      setTimeout(() => this.state.advanceToNextScene(), 1500);
    }
  }

  private showTutorial(): void {
    const steps = getChapter3Tutorial(this.screenWidth, this.screenHeight);
    this.tutorial = new Tutorial(this.screenWidth, this.screenHeight, steps, () => this.closeTutorial(), () => this.closeTutorial());
    this.container.addChild(this.tutorial);
  }

  private closeTutorial(): void {
    if (this.tutorial) {
      this.container.removeChild(this.tutorial);
      this.tutorial.destroy();
      this.tutorial = null;
    }
    Sound.playSuccess();
    showToast('Tutorial complete! Watch for algorithm changes.', 'info', '🚀');
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyA') this.toggleAnalytics();
    else if (event.code === 'Escape') { this.clearSelection(); if (this.showAnalytics) this.toggleAnalytics(); }
    else if (event.code === 'KeyN') this.state.advanceToNextScene();
  };

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    ToastManager.getInstance().clear();
    this.container.destroy({ children: true });
  }
}
