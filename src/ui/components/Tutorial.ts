import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * Tutorial step definition
 */
export interface TutorialStep {
  title: string;
  content: string;
  highlight?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

// Color palette - cyber terminal aesthetic
const COLORS = {
  bg: 0x0a0e14,
  bgLight: 0x131920,
  bgCard: 0x0d1117,
  primary: 0x00ff9f,      // Neon green
  primaryDim: 0x00cc7f,
  secondary: 0x00d4ff,    // Cyan
  accent: 0xff6b6b,       // Coral for warnings/skip
  text: 0xe6edf3,
  textDim: 0x8b949e,
  textMuted: 0x484f58,
  border: 0x21262d,
  glow: 0x00ff9f,
};

/**
 * Tutorial overlay component
 * Shows step-by-step instructions that can be navigated or skipped
 * Fully responsive to different screen sizes
 * Cyber-terminal aesthetic design
 */
export class Tutorial extends Container {
  private steps: TutorialStep[];
  private currentStep: number = 0;
  private overlay!: Graphics;
  private card!: Container;
  private titleText!: Text;
  private contentText!: Text;
  private stepIndicator!: Text;
  private highlightBox!: Graphics;
  private progressDots!: Container;
  private scanlineOverlay!: Graphics;
  private glowBorder!: Graphics;
  private cornerDecorations!: Container;
  
  private screenWidth: number;
  private screenHeight: number;
  private onComplete: () => void;
  private onSkip: () => void;

  // Responsive dimensions
  private cardWidth: number;
  private cardHeight: number;
  private cardPadding: number;

  // Animation
  private animationFrame: number = 0;

  constructor(
    screenWidth: number,
    screenHeight: number,
    steps: TutorialStep[],
    onComplete: () => void,
    onSkip: () => void
  ) {
    super();
    
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.steps = steps;
    this.onComplete = onComplete;
    this.onSkip = onSkip;

    // Calculate responsive card size with minimums
    const minCardWidth = 420;
    const minCardHeight = 380; // Increased from 320
    const maxCardWidth = 560;
    const maxCardHeight = 460; // Increased from 420
    
    this.cardWidth = Math.max(minCardWidth, Math.min(maxCardWidth, screenWidth - 80));
    this.cardHeight = Math.max(minCardHeight, Math.min(maxCardHeight, screenHeight - 120));
    this.cardPadding = Math.max(24, Math.min(32, screenWidth * 0.025));

    this.buildUI();
    this.showStep(0);
    this.startAnimation();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleResize = (): void => {
    // Update screen dimensions
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    
    // Recalculate card size with minimums
    const minCardWidth = 420;
    const minCardHeight = 320;
    const maxCardWidth = 560;
    const maxCardHeight = 420;
    
    this.cardWidth = Math.max(minCardWidth, Math.min(maxCardWidth, this.screenWidth - 80));
    this.cardHeight = Math.max(minCardHeight, Math.min(maxCardHeight, this.screenHeight - 120));
    this.cardPadding = Math.max(24, Math.min(32, this.screenWidth * 0.025));

    // Rebuild UI
    this.rebuildUI();
    this.showStep(this.currentStep);
  };

  private rebuildUI(): void {
    // Remove old UI
    this.removeChildren();
    
    // Rebuild
    this.buildUI();
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationFrame++;
      
      // Pulse the glow border
      if (this.glowBorder) {
        const pulse = Math.sin(this.animationFrame * 0.03) * 0.15 + 0.35;
        this.glowBorder.alpha = pulse;
      }
      
      requestAnimationFrame(animate);
    };
    animate();
  }

