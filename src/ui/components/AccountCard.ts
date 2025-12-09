import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Account } from '../../core/types';

/**
 * AccountCard - Visual representation of an account in the grid
 * 
 * Displays:
 * - Avatar and display name
 * - Followers count
 * - Persona tags (compact icons)
 * - Risk class
 * - Status
 */
export class AccountCard extends Container {
  private background: Graphics;
  private nameText: Text;
  private detailsText: Text;
  private statusIndicator: Graphics;
  private account: Account | null = null;

  constructor() {
    super();

    // Create background
    this.background = new Graphics();
    this.addChild(this.background);

    // Create status indicator
    this.statusIndicator = new Graphics();
    this.addChild(this.statusIndicator);

    // Create name text
    const nameStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    this.nameText = new Text('', nameStyle);
    this.nameText.position.set(10, 8);
    this.addChild(this.nameText);

    // Create details text
    const detailsStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0xaaaaaa,
    });

    this.detailsText = new Text('', detailsStyle);
    this.detailsText.position.set(10, 26);
    this.addChild(this.detailsText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.background.clear();
    this.background.beginFill(0x16213e);
    this.background.lineStyle(1, 0x2a3f5f);
    this.background.drawRoundedRect(0, 0, 160, 50, 4);
    this.background.endFill();
  }

  private drawStatusIndicator(): void {
    this.statusIndicator.clear();

    let color = 0x51cf66; // active - green
    if (this.account) {
      switch (this.account.status) {
        case 'flagged':
          color = 0xffc078; // orange
          break;
        case 'banned':
          color = 0xff6b6b; // red
          break;
        case 'parked':
          color = 0x748ffc; // blue
          break;
        case 'discarded':
          color = 0x868e96; // gray
          break;
      }
    }

    this.statusIndicator.beginFill(color);
    this.statusIndicator.drawCircle(150, 10, 5);
    this.statusIndicator.endFill();
  }

  public setAccount(account: Account): void {
    this.account = account;
    this.updateDisplay();
  }

  public updateDisplay(): void {
    if (!this.account) return;

    this.nameText.text = this.account.profile.displayName;
    this.detailsText.text = `${this.account.followers} followers | ${this.account.riskClass}`;
    this.drawStatusIndicator();
  }

  public override destroy(): void {
    super.destroy({ children: true });
  }
}
