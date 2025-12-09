import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';

/**
 * Chapter1Layout - Layout manager for Swarm Orchestration scene
 * 
 * Manages:
 * - Top region: Tweet timeline
 * - Center panel: Engagement planner
 * - Bottom region: Account grid
 * - Right side: Suspicion meter and notices
 */
export class Chapter1Layout {
  public readonly container: Container;
  
  private readonly app: Application;

  // Layout regions
  public tweetTimelineRegion: Container;
  public engagementPlannerRegion: Container;
  public accountGridRegion: Container;
  public statusPanelRegion: Container;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();

    // Create regions
    this.tweetTimelineRegion = new Container();
    this.engagementPlannerRegion = new Container();
    this.accountGridRegion = new Container();
    this.statusPanelRegion = new Container();

    this.container.addChild(this.tweetTimelineRegion);
    this.container.addChild(this.engagementPlannerRegion);
    this.container.addChild(this.accountGridRegion);
    this.container.addChild(this.statusPanelRegion);

    this.layoutRegions();
  }

  private layoutRegions(): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Status panel on right (280px wide)
    const statusWidth = 280;
    const mainWidth = width - statusWidth;

    // Tweet timeline at top (120px tall)
    this.tweetTimelineRegion.position.set(0, 0);
    // TODO: Set bounds/mask

    // Engagement planner in center
    this.engagementPlannerRegion.position.set(0, 120);
    // TODO: Set bounds/mask

    // Account grid at bottom (remaining height)
    this.accountGridRegion.position.set(0, height * 0.5);
    // TODO: Set bounds/mask

    // Status panel on right
    this.statusPanelRegion.position.set(mainWidth, 0);
    // TODO: Set bounds/mask
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