  private buildUI(): void {
    // Semi-transparent overlay with slight gradient feel
    this.overlay = new Graphics();
    this.overlay.beginFill(0x000000, 0.92);
    this.overlay.drawRect(0, 0, this.screenWidth, this.screenHeight);
    this.overlay.endFill();
    this.overlay.eventMode = 'static';
    this.addChild(this.overlay);

    // Grid pattern overlay for depth
    const gridOverlay = this.createGridPattern();
    this.addChild(gridOverlay);

    // Highlight box (drawn behind card)
    this.highlightBox = new Graphics();
    this.addChild(this.highlightBox);

    // Tutorial card
    this.card = new Container();
    this.addChild(this.card);

    // Outer glow effect
    this.glowBorder = new Graphics();
    this.glowBorder.lineStyle(8, COLORS.primary, 0.3);
    this.glowBorder.drawRoundedRect(-4, -4, this.cardWidth + 8, this.cardHeight + 8, 16);
    this.card.addChild(this.glowBorder);

    // Card background with layered effect
    const cardShadow = new Graphics();
    cardShadow.beginFill(0x000000, 0.5);
    cardShadow.drawRoundedRect(4, 4, this.cardWidth, this.cardHeight, 12);
    cardShadow.endFill();
    this.card.addChild(cardShadow);

    const cardBg = new Graphics();
    // Main background
    cardBg.beginFill(COLORS.bgCard);
    cardBg.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, 12);
    cardBg.endFill();
    // Border
    cardBg.lineStyle(1, COLORS.primary, 0.4);
    cardBg.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, 12);
    this.card.addChild(cardBg);

    // Inner subtle gradient overlay
    const innerGlow = new Graphics();
    innerGlow.beginFill(COLORS.primary, 0.03);
    innerGlow.drawRoundedRect(1, 1, this.cardWidth - 2, 80, 11);
    innerGlow.endFill();
    this.card.addChild(innerGlow);

    // Corner decorations
    this.cornerDecorations = new Container();
    this.addCornerDecorations();
    this.card.addChild(this.cornerDecorations);

    // Top accent bar with gradient effect
    const accentBar = new Graphics();
    accentBar.beginFill(COLORS.primary);
    accentBar.drawRect(0, 0, this.cardWidth, 3);
    accentBar.endFill();
    // Add glow under the accent
    accentBar.beginFill(COLORS.primary, 0.2);
    accentBar.drawRect(0, 3, this.cardWidth, 20);
    accentBar.endFill();
    this.card.addChild(accentBar);

    // Header section
    const headerY = 28;
    
    // System indicator (left side)
    const systemLabel = new Text('// SYSTEM', new TextStyle({
      fontFamily: '"Courier New", monospace',
      fontSize: 10,
      fontWeight: 'bold',
      fill: COLORS.primary,
      letterSpacing: 2,
    }));
    systemLabel.position.set(this.cardPadding, headerY);
    this.card.addChild(systemLabel);

    // Step indicator with better styling (right side)
    this.stepIndicator = new Text('', new TextStyle({
      fontFamily: '"Courier New", monospace',
      fontSize: 11,
      fill: COLORS.textDim,
      letterSpacing: 1,
    }));
    this.stepIndicator.anchor.set(1, 0);
    this.stepIndicator.position.set(this.cardWidth - this.cardPadding, headerY);
    this.card.addChild(this.stepIndicator);

    // Divider line
    const divider = new Graphics();
    divider.lineStyle(1, COLORS.border, 0.6);
    divider.moveTo(this.cardPadding, 52);
    divider.lineTo(this.cardWidth - this.cardPadding, 52);
    this.card.addChild(divider);

    // Title with terminal cursor effect
    const titleFontSize = Math.max(20, Math.min(26, this.cardWidth / 20));
    this.titleText = new Text('', new TextStyle({
      fontFamily: '"Segoe UI", -apple-system, sans-serif',
      fontSize: titleFontSize,
      fontWeight: '600',
      fill: COLORS.text,
      letterSpacing: -0.5,
    }));
    this.titleText.position.set(this.cardPadding, 70);
    this.card.addChild(this.titleText);

    // Content with better line height
    const contentFontSize = Math.max(13, Math.min(15, this.cardWidth / 32));
    const contentWidth = this.cardWidth - this.cardPadding * 2;
    this.contentText = new Text('', new TextStyle({
      fontFamily: '"Segoe UI", -apple-system, sans-serif',
      fontSize: contentFontSize,
      fill: COLORS.textDim,
      wordWrap: true,
      wordWrapWidth: contentWidth,
      lineHeight: contentFontSize * 1.7,
    }));
    this.contentText.position.set(this.cardPadding, 110);
    this.card.addChild(this.contentText);

    // Progress dots
    this.progressDots = new Container();
    this.progressDots.position.set(this.cardWidth / 2, this.cardHeight - 95);
    this.card.addChild(this.progressDots);
    this.buildProgressDots();

