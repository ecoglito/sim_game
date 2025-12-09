import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * AnalyticsPanel - Displays analytics data in Chapter 3
 * 
 * Shows:
 * - Bans/flags by account age, followers, persona, frequency
 * - Simple charts or text lists
 */
export class AnalyticsPanel extends Container {
  private background: Graphics;
  private titleText: Text;
  private contentText: Text;

  private readonly panelWidth: number;
  private readonly panelHeight: number;

  constructor(width: number = 280, height: number = 400) {
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

    this.titleText = new Text('ANALYTICS', titleStyle);
    this.titleText.position.set(16, 16);
    this.addChild(this.titleText);

    // Create content placeholder
    const contentStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xaaaaaa,
      wordWrap: true,
      wordWrapWidth: this.panelWidth - 32,
    });

    this.contentText = new Text(
      'Analytics data will appear here.\n\nTrack patterns across:\n- Account age buckets\n- Follower counts\n- Persona types\n- Action frequency',
      contentStyle
    );
    this.contentText.position.set(16, 48);
    this.addChild(this.contentText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.background.clear();
    this.background.beginFill(0x0f0f1a);
    this.background.lineStyle(1, 0x2a2a4a);
    this.background.drawRoundedRect(0, 0, this.panelWidth, this.panelHeight, 8);
    this.background.endFill();
  }

  public updateAnalytics(data: AnalyticsData): void {
    const lines: string[] = [
      `Bans by Age:`,
      `  < 30 days: ${data.bansByAge?.young ?? 0}`,
      `  30-90 days: ${data.bansByAge?.medium ?? 0}`,
      `  > 90 days: ${data.bansByAge?.old ?? 0}`,
      '',
      `Bans by Risk Class:`,
      `  Frontline: ${data.bansByRisk?.frontline ?? 0}`,
      `  Mid: ${data.bansByRisk?.mid ?? 0}`,
      `  Background: ${data.bansByRisk?.background ?? 0}`,
      '',
      `Suspicion per Action: ${(data.suspicionPerAction ?? 0).toFixed(2)}`,
      `Avg Reach: ${data.avgReach ?? 0}`,
    ];

    this.contentText.text = lines.join('\n');
  }

  public override destroy(): void {
    super.destroy({ children: true });
  }
}

export interface AnalyticsData {
  bansByAge?: {
    young: number;
    medium: number;
    old: number;
  };
  bansByRisk?: {
    frontline: number;
    mid: number;
    background: number;
  };
  suspicionPerAction?: number;
  avgReach?: number;
}
