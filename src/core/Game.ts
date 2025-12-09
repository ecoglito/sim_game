import { Application, Container } from 'pixi.js';
import type { GameState } from './GameState';
import type { SceneId } from './types';

/**
 * Scene interface - all scenes must implement this
 */
export interface IScene {
  readonly container: Container;
  init(): void;
  update(deltaMs: number): void;
  destroy(): void;
}

/**
 * Scene constructor type
 */
export type SceneConstructor = new (app: Application, state: GameState) => IScene;

/**
 * Game - Main game controller
 * 
 * Manages the PixiJS Application, scene registration, and the main update loop.
 */
export class Game {
  public readonly app: Application;
  private readonly state: GameState;
  private readonly sceneRegistry: Map<SceneId, SceneConstructor> = new Map();
  private activeScene: IScene | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(state: GameState) {
    this.state = state;

    // Create PixiJS Application (PixiJS 7 synchronous API)
    this.app = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x0a0a0f,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    // Set up scene change callback
    this.state.setSceneChangeCallback((sceneId) => this.loadScene(sceneId));

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Initial resize to ensure proper sizing
    this.handleResize();
  }

  /**
   * Get the canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.app.view as HTMLCanvasElement;
  }

  /**
   * Register a scene class with a scene ID
   */
  public registerScene(sceneId: SceneId, sceneClass: SceneConstructor): void {
    this.sceneRegistry.set(sceneId, sceneClass);
  }

  /**
   * Load and switch to a scene
   */
  public loadScene(sceneId: SceneId): void {
    // Destroy current scene
    if (this.activeScene) {
      this.app.stage.removeChild(this.activeScene.container);
      this.activeScene.destroy();
      this.activeScene = null;
    }

    // Get scene constructor
    const SceneClass = this.sceneRegistry.get(sceneId);
    if (!SceneClass) {
      console.error(`Scene not registered: ${sceneId}`);
      return;
    }

    // Create and initialize new scene
    this.activeScene = new SceneClass(this.app, this.state);
    this.app.stage.addChild(this.activeScene.container);
    this.activeScene.init();
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    // Load the initial scene
    this.loadScene(this.state.currentSceneId);

    // Start the loop
    this.loop();
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Main game loop
   */
  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    // Update active scene
    if (this.activeScene) {
      this.activeScene.update(deltaMs);
    }

    // Request next frame
    requestAnimationFrame(this.loop);
  };

  /**
   * Handle window resize
   */
  private handleResize(): void {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
  }
}