    // Navigation buttons
    const btnY = this.cardHeight - 70;
    const btnHeight = 40;

    // Skip button (text-only style)
    const skipBtn = this.createTextButton('Skip', COLORS.textMuted);
    skipBtn.position.set(this.cardPadding, btnY + btnHeight / 2);
    skipBtn.on('pointerdown', () => this.skip());
    this.card.addChild(skipBtn);

    // Navigation button group (right side)
    const navGroup = new Container();
    navGroup.position.set(this.cardWidth - this.cardPadding, btnY);
    
    // Previous button
    const prevBtn = this.createNavButton('←  PREV', false);
    prevBtn.position.set(-180, 0);
    prevBtn.on('pointerdown', () => this.prev());
    navGroup.addChild(prevBtn);

    // Next button (primary action)
    const nextBtn = this.createNavButton('NEXT  →', true);
    nextBtn.position.set(-85, 0);
    nextBtn.on('pointerdown', () => this.next());
    navGroup.addChild(nextBtn);
    
    this.card.addChild(navGroup);

    // Keyboard hint
    const hintFontSize = 10;
    const hint = new Text('↑↓ or SPACE to navigate  •  ESC to skip', new TextStyle({
      fontFamily: '"Courier New", monospace',
      fontSize: hintFontSize,
      fill: COLORS.textMuted,
      letterSpacing: 0.5,
    }));
    hint.anchor.set(0.5, 1);
    hint.position.set(this.cardWidth / 2, this.cardHeight - 12);
    this.card.addChild(hint);

    // Scanline effect overlay (subtle) - stop before the bottom hint area
    this.scanlineOverlay = new Graphics();
    this.scanlineOverlay.alpha = 0.03;
    for (let i = 0; i < this.cardHeight - 25; i += 3) {
      this.scanlineOverlay.beginFill(0x000000);
      this.scanlineOverlay.drawRect(0, i, this.cardWidth, 1);
      this.scanlineOverlay.endFill();
    }
    this.card.addChild(this.scanlineOverlay);

