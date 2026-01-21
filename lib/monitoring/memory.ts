/**
 * Memory monitoring utility to detect potential memory leaks
 * Logs memory usage at regular intervals
 */

export interface MemoryStats {
  rss: number; // Resident Set Size - total memory allocated
  heapTotal: number; // Total heap size
  heapUsed: number; // Actual memory used
  external: number; // Memory used by C++ objects bound to JavaScript
  timestamp: Date;
}

export class MemoryMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly thresholdMB: number;
  private lastStats: MemoryStats | null = null;

  constructor(intervalMs: number = 60000, thresholdMB: number = 400) {
    this.intervalMs = intervalMs;
    this.thresholdMB = thresholdMB;
  }

  /**
   * Convert bytes to megabytes
   */
  private toMB(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 100) / 100;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      timestamp: new Date(),
    };
  }

  /**
   * Format memory stats for logging
   */
  private formatStats(stats: MemoryStats): string {
    return [
      `RSS: ${this.toMB(stats.rss)}MB`,
      `Heap: ${this.toMB(stats.heapUsed)}/${this.toMB(stats.heapTotal)}MB`,
      `External: ${this.toMB(stats.external)}MB`,
    ].join(' | ');
  }

  /**
   * Check if memory usage exceeds threshold
   */
  private checkThreshold(stats: MemoryStats): void {
    const rssInMB = this.toMB(stats.rss);
    if (rssInMB > this.thresholdMB) {
      console.warn(`⚠️ Memory threshold exceeded: ${rssInMB}MB > ${this.thresholdMB}MB`);
    }
  }

  /**
   * Calculate memory growth since last check
   */
  private calculateGrowth(current: MemoryStats): string | null {
    if (!this.lastStats) return null;

    const rssDiff = this.toMB(current.rss - this.lastStats.rss);
    const heapDiff = this.toMB(current.heapUsed - this.lastStats.heapUsed);

    if (Math.abs(rssDiff) > 10 || Math.abs(heapDiff) > 10) {
      return `Growth: RSS ${rssDiff > 0 ? '+' : ''}${rssDiff}MB, Heap ${heapDiff > 0 ? '+' : ''}${heapDiff}MB`;
    }
    return null;
  }

  /**
   * Log current memory usage
   */
  private logMemory(): void {
    const stats = this.getMemoryUsage();
    const formatted = this.formatStats(stats);
    const growth = this.calculateGrowth(stats);

    if (growth) {
      console.log(`📊 Memory: ${formatted} | ${growth}`);
    } else if (process.env.LOG_LEVEL === 'debug') {
      console.log(`📊 Memory: ${formatted}`);
    }

    this.checkThreshold(stats);
    this.lastStats = stats;
  }

  /**
   * Start monitoring memory usage
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Memory monitor is already running');
      return;
    }

    console.log(`📊 Memory monitoring started (interval: ${this.intervalMs / 1000}s, threshold: ${this.thresholdMB}MB)`);
    this.logMemory(); // Log immediately
    this.intervalId = setInterval(() => this.logMemory(), this.intervalMs);
  }

  /**
   * Stop monitoring memory usage
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📊 Memory monitoring stopped');
    }
  }

  /**
   * Get a summary of current memory usage
   */
  getSummary(): { formatted: string; stats: MemoryStats } {
    const stats = this.getMemoryUsage();
    return {
      formatted: this.formatStats(stats),
      stats,
    };
  }
}

// Singleton instance
let memoryMonitor: MemoryMonitor | null = null;

/**
 * Get or create the global memory monitor instance
 */
export function getMemoryMonitor(intervalMs?: number, thresholdMB?: number): MemoryMonitor {
  if (!memoryMonitor) {
    memoryMonitor = new MemoryMonitor(intervalMs, thresholdMB);
  }
  return memoryMonitor;
}

/**
 * Start memory monitoring (convenience function)
 */
export function startMemoryMonitoring(intervalMs?: number, thresholdMB?: number): void {
  const monitor = getMemoryMonitor(intervalMs, thresholdMB);
  monitor.start();
}
