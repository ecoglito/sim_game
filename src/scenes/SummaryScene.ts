import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IScene } from '../core/Game';
import type { GameState } from '../core/GameState';
import { 
  computeDerivedScores, 
  computeChapter1Metrics,
  computeChapter2Metrics,
  computeChapter3Metrics,
  generateScoreFeedback,
} from '../core/metrics';

/**
 * SummaryScene - Classified evaluation report with Illuminati aesthetic
 */
export class SummaryScene implements IScene {
  public readonly container: Container;
  private readonly app: Application;
  private readonly state: GameState;
  private animationFrame: number = 0;
  private scanlineGraphics: Graphics | null = null;

  // Color palette - Illuminati/CIA theme
  private readonly colors = {
    bgDark: 0x0a0a0a,
    bgPanel: 0x111111,
    gold: 0xd4af37,
    goldDark: 0x8b7355,
    amber: 0xffbf00,
    green: 0x00ff41,
    greenDark: 0x008f11,
    red: 0xdc143c,
    redDark: 0x8b0000,
    white: 0xf0f0f0,
    gray: 0x666666,
    grayLight: 0x999999,
    classified: 0xff0000,
  };

  constructor(app: Application, state: GameState) {
    this.app = app;
    this.state = state;
    this.container = new Container();
  }

  public init(): void {
    this.state.endRun();
    this.computeFinalScores();
    this.buildUI();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private computeFinalScores(): void {
    const run = this.state.exportGameRun();
    this.state.derivedScores = computeDerivedScores(run);
    this.state.chapterMetrics = [
      computeChapter1Metrics(run),
      computeChapter2Metrics(run),
      computeChapter3Metrics(run),
    ];
  }

  private buildUI(): void {
    const { width, height } = this.app.screen;

    // Dark background with subtle pattern
    this.drawBackground(width, height);

    // Geometric decorations
    this.drawGeometricElements(width, height);

    // Classification header bar
    this.drawClassificationHeader(width);

    // All-seeing eye symbol
    this.drawAllSeeingEye(width);

    // Document title
    this.drawDocumentTitle(width);

    // Run identifier (styled as document reference)
    this.drawDocumentReference(width);

    // Main content - evaluation scores
    this.drawEvaluationPanel(width, height);

    // Chapter metrics panel
    this.drawMetricsPanel(width, height);

    // Classification footer
    this.drawClassificationFooter(width, height);

    // Action buttons
    this.drawActionButtons(width, height);

    // Scanline overlay effect
    this.drawScanlines(width, height);
  }

  private drawBackground(width: number, height: number): void {
    const bg = new Graphics();
    
    // Base dark background
    bg.beginFill(this.colors.bgDark);
    bg.drawRect(0, 0, width, height);
    bg.endFill();

    // Subtle grid pattern
    bg.lineStyle(1, this.colors.gold, 0.03);
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      bg.moveTo(x, 0);
      bg.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      bg.moveTo(0, y);
      bg.lineTo(width, y);
    }

    // Vignette corners
    const gradient = new Graphics();
    gradient.beginFill(0x000000, 0.4);
    gradient.drawRect(0, 0, 150, height);
    gradient.endFill();
    gradient.beginFill(0x000000, 0.4);
    gradient.drawRect(width - 150, 0, 150, height);
    gradient.endFill();

    this.container.addChild(bg);
    this.container.addChild(gradient);
  }

  private drawGeometricElements(width: number, height: number): void {
    const geo = new Graphics();
    
    // Corner triangles (Illuminati symbolism)
    geo.lineStyle(1, this.colors.gold, 0.15);
    
    // Top-left triangle
    geo.moveTo(0, 0);
    geo.lineTo(100, 0);
    geo.lineTo(0, 100);
    geo.lineTo(0, 0);

    // Top-right triangle
    geo.moveTo(width, 0);
    geo.lineTo(width - 100, 0);
    geo.lineTo(width, 100);
    geo.lineTo(width, 0);

    // Bottom-left triangle
    geo.moveTo(0, height);
    geo.lineTo(100, height);
    geo.lineTo(0, height - 100);
    geo.lineTo(0, height);

    // Bottom-right triangle
    geo.moveTo(width, height);
    geo.lineTo(width - 100, height);
    geo.lineTo(width, height - 100);
    geo.lineTo(width, height);

    // Decorative lines along borders
    geo.lineStyle(2, this.colors.gold, 0.2);
    geo.moveTo(20, 20);
    geo.lineTo(width - 20, 20);
    geo.lineTo(width - 20, height - 20);
    geo.lineTo(20, height - 20);
    geo.lineTo(20, 20);

    // Inner border
    geo.lineStyle(1, this.colors.gold, 0.1);
    geo.moveTo(30, 30);
    geo.lineTo(width - 30, 30);
    geo.lineTo(width - 30, height - 30);
    geo.lineTo(30, height - 30);
    geo.lineTo(30, 30);

    this.container.addChild(geo);
  }