    // Center card initially
    this.centerCard();
  }

  private createGridPattern(): Graphics {
    const grid = new Graphics();
    grid.alpha = 0.02;
    const spacing = 40;
    
    grid.lineStyle(1, COLORS.primary, 1);
    
    // Vertical lines
    for (let x = 0; x < this.screenWidth; x += spacing) {
      grid.moveTo(x, 0);
      grid.lineTo(x, this.screenHeight);
    }
    
    // Horizontal lines
    for (let y = 0; y < this.screenHeight; y += spacing) {
      grid.moveTo(0, y);
      grid.lineTo(this.screenWidth, y);
    }
    
    return grid;
  }

  private addCornerDecorations(): void {
    const cornerSize = 16;
    const inset = 8;
    
    // Top-left
    const tl = new Graphics();
    tl.lineStyle(2, COLORS.primary, 0.6);
    tl.moveTo(inset, inset + cornerSize);
    tl.lineTo(inset, inset);
    tl.lineTo(inset + cornerSize, inset);
    this.cornerDecorations.addChild(tl);
    
    // Top-right
    const tr = new Graphics();
    tr.lineStyle(2, COLORS.primary, 0.6);
    tr.moveTo(this.cardWidth - inset - cornerSize, inset);
    tr.lineTo(this.cardWidth - inset, inset);
    tr.lineTo(this.cardWidth - inset, inset + cornerSize);
    this.cornerDecorations.addChild(tr);
    
    // Bottom-left
    const bl = new Graphics();
    bl.lineStyle(2, COLORS.primary, 0.6);
    bl.moveTo(inset, this.cardHeight - inset - cornerSize);
    bl.lineTo(inset, this.cardHeight - inset);
    bl.lineTo(inset + cornerSize, this.cardHeight - inset);
    this.cornerDecorations.addChild(bl);
    
    // Bottom-right
    const br = new Graphics();
    br.lineStyle(2, COLORS.primary, 0.6);
    br.moveTo(this.cardWidth - inset - cornerSize, this.cardHeight - inset);
    br.lineTo(this.cardWidth - inset, this.cardHeight - inset);
    br.lineTo(this.cardWidth - inset, this.cardHeight - inset - cornerSize);
    this.cornerDecorations.addChild(br);
  }

  private buildProgressDots(): void {
    this.progressDots.removeChildren();
    
    const dotSize = 8;
    const dotGap = 16;
    const totalWidth = (this.steps.length - 1) * dotGap;
    const startX = -totalWidth / 2;
    
    for (let i = 0; i < this.steps.length; i++) {
      const dot = new Graphics();
      const isActive = i === this.currentStep;
      const isPast = i < this.currentStep;
      
      if (isActive) {
        // Active dot - filled with glow
        dot.beginFill(COLORS.primary);
        dot.drawCircle(0, 0, dotSize / 2);
        dot.endFill();
        // Outer ring
        dot.lineStyle(2, COLORS.primary, 0.4);
        dot.drawCircle(0, 0, dotSize / 2 + 3);
      } else if (isPast) {
        // Past dot - smaller, filled
        dot.beginFill(COLORS.primary, 0.6);
        dot.drawCircle(0, 0, dotSize / 2 - 1);
        dot.endFill();
      } else {
        // Future dot - outline only
        dot.lineStyle(1.5, COLORS.textMuted, 0.5);
        dot.drawCircle(0, 0, dotSize / 2 - 1);
      }
      
      dot.position.set(startX + i * dotGap, 0);
      this.progressDots.addChild(dot);
    }
  }

  private centerCard(): void {
    const safeMargin = Math.max(this.cardPadding, 20);
    this.card.position.set(
      Math.max(safeMargin, (this.screenWidth - this.cardWidth) / 2),
      Math.max(safeMargin, (this.screenHeight - this.cardHeight) / 2)
    );
  }

  private createTextButton(label: string, color: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const text = new Text(label, new TextStyle({
      fontFamily: '"Segoe UI", sans-serif',
      fontSize: 13,
      fill: color,
      letterSpacing: 0.5,
    }));
    text.anchor.set(0, 0.5);
    btn.addChild(text);

    const underline = new Graphics();
    underline.alpha = 0;
    underline.lineStyle(1, color, 0.8);
    underline.moveTo(0, text.height / 2 + 2);
    underline.lineTo(text.width, text.height / 2 + 2);
    btn.addChild(underline);

    btn.on('pointerover', () => {
      text.style.fill = COLORS.text;
      underline.alpha = 1;
    });

    btn.on('pointerout', () => {
      text.style.fill = color;
      underline.alpha = 0;
    });

    return btn;
  }

  private createNavButton(label: string, isPrimary: boolean): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const width = 80;
    const height = 40;

    const bg = new Graphics();
    if (isPrimary) {
      bg.beginFill(COLORS.primary);
      bg.drawRoundedRect(0, 0, width, height, 6);
      bg.endFill();
    } else {
      bg.lineStyle(1.5, COLORS.border, 1);
      bg.beginFill(COLORS.bgLight, 0.5);
      bg.drawRoundedRect(0, 0, width, height, 6);
      bg.endFill();
    }
    btn.addChild(bg);

    const text = new Text(label, new TextStyle({
      fontFamily: '"Segoe UI", sans-serif',
      fontSize: 11,
      fontWeight: isPrimary ? '700' : '600',
      fill: isPrimary ? COLORS.bgCard : COLORS.textDim,
      letterSpacing: 1,
    }));
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    btn.addChild(text);

    btn.on('pointerover', () => {
      bg.clear();
      if (isPrimary) {
        bg.beginFill(COLORS.primaryDim);
        bg.drawRoundedRect(0, 0, width, height, 6);
        bg.endFill();
      } else {
        bg.lineStyle(1.5, COLORS.primary, 0.6);
        bg.beginFill(COLORS.bgLight, 0.8);
        bg.drawRoundedRect(0, 0, width, height, 6);
        bg.endFill();
        text.style.fill = COLORS.text;
      }
    });

    btn.on('pointerout', () => {
      bg.clear();
      if (isPrimary) {
        bg.beginFill(COLORS.primary);
        bg.drawRoundedRect(0, 0, width, height, 6);
        bg.endFill();
      } else {
        bg.lineStyle(1.5, COLORS.border, 1);
        bg.beginFill(COLORS.bgLight, 0.5);
        bg.drawRoundedRect(0, 0, width, height, 6);
        bg.endFill();
        text.style.fill = COLORS.textDim;
      }
    });

    return btn;
  }

  private showStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;

    this.currentStep = index;
    const step = this.steps[index];

    // Update text
    this.titleText.text = step.title;
    this.contentText.text = step.content;
    this.stepIndicator.text = `[ ${String(index + 1).padStart(2, '0')} / ${String(this.steps.length).padStart(2, '0')} ]`;

    // Update progress dots
    this.buildProgressDots();

    // Update highlight
    this.highlightBox.clear();
    if (step.highlight) {
      const h = step.highlight;
      const padding = 10;
      
      // Redraw overlay with cutout
      this.overlay.clear();
      this.overlay.beginFill(0x000000, 0.92);
      this.overlay.drawRect(0, 0, this.screenWidth, this.screenHeight);
      this.overlay.endFill();
      
      // Ensure highlight is within screen bounds
      const highlightX = Math.max(0, Math.min(h.x, this.screenWidth - h.width));
      const highlightY = Math.max(0, Math.min(h.y, this.screenHeight - h.height));
      const highlightWidth = Math.min(h.width, this.screenWidth - highlightX);
      const highlightHeight = Math.min(h.height, this.screenHeight - highlightY);

      // Outer glow
      this.highlightBox.lineStyle(6, COLORS.primary, 0.2);
      this.highlightBox.drawRoundedRect(
        highlightX - padding - 3,
        highlightY - padding - 3,
        highlightWidth + (padding + 3) * 2,
        highlightHeight + (padding + 3) * 2,
        12
      );

      // Main highlight border
      this.highlightBox.lineStyle(2, COLORS.primary, 0.9);
      this.highlightBox.drawRoundedRect(
        highlightX - padding,
        highlightY - padding,
        highlightWidth + padding * 2,
        highlightHeight + padding * 2,
        8
      );

      // Corner accents
      const cornerLen = 20;
      this.highlightBox.lineStyle(3, COLORS.primary, 1);
      
      // Top-left corner
      this.highlightBox.moveTo(highlightX - padding, highlightY - padding + cornerLen);
      this.highlightBox.lineTo(highlightX - padding, highlightY - padding);
      this.highlightBox.lineTo(highlightX - padding + cornerLen, highlightY - padding);
      
      // Top-right corner
      this.highlightBox.moveTo(highlightX + highlightWidth + padding - cornerLen, highlightY - padding);
      this.highlightBox.lineTo(highlightX + highlightWidth + padding, highlightY - padding);
      this.highlightBox.lineTo(highlightX + highlightWidth + padding, highlightY - padding + cornerLen);
      
      // Bottom-left corner
      this.highlightBox.moveTo(highlightX - padding, highlightY + highlightHeight + padding - cornerLen);
      this.highlightBox.lineTo(highlightX - padding, highlightY + highlightHeight + padding);
      this.highlightBox.lineTo(highlightX - padding + cornerLen, highlightY + highlightHeight + padding);
      
      // Bottom-right corner
      this.highlightBox.moveTo(highlightX + highlightWidth + padding - cornerLen, highlightY + highlightHeight + padding);
      this.highlightBox.lineTo(highlightX + highlightWidth + padding, highlightY + highlightHeight + padding);
      this.highlightBox.lineTo(highlightX + highlightWidth + padding, highlightY + highlightHeight + padding - cornerLen);

      // Subtle fill
      this.highlightBox.beginFill(COLORS.primary, 0.05);
      this.highlightBox.drawRoundedRect(
        highlightX - padding,
        highlightY - padding,
        highlightWidth + padding * 2,
        highlightHeight + padding * 2,
        8
      );
      this.highlightBox.endFill();

      // Position card based on highlight
      this.positionCardNearHighlight(step, highlightX, highlightY, highlightWidth, highlightHeight);
    } else {
      // Center card if no highlight
      this.centerCard();
    }
  }

  private positionCardNearHighlight(
    step: TutorialStep,
    hX: number,
    hY: number,
    hW: number,
    hH: number
  ): void {
    const margin = 20;
    const minMargin = 10;

    let x: number;
    let y: number;

    const position = step.position || 'center';

    switch (position) {
      case 'bottom':
        x = Math.max(minMargin, Math.min(
          this.screenWidth - this.cardWidth - minMargin,
          hX + hW / 2 - this.cardWidth / 2
        ));
        y = hY + hH + margin;
        if (y + this.cardHeight > this.screenHeight - minMargin) {
          y = Math.max(minMargin, hY - this.cardHeight - margin);
        }
        break;
      case 'top':
        x = Math.max(minMargin, Math.min(
          this.screenWidth - this.cardWidth - minMargin,
          hX + hW / 2 - this.cardWidth / 2
        ));
        y = hY - this.cardHeight - margin;
        if (y < minMargin) {
          y = Math.min(this.screenHeight - this.cardHeight - minMargin, hY + hH + margin);
        }
        break;
      case 'right':
        x = hX + hW + margin;
        y = Math.max(minMargin, Math.min(
          this.screenHeight - this.cardHeight - minMargin,
          hY + hH / 2 - this.cardHeight / 2
        ));
        if (x + this.cardWidth > this.screenWidth - minMargin) {
          x = Math.max(minMargin, hX - this.cardWidth - margin);
        }
        break;
      case 'left':
        x = hX - this.cardWidth - margin;
        y = Math.max(minMargin, Math.min(
          this.screenHeight - this.cardHeight - minMargin,
          hY + hH / 2 - this.cardHeight / 2
        ));
        if (x < minMargin) {
          x = Math.min(this.screenWidth - this.cardWidth - minMargin, hX + hW + margin);
        }
        break;
      default:
        // Center, but ensure it doesn't overlap highlight
        x = (this.screenWidth - this.cardWidth) / 2;
        y = (this.screenHeight - this.cardHeight) / 2;
        
        // Check for overlap and adjust
        const cardRight = x + this.cardWidth;
        const cardBottom = y + this.cardHeight;
        const highlightRight = hX + hW;
        const highlightBottom = hY + hH;
        
        if (x < highlightRight + margin && cardRight > hX - margin &&
            y < highlightBottom + margin && cardBottom > hY - margin) {
          // Overlap detected, move card
          if (hY + hH < this.screenHeight / 2) {
            // Highlight is in top half, put card below
            y = hY + hH + margin;
          } else {
            // Highlight is in bottom half, put card above
            y = hY - this.cardHeight - margin;
          }
          
          // Ensure card stays in bounds
          y = Math.max(minMargin, Math.min(y, this.screenHeight - this.cardHeight - minMargin));
        }
    }

    // Final bounds check - ensure card is fully visible
    const safeMargin = Math.max(minMargin, this.cardPadding);
    x = Math.max(safeMargin, Math.min(x, this.screenWidth - this.cardWidth - safeMargin));
    y = Math.max(safeMargin, Math.min(y, this.screenHeight - this.cardHeight - safeMargin));

    this.card.position.set(x, y);
  }

  private next(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    } else {
      this.complete();
    }
  }

  private prev(): void {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  private skip(): void {
    this.cleanup();
    this.onSkip();
  }

  private complete(): void {
    this.cleanup();
    this.onComplete();
  }

  private cleanup(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'ArrowRight' || event.code === 'Space') {
      event.preventDefault();
      this.next();
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      this.skip();
    }
  };

  public override destroy(): void {
    this.cleanup();
    super.destroy({ children: true });
  }
}

