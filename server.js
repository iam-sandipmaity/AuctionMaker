import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all network interfaces
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============================================================================
// MEMORY MONITORING
// ============================================================================
class MemoryMonitor {
    constructor(intervalMs = 60000, thresholdMB = 400) {
        this.intervalMs = intervalMs;
        this.thresholdMB = thresholdMB;
        this.intervalId = null;
        this.lastStats = null;
    }

    toMB(bytes) {
        return Math.round((bytes / 1024 / 1024) * 100) / 100;
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss,
            heapTotal: usage.heapTotal,
            heapUsed: usage.heapUsed,
            external: usage.external,
            timestamp: new Date(),
        };
    }

    formatStats(stats) {
        return [
            `RSS: ${this.toMB(stats.rss)}MB`,
            `Heap: ${this.toMB(stats.heapUsed)}/${this.toMB(stats.heapTotal)}MB`,
            `External: ${this.toMB(stats.external)}MB`,
        ].join(' | ');
    }

    checkThreshold(stats) {
        const rssInMB = this.toMB(stats.rss);
        if (rssInMB > this.thresholdMB) {
            console.warn(`⚠️ Memory threshold exceeded: ${rssInMB}MB > ${this.thresholdMB}MB`);
        }
    }

    calculateGrowth(current) {
        if (!this.lastStats) return null;

        const rssDiff = this.toMB(current.rss - this.lastStats.rss);
        const heapDiff = this.toMB(current.heapUsed - this.lastStats.heapUsed);

        if (Math.abs(rssDiff) > 10 || Math.abs(heapDiff) > 10) {
            return `Growth: RSS ${rssDiff > 0 ? '+' : ''}${rssDiff}MB, Heap ${heapDiff > 0 ? '+' : ''}${heapDiff}MB`;
        }
        return null;
    }

    logMemory() {
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

    start() {
        if (this.intervalId) return;
        console.log(`📊 Memory monitoring started (interval: ${this.intervalMs / 1000}s, threshold: ${this.thresholdMB}MB)`);
        this.logMemory();
        this.intervalId = setInterval(() => this.logMemory(), this.intervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================
class Logger {
    constructor(prefix = '') {
        this.prefix = prefix;
        this.level = this.getLogLevelFromEnv();
    }

    getLogLevelFromEnv() {
        const envLevel = process.env.LOG_LEVEL?.toLowerCase();
        if (process.env.NODE_ENV === 'production' && !envLevel) {
            return 'warn';
        }
        return envLevel || 'info';
    }

    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error', 'none'];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex && this.level !== 'none';
    }

    format(message) {
        return this.prefix ? `[${this.prefix}] ${message}` : message;
    }

    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(this.format(message), ...args);
        }
    }

    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(this.format(message), ...args);
        }
    }

    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.format(message), ...args);
        }
    }

    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.format(message), ...args);
        }
    }
}

const rootLogger = new Logger();
const socketLogger = new Logger('Socket');

// ============================================================================
// SOCKET CONNECTION MANAGER
// ============================================================================
class SocketConnectionManager {
    constructor(config = {}) {
        this.config = {
            inactivityTimeout: config.inactivityTimeout || 30 * 60 * 1000,
            pingInterval: config.pingInterval || 60 * 1000,
            enableTimeout: config.enableTimeout !== false,
        };
        this.sockets = new Map();
    }

    registerSocket(socket) {
        const metadata = {
            lastActivity: Date.now(),
            auctionRooms: new Set(),
        };

        this.sockets.set(socket.id, metadata);
        socketLogger.debug(`✅ Registered socket: ${socket.id}`);

        if (this.config.enableTimeout) {
            this.setupActivityTracking(socket, metadata);
            this.setupInactivityTimeout(socket, metadata);
        }

        socket.on('join:auction', (auctionId) => {
            metadata.auctionRooms.add(auctionId);
            this.updateActivity(socket.id);
        });

        socket.on('leave:auction', (auctionId) => {
            metadata.auctionRooms.delete(auctionId);
            this.updateActivity(socket.id);
        });

        socket.on('disconnect', () => {
            this.unregisterSocket(socket.id);
        });
    }

    setupActivityTracking(socket, metadata) {
        const activityEvents = ['join:auction', 'leave:auction', 'bid', 'message', 'pong'];
        
        activityEvents.forEach(event => {
            socket.on(event, () => {
                this.updateActivity(socket.id);
            });
        });

        if (this.config.pingInterval > 0) {
            metadata.pingIntervalId = setInterval(() => {
                socket.emit('ping');
                socketLogger.debug(`🏓 Ping sent to ${socket.id}`);
            }, this.config.pingInterval);
        }
    }

