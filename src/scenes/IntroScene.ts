import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IScene } from '../core/Game';
import type { GameState } from '../core/GameState';

/**
 * IntroScene - Landing screen with briefing
 * Clean, professional design
 */
export class IntroScene implements IScene {
  public readonly container: Container;
  private readonly app: Application;
  private readonly state: GameState;
  private instructionText!: Text;
  private pulseTime = 0;

  constructor(app: Application, state: GameState) {
    this.app = app;
    this.state = state;
    this.container = new Container();
  }

  public init(): void {
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;

    // Background
    const bg = new Graphics();
    bg.beginFill(0x08080c);
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.endFill();
    this.container.addChild(bg);

    // Subtle grid pattern
    const grid = new Graphics();
    grid.lineStyle(1, 0x12121a, 0.5);
    for (let x = 0; x < this.app.screen.width; x += 60) {
      grid.moveTo(x, 0);
      grid.lineTo(x, this.app.screen.height);
    }
    for (let y = 0; y < this.app.screen.height; y += 60) {
      grid.moveTo(0, y);
      grid.lineTo(this.app.screen.width, y);
    }
    this.container.addChild(grid);

    // Main card
    const cardWidth = 700;
    const cardHeight = 480;
    const cardX = centerX - cardWidth / 2;
    const cardY = centerY - cardHeight / 2;

    const card = new Graphics();
    card.beginFill(0x0d0d14);
    card.lineStyle(2, 0x4dabf7, 0.3);
    card.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 16);
    card.endFill();
    this.container.addChild(card);

    // Top accent line
    const accent = new Graphics();
    accent.beginFill(0x4dabf7);
    accent.drawRect(cardX, cardY, cardWidth, 4);
    accent.endFill();
    this.container.addChild(accent);

    // Title
    const title = new Text('OPERATION BLACK KNIGHTS', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: 'bold',
      fill: 0xffffff,
      letterSpacing: 4,
    }));
    title.anchor.set(0.5);
    title.position.set(centerX, cardY + 60);
    this.container.addChild(title);

    // Subtitle
    const subtitle = new Text('X SWARM OPERATIONS SIMULATION', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0x4dabf7,
      letterSpacing: 3,
    }));
    subtitle.anchor.set(0.5);
    subtitle.position.set(centerX, cardY + 100);
    this.container.addChild(subtitle);

    // Divider
    const divider = new Graphics();
    divider.beginFill(0x2a2a3a);
    divider.drawRect(cardX + 60, cardY + 130, cardWidth - 120, 1);
    divider.endFill();
    this.container.addChild(divider);

    // Briefing
    const briefingStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xaaaaaa,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 100,
      lineHeight: 24,
    });

    const briefing = new Text(
      'You are being evaluated on your ability to operate a large fleet of accounts on X.\n\n' +
      'This simulation consists of three chapters:',
      briefingStyle
    );
    briefing.anchor.set(0.5, 0);
    briefing.position.set(centerX, cardY + 155);
    this.container.addChild(briefing);

    // Chapter cards
    const chapters = [
      { num: 'I', title: 'SWARM ORCHESTRATION', desc: 'Coordinate engagement patterns', color: 0x4dabf7 },
      { num: 'II', title: 'ACCOUNT TRIAGE', desc: 'Evaluate and rebuild accounts', color: 0xffc078 },
      { num: 'III', title: 'COUNTERMEASURES', desc: 'Adapt to detection changes', color: 0xff6b6b },
    ];

    const chapterY = cardY + 260;
    const chapterWidth = 190;
    const chapterGap = 20;
    const totalChaptersWidth = chapters.length * chapterWidth + (chapters.length - 1) * chapterGap;
    const startX = centerX - totalChaptersWidth / 2;

    chapters.forEach((ch, i) => {
      const chX = startX + i * (chapterWidth + chapterGap);

      const chBg = new Graphics();
      chBg.beginFill(ch.color, 0.1);
      chBg.lineStyle(1, ch.color, 0.3);
      chBg.drawRoundedRect(chX, chapterY, chapterWidth, 80, 8);
      chBg.endFill();
      this.container.addChild(chBg);

      const chNum = new Text(ch.num, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        fill: ch.color,
      }));
      chNum.position.set(chX + 16, chapterY + 12);
      this.container.addChild(chNum);

      const chTitle = new Text(ch.title, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0xffffff,
        letterSpacing: 1,
      }));
      chTitle.position.set(chX + 16, chapterY + 42);
      this.container.addChild(chTitle);

      const chDesc = new Text(ch.desc, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0x888888,
      }));
      chDesc.position.set(chX + 16, chapterY + 58);
      this.container.addChild(chDesc);
    });

    // Time estimate
    const timeText = new Text('Estimated time: 35-50 minutes', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0x666666,
    }));
    timeText.anchor.set(0.5);
    timeText.position.set(centerX, cardY + 370);
    this.container.addChild(timeText);

    // Start button
    const btnWidth = 220;
    const btnHeight = 50;
    const btnX = centerX - btnWidth / 2;
    const btnY = cardY + cardHeight - 80;

    const startBtn = new Graphics();
    startBtn.beginFill(0x51cf66, 0.2);
    startBtn.lineStyle(2, 0x51cf66);
    startBtn.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 8);
    startBtn.endFill();
    startBtn.eventMode = 'static';
    startBtn.cursor = 'pointer';
    this.container.addChild(startBtn);

    const startText = new Text('START SIMULATION', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0x51cf66,
      letterSpacing: 2,
    }));
    startText.anchor.set(0.5);
    startText.position.set(centerX, btnY + btnHeight / 2);
    this.container.addChild(startText);

    startBtn.on('pointerdown', () => this.state.advanceToNextScene());

    startBtn.on('pointerover', () => {
      startBtn.clear();
      startBtn.beginFill(0x51cf66, 0.4);
      startBtn.lineStyle(2, 0x51cf66);
      startBtn.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 8);
      startBtn.endFill();
    });

    startBtn.on('pointerout', () => {
      startBtn.clear();
      startBtn.beginFill(0x51cf66, 0.2);
      startBtn.lineStyle(2, 0x51cf66);
      startBtn.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 8);
      startBtn.endFill();
    });

    // Footer instruction
    this.instructionText = new Text('Press SPACE or click to begin', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0x555555,
    }));
    this.instructionText.anchor.set(0.5);
    this.instructionText.position.set(centerX, this.app.screen.height - 30);
    this.container.addChild(this.instructionText);

    // Version
    const version = new Text('v1.0  ·  GTE Assessment', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0x333333,
    }));
    version.position.set(20, this.app.screen.height - 30);
    this.container.addChild(version);

    window.addEventListener('keydown', this.handleKeyDown);
  }

  public update(deltaMs: number): void {
    this.pulseTime += deltaMs;
    const pulse = Math.sin(this.pulseTime / 600) * 0.3 + 0.7;
    this.instructionText.alpha = pulse;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.container.destroy({ children: true });
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.state.advanceToNextScene();
    }
  };
}
