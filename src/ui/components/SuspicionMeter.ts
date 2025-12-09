import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * SuspicionMeter - Visual meter showing current suspicion level (0-100)
 * 
 * Changes color based on thresholds:
 * - Green: 0-39
 * - Yellow: 40-59
 * - Orange: 60-79
 * - Red: 80-100
 */
export class SuspicionMeter extends Container {
  private background: Graphics;
  private fillBar: Graphics;
  private labelText: Text;
  private valueText: Text;
  
  private currentValue: number = 0;
  private readonly meterWidth: number;
  private readonly meterHeight: number;

  constructor(width: number = 200, height: number = 24) {
    super();
    
    this.meterWidth = width;
    this.meterHeight = height;

    // Create background
    this.background = new Graphics();
    this.addChild(this.background);

    // Create fill bar
    this.fillBar = new Graphics();
    this.addChild(this.fillBar);

    // Create label
    const labelStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xaaaaaa,
    });

    this.labelText = new Text('SUSPICION', labelStyle);
    this.labelText.position.set(0, -18);
    this.addChild(this.labelText);

    // Create value text
    const valueStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    this.valueText = new Text('0', valueStyle);
    this.valueText.anchor.set(1, 0);
    this.valueText.position.set(this.meterWidth, -18);
    this.addChild(this.valueText);

    this.drawBackground();
    this.updateFill();
  }

  private drawBackground(): void {
    this.background.clear();
    this.background.beginFill(0x1a1a2e);
    this.background.lineStyle(1, 0x4a4a6a);
    this.background.drawRoundedRect(0, 0, this.meterWidth, this.meterHeight, 4);
    this.background.endFill();
  }

  private getColor(): number {
    if (this.currentValue < 40) return 0x51cf66; // green
    if (this.currentValue < 60) return 0xffd43b; // yellow
    if (this.currentValue < 80) return 0xff922b; // orange
    return 0xff6b6b; // red
  }

  private updateFill(): void {
    this.fillBar.clear();
    
    const fillWidth = (this.currentValue / 100) * (this.meterWidth - 4);
    if (fillWidth > 0) {
      this.fillBar.beginFill(this.getColor());
      this.fillBar.drawRoundedRect(2, 2, fillWidth, this.meterHeight - 4, 3);
      this.fillBar.endFill();
    }

    this.valueText.text = Math.round(this.currentValue).toString();
  }

  public setValue(value: number): void {
    this.currentValue = Math.max(0, Math.min(100, value));
    this.updateFill();
  }

  public getValue(): number {
    return this.currentValue;
  }

  public override destroy(): void {
    super.destroy({ children: true });
  }
}