    setupInactivityTimeout(socket, metadata) {
        const checkInactivity = () => {
            const now = Date.now();
            const inactiveDuration = now - metadata.lastActivity;

            if (inactiveDuration >= this.config.inactivityTimeout) {
                socketLogger.info(`⏱️ Disconnecting inactive socket: ${socket.id} (inactive for ${Math.round(inactiveDuration / 60000)} minutes)`);
                socket.emit('disconnect:inactive', {
                    message: 'Disconnected due to inactivity',
                    inactiveDuration: inactiveDuration,
                });
                socket.disconnect(true);
            } else {
                metadata.timeoutId = setTimeout(checkInactivity, this.config.inactivityTimeout - inactiveDuration);
            }
        };

        metadata.timeoutId = setTimeout(checkInactivity, this.config.inactivityTimeout);
    }

    updateActivity(socketId) {
        const metadata = this.sockets.get(socketId);
        if (metadata) {
            metadata.lastActivity = Date.now();
            socketLogger.debug(`🔄 Activity updated for ${socketId}`);
        }
    }

    unregisterSocket(socketId) {
        const metadata = this.sockets.get(socketId);
        if (metadata) {
            if (metadata.timeoutId) {
                clearTimeout(metadata.timeoutId);
            }
            if (metadata.pingIntervalId) {
                clearInterval(metadata.pingIntervalId);
            }
            this.sockets.delete(socketId);
            socketLogger.debug(`❌ Unregistered socket: ${socketId}`);
        }
    }

    getStats() {
        const now = Date.now();
        let totalInactivity = 0;
        let activeCount = 0;
        let inactiveCount = 0;

        this.sockets.forEach(metadata => {
            const inactiveDuration = now - metadata.lastActivity;
            totalInactivity += inactiveDuration;

            if (inactiveDuration < 5 * 60 * 1000) {
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
}

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
app.prepare().then(() => {
    // Start memory monitoring
    const memoryCheckInterval = process.env.MEMORY_CHECK_INTERVAL 
        ? parseInt(process.env.MEMORY_CHECK_INTERVAL) 
        : 120000;
    const memoryThreshold = process.env.MEMORY_THRESHOLD_MB 
        ? parseInt(process.env.MEMORY_THRESHOLD_MB) 
        : 400;
    
    const memoryMonitor = new MemoryMonitor(memoryCheckInterval, memoryThreshold);
    memoryMonitor.start();
    rootLogger.info('🚀 Memory monitoring enabled');

    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            rootLogger.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Initialize Socket.IO
    const io = new SocketIOServer(httpServer, {
        path: '/api/socketio',
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        // Increase connection limits
        maxHttpBufferSize: 1e8, // 100MB
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
        upgradeTimeout: 30000, // 30 seconds
        // Allow unlimited connections
        connectTimeout: 45000,
        // Transports order
        transports: ['websocket', 'polling'],
        // Allow more connections per origin
        allowEIO3: true,
        // Increase concurrent connections
        perMessageDeflate: false, // Disable compression for better performance
    });

    // Initialize socket connection manager
    const connectionManager = new SocketConnectionManager({
        inactivityTimeout: 30 * 60 * 1000,
        pingInterval: 60 * 1000,
        // Disable timeout in development to avoid connection issues
        enableTimeout: process.env.NODE_ENV === 'production' && process.env.SOCKET_TIMEOUT_ENABLED !== 'false',
    });

    io.on('connection', (socket) => {
        socketLogger.info(`✅ Client connected: ${socket.id}`);
        
        connectionManager.registerSocket(socket);

        socket.on('join:auction', (auctionId) => {
            socket.join(`auction:${auctionId}`);
            socketLogger.info(`📡 Socket ${socket.id} joined auction:${auctionId}`);
        });

        socket.on('leave:auction', (auctionId) => {
            socket.leave(`auction:${auctionId}`);
            socketLogger.info(`👋 Socket ${socket.id} left auction:${auctionId}`);
        });

        socket.on('disconnect', () => {
            socketLogger.info(`❌ Client disconnected: ${socket.id}`);
        });

        socket.on('pong', () => {
            socketLogger.debug(`🏓 Pong received from ${socket.id}`);
        });
    });

    // Log connection stats every 5 minutes
    setInterval(() => {
        const stats = connectionManager.getStats();
        if (stats.totalConnections > 0) {
            socketLogger.info(
                `📊 Socket Stats: ${stats.totalConnections} total, ` +
                `${stats.activeConnections} active, ${stats.inactiveConnections} inactive, ` +
                `avg inactivity: ${stats.averageInactivityMinutes}min`
            );
        }
    }, 5 * 60 * 1000);

    // Make io available globally
    global.io = io;

    httpServer
        .once('error', (err) => {
            rootLogger.error('Server error:', err);
            process.exit(1);
        })
        .listen(port, () => {
            rootLogger.info(`> Ready on http://${hostname}:${port}`);
            rootLogger.info(`> Socket.IO server running on ws://${hostname}:${port}/api/socketio`);
            rootLogger.info(`> Environment: ${process.env.NODE_ENV || 'development'}`);
            rootLogger.info(`> Log Level: ${process.env.LOG_LEVEL || 'info'}`);
        });
});
