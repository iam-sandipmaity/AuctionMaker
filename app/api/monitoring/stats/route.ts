/**
 * Admin monitoring endpoint
 * GET /api/monitoring/stats
 * 
 * Returns current memory and socket connection stats
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get memory stats
    const usage = process.memoryUsage();
    const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    const memoryStats = {
      rss: toMB(usage.rss),
      heapTotal: toMB(usage.heapTotal),
      heapUsed: toMB(usage.heapUsed),
      external: toMB(usage.external),
      heapUsedPercentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };

    // Get process stats
    const uptime = process.uptime();
    const uptimeFormatted = {
      hours: Math.floor(uptime / 3600),
      minutes: Math.floor((uptime % 3600) / 60),
      seconds: Math.floor(uptime % 60),
    };

    // Get socket stats from global io instance
    const io = (global as any).io;
    let socketStats = null;
    
    if (io) {
      const sockets = await io.fetchSockets();
      socketStats = {
        connected: sockets.length,
        // You can add more socket-specific stats here
      };
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      memory: memoryStats,
      uptime: uptimeFormatted,
      sockets: socketStats,
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
    });
  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring stats' },
      { status: 500 }
    );
  }
}
