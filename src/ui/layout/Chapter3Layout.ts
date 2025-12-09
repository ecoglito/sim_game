import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';

/**
 * Chapter3Layout - Layout manager for Algorithm Countermeasures scene
 * 
 * Reuses much of Chapter 1 layout with additions:
 * - Top region: Tweet timeline
 * - Bottom region: Account grid
 * - Right panel with tabs: Status, Analytics
 * - Top right: Countermeasure panel
 */
export class Chapter3Layout {
  public readonly container: Container;

  private readonly app: Application;

  // Layout regions
  public tweetTimelineRegion: Container;
  public accountGridRegion: Container;
  public statusPanelRegion: Container;
  public analyticsPanelRegion: Container;
  public countermeasurePanelRegion: Container;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();

    // Create regions
    this.tweetTimelineRegion = new Container();
    this.accountGridRegion = new Container();
    this.statusPanelRegion = new Container();
    this.analyticsPanelRegion = new Container();
    this.countermeasurePanelRegion = new Container();

    this.container.addChild(this.tweetTimelineRegion);
    this.container.addChild(this.accountGridRegion);
    this.container.addChild(this.statusPanelRegion);
    this.container.addChild(this.analyticsPanelRegion);
    this.container.addChild(this.countermeasurePanelRegion);

    this.layoutRegions();
  }

  private layoutRegions(): void {
    const width = this.app.screen.width;

    // Right panels (300px wide)
    const rightWidth = 300;
    const mainWidth = width - rightWidth;

    // Tweet timeline at top (120px tall)
    this.tweetTimelineRegion.position.set(0, 0);
    // TODO: Set bounds/mask

    // Account grid at bottom
    this.accountGridRegion.position.set(0, 120);
    // TODO: Set bounds/mask

    // Countermeasure panel at top right
    this.countermeasurePanelRegion.position.set(mainWidth, 0);
    // TODO: Set bounds/mask (300x300)

    // Status panel below countermeasures
    this.statusPanelRegion.position.set(mainWidth, 310);
    // TODO: Set bounds/mask

    // Analytics panel (hidden by default, shown via tab)
    this.analyticsPanelRegion.position.set(mainWidth, 310);
    this.analyticsPanelRegion.visible = false;
    // TODO: Set bounds/mask
  }

  public showStatusPanel(): void {
    this.statusPanelRegion.visible = true;
    this.analyticsPanelRegion.visible = false;
  }

  public showAnalyticsPanel(): void {
    this.statusPanelRegion.visible = false;
    this.analyticsPanelRegion.visible = true;
  }

  public resize(): void {
    this.layoutRegions();
  }

  public update(_deltaMs: number): void {
    // TODO: Update layout components
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
