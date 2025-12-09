import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { SimTweet } from '../../core/types';

/**
 * TweetCard - Visual representation of a tweet in the timeline
 * 
 * Displays:
 * - Author type icon
 * - Time since posted
 * - Current impressions and depth
 * - Objective indicator
 */
export class TweetCard extends Container {
  private background: Graphics;
  private authorText: Text;
  private metricsText: Text;
  private tweet: SimTweet | null = null;

  constructor() {
    super();

    // Create background
    this.background = new Graphics();
    this.addChild(this.background);

    // Create author text
    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xffffff,
    });

    this.authorText = new Text('', textStyle);
    this.authorText.position.set(10, 10);
    this.addChild(this.authorText);

    // Create metrics text
    this.metricsText = new Text('', textStyle);
    this.metricsText.position.set(10, 30);
    this.addChild(this.metricsText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.background.clear();
    this.background.beginFill(0x1a1a2e);
    this.background.lineStyle(1, 0x4a4a6a);
    this.background.drawRoundedRect(0, 0, 200, 80, 8);
    this.background.endFill();
  }

  public setTweet(tweet: SimTweet): void {
    this.tweet = tweet;
    this.updateDisplay();
  }

  public updateDisplay(): void {
    if (!this.tweet) return;

    this.authorText.text = `[${this.tweet.authorType}]`;
    this.metricsText.text = `${this.tweet.liveMetrics.impressions} imp | ${this.tweet.liveMetrics.depthScore} depth`;
  }

  public override destroy(): void {
    super.destroy({ children: true });
  }
}