// ============================================================================
// Tutorial content for each chapter
// ============================================================================

export function getChapter1Tutorial(screenWidth: number, screenHeight: number): TutorialStep[] {
  // Calculate responsive panel dimensions
  const rightPanelWidth = Math.min(320, screenWidth * 0.25);
  const rightPanelX = screenWidth - rightPanelWidth;
  const headerHeight = 56;
  const tweetSectionHeight = 160;
  
  return [
    {
      title: 'Welcome to Swarm Orchestration',
      content: 'In this chapter, you\'ll coordinate engagement across your account fleet to boost important tweets while avoiding detection.\n\nYour goal is to maximize reach and depth while keeping suspicion low.',
      position: 'center',
    },
    {
      title: 'The Tweet Timeline',
      content: 'At the top, you\'ll see active tweets that need engagement. Each card shows:\n\n• Author type (GTE main, affiliate, team member)\n• Objective (reach, depth, repair, partner support)\n• Current metrics (impressions and depth score)\n\nClick a tweet to select it for engagement.',
      highlight: { 
        x: 0, 
        y: headerHeight, 
        width: Math.max(200, screenWidth - rightPanelWidth - 20), 
        height: tweetSectionHeight 
      },
      position: 'bottom',
    },
    {
      title: 'Your Account Fleet',
      content: 'Below are your accounts. Each card shows:\n\n• Handle and follower count\n• Risk class (gold = frontline, blue = mid, gray = background)\n• Status dot (green = active, orange = flagged, red = banned)\n• Persona tags\n\nClick cards to toggle selection.',
      highlight: { 
        x: 0, 
        y: headerHeight + tweetSectionHeight, 
        width: Math.max(200, screenWidth - rightPanelWidth - 20), 
        height: Math.max(200, screenHeight - (headerHeight + tweetSectionHeight) - 20) 
      },
      position: 'right',
    },
    {
      title: 'Engagement Actions',
      content: 'After selecting a tweet and accounts, use the engagement buttons:\n\n• Like - Low suspicion, moderate reach\n• Reply - Higher suspicion, good depth\n• Retweet - Moderate suspicion, high reach\n• Quote - High suspicion, high depth\n\nPatterns let you schedule multiple accounts with different timing.',
      highlight: { 
        x: Math.max(0, rightPanelX - 10), 
        y: 120, 
        width: Math.min(rightPanelWidth, screenWidth - rightPanelX), 
        height: 200 
      },
      position: 'left',
    },
    {
      title: 'The Suspicion Meter',
      content: 'Watch the suspicion meter carefully!\n\n• Green (0-39): Safe to engage\n• Yellow (40-59): Be careful\n• Orange (60-79): High risk of flags\n• Red (80+): Accounts will get banned\n\nSuspicion rises when you engage too quickly, use the same accounts repeatedly, or create unnatural patterns.',
      highlight: { 
        x: Math.max(0, rightPanelX - 10), 
        y: 56, 
        width: Math.min(rightPanelWidth, screenWidth - rightPanelX), 
        height: 70 
      },
      position: 'left',
    },
    {
      title: 'Tips for Success',
      content: '• Stagger engagements over time - don\'t burst\n• Rotate accounts - don\'t overuse any single one\n• Match personas to content (DeFi accounts for DeFi tweets)\n• Protect frontline accounts - they\'re most valuable\n• Watch system notices for warnings\n\nGood luck! Press N at any time to skip to the next chapter.',
      position: 'center',
    },
  ];
}

