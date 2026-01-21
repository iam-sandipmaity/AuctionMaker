/**
 * Socket connection management utility
 * Handles automatic disconnection of inactive users
 */

import { Socket } from 'socket.io';
import { Logger } from '../monitoring/logger';

export interface SocketTimeoutConfig {
  inactivityTimeout: number; // Time in ms before considering a socket inactive
  pingInterval: number; // How often to send ping messages
  enableTimeout: boolean; // Enable/disable timeout feature
}

const DEFAULT_CONFIG: SocketTimeoutConfig = {
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  pingInterval: 60 * 1000, // 1 minute
  enableTimeout: true,
};

interface SocketMetadata {
  lastActivity: number;
  timeoutId?: NodeJS.Timeout;
  pingIntervalId?: NodeJS.Timeout;
  auctionRooms: Set<string>;
}

export class SocketConnectionManager {
  private config: SocketTimeoutConfig;
  private sockets: Map<string, SocketMetadata>;
  private logger: Logger;

  constructor(config?: Partial<SocketTimeoutConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sockets = new Map();
    this.logger = logger || new Logger('SocketManager');
  }

  /**
   * Register a new socket connection
   */
  registerSocket(socket: Socket): void {
    const metadata: SocketMetadata = {
      lastActivity: Date.now(),
      auctionRooms: new Set(),
    };

    this.sockets.set(socket.id, metadata);
    this.logger.debug(`✅ Registered socket: ${socket.id}`);

    if (this.config.enableTimeout) {
      this.setupActivityTracking(socket, metadata);
      this.setupInactivityTimeout(socket, metadata);
    }

    // Track auction room joins
    socket.on('join:auction', (auctionId: string) => {
      metadata.auctionRooms.add(auctionId);
      this.updateActivity(socket.id);
    });

    socket.on('leave:auction', (auctionId: string) => {
      metadata.auctionRooms.delete(auctionId);
      this.updateActivity(socket.id);
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      this.unregisterSocket(socket.id);
    });
  }

  /**
   * Set up activity tracking for a socket
   */
  private setupActivityTracking(socket: Socket, metadata: SocketMetadata): void {
    // Track activity on any message
    const activityEvents = ['join:auction', 'leave:auction', 'bid', 'message', 'pong'];
    
    activityEvents.forEach(event => {
      socket.on(event, () => {
        this.updateActivity(socket.id);
      });
    });

    // Set up ping-pong to detect client availability
    if (this.config.pingInterval > 0) {
      metadata.pingIntervalId = setInterval(() => {
        socket.emit('ping');
        this.logger.debug(`🏓 Ping sent to ${socket.id}`);
      }, this.config.pingInterval);
    }
  }

  /**
   * Set up inactivity timeout for a socket
   */
  private setupInactivityTimeout(socket: Socket, metadata: SocketMetadata): void {
    const checkInactivity = () => {
      const now = Date.now();
      const inactiveDuration = now - metadata.lastActivity;

      if (inactiveDuration >= this.config.inactivityTimeout) {
        this.logger.info(`⏱️ Disconnecting inactive socket: ${socket.id} (inactive for ${Math.round(inactiveDuration / 60000)} minutes)`);
        socket.emit('disconnect:inactive', {
          message: 'Disconnected due to inactivity',
          inactiveDuration: inactiveDuration,
        });
        socket.disconnect(true);
      } else {
        // Schedule next check
        metadata.timeoutId = setTimeout(checkInactivity, this.config.inactivityTimeout - inactiveDuration);
      }
    };

    metadata.timeoutId = setTimeout(checkInactivity, this.config.inactivityTimeout);
  }

  /**
   * Update last activity timestamp for a socket
   */
  private updateActivity(socketId: string): void {
    const metadata = this.sockets.get(socketId);
    if (metadata) {
      metadata.lastActivity = Date.now();
      this.logger.debug(`🔄 Activity updated for ${socketId}`);
    }
  }

  /**
   * Unregister a socket connection
   */
  private unregisterSocket(socketId: string): void {
    const metadata = this.sockets.get(socketId);
    if (metadata) {
      // Clear timers
      if (metadata.timeoutId) {
        clearTimeout(metadata.timeoutId);
      }
      if (metadata.pingIntervalId) {
        clearInterval(metadata.pingIntervalId);
      }

      this.sockets.delete(socketId);
      this.logger.debug(`❌ Unregistered socket: ${socketId}`);
    }
  }

  /**
   * Get statistics about connected sockets
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    inactiveConnections: number;
    averageInactivityMinutes: number;
  } {
    const now = Date.now();
    let totalInactivity = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    this.sockets.forEach(metadata => {
      const inactiveDuration = now - metadata.lastActivity;
      totalInactivity += inactiveDuration;

      if (inactiveDuration < 5 * 60 * 1000) { // Active if activity within 5 minutes
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    return {
      totalConnections: this.sockets.size,
      activeConnections: activeCount,
      inactiveConnections: inactiveCount,
      averageInactivityMinutes: this.sockets.size > 0 
        ? Math.round((totalInactivity / this.sockets.size) / 60000) 
        : 0,
    };
  }

  /**
   * Manually disconnect a socket
   */
  disconnectSocket(socketId: string, reason?: string): boolean {
    const metadata = this.sockets.get(socketId);
    if (metadata) {
      this.logger.info(`🔌 Manually disconnecting socket: ${socketId} ${reason ? `(${reason})` : ''}`);
      this.unregisterSocket(socketId);
      return true;
    }
    return false;
  }

  /**
   * Get list of socket IDs in a specific auction room
   */
  getSocketsInAuction(auctionId: string): string[] {
    const socketIds: string[] = [];
    this.sockets.forEach((metadata, socketId) => {
      if (metadata.auctionRooms.has(auctionId)) {
        socketIds.push(socketId);
      }
    });
    return socketIds;
  }

  /**
   * Disconnect all sockets in an auction room
   */
  disconnectAuctionRoom(auctionId: string, reason?: string): number {
    const socketIds = this.getSocketsInAuction(auctionId);
    socketIds.forEach(socketId => {
      this.disconnectSocket(socketId, reason || `Auction ${auctionId} closed`);
    });
    return socketIds.length;
  }
}

// Singleton instance
let connectionManager: SocketConnectionManager | null = null;

/**
 * Get or create the global socket connection manager
 */
export function getSocketConnectionManager(config?: Partial<SocketTimeoutConfig>): SocketConnectionManager {
  if (!connectionManager) {
    connectionManager = new SocketConnectionManager(config);
  }
  return connectionManager;
}
