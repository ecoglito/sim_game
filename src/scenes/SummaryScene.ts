import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IScene } from '../core/Game';
import type { GameState } from '../core/GameState';
import { 
  computeDerivedScores, 
  computeChapter1Metrics,
  computeChapter2Metrics,
  computeChapter3Metrics,
} from '../core/metrics';

/**
 * SummaryScene - Submission complete screen (NO SCORES SHOWN TO PLAYER)
 * Scores are computed and submitted but only visible to admins.
 */
export class SummaryScene implements IScene {
  public readonly container: Container;
  private readonly app: Application;
  private readonly state: GameState;
  private animationFrame: number = 0;
  private scanlineGraphics: Graphics | null = null;
  private isSubmitting: boolean = false;
  private isSubmitted: boolean = false;

  // Color palette
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
    this.submitResults();
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

  private async submitResults(): Promise<void> {
    if (this.isSubmitting || this.isSubmitted) return;
    
    this.isSubmitting = true;
    this.updateSubmitStatus('Submitting results...');

    try {
      const gameRun = this.state.exportGameRun();
      gameRun.derivedScores = this.state.derivedScores;
      gameRun.chapterMetrics = this.state.chapterMetrics;

      const response = await fetch('/api/game/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameRun),
      });

      if (response.ok) {
        this.isSubmitted = true;
        this.updateSubmitStatus('Results submitted successfully!');
      } else {
        this.updateSubmitStatus('Submission complete.');
      }
    } catch (error) {
      console.error('Failed to submit results:', error);
      this.updateSubmitStatus('Submission complete.');
    } finally {
      this.isSubmitting = false;
    }
  }

  private updateSubmitStatus(message: string): void {
    const statusText = this.container.children.find(c => c.name === 'submitStatus') as Text;
    if (statusText) {
      statusText.text = message;
      if (message.includes('successfully')) {
        statusText.style.fill = this.colors.green;
      }
    }
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

    // Thank you message
    this.drawThankYouMessage(width, height);

    // Classification footer
    this.drawClassificationFooter(width, height);

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
    
    // Corner triangles
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
    eyeContainer.position.set(width / 2, 120);

    const eye = new Graphics();
    
    // Outer pyramid/triangle
    eye.lineStyle(2, this.colors.gold, 0.8);
    eye.moveTo(0, -50);
    eye.lineTo(-45, 30);
    eye.lineTo(45, 30);
    eye.lineTo(0, -50);

    // Inner triangle
    eye.lineStyle(1, this.colors.gold, 0.4);
    eye.moveTo(0, -30);
    eye.lineTo(-25, 15);
    eye.lineTo(25, 15);
    eye.lineTo(0, -30);

    // Eye circle
    eye.lineStyle(2, this.colors.gold, 1);
    eye.drawCircle(0, -5, 15);

    // Pupil
    eye.beginFill(this.colors.gold);
    eye.drawCircle(0, -5, 6);
    eye.endFill();

    // Radiating lines
    eye.lineStyle(1, this.colors.gold, 0.3);
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      eye.moveTo(Math.cos(angle) * 55, -5 + Math.sin(angle) * 55);
      eye.lineTo(Math.cos(angle) * 75, -5 + Math.sin(angle) * 75);
    }

    eyeContainer.addChild(eye);
    this.container.addChild(eyeContainer);
  }

  private drawThankYouMessage(width: number, height: number): void {
    const centerY = height / 2;

    // Main title
    const titleStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 36,
      fontWeight: 'bold',
      fill: this.colors.gold,
      letterSpacing: 6,
    });

    const title = new Text('SIMULATION COMPLETE', titleStyle);
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, centerY - 80);
    this.container.addChild(title);

    // Decorative line
    const line = new Graphics();
    line.lineStyle(2, this.colors.gold, 0.5);
    line.moveTo(width / 2 - 200, centerY - 35);
    line.lineTo(width / 2 - 50, centerY - 35);
    line.moveTo(width / 2 + 50, centerY - 35);
    line.lineTo(width / 2 + 200, centerY - 35);
    
    // Diamond in center
    line.lineStyle(1, this.colors.gold, 0.8);
    line.moveTo(width / 2, centerY - 45);
    line.lineTo(width / 2 + 10, centerY - 35);
    line.lineTo(width / 2, centerY - 25);
    line.lineTo(width / 2 - 10, centerY - 35);
    line.lineTo(width / 2, centerY - 45);
    this.container.addChild(line);

    // Thank you message
    const messageStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 18,
      fill: this.colors.grayLight,
      letterSpacing: 2,
      align: 'center',
    });

    const message = new Text('Thank you for completing the assessment.', messageStyle);
    message.anchor.set(0.5, 0);
    message.position.set(width / 2, centerY);
    this.container.addChild(message);

    // Sub-message
    const subMessageStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      fill: this.colors.gray,
      letterSpacing: 1,
      align: 'center',
    });

    const subMessage = new Text('Your results have been recorded and will be reviewed.', subMessageStyle);
    subMessage.anchor.set(0.5, 0);
    subMessage.position.set(width / 2, centerY + 40);
    this.container.addChild(subMessage);

    // Status text (for submission updates)
    const statusStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 12,
      fill: this.colors.amber,
      letterSpacing: 1,
    });

    const statusText = new Text('Submitting results...', statusStyle);
    statusText.anchor.set(0.5, 0);
    statusText.position.set(width / 2, centerY + 80);
    statusText.name = 'submitStatus';
    this.container.addChild(statusText);

    // Document reference
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    const refStyle = new TextStyle({
      fontFamily: 'Courier New, monospace',
      fontSize: 10,
      fill: this.colors.gray,
      letterSpacing: 1,
    });

    const refText = new Text(`DOC REF: OBK-${dateStr}-${this.state.runId.slice(0, 8).toUpperCase()}`, refStyle);
    refText.anchor.set(0.5, 0);
    refText.position.set(width / 2, centerY + 120);
    this.container.addChild(refText);

    // Panel around message
    const panel = new Graphics();
    panel.lineStyle(1, this.colors.gold, 0.3);
    panel.drawRoundedRect(width / 2 - 300, centerY - 100, 600, 250, 8);
    this.container.addChild(panel);
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

  public update(deltaMs: number): void {
    // Subtle animation for scanlines
    this.animationFrame += deltaMs;
    if (this.scanlineGraphics) {
      this.scanlineGraphics.alpha = 0.02 + Math.sin(this.animationFrame / 1000) * 0.01;
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
