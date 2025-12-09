import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export type ToastType = 'success' | 'warning' | 'error' | 'info' | 'engagement';

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
  icon?: string;
  subtext?: string;
}

interface ActiveToast {
  container: Container;
  startTime: number;
  duration: number;
  targetY: number;
}

/**
 * Toast notification system
 * Beautiful animated toasts for game feedback
 */
export class ToastManager {
  private static instance: ToastManager;
  private parentContainer: Container | null = null;
  private activeToasts: ActiveToast[] = [];
  private toastWidth = 320;
  private toastHeight = 70;
  private toastGap = 10;
  private screenWidth = 1280;
  private screenHeight = 720;

  private constructor() {}

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  public setContainer(container: Container, screenWidth: number, screenHeight: number): void {
    this.parentContainer = container;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  public show(config: ToastConfig): void {
    if (!this.parentContainer) return;

    const toast = this.createToast(config);
    const duration = config.duration || 3000;

    // Position off-screen to the right
    const startX = this.screenWidth + 20;
    const targetX = this.screenWidth - this.toastWidth - 20;
    
    // Calculate Y position (stack from bottom)
    const baseY = this.screenHeight - 100;
    const targetY = baseY - this.activeToasts.length * (this.toastHeight + this.toastGap);
    
    toast.position.set(startX, targetY);
    toast.alpha = 0;
    this.parentContainer.addChild(toast);

    const activeToast: ActiveToast = {
      container: toast,
      startTime: Date.now(),
      duration,
      targetY
    };
    this.activeToasts.push(activeToast);

    // Animate in
    this.animateIn(toast, targetX);
  }

  private createToast(config: ToastConfig): Container {
    const toast = new Container();

    // Colors based on type
    const colors: Record<ToastType, { bg: number; border: number; text: number }> = {
      success: { bg: 0x1a2e1a, border: 0x51cf66, text: 0x51cf66 },
      warning: { bg: 0x2e2a1a, border: 0xffc078, text: 0xffc078 },
      error: { bg: 0x2e1a1a, border: 0xff6b6b, text: 0xff6b6b },
      info: { bg: 0x1a1a2e, border: 0x4dabf7, text: 0x4dabf7 },
      engagement: { bg: 0x1a2e2e, border: 0x20c997, text: 0x20c997 }
    };
    const color = colors[config.type];

    // Background with glow effect
    const glow = new Graphics();
    glow.beginFill(color.border, 0.1);
    glow.drawRoundedRect(-4, -4, this.toastWidth + 8, this.toastHeight + 8, 12);
    glow.endFill();
    toast.addChild(glow);

    // Main background
    const bg = new Graphics();
    bg.beginFill(color.bg);
    bg.lineStyle(2, color.border, 0.8);
    bg.drawRoundedRect(0, 0, this.toastWidth, this.toastHeight, 10);
    bg.endFill();
    toast.addChild(bg);

    // Left accent bar
    const accent = new Graphics();
    accent.beginFill(color.border);
    accent.drawRoundedRect(0, 0, 4, this.toastHeight, 2);
    accent.endFill();
    toast.addChild(accent);

    // Icon
    if (config.icon) {
      const icon = new Text(config.icon, new TextStyle({
        fontSize: 24
      }));
      icon.position.set(16, this.toastHeight / 2 - 12);
      toast.addChild(icon);
    }

    // Message
    const textX = config.icon ? 50 : 16;
    const message = new Text(config.message, new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: this.toastWidth - textX - 16
    }));
    message.position.set(textX, config.subtext ? 14 : (this.toastHeight - message.height) / 2);
    toast.addChild(message);

    // Subtext
    if (config.subtext) {
      const subtext = new Text(config.subtext, new TextStyle({
        fontFamily: 'Arial',
        fontSize: 11,
        fill: color.text,
      }));
      subtext.position.set(textX, 38);
      toast.addChild(subtext);
    }

