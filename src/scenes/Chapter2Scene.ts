import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IScene } from '../core/Game';
import type { GameState } from '../core/GameState';
import type { Account, AccountRiskClass, AccountPersonaTags } from '../core/types';
import { generateAccounts } from '../data/generators';
import {
  initChapter2,
  getTimeBudget,
  getCurrentAccount,
  getTriageQueue,
  getProcessedCount,
  makeTriageDecision,
  skipAccount,
  changeRiskClass,
  togglePersonaTag,
  getPortfolioStats,
  getNarrativeNeeds,
  isTimeExhausted,
  revealHistoryFlag,
} from '../systems/chapter2Logic';
import { Tutorial, getChapter2Tutorial } from '../ui/components/Tutorial';
import { ToastManager, showToast } from '../ui/components/Toast';
import { Sound } from '../core/SoundManager';

/**
 * Chapter2Scene - Account Triage
 * OBJECTIVE: Review incoming accounts, decide keep/park/discard
 * SCORING: Quality (avoiding risky accounts), Efficiency (time), Diversity
 */
export class Chapter2Scene implements IScene {
  public readonly container: Container;
  private readonly app: Application;
  private readonly state: GameState;

  // Layout - initialized with defaults
  private screenWidth: number = 1280;
  private screenHeight: number = 720;
  private headerHeight: number = 56;
  private leftPanelWidth: number = 280;
  private rightPanelWidth: number = 300;

  // UI Containers
  private headerBar!: Container;
  private queuePanel!: Container;
  private editorPanel!: Container;
  private infoPanel!: Container;

  // State
  private currentAccount: Account | null = null;
  private revealedFlags: Set<number> = new Set();
  private detectedFlags: string[] = [];
  private editStartTime: number = 0;
  private queueCards: Container[] = [];

  // UI Elements
  private timeText!: Text;
  private timeBudgetBar!: Graphics;
  private progressText!: Text;
  private portfolioStatsText!: Text;
  private objectivesText!: Text;
  private scoreText!: Text;