export function getChapter2Tutorial(screenWidth: number, screenHeight: number): TutorialStep[] {
  // Calculate responsive panel dimensions
  const leftPanelWidth = Math.min(300, screenWidth * 0.22);
  const rightPanelWidth = Math.min(320, screenWidth * 0.25);
  const editorX = leftPanelWidth;
  const editorWidth = Math.max(300, screenWidth - leftPanelWidth - rightPanelWidth);
  const headerHeight = 56;
  
  return [
    {
      title: 'Welcome to Account Triage',
      content: 'In this chapter, you\'ll evaluate incoming accounts from suppliers and decide which to keep, park, or discard.\n\nYou have a limited time budget, so work efficiently!',
      position: 'center',
    },
    {
      title: 'The Account Queue',
      content: 'On the left, you\'ll see incoming accounts waiting to be processed.\n\nThe highlighted card is the current account you\'re evaluating. A ⚠️ icon indicates the account has history flags that need investigation.',
      highlight: { 
        x: 0, 
        y: headerHeight, 
        width: Math.min(leftPanelWidth, screenWidth - 20), 
        height: Math.max(200, screenHeight - headerHeight - 20) 
      },
      position: 'right',
    },
    {
      title: 'Account Editor',
      content: 'In the center panel, you can:\n\n• View the account profile and stats\n• Assign a risk class (frontline, mid, background)\n• Toggle persona tags for targeting\n• Reveal history flags (costs time!)\n\nFlags may reveal risky past behavior like spam or scams.',
      highlight: { 
        x: Math.max(0, editorX - 10), 
        y: headerHeight, 
        width: Math.min(editorWidth, screenWidth - editorX - rightPanelWidth), 
        height: Math.max(200, screenHeight - headerHeight - 20) 
      },
      position: 'right',
    },
    {
      title: 'Making Decisions',
      content: 'For each account, choose:\n\n• KEEP - Account joins your active fleet\n• PARK - Save for later, not active now\n• DISCARD - Remove permanently\n\nAccounts with severe flags should be parked or discarded. Keeping risky accounts raises your ban rate in other chapters.',
      highlight: { 
        x: Math.max(0, editorX - 10), 
        y: Math.max(56, screenHeight - 120), 
        width: Math.min(500, editorWidth), 
        height: 80 
      },
      position: 'top',
    },
    {
      title: 'Time Budget',
      content: 'Every action costs time:\n\n• Opening an account: 1 minute\n• Changing profile/tags: 0.5 minutes\n• Revealing flags: 0.75 minutes\n• Making a decision: 0.5 minutes\n\nWhen time runs out, the chapter ends automatically.',
      highlight: { 
        x: Math.max(0, screenWidth - 240), 
        y: 10, 
        width: Math.min(220, screenWidth - 20), 
        height: 40 
      },
      position: 'bottom',
    },
    {
      title: 'Portfolio Balance',
      content: 'The right panel shows your portfolio status and upcoming content needs.\n\nTry to maintain a balanced portfolio with:\n• Mix of risk classes\n• Diverse persona tags\n• Alignment with upcoming content needs\n\nKeyboard shortcuts: K=Keep, P=Park, D=Discard, Space=Skip',
      highlight: { 
        x: Math.max(0, screenWidth - rightPanelWidth - 10), 
        y: 200, 
        width: Math.min(rightPanelWidth, screenWidth - 20), 
        height: Math.min(300, screenHeight - 200 - 20) 
      },
      position: 'left',
    },
  ];
}