    // Progress bar
    const progressBg = new Graphics();
    progressBg.beginFill(0x000000, 0.3);
    progressBg.drawRect(0, this.toastHeight - 3, this.toastWidth, 3);
    progressBg.endFill();
    toast.addChild(progressBg);

    const progressBar = new Graphics();
    progressBar.beginFill(color.border);
    progressBar.drawRect(0, this.toastHeight - 3, this.toastWidth, 3);
    progressBar.endFill();
    toast.addChild(progressBar);

    // Store progress bar reference for animation
    (toast as any).progressBar = progressBar;

    return toast;
  }

  private animateIn(toast: Container, targetX: number): void {
    const startX = toast.x;
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      toast.x = startX + (targetX - startX) * eased;
      toast.alpha = eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private animateOut(toast: Container, onComplete: () => void): void {
    const startX = toast.x;
    const targetX = this.screenWidth + 20;
    const startTime = Date.now();
    const duration = 200;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Ease in cubic
      const eased = progress * progress * progress;
      
      toast.x = startX + (targetX - startX) * eased;
      toast.alpha = 1 - eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  public update(): void {
    const now = Date.now();
    const toRemove: number[] = [];

    this.activeToasts.forEach((toast, index) => {
      const elapsed = now - toast.startTime;
      const progress = Math.min(1, elapsed / toast.duration);

      // Update progress bar
      const progressBar = (toast.container as any).progressBar as Graphics;
      if (progressBar) {
        progressBar.clear();
        progressBar.beginFill(0x4dabf7);
        progressBar.drawRect(0, this.toastHeight - 3, this.toastWidth * (1 - progress), 3);
        progressBar.endFill();
      }

      // Remove expired toasts
      if (elapsed >= toast.duration) {
        toRemove.push(index);
        this.animateOut(toast.container, () => {
          if (this.parentContainer && toast.container.parent) {
            this.parentContainer.removeChild(toast.container);
            toast.container.destroy({ children: true });
          }
        });
      }
    });

    // Remove expired toasts from array (reverse order to maintain indices)
    toRemove.reverse().forEach(index => {
      this.activeToasts.splice(index, 1);
    });

    // Reposition remaining toasts
    this.repositionToasts();
  }

  private repositionToasts(): void {
    const baseY = this.screenHeight - 100;
    this.activeToasts.forEach((toast, index) => {
      const targetY = baseY - index * (this.toastHeight + this.toastGap);
      if (Math.abs(toast.container.y - targetY) > 1) {
        toast.container.y += (targetY - toast.container.y) * 0.1;
      }
    });
  }

  public clear(): void {
    this.activeToasts.forEach(toast => {
      if (this.parentContainer && toast.container.parent) {
        this.parentContainer.removeChild(toast.container);
        toast.container.destroy({ children: true });
      }
    });
    this.activeToasts = [];
  }
}

// Convenience functions
export function showToast(message: string, type: ToastType = 'info', icon?: string, subtext?: string): void {
  ToastManager.getInstance().show({ message, type, icon, subtext });
}

export function showEngagementToast(action: string, tweetAuthor: string, accountHandle: string): void {
  const icons: Record<string, string> = {
    like: '👍',
    reply: '💬',
    retweet: '🔄',
    quote: '📝'
  };
  ToastManager.getInstance().show({
    message: `${action.charAt(0).toUpperCase() + action.slice(1)} scheduled`,
    type: 'engagement',
    icon: icons[action] || '✨',
    subtext: `@${accountHandle} → ${tweetAuthor}`,
    duration: 2000
  });
}

export function showMetricToast(metric: string, oldValue: number, newValue: number): void {
  const change = newValue - oldValue;
  const icon = change > 0 ? '📈' : '📉';
  ToastManager.getInstance().show({
    message: `${metric} ${change > 0 ? '+' : ''}${change}`,
    type: change > 0 ? 'success' : 'warning',
    icon,
    subtext: `${oldValue} → ${newValue}`,
    duration: 2500
  });
}

