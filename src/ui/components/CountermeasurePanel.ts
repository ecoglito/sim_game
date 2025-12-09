import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * CountermeasurePanel - Controls for adjusting engagement patterns
 * 
 * Provides:
 * - Max actions per account per hour slider
 * - Minimum delay between actions slider
 * - Like/Reply/Retweet ratio controls
 * - Silent browsing injection control
 * - Apply button
 */
export class CountermeasurePanel extends Container {
  private background: Graphics;
  private titleText: Text;
  private settingsText: Text;
  private remainingText: Text;

  private readonly panelWidth: number;
  private readonly panelHeight: number;

  private settings: CountermeasureSettings = {
    maxActionsPerAccountPerHour: 10,
    minDelayBetweenActions: 2,
    likeRatio: 0.5,
    replyRatio: 0.3,
    retweetRatio: 0.2,
    silentBrowsingCount: 0,
  };

  private updatesRemaining: number = 3;

  constructor(width: number = 280, height: number = 300) {
    super();

    this.panelWidth = width;
    this.panelHeight = height;

    // Create background
    this.background = new Graphics();
    this.addChild(this.background);

    // Create title
    const titleStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    this.titleText = new Text('COUNTERMEASURES', titleStyle);
    this.titleText.position.set(16, 16);
    this.addChild(this.titleText);

    // Create remaining updates text
    const remainingStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xff922b,
    });

    this.remainingText = new Text(`${this.updatesRemaining} updates remaining`, remainingStyle);
    this.remainingText.anchor.set(1, 0);
    this.remainingText.position.set(this.panelWidth - 16, 16);
    this.addChild(this.remainingText);

    // Create settings display
    const settingsStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xcccccc,
      wordWrap: true,
      wordWrapWidth: this.panelWidth - 32,
    });

    this.settingsText = new Text('', settingsStyle);
    this.settingsText.position.set(16, 48);
    this.addChild(this.settingsText);

    this.drawBackground();
    this.updateSettingsDisplay();
  }

  private drawBackground(): void {
    this.background.clear();
    this.background.beginFill(0x0f0f1a);
    this.background.lineStyle(1, 0x2a2a4a);
    this.background.drawRoundedRect(0, 0, this.panelWidth, this.panelHeight, 8);
    this.background.endFill();
  }

  private updateSettingsDisplay(): void {
    const lines = [
      `Max Actions/Account/Hour: ${this.settings.maxActionsPerAccountPerHour}`,
      `Min Delay Between Actions: ${this.settings.minDelayBetweenActions} min`,
      '',
      `Engagement Ratios:`,
      `  Likes: ${(this.settings.likeRatio * 100).toFixed(0)}%`,
      `  Replies: ${(this.settings.replyRatio * 100).toFixed(0)}%`,
      `  Retweets: ${(this.settings.retweetRatio * 100).toFixed(0)}%`,
      '',
      `Silent Browsing: ${this.settings.silentBrowsingCount}`,
      '',
      '[Slider controls to be implemented]',
    ];

    this.settingsText.text = lines.join('\n');
    this.remainingText.text = `${this.updatesRemaining} updates remaining`;
  }

  public getSettings(): CountermeasureSettings {
    return { ...this.settings };
  }

  public setSettings(settings: Partial<CountermeasureSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.updateSettingsDisplay();
  }

  public applyUpdate(): boolean {
    if (this.updatesRemaining <= 0) return false;
    this.updatesRemaining--;
    this.updateSettingsDisplay();
    return true;
  }

  public getUpdatesRemaining(): number {
    return this.updatesRemaining;
  }

  public override destroy(): void {
    super.destroy({ children: true });
  }
}

export interface CountermeasureSettings {
  maxActionsPerAccountPerHour: number;
  minDelayBetweenActions: number;
  likeRatio: number;
  replyRatio: number;
  retweetRatio: number;
  silentBrowsingCount: number;
}