export function getChapter3Tutorial(screenWidth: number, screenHeight: number): TutorialStep[] {
  // Calculate responsive panel dimensions
  const rightPanelWidth = Math.min(290, screenWidth * 0.25);
  const rightPanelX = screenWidth - rightPanelWidth;
  
  return [
    {
      title: 'Welcome to Algorithm Countermeasures',
      content: 'This chapter tests your ability to detect and adapt to algorithm changes.\n\nThe detection algorithm will silently change mid-chapter. You\'ll need to identify what changed and deploy countermeasures.',
      position: 'center',
    },
    {
      title: 'Two Phases',
      content: 'The chapter has two phases:\n\n• BASELINE: Operate normally to establish performance metrics\n• POST-CHANGE: The algorithm changes - watch for anomalies!\n\nThe phase indicator in the header will turn red when the change occurs. You won\'t be told what changed.',
      position: 'center',
    },
    {
      title: 'The Analytics Panel',
      content: 'Press A to open the Analytics panel. It shows:\n\n• Bans by account age and risk class\n• Average suspicion per action type\n• Patterns that might reveal what changed\n\nUse this data to figure out the new detection rules.',
      highlight: { 
        x: Math.max(0, rightPanelX - 10), 
        y: 270, 
        width: Math.min(rightPanelWidth, screenWidth - rightPanelX), 
        height: Math.min(280, screenHeight - 270 - 20) 
      },
      position: 'left',
    },
    {
      title: 'Countermeasures',
      content: 'You have 3 countermeasure updates to use. Options include:\n\n• Reduce Activity - Lower actions per hour\n• Increase Delays - More time between actions\n• Adjust Ratios - Change like/reply/retweet mix\n• Add Browsing - Inject silent browsing actions\n\nChoose wisely - you can\'t undo them!',
      highlight: { 
        x: Math.max(0, rightPanelX - 10), 
        y: 560, 
        width: Math.min(rightPanelWidth, screenWidth - rightPanelX), 
        height: Math.min(180, screenHeight - 560 - 20) 
      },
      position: 'left',
    },
    {
      title: 'Scoring Criteria',
      content: 'You\'ll be scored on:\n\n• Time to react after the algorithm change\n• How much your metrics improve after countermeasures\n• Diversity of countermeasures used\n• Use of the Analytics panel\n\nQuick engagement: Press 1-6 to engage random accounts on tweets.',
      position: 'center',
    },
  ];
}
