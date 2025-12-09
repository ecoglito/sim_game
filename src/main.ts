/**
 * Operation Black Knights - Game Exports
 * 
 * This file exports the game modules for use in the Next.js app.
 * The game is now initialized via the GameContainer component.
 */

export { GameState } from './core/GameState';
export { Game } from './core/Game';
export { IntroScene } from './scenes/IntroScene';
export { Chapter1Scene } from './scenes/Chapter1Scene';
export { Chapter2Scene } from './scenes/Chapter2Scene';
export { Chapter3Scene } from './scenes/Chapter3Scene';
export { SummaryScene } from './scenes/SummaryScene';

// Re-export types
export * from './core/types';
