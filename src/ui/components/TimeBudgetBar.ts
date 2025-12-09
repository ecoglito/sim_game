import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * TimeBudgetBar - Visual bar showing remaining time budget
 * 
 * Used in Chapter 2 to show triage time remaining.
 */
export class TimeBudgetBar extends Container {
  private background: Graphics;
  private fillBar: Graphics;
  private labelText: Text;
  private timeText: Text;

  private maxTime: number = 60;
  private currentTime: number = 60;
  private readonly barWidth: number;
  private readonly barHeight: number;

  constructor(width: number = 200, height: number = 24) {
    super();

    this.barWidth = width;
    this.barHeight = height;

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

    this.labelText = new Text('TIME REMAINING', labelStyle);
    this.labelText.position.set(0, -18);
    this.addChild(this.labelText);

    // Create time text
    const timeStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    this.timeText = new Text('60:00', timeStyle);
    this.timeText.anchor.set(1, 0);
    this.timeText.position.set(this.barWidth, -18);
    this.addChild(this.timeText);

    this.drawBackground();
    this.updateFill();
  }

  private drawBackground(): void {
    this.background.clear();
    this.background.beginFill(0x1a1a2e);
    this.background.lineStyle(1, 0x4a4a6a);
    this.background.drawRoundedRect(0, 0, this.barWidth, this.barHeight, 4);
    this.background.endFill();
  }

  private getColor(): number {
    const ratio = this.currentTime / this.maxTime;
    if (ratio > 0.5) return 0x4dabf7; // blue
    if (ratio > 0.25) return 0xffd43b; // yellow
    return 0xff6b6b; // red
  }

  private updateFill(): void {
    this.fillBar.clear();

    const ratio = this.currentTime / this.maxTime;
    const fillWidth = ratio * (this.barWidth - 4);
    
    if (fillWidth > 0) {
      this.fillBar.beginFill(this.getColor());
      this.fillBar.drawRoundedRect(2, 2, fillWidth, this.barHeight - 4, 3);
      this.fillBar.endFill();
    }

    // Format time as MM:SS
    const minutes = Math.floor(this.currentTime);
    const seconds = Math.floor((this.currentTime - minutes) * 60);
    this.timeText.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public setMaxTime(minutes: number): void {
    this.maxTime = minutes;
    this.currentTime = Math.min(this.currentTime, this.maxTime);
    this.updateFill();
  }

  public setCurrentTime(minutes: number): void {
    this.currentTime = Math.max(0, Math.min(this.maxTime, minutes));
    this.updateFill();
  }

  public deductTime(minutes: number): boolean {
    if (this.currentTime < minutes) return false;
    this.currentTime -= minutes;
    this.updateFill();
    return true;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public override destroy(): void {
    super.destroy({ children: true });
  }
}
