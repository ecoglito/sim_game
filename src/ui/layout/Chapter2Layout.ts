import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';

/**
 * Chapter2Layout - Layout manager for Account Triage scene
 * 
 * Manages:
 * - Left panel: Incoming account queue
 * - Center panel: Account detail editor
 * - Right panel: Briefing and time budget
 */
export class Chapter2Layout {
  public readonly container: Container;

  private readonly app: Application;

  // Layout regions
  public accountQueueRegion: Container;
  public accountEditorRegion: Container;
  public briefingPanelRegion: Container;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();

    // Create regions
    this.accountQueueRegion = new Container();
    this.accountEditorRegion = new Container();
    this.briefingPanelRegion = new Container();

    this.container.addChild(this.accountQueueRegion);
    this.container.addChild(this.accountEditorRegion);
    this.container.addChild(this.briefingPanelRegion);

    this.layoutRegions();
  }

  private layoutRegions(): void {
    const width = this.app.screen.width;

    // Three-column layout
    const leftWidth = 280;
    const rightWidth = 300;
    const centerWidth = width - leftWidth - rightWidth;

    // Account queue on left
    this.accountQueueRegion.position.set(0, 0);
    // TODO: Set bounds/mask

    // Account editor in center
    this.accountEditorRegion.position.set(leftWidth, 0);
    // TODO: Set bounds/mask

    // Briefing panel on right
    this.briefingPanelRegion.position.set(leftWidth + centerWidth, 0);
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
