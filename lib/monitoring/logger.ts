/**
 * Environment-based logging utility
 * Reduces overhead by respecting LOG_LEVEL environment variable
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = '', level?: LogLevel) {
    this.prefix = prefix;
    this.level = level || this.getLogLevelFromEnv();
  }

  /**
   * Get log level from environment variable
   */
  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    
    // In production, default to 'warn' unless specified
    if (process.env.NODE_ENV === 'production' && !envLevel) {
      return 'warn';
    }

    switch (envLevel) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warn':
        return 'warn';
      case 'error':
        return 'error';
      case 'none':
        return 'none';
      default:
        return 'info'; // Default for development
    }
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex && this.level !== 'none';
  }

  /**
   * Format log message with prefix
   */
  private format(message: string): string {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }

  /**
   * Debug level logging
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.format(message), ...args);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.format(message), ...args);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format(message), ...args);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format(message), ...args);
    }
  }

  /**
   * Create a child logger with additional prefix
   */
  child(childPrefix: string): Logger {
    const newPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
    return new Logger(newPrefix, this.level);
  }
}

// Create default loggers for common use cases
export const rootLogger = new Logger();
export const socketLogger = new Logger('Socket');
export const auctionLogger = new Logger('Auction');
export const apiLogger = new Logger('API');

/**
 * Create a logger with a custom prefix
 */
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}