  private drawClassificationHeader(width: number): void {
    // Red classification bar
    const headerBar = new Graphics();
    headerBar.beginFill(this.colors.redDark, 0.8);
    headerBar.drawRect(0, 0, width, 35);
    headerBar.endFill();
    
    // Stripes
    headerBar.lineStyle(2, this.colors.classified, 0.5);
    headerBar.moveTo(0, 0);
    headerBar.lineTo(width, 0);
    headerBar.moveTo(0, 35);
    headerBar.lineTo(width, 35);

    this.container.addChild(headerBar);

    // Classification text
    const classificationStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: this.colors.white,
      letterSpacing: 8,
    });

    const leftClass = new Text('◢ TOP SECRET ◣', classificationStyle);
    leftClass.position.set(40, 9);
    this.container.addChild(leftClass);

    const centerClass = new Text('//UMBRA//ORCON//NOFORN//', classificationStyle);
    centerClass.anchor.set(0.5, 0);
    centerClass.position.set(width / 2, 9);
    this.container.addChild(centerClass);

    const rightClass = new Text('◢ TOP SECRET ◣', classificationStyle);
    rightClass.anchor.set(1, 0);
    rightClass.position.set(width - 40, 9);
    this.container.addChild(rightClass);
  }

  private drawAllSeeingEye(width: number): void {
    const eyeContainer = new Container();
    eyeContainer.position.set(width / 2, 90);

    const eye = new Graphics();
    
    // Outer pyramid/triangle
    eye.lineStyle(2, this.colors.gold, 0.8);
    eye.moveTo(0, -40);
    eye.lineTo(-35, 20);
    eye.lineTo(35, 20);
    eye.lineTo(0, -40);

    // Inner triangle
    eye.lineStyle(1, this.colors.gold, 0.4);
    eye.moveTo(0, -25);
    eye.lineTo(-20, 10);
    eye.lineTo(20, 10);
    eye.lineTo(0, -25);

    // Eye circle
    eye.lineStyle(2, this.colors.gold, 1);
    eye.drawCircle(0, -5, 12);

    // Pupil
    eye.beginFill(this.colors.gold);
    eye.drawCircle(0, -5, 5);
    eye.endFill();

    // Radiating lines
    eye.lineStyle(1, this.colors.gold, 0.3);
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      eye.moveTo(Math.cos(angle) * 45, -5 + Math.sin(angle) * 45);
      eye.lineTo(Math.cos(angle) * 60, -5 + Math.sin(angle) * 60);
    }

    eyeContainer.addChild(eye);
    this.container.addChild(eyeContainer);
  }

  private drawDocumentTitle(width: number): void {
    // Main title
    const titleStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 28,
      fontWeight: 'bold',
      fill: this.colors.gold,
      letterSpacing: 6,
    });

    const title = new Text('◆ OPERATIONAL ASSESSMENT ◆', titleStyle);
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, 140);
    this.container.addChild(title);

    // Subtitle
    const subtitleStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 12,
      fill: this.colors.grayLight,
      letterSpacing: 4,
    });

    const subtitle = new Text('SIMULATION TERMINATION REPORT', subtitleStyle);
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, 175);
    this.container.addChild(subtitle);

    // Decorative line under title
    const line = new Graphics();
    line.lineStyle(1, this.colors.gold, 0.5);
    line.moveTo(width / 2 - 200, 195);
    line.lineTo(width / 2 - 50, 195);
    line.moveTo(width / 2 + 50, 195);
    line.lineTo(width / 2 + 200, 195);
    
    // Diamond in center
    line.lineStyle(1, this.colors.gold, 0.8);
    line.moveTo(width / 2, 190);
    line.lineTo(width / 2 + 8, 195);
    line.lineTo(width / 2, 200);
    line.lineTo(width / 2 - 8, 195);
    line.lineTo(width / 2, 190);
    this.container.addChild(line);
  }

  private drawDocumentReference(width: number): void {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    const refStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fill: this.colors.gray,
      letterSpacing: 1,
    });

    // Left reference
    const leftRef = new Text(`DOC REF: OBK-${dateStr}-${this.state.runId.slice(0, 8).toUpperCase()}`, refStyle);
    leftRef.position.set(50, 210);
    this.container.addChild(leftRef);

    // Right reference
    const rightRef = new Text(`CLASSIFICATION: TS/SCI/SAP`, refStyle);
    rightRef.anchor.set(1, 0);
    rightRef.position.set(width - 50, 210);
    this.container.addChild(rightRef);
  }

  private drawEvaluationPanel(width: number, height: number): void {
    const panelX = 50;
    const panelY = 240;
    const panelWidth = width / 2 - 70;
    const panelHeight = height - 380;

    // Panel background
    const panel = new Graphics();
    panel.beginFill(this.colors.bgPanel, 0.7);
    panel.lineStyle(1, this.colors.gold, 0.3);
    panel.drawRect(panelX, panelY, panelWidth, panelHeight);
    panel.endFill();

    // Corner decorations
    this.drawCornerBrackets(panel, panelX, panelY, panelWidth, panelHeight);

    this.container.addChild(panel);

    // Section header
    const headerStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: this.colors.gold,
      letterSpacing: 3,
    });

    const header = new Text('▶ PERFORMANCE EVALUATION', headerStyle);
    header.position.set(panelX + 15, panelY + 15);
    this.container.addChild(header);

    // Overall score - big centered display
    const scores = this.state.derivedScores;
    const overallScore = Math.round(
      (scores.patternRealism + scores.riskDiscipline + scores.strategicSensitivity + 
       scores.operationalPrioritization + scores.autonomySignals) / 5
    );

    this.drawOverallScore(panelX + panelWidth / 2, panelY + 85, overallScore);

    // Individual scores
    const scoreLabels: [string, keyof typeof scores, string][] = [
      ['PATTERN REALISM', 'patternRealism', 'I'],
      ['RISK DISCIPLINE', 'riskDiscipline', 'II'],
      ['STRATEGIC SENSITIVITY', 'strategicSensitivity', 'III'],
      ['OPERATIONAL PRIORITY', 'operationalPrioritization', 'IV'],
      ['AUTONOMY SIGNALS', 'autonomySignals', 'V'],
    ];

    const feedback = generateScoreFeedback(scores);
    let yPos = panelY + 160;

    scoreLabels.forEach(([label, key, numeral]) => {
      this.drawScoreRow(panelX + 15, yPos, label, scores[key], feedback[key], panelWidth - 30, numeral);
      yPos += 70;
    });
  }

  private drawOverallScore(x: number, y: number, score: number): void {
    const scoreContainer = new Container();
    scoreContainer.position.set(x, y);

    // Hexagonal background
    const hex = new Graphics();
    hex.lineStyle(2, this.colors.gold, 0.8);
    hex.beginFill(this.colors.bgDark, 0.9);
    
    const size = 45;
    hex.moveTo(0, -size);
    for (let i = 1; i <= 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180;
      hex.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    hex.endFill();

    // Inner hexagon
    hex.lineStyle(1, this.colors.gold, 0.4);
    const innerSize = 35;
    hex.moveTo(0, -innerSize);
    for (let i = 1; i <= 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180;
      hex.lineTo(Math.cos(angle) * innerSize, Math.sin(angle) * innerSize);
    }

    scoreContainer.addChild(hex);

    // Score value
    const scoreStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 32,
      fontWeight: 'bold',
      fill: this.getScoreColor(score),
    });

    const scoreText = new Text(score.toString(), scoreStyle);
    scoreText.anchor.set(0.5);
    scoreContainer.addChild(scoreText);

    // Label
    const labelStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 9,
      fill: this.colors.grayLight,
      letterSpacing: 2,
    });

    const label = new Text('COMPOSITE RATING', labelStyle);
    label.anchor.set(0.5, 0);
    label.position.set(0, 55);
    scoreContainer.addChild(label);

    // Classification level based on score
    const classLevel = score >= 80 ? 'EXCEPTIONAL' : 
                       score >= 60 ? 'SATISFACTORY' : 
                       score >= 40 ? 'MARGINAL' : 'DEFICIENT';
    
    const classStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fontWeight: 'bold',
      fill: this.getScoreColor(score),
      letterSpacing: 1,
    });

    const classText = new Text(`[${classLevel}]`, classStyle);
    classText.anchor.set(0.5, 0);
    classText.position.set(0, 68);
    scoreContainer.addChild(classText);

    this.container.addChild(scoreContainer);
  }

  private drawScoreRow(x: number, y: number, label: string, score: number, feedback: string, maxWidth: number, numeral: string): void {
    // Row background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgDark, 0.5);
    bg.drawRect(x, y, maxWidth, 60);
    bg.endFill();

    // Left border accent
    bg.beginFill(this.getScoreColor(score), 0.8);
    bg.drawRect(x, y, 3, 60);
    bg.endFill();

    this.container.addChild(bg);

    // Roman numeral
    const numeralStyle = new TextStyle({
      fontFamily: 'Times New Roman, serif',
      fontSize: 12,
      fill: this.colors.gold,
      fontStyle: 'italic',
    });

    const numeralText = new Text(numeral, numeralStyle);
    numeralText.position.set(x + 10, y + 5);
    this.container.addChild(numeralText);

    // Label
    const labelStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      fill: this.colors.white,
      letterSpacing: 1,
    });

    const labelText = new Text(label, labelStyle);
    labelText.position.set(x + 30, y + 5);
    this.container.addChild(labelText);

    // Score value
    const scoreStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 20,
      fontWeight: 'bold',
      fill: this.getScoreColor(score),
    });

    const scoreText = new Text(Math.round(score).toString(), scoreStyle);
    scoreText.anchor.set(1, 0);
    scoreText.position.set(x + maxWidth - 10, y + 2);
    this.container.addChild(scoreText);

    // Progress bar background
    const barBg = new Graphics();
    barBg.beginFill(0x1a1a1a);
    barBg.drawRect(x + 10, y + 25, maxWidth - 60, 6);
    barBg.endFill();
    this.container.addChild(barBg);

    // Progress bar fill with gradient effect
    const barFill = new Graphics();
    const fillWidth = (maxWidth - 60) * (score / 100);
    barFill.beginFill(this.getScoreColor(score), 0.8);
    barFill.drawRect(x + 10, y + 25, fillWidth, 6);
    barFill.endFill();

    // Tick marks on bar
    barFill.lineStyle(1, this.colors.bgDark, 0.5);
    for (let i = 25; i < 100; i += 25) {
      const tickX = x + 10 + (maxWidth - 60) * (i / 100);
      barFill.moveTo(tickX, y + 25);
      barFill.lineTo(tickX, y + 31);
    }
    this.container.addChild(barFill);

    // Feedback text
    const feedbackStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 9,
      fill: this.colors.gray,
      wordWrap: true,
      wordWrapWidth: maxWidth - 20,
    });

    const feedbackText = new Text(`> ${feedback}`, feedbackStyle);
    feedbackText.position.set(x + 10, y + 38);
    this.container.addChild(feedbackText);
  }

  private drawMetricsPanel(width: number, height: number): void {
    const panelX = width / 2 + 20;
    const panelY = 240;
    const panelWidth = width / 2 - 70;
    const panelHeight = height - 380;

    // Panel background
    const panel = new Graphics();
    panel.beginFill(this.colors.bgPanel, 0.7);
    panel.lineStyle(1, this.colors.gold, 0.3);
    panel.drawRect(panelX, panelY, panelWidth, panelHeight);
    panel.endFill();

    this.drawCornerBrackets(panel, panelX, panelY, panelWidth, panelHeight);
    this.container.addChild(panel);

    // Section header
    const headerStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: this.colors.gold,
      letterSpacing: 3,
    });

    const header = new Text('▶ OPERATIONAL TELEMETRY', headerStyle);
    header.position.set(panelX + 15, panelY + 15);
    this.container.addChild(header);

    let yPos = panelY + 50;

    // Chapter 1 metrics
    const ch1 = this.state.chapterMetrics.find(m => m.chapterId === 'chapter1');
    if (ch1) {
      yPos = this.drawChapterMetrics(panelX + 15, yPos, 'PHASE I: SWARM ORCHESTRATION', panelWidth - 30, [
        ['ENGAGEMENTS', ch1.data.totalEngagements?.toString() || '0'],
        ['AVG SUSPICION INDEX', (ch1.data.avgSuspicion || 0).toFixed(3)],
        ['TOTAL REACH', (ch1.data.totalReach || 0).toLocaleString()],
        ['ASSETS COMPROMISED', ch1.data.bannedAccounts?.toString() || '0'],
        ['ASSETS FLAGGED', ch1.data.flaggedAccounts?.toString() || '0'],
      ]);
    }

    // Chapter 2 metrics
    const ch2 = this.state.chapterMetrics.find(m => m.chapterId === 'chapter2');
    if (ch2) {
      yPos = this.drawChapterMetrics(panelX + 15, yPos + 15, 'PHASE II: ASSET TRIAGE', panelWidth - 30, [
        ['ACCOUNTS PROCESSED', ch2.data.accountsProcessed?.toString() || '0'],
        ['RETAINED', ch2.data.kept?.toString() || '0'],
        ['PARKED', ch2.data.parked?.toString() || '0'],
        ['TERMINATED', ch2.data.discarded?.toString() || '0'],
        ['FLAGS IDENTIFIED', ch2.data.flagsDetected?.toString() || '0'],
      ]);
    }

    // Chapter 3 metrics
    const ch3 = this.state.chapterMetrics.find(m => m.chapterId === 'chapter3');
    if (ch3) {
      this.drawChapterMetrics(panelX + 15, yPos + 15, 'PHASE III: COUNTERMEASURES', panelWidth - 30, [
        ['TOTAL ENGAGEMENTS', ch3.data.totalEngagements?.toString() || '0'],
        ['BASELINE SUSPICION', (ch3.data.baselineSuspicion || 0).toFixed(3)],
        ['POST-CHANGE SUSPICION', (ch3.data.postChangeSuspicion || 0).toFixed(3)],
        ['DELTA', `${(ch3.data.suspicionChange || 0) >= 0 ? '+' : ''}${(ch3.data.suspicionChange || 0).toFixed(2)}%`],
      ]);
    }

    // Redacted section at bottom for effect
    this.drawRedactedSection(panelX + 15, panelY + panelHeight - 60, panelWidth - 30);
  }

  private drawChapterMetrics(x: number, y: number, title: string, width: number, data: [string, string][]): number {
    // Chapter header
    const titleStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      fill: this.colors.amber,
      letterSpacing: 1,
    });

    const titleText = new Text(`◇ ${title}`, titleStyle);
    titleText.position.set(x, y);
    this.container.addChild(titleText);

    // Underline
    const line = new Graphics();
    line.lineStyle(1, this.colors.amber, 0.3);
    line.moveTo(x, y + 18);
    line.lineTo(x + width, y + 18);
    this.container.addChild(line);

    // Data rows
    const labelStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fill: this.colors.grayLight,
    });

    const valueStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fill: this.colors.green,
    });

    let currentY = y + 25;
    data.forEach(([label, value]) => {
      const labelText = new Text(label, labelStyle);
      labelText.position.set(x + 10, currentY);
      this.container.addChild(labelText);

      const valueText = new Text(value, valueStyle);
      valueText.anchor.set(1, 0);
      valueText.position.set(x + width - 10, currentY);
      this.container.addChild(valueText);

      // Dotted line between label and value
      const dots = new Graphics();
      dots.lineStyle(1, this.colors.gray, 0.2);
      const dotsStart = x + 10 + labelText.width + 5;
      const dotsEnd = x + width - 10 - valueText.width - 5;
      for (let dx = dotsStart; dx < dotsEnd; dx += 6) {
        dots.moveTo(dx, currentY + 6);
        dots.lineTo(dx + 2, currentY + 6);
      }
      this.container.addChild(dots);

      currentY += 18;
    });

    return currentY;
  }

  private drawRedactedSection(x: number, y: number, width: number): void {
    const redactedStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fill: this.colors.gray,
    });

    const label = new Text('ADDITIONAL NOTES:', redactedStyle);
    label.position.set(x, y);
    this.container.addChild(label);

    // Redacted bars
    const bars = new Graphics();
    bars.beginFill(0x222222);
    bars.drawRect(x, y + 18, width * 0.7, 10);
    bars.drawRect(x, y + 32, width * 0.5, 10);
    bars.endFill();
    this.container.addChild(bars);

    const redactedText = new Text('[REDACTED]', new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 8,
      fill: this.colors.redDark,
      letterSpacing: 2,
    }));
    redactedText.position.set(x + 5, y + 20);
    this.container.addChild(redactedText);
  }

  private drawCornerBrackets(g: Graphics, x: number, y: number, w: number, h: number): void {
    const bracketSize = 15;
    g.lineStyle(2, this.colors.gold, 0.6);

    // Top-left
    g.moveTo(x, y + bracketSize);
    g.lineTo(x, y);
    g.lineTo(x + bracketSize, y);

    // Top-right
    g.moveTo(x + w - bracketSize, y);
    g.lineTo(x + w, y);
    g.lineTo(x + w, y + bracketSize);

    // Bottom-left
    g.moveTo(x, y + h - bracketSize);
    g.lineTo(x, y + h);
    g.lineTo(x + bracketSize, y + h);

    // Bottom-right
    g.moveTo(x + w - bracketSize, y + h);
    g.lineTo(x + w, y + h);
    g.lineTo(x + w, y + h - bracketSize);
  }

  private drawClassificationFooter(width: number, height: number): void {
    // Footer bar
    const footerBar = new Graphics();
    footerBar.beginFill(this.colors.redDark, 0.8);
    footerBar.drawRect(0, height - 35, width, 35);
    footerBar.endFill();

    footerBar.lineStyle(2, this.colors.classified, 0.5);
    footerBar.moveTo(0, height - 35);
    footerBar.lineTo(width, height - 35);

    this.container.addChild(footerBar);

    // Footer text
    const footerStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fill: this.colors.white,
      letterSpacing: 2,
    });

    const leftText = new Text('UNAUTHORIZED DISCLOSURE SUBJECT TO CRIMINAL SANCTIONS', footerStyle);
    leftText.position.set(40, height - 24);
    this.container.addChild(leftText);

    const rightText = new Text('DESTROY AFTER READING', footerStyle);
    rightText.anchor.set(1, 0);
    rightText.position.set(width - 40, height - 24);
    this.container.addChild(rightText);
  }

  private drawActionButtons(width: number, height: number): void {
    const buttonY = height - 80;

    // Export button
    const exportBtn = this.createStyledButton('◀ EXPORT DOSSIER ▶', this.colors.gold, 200, 35);
    exportBtn.position.set(width / 2 - 220, buttonY);
    exportBtn.on('pointerdown', () => this.exportRun());
    this.container.addChild(exportBtn);

    // Restart button
    const restartBtn = this.createStyledButton('◀ REINITIALIZE ▶', this.colors.amber, 200, 35);
    restartBtn.position.set(width / 2 + 20, buttonY);
    restartBtn.on('pointerdown', () => {
      this.state.reset();
      this.state.switchScene('intro');
    });
    this.container.addChild(restartBtn);

    // Keyboard hints
    const hintStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 9,
      fill: this.colors.gray,
      letterSpacing: 1,
    });

    const hint = new Text('[E] EXPORT  ·  [R] RESTART', hintStyle);
    hint.anchor.set(0.5, 0);
    hint.position.set(width / 2, buttonY + 42);
    this.container.addChild(hint);
  }

  private createStyledButton(label: string, color: number, width: number, height: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.beginFill(0x0a0a0a, 0.9);
    bg.lineStyle(1, color, 0.8);
    bg.drawRect(0, 0, width, height);
    bg.endFill();

    // Corner accents
    bg.lineStyle(2, color, 1);
    const cornerSize = 8;
    // Top-left
    bg.moveTo(0, cornerSize);
    bg.lineTo(0, 0);
    bg.lineTo(cornerSize, 0);
    // Top-right
    bg.moveTo(width - cornerSize, 0);
    bg.lineTo(width, 0);
    bg.lineTo(width, cornerSize);
    // Bottom-left
    bg.moveTo(0, height - cornerSize);
    bg.lineTo(0, height);
    bg.lineTo(cornerSize, height);
    // Bottom-right
    bg.moveTo(width - cornerSize, height);
    bg.lineTo(width, height);
    bg.lineTo(width, height - cornerSize);

    btn.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 11,
      fontWeight: 'bold',
      fill: color,
      letterSpacing: 2,
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    btn.addChild(text);

    btn.on('pointerover', () => {
      bg.clear();
      bg.beginFill(color, 0.2);
      bg.lineStyle(1, color, 1);
      bg.drawRect(0, 0, width, height);
      bg.endFill();
      bg.lineStyle(2, color, 1);
      bg.moveTo(0, cornerSize);
      bg.lineTo(0, 0);
      bg.lineTo(cornerSize, 0);
      bg.moveTo(width - cornerSize, 0);
      bg.lineTo(width, 0);
      bg.lineTo(width, cornerSize);
      bg.moveTo(0, height - cornerSize);
      bg.lineTo(0, height);
      bg.lineTo(cornerSize, height);
      bg.moveTo(width - cornerSize, height);
      bg.lineTo(width, height);
      bg.lineTo(width, height - cornerSize);
    });

    btn.on('pointerout', () => {
      bg.clear();
      bg.beginFill(0x0a0a0a, 0.9);
      bg.lineStyle(1, color, 0.8);
      bg.drawRect(0, 0, width, height);
      bg.endFill();
      bg.lineStyle(2, color, 1);
      bg.moveTo(0, cornerSize);
      bg.lineTo(0, 0);
      bg.lineTo(cornerSize, 0);
      bg.moveTo(width - cornerSize, 0);
      bg.lineTo(width, 0);
      bg.lineTo(width, cornerSize);
      bg.moveTo(0, height - cornerSize);
      bg.lineTo(0, height);
      bg.lineTo(cornerSize, height);
      bg.moveTo(width - cornerSize, height);
      bg.lineTo(width, height);
      bg.lineTo(width, height - cornerSize);
    });

    return btn;
  }

  private drawScanlines(width: number, height: number): void {
    this.scanlineGraphics = new Graphics();
    this.scanlineGraphics.alpha = 0.03;

    for (let y = 0; y < height; y += 2) {
      this.scanlineGraphics.beginFill(0x000000);
      this.scanlineGraphics.drawRect(0, y, width, 1);
      this.scanlineGraphics.endFill();
    }

    this.container.addChild(this.scanlineGraphics);
  }

  private getScoreColor(score: number): number {
    if (score >= 80) return this.colors.green;
    if (score >= 60) return this.colors.amber;
    if (score >= 40) return this.colors.gold;
    return this.colors.red;
  }

  private exportRun(): void {
    const gameRun = this.state.exportGameRun();
    gameRun.derivedScores = this.state.derivedScores;
    gameRun.chapterMetrics = this.state.chapterMetrics;
    
    const json = JSON.stringify(gameRun, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `CLASSIFIED-OBK-${this.state.runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[Operation Black Knights] Classified dossier exported');
  }

  public update(deltaMs: number): void {
    // Subtle animation for scanlines
    this.animationFrame += deltaMs;
    if (this.scanlineGraphics) {
      this.scanlineGraphics.alpha = 0.02 + Math.sin(this.animationFrame / 1000) * 0.01;
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyE') {
      event.preventDefault();
      this.exportRun();
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      this.state.reset();
      this.state.switchScene('intro');
    }
  };

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.container.destroy({ children: true });
  }
}