  // Scoring targets
  private readonly TARGET_PROCESSED = 20;
  private readonly TARGET_QUALITY = 80; // % good decisions
  private readonly TARGET_DIVERSITY = 70; // % diversity index

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
      this.state.accounts = generateAccounts(30);
    }
    initChapter2(this.state);
    this.buildUI();
    this.loadCurrentAccount();

    // Setup toast manager
    ToastManager.getInstance().setContainer(this.container, this.screenWidth, this.screenHeight);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    this.showTutorial();
  }

  private calculateLayout(): void {
    this.screenWidth = this.app.screen.width;
    this.screenHeight = this.app.screen.height;
    this.leftPanelWidth = this.screenWidth < 1024 ? 240 : 280;
    this.rightPanelWidth = this.screenWidth < 1024 ? 260 : 300;
  }

  private handleResize = (): void => {
    this.calculateLayout();
    this.rebuildUI();
  };

  private rebuildUI(): void {
    this.container.removeChildren();
    this.buildUI();
    ToastManager.getInstance().setContainer(this.container, this.screenWidth, this.screenHeight);
    if (this.currentAccount) this.rebuildEditorContent();
    this.updateQueueDisplay();
    if (this.tutorial) this.container.addChild(this.tutorial);
  }

  private buildUI(): void {
    this.buildHeaderBar();
    this.buildQueuePanel();
    this.buildEditorPanel();
    this.buildInfoPanel();
  }

  private buildHeaderBar(): void {
    this.headerBar = new Container();

    const bg = new Graphics();
    bg.beginFill(0x12121a);
    bg.drawRect(0, 0, this.screenWidth, this.headerHeight);
    bg.endFill();
    this.headerBar.addChild(bg);

    const border = new Graphics();
    border.beginFill(0xffc078);
    border.drawRect(0, this.headerHeight - 2, this.screenWidth, 2);
    border.endFill();
    this.headerBar.addChild(border);

    const titleFontSize = this.screenWidth < 900 ? 16 : 20;
    const title = new Text('CHAPTER II: ACCOUNT TRIAGE', new TextStyle({
      fontFamily: 'Arial', fontSize: titleFontSize, fontWeight: 'bold', fill: 0xffc078, letterSpacing: 1,
    }));
    title.position.set(20, (this.headerHeight - title.height) / 2);
    this.headerBar.addChild(title);

    // Time budget display
    const timeLabel = new Text('TIME LEFT', new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x666666, letterSpacing: 1,
    }));
    timeLabel.anchor.set(1, 0);
    timeLabel.position.set(this.screenWidth - 20, 8);
    this.headerBar.addChild(timeLabel);

    this.timeText = new Text('60:00', new TextStyle({
      fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', fill: 0xffffff,
    }));
    this.timeText.anchor.set(1, 0);
    this.timeText.position.set(this.screenWidth - 20, 24);
    this.headerBar.addChild(this.timeText);

    const barX = this.screenWidth - 180;
    const barBg = new Graphics();
    barBg.beginFill(0x1a1a24);
    barBg.drawRoundedRect(barX, 18, 120, 14, 7);
    barBg.endFill();
    this.headerBar.addChild(barBg);

    this.timeBudgetBar = new Graphics();
    this.headerBar.addChild(this.timeBudgetBar);

    this.container.addChild(this.headerBar);
  }

  private buildQueuePanel(): void {
    this.queuePanel = new Container();
    this.queuePanel.position.set(0, this.headerHeight);

    const panelHeight = this.screenHeight - this.headerHeight;

    const bg = new Graphics();
    bg.beginFill(0x0d0d12);
    bg.drawRect(0, 0, this.leftPanelWidth, panelHeight);
    bg.endFill();
    this.queuePanel.addChild(bg);

    const border = new Graphics();
    border.beginFill(0x2a2a3a);
    border.drawRect(this.leftPanelWidth - 1, 0, 1, panelHeight);
    border.endFill();
    this.queuePanel.addChild(border);

    const headerBg = new Graphics();
    headerBg.beginFill(0x12121a);
    headerBg.drawRect(0, 0, this.leftPanelWidth, 44);
    headerBg.endFill();
    this.queuePanel.addChild(headerBg);

    const label = new Text('INCOMING ACCOUNTS', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    label.position.set(16, 14);
    this.queuePanel.addChild(label);

    this.progressText = new Text('', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fill: 0x888888
    }));
    this.progressText.anchor.set(1, 0);
    this.progressText.position.set(this.leftPanelWidth - 16, 14);
    this.queuePanel.addChild(this.progressText);

    // Queue cards
    const queue = getTriageQueue();
    const maxVisible = Math.min(queue.length, Math.floor((panelHeight - 60) / 58));
    const cardHeight = 50;
    const cardGap = 8;

    this.queueCards = [];
    for (let i = 0; i < maxVisible; i++) {
      const card = this.createQueueCard(queue[i], i);
      card.position.set(12, 52 + i * (cardHeight + cardGap));
      this.queuePanel.addChild(card);
      this.queueCards.push(card);
    }

    this.container.addChild(this.queuePanel);
  }

  private createQueueCard(account: Account, index: number): Container {
    const card = new Container();
    const width = this.leftPanelWidth - 24;
    const height = 50;

    const bg = new Graphics();
    const isActive = index === 0;
    bg.beginFill(isActive ? 0x1a2a3a : 0x14141c);
    bg.lineStyle(isActive ? 2 : 1, isActive ? 0x4dabf7 : 0x2a2a3a);
    bg.drawRoundedRect(0, 0, width, height, 5);
    bg.endFill();
    card.addChild(bg);

    const handle = new Text(`@${account.profile.handle.slice(0, 14)}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: 0xffffff
    }));
    handle.position.set(10, 8);
    card.addChild(handle);

    const details = new Text(`${this.formatNumber(account.followers)} · ${account.ageDays}d old`, new TextStyle({
      fontFamily: 'Arial', fontSize: 10, fill: 0x888888
    }));
    details.position.set(10, 28);
    card.addChild(details);

    if (account.historyFlags.length > 0) {
      const warning = new Text('⚠️', new TextStyle({ fontSize: 12 }));
      warning.anchor.set(1, 0);
      warning.position.set(width - 8, 8);
      card.addChild(warning);
    }

    return card;
  }

  private buildEditorPanel(): void {
    const editorX = this.leftPanelWidth;
    const editorWidth = this.screenWidth - this.leftPanelWidth - this.rightPanelWidth;
    
    this.editorPanel = new Container();
    this.editorPanel.position.set(editorX, this.headerHeight);

    const panelHeight = this.screenHeight - this.headerHeight;

    const bg = new Graphics();
    bg.beginFill(0x08080c);
    bg.drawRect(0, 0, editorWidth, panelHeight);
    bg.endFill();
    this.editorPanel.addChild(bg);

    const headerBg = new Graphics();
    headerBg.beginFill(0x0d0d12);
    headerBg.drawRect(0, 0, editorWidth, 44);
    headerBg.endFill();
    this.editorPanel.addChild(headerBg);

    const label = new Text('ACCOUNT EDITOR', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    label.position.set(20, 14);
    this.editorPanel.addChild(label);

    this.container.addChild(this.editorPanel);
  }

  private buildInfoPanel(): void {
    this.infoPanel = new Container();
    this.infoPanel.position.set(this.screenWidth - this.rightPanelWidth, this.headerHeight);

    const panelHeight = this.screenHeight - this.headerHeight;
    const padding = 16;
    const innerWidth = this.rightPanelWidth - padding * 2;

    const bg = new Graphics();
    bg.beginFill(0x0d0d14);
    bg.drawRect(0, 0, this.rightPanelWidth, panelHeight);
    bg.endFill();
    this.infoPanel.addChild(bg);

    const border = new Graphics();
    border.beginFill(0x2a2a3a);
    border.drawRect(0, 0, 1, panelHeight);
    border.endFill();
    this.infoPanel.addChild(border);

    let yPos = padding;

    // ========== OBJECTIVES ==========
    const objLabel = new Text('🎯 OBJECTIVES', new TextStyle({
      fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: 0x51cf66, letterSpacing: 1
    }));
    objLabel.position.set(padding, yPos);
    this.infoPanel.addChild(objLabel);

    yPos += 24;

    this.objectivesText = new Text(
      `Process: 0 / ${this.TARGET_PROCESSED} accounts\nQuality: 0% (avoid risky keeps)\nDiversity: 0% portfolio mix`,
      new TextStyle({ fontFamily: 'Arial', fontSize: 11, fill: 0xaaaaaa, lineHeight: 20 })
    );
    this.objectivesText.position.set(padding, yPos);
    this.infoPanel.addChild(this.objectivesText);

    yPos += 70;

    this.scoreText = new Text('SCORE: 0', new TextStyle({
      fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fill: 0xffd43b
    }));
    this.scoreText.position.set(padding, yPos);
    this.infoPanel.addChild(this.scoreText);

    yPos += 36;

    // Divider
    const divider1 = new Graphics();
    divider1.beginFill(0x2a2a3a);
    divider1.drawRect(padding, yPos, innerWidth, 1);
    divider1.endFill();
    this.infoPanel.addChild(divider1);

    yPos += 16;

    // ========== UPCOMING NEEDS ==========
    const needsLabel = new Text('UPCOMING CONTENT NEEDS', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    needsLabel.position.set(padding, yPos);
    this.infoPanel.addChild(needsLabel);

    yPos += 24;

    const needs = getNarrativeNeeds();
    const needsText = new Text(needs.map(n => `• ${n}`).join('\n'), new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fill: 0xaaaaaa, wordWrap: true, wordWrapWidth: innerWidth, lineHeight: 18
    }));
    needsText.position.set(padding, yPos);
    this.infoPanel.addChild(needsText);

    yPos += 120;

    // Divider
    const divider2 = new Graphics();
    divider2.beginFill(0x2a2a3a);
    divider2.drawRect(padding, yPos, innerWidth, 1);
    divider2.endFill();
    this.infoPanel.addChild(divider2);

    yPos += 16;

    // ========== PORTFOLIO STATUS ==========
    const portfolioLabel = new Text('PORTFOLIO STATUS', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    portfolioLabel.position.set(padding, yPos);
    this.infoPanel.addChild(portfolioLabel);

    yPos += 24;

    this.portfolioStatsText = new Text('', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fill: 0xaaaaaa, lineHeight: 20
    }));
    this.portfolioStatsText.position.set(padding, yPos);
    this.infoPanel.addChild(this.portfolioStatsText);

    this.container.addChild(this.infoPanel);
  }

  private loadCurrentAccount(): void {
    this.currentAccount = getCurrentAccount();
    this.revealedFlags.clear();
    this.detectedFlags = [];
    this.editStartTime = Date.now();
    this.rebuildEditorContent();
    this.updateQueueDisplay();
    if (this.currentAccount) {
      Sound.playNextCard();
    }
  }

  private rebuildEditorContent(): void {
    // Remove old content (keep bg and header)
    while (this.editorPanel.children.length > 3) {
      this.editorPanel.removeChildAt(3);
    }

    const editorWidth = this.screenWidth - this.leftPanelWidth - this.rightPanelWidth;

    if (!this.currentAccount) {
      const complete = new Text('✓ All accounts processed!', new TextStyle({
        fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', fill: 0x51cf66
      }));
      complete.position.set(20, 80);
      this.editorPanel.addChild(complete);
      return;
    }

    const account = this.currentAccount;
    let yPos = 60;

    // Profile card
    const profileBg = new Graphics();
    profileBg.beginFill(0x0d0d14);
    profileBg.drawRoundedRect(20, yPos, editorWidth - 40, 100, 6);
    profileBg.endFill();
    this.editorPanel.addChild(profileBg);

    const displayName = new Text(account.profile.displayName, new TextStyle({
      fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', fill: 0xffffff
    }));
    displayName.position.set(36, yPos + 12);
    this.editorPanel.addChild(displayName);

    const handle = new Text(`@${account.profile.handle}`, new TextStyle({
      fontFamily: 'Arial', fontSize: 13, fill: 0x4dabf7
    }));
    handle.position.set(36, yPos + 36);
    this.editorPanel.addChild(handle);

    const bio = new Text(`"${account.profile.bio.slice(0, 80)}..."`, new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fill: 0x888888, fontStyle: 'italic', wordWrap: true, wordWrapWidth: editorWidth - 80
    }));
    bio.position.set(36, yPos + 58);
    this.editorPanel.addChild(bio);

    yPos += 116;

    // Stats
    const statsText = new Text(
      `📊 ${this.formatNumber(account.followers)} followers   📅 ${account.ageDays} days old   🌍 ${account.region}`,
      new TextStyle({ fontFamily: 'Arial', fontSize: 12, fill: 0xaaaaaa })
    );
    statsText.position.set(20, yPos);
    this.editorPanel.addChild(statsText);

    yPos += 36;

    // Risk Class
    const riskLabel = new Text('ASSIGN RISK CLASS', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    riskLabel.position.set(20, yPos);
    this.editorPanel.addChild(riskLabel);

    yPos += 22;

    const riskClasses: AccountRiskClass[] = ['frontline', 'mid', 'background'];
    const riskColors: Record<string, number> = { frontline: 0xffd43b, mid: 0x4dabf7, background: 0x666666 };

    riskClasses.forEach((rc, i) => {
      const btn = this.createToggleButton(rc.toUpperCase(), riskColors[rc], 90, 30, account.riskClass === rc);
      btn.position.set(20 + i * 100, yPos);
      btn.on('pointerdown', () => { 
        if (account.riskClass !== rc) {
          Sound.playRiskChange();
          changeRiskClass(account, rc); 
          this.rebuildEditorContent(); 
        }
      });
      this.editorPanel.addChild(btn);
    });

    yPos += 48;

    // Persona tags
    const personaLabel = new Text('PERSONA TAGS', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    personaLabel.position.set(20, yPos);
    this.editorPanel.addChild(personaLabel);

    yPos += 22;

    const personaTags: (keyof AccountPersonaTags)[] = ['defi', 'nft', 'gaming', 'normie', 'builder', 'trader'];
    personaTags.forEach((tag, i) => {
      const isActive = account.persona[tag];
      const btn = this.createToggleButton(tag.toUpperCase(), isActive ? 0x51cf66 : 0x444444, 80, 26, isActive);
      btn.position.set(20 + (i % 4) * 88, yPos + Math.floor(i / 4) * 32);
      btn.on('pointerdown', () => { 
        Sound.playTagToggle(!account.persona[tag]);
        togglePersonaTag(account, tag); 
        this.rebuildEditorContent(); 
      });
      this.editorPanel.addChild(btn);
    });

    yPos += 80;

    // History flags
    const flagsLabel = new Text('HISTORY FLAGS', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    flagsLabel.position.set(20, yPos);
    this.editorPanel.addChild(flagsLabel);

    yPos += 22;

    if (account.historyFlags.length === 0) {
      const noFlags = new Text('✓ No history flags detected', new TextStyle({
        fontFamily: 'Arial', fontSize: 12, fill: 0x51cf66
      }));
      noFlags.position.set(20, yPos);
      this.editorPanel.addChild(noFlags);
    } else {
      account.historyFlags.forEach((flag, i) => {
        const isRevealed = this.revealedFlags.has(i);
        const flagBtn = new Container();
        flagBtn.eventMode = 'static';
        flagBtn.cursor = 'pointer';
        flagBtn.position.set(20, yPos + i * 34);

        const isSevere = flag.includes('scam') || flag.includes('spam');
        const flagColor = isRevealed ? (isSevere ? 0xff6b6b : 0xffc078) : 0x333333;

        const flagBg = new Graphics();
        flagBg.beginFill(flagColor, 0.2);
        flagBg.lineStyle(1, flagColor, 0.5);
        flagBg.drawRoundedRect(0, 0, editorWidth - 60, 28, 4);
        flagBg.endFill();
        flagBtn.addChild(flagBg);

        const flagText = new Text(
          isRevealed ? `⚠️  ${flag.replace(/_/g, ' ')}` : '🔒  Click to reveal (costs 0.75 min)',
          new TextStyle({ fontFamily: 'Arial', fontSize: 11, fill: isRevealed ? (isSevere ? 0xff6b6b : 0xffc078) : 0x666666 })
        );
        flagText.position.set(10, 6);
        flagBtn.addChild(flagText);

        flagBtn.on('pointerdown', () => {
          if (!isRevealed) {
            const revealed = revealHistoryFlag(account, i);
            if (revealed) {
              this.revealedFlags.add(i);
              this.detectedFlags.push(revealed);
              // Play reveal sound, then warning if severe
              Sound.playReveal();
              if (revealed.includes('scam') || revealed.includes('spam')) {
                setTimeout(() => Sound.playWarning(), 150);
                showToast('Severe flag detected!', 'error', '🚨');
              }
              this.rebuildEditorContent();
            }
          }
        });
        this.editorPanel.addChild(flagBtn);
      });
    }

    // Decision buttons at bottom
    const btnY = this.screenHeight - this.headerHeight - 70;
    const decisionLabel = new Text('YOUR DECISION', new TextStyle({
      fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: 0x666666, letterSpacing: 1
    }));
    decisionLabel.position.set(20, btnY - 26);
    this.editorPanel.addChild(decisionLabel);

    const decisions: [string, 'keep' | 'park' | 'discard', number][] = [
      ['✓ KEEP', 'keep', 0x51cf66], ['⏸ PARK', 'park', 0x748ffc], ['✗ DISCARD', 'discard', 0xff6b6b]
    ];

    decisions.forEach(([label, action, color], i) => {
      const btn = this.createActionButton(label, color, 110, 40);
      btn.position.set(20 + i * 120, btnY);
      btn.on('pointerdown', () => {
        this.makeDecision(action);
      });
      this.editorPanel.addChild(btn);
    });

    const skipBtn = this.createActionButton('→ SKIP', 0x555555, 80, 40);
    skipBtn.position.set(20 + 3 * 120, btnY);
    skipBtn.on('pointerdown', () => { 
      Sound.playSkip();
      skipAccount(); 
      this.loadCurrentAccount(); 
    });
    this.editorPanel.addChild(skipBtn);
  }

  private createToggleButton(label: string, color: number, width: number, height: number, active: boolean): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    const bg = new Graphics();
    bg.beginFill(color, active ? 0.3 : 0.1);
    bg.lineStyle(active ? 2 : 1, color, active ? 0.8 : 0.3);
    bg.drawRoundedRect(0, 0, width, height, 4);
    bg.endFill();
    btn.addChild(bg);
    const text = new Text(label, new TextStyle({ fontFamily: 'Arial', fontSize: 10, fontWeight: 'bold', fill: active ? color : 0x666666 }));
    text.anchor.set(0.5); text.position.set(width / 2, height / 2);
    btn.addChild(text);
    return btn;
  }

  private createActionButton(label: string, color: number, width: number, height: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    const bg = new Graphics();
    bg.beginFill(color, 0.2);
    bg.lineStyle(2, color, 0.6);
    bg.drawRoundedRect(0, 0, width, height, 5);
    bg.endFill();
    btn.addChild(bg);
    const text = new Text(label, new TextStyle({ fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: color }));
    text.anchor.set(0.5); text.position.set(width / 2, height / 2);
    btn.addChild(text);
    btn.on('pointerover', () => { bg.clear(); bg.beginFill(color, 0.4); bg.lineStyle(2, color, 1); bg.drawRoundedRect(0, 0, width, height, 5); bg.endFill(); });
    btn.on('pointerout', () => { bg.clear(); bg.beginFill(color, 0.2); bg.lineStyle(2, color, 0.6); bg.drawRoundedRect(0, 0, width, height, 5); bg.endFill(); });
    return btn;
  }

  private makeDecision(action: 'keep' | 'park' | 'discard'): void {
    if (!this.currentAccount) return;
    const timeSpent = (Date.now() - this.editStartTime) / 1000 / 60;
    
    // Provide audio feedback based on decision
    const hasRiskyFlags = this.detectedFlags.some(f => f.includes('scam') || f.includes('spam'));
    
    if (action === 'keep') {
      if (hasRiskyFlags) {
        Sound.playWarning();
        showToast('Risky account kept!', 'warning', '⚠️');
      } else {
        Sound.playKeep();
        showToast('Account added to fleet', 'success', '✓');
      }
    } else if (action === 'park') {
      Sound.playPark();
      showToast('Account parked for later', 'info', '⏸');
    } else if (action === 'discard') {
      if (hasRiskyFlags) {
        Sound.playKeep(); // Good decision discarding risky account
        showToast('Risky account discarded', 'success', '✗');
      } else {
        Sound.playDiscard();
        showToast('Account discarded', 'info', '✗');
      }
    }
    
    makeTriageDecision(this.state, this.currentAccount.id, action, this.detectedFlags, timeSpent);
    this.loadCurrentAccount();
  }

  private updateQueueDisplay(): void {
    const queue = getTriageQueue();
    const processedCount = getProcessedCount();
    this.progressText.text = `${processedCount} / ${queue.length}`;
    
    this.queueCards.forEach((card, i) => {
      const isActive = i === processedCount;
      const isProcessed = i < processedCount;
      const bg = card.getChildAt(0) as Graphics;
      const width = this.leftPanelWidth - 24;
      bg.clear();
      if (isProcessed) { bg.beginFill(0x0c0c10, 0.5); bg.lineStyle(1, 0x1a1a24); }
      else if (isActive) { bg.beginFill(0x1a2a3a); bg.lineStyle(2, 0x4dabf7); }
      else { bg.beginFill(0x14141c); bg.lineStyle(1, 0x2a2a3a); }
      bg.drawRoundedRect(0, 0, width, 50, 5);
      bg.endFill();
      card.alpha = isProcessed ? 0.4 : 1;
    });
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  public update(_deltaMs: number): void {
    if (this.isComplete) return;

    // Update toast manager
    ToastManager.getInstance().update();

    // Update time
    const budget = getTimeBudget();
    const minutes = Math.floor(budget);
    const seconds = Math.floor((budget - minutes) * 60);
    this.timeText.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Low time warning
    if (budget < 10 && budget > 9.9) {
      Sound.playTimeLow();
      showToast('10 minutes remaining!', 'warning', '⏰');
    } else if (budget < 5 && budget > 4.9) {
      Sound.playTimeLow();
      showToast('5 minutes remaining!', 'error', '⏰');
    }

    // Update time bar
    const barX = this.screenWidth - 180;
    const ratio = budget / 60;
    let color = 0x4dabf7;
    if (ratio < 0.25) color = 0xff6b6b;
    else if (ratio < 0.5) color = 0xffd43b;
    this.timeBudgetBar.clear();
    this.timeBudgetBar.beginFill(color);
    this.timeBudgetBar.drawRoundedRect(barX, 18, 120 * ratio, 14, 7);
    this.timeBudgetBar.endFill();

    // Update portfolio stats
    const stats = getPortfolioStats(this.state);
    this.portfolioStatsText.text = [
      `Kept: ${stats.kept}  |  Parked: ${stats.parked}  |  Discarded: ${stats.discarded}`,
      ``,
      `Frontline: ${stats.byRiskClass.frontline}  Mid: ${stats.byRiskClass.mid}  Back: ${stats.byRiskClass.background}`,
      ``,
      `Diversity Index: ${(stats.diversityIndex * 100).toFixed(0)}%`
    ].join('\n');

    // Update objectives
    const processed = getProcessedCount();
    const quality = stats.kept > 0 ? Math.round((1 - stats.avgBanRisk) * 100) : 100;
    const diversity = Math.round(stats.diversityIndex * 100);

    const procIcon = processed >= this.TARGET_PROCESSED ? '✅' : '⬜';
    const qualIcon = quality >= this.TARGET_QUALITY ? '✅' : '⬜';
    const divIcon = diversity >= this.TARGET_DIVERSITY ? '✅' : '⬜';

    this.objectivesText.text = `${procIcon} Process: ${processed} / ${this.TARGET_PROCESSED} accounts\n${qualIcon} Quality: ${quality}% (avoid risky keeps)\n${divIcon} Diversity: ${diversity}% portfolio mix`;

    // Calculate score
    const procScore = Math.min(100, (processed / this.TARGET_PROCESSED) * 100);
    const qualScore = quality;
    const divScore = diversity;
    const score = Math.round(procScore * 0.4 + qualScore * 0.3 + divScore * 0.3);
    this.scoreText.text = `SCORE: ${score}`;

    // Check completion
    if (isTimeExhausted() || !getCurrentAccount()) {
      this.isComplete = true;
      Sound.playSuccess();
      showToast('Chapter Complete!', 'success', '🎉');
      setTimeout(() => this.state.advanceToNextScene(), 1500);
    }
  }

  private showTutorial(): void {
    const steps = getChapter2Tutorial(this.screenWidth, this.screenHeight);
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
    showToast('Tutorial complete! Start triaging.', 'info', '🚀');
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyK') this.makeDecision('keep');
    else if (event.code === 'KeyP') this.makeDecision('park');
    else if (event.code === 'KeyD') this.makeDecision('discard');
    else if (event.code === 'Space') { event.preventDefault(); Sound.playSkip(); skipAccount(); this.loadCurrentAccount(); }
  };

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    ToastManager.getInstance().clear();
    this.container.destroy({ children: true });
  }
}
