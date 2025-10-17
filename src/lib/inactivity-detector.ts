/**
 * Inactivity Detection System
 * Automatically closes database connections when user is inactive
 */

import { aggressiveConnectionManager } from './aggressive-connection-manager';

class InactivityDetector {
  private static instance: InactivityDetector;
  private lastActivity: number = Date.now();
  private inactivityTimeout: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_THRESHOLD = 900000; // 15 minutes of inactivity
  private isUserActive = true;

  private constructor() {
    this.setupActivityListeners();
    this.startInactivityMonitoring();
  }

  static getInstance(): InactivityDetector {
    if (!InactivityDetector.instance) {
      InactivityDetector.instance = new InactivityDetector();
    }
    return InactivityDetector.instance;
  }

  /**
   * Setup activity listeners for browser events
   */
  private setupActivityListeners(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'blur'
    ];

    const updateActivity = () => {
      this.lastActivity = Date.now();
      if (!this.isUserActive) {
        this.isUserActive = true;
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 User activity detected - connections may be needed');
        }
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📱 Page hidden - will cleanup after 10 minutes');
        }
        // Don't immediately cleanup, wait for longer period
        setTimeout(() => {
          if (document.hidden) {
            this.handleInactivity();
          }
        }, 600000); // 10 minutes
      } else {
        updateActivity();
      }
    });

    // Window focus/blur
    window.addEventListener('focus', updateActivity);
    window.addEventListener('blur', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Window lost focus - will cleanup after extended inactivity');
      }
      // Only cleanup after extended period of window being unfocused
      setTimeout(() => {
        if (!document.hasFocus()) {
          this.scheduleInactivityCleanup();
        }
      }, 900000); // 15 minutes
    });
  }

  /**
   * Start monitoring for inactivity
   */
  private startInactivityMonitoring(): void {
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      
      if (timeSinceActivity > this.INACTIVITY_THRESHOLD && this.isUserActive) {
        this.handleInactivity();
      }
    }, 60000); // Check every minute
  }

  /**
   * Handle detected inactivity
   */
  private async handleInactivity(): Promise<void> {
    this.isUserActive = false;
    if (process.env.NODE_ENV === 'development') {
      console.log('😴 User inactivity detected - cleaning up connections');
    }
    
    try {
      await aggressiveConnectionManager.forceCleanup();
      
      // Log connection stats in development
      if (process.env.NODE_ENV === 'development') {
        const stats = aggressiveConnectionManager.getStats();
        console.log(`🔌 Cleanup complete: ${stats.totalConnections} connections remaining`);
      }
    } catch (error) {
      console.warn('⚠️ Error during inactivity cleanup:', error);
    }
  }

  /**
   * Schedule cleanup after a delay
   */
  private scheduleInactivityCleanup(): void {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    this.inactivityTimeout = setTimeout(async () => {
      await this.handleInactivity();
    }, 300000); // Cleanup after 5 minutes of inactivity
  }

  /**
   * Force immediate cleanup
   */
  async forceCleanup(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Forcing immediate connection cleanup');
    }
    await aggressiveConnectionManager.forceCleanup();
  }

  /**
   * Get activity status
   */
  getActivityStatus(): {
    isActive: boolean;
    lastActivity: number;
    timeSinceActivity: number;
  } {
    return {
      isActive: this.isUserActive,
      lastActivity: this.lastActivity,
      timeSinceActivity: Date.now() - this.lastActivity
    };
  }
}

// Export singleton instance
export const inactivityDetector = InactivityDetector.getInstance();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    inactivityDetector.forceCleanup();
  });
  
  // Cleanup on page hide (mobile browsers)
  document.addEventListener('pagehide', () => {
    inactivityDetector.forceCleanup();
  });
}