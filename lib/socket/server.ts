import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

// Global type definition for io instance
declare global {
    var io: SocketIOServer | undefined;
}

export type NextApiResponseWithSocket = NextApiResponse & {
    socket: {
        server: HTTPServer & {
            io?: SocketIOServer;
        };
    };
};

export function initSocket(server: HTTPServer): SocketIOServer {
    const io = new SocketIOServer(server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
            origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join:auction', (auctionId: string) => {
            socket.join(`auction:${auctionId}`);
            console.log(`Socket ${socket.id} joined auction:${auctionId}`);
        });

        socket.on('leave:auction', (auctionId: string) => {
            socket.leave(`auction:${auctionId}`);
            console.log(`Socket ${socket.id} left auction:${auctionId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}

export function getIO(server: HTTPServer & { io?: SocketIOServer }): SocketIOServer {
    if (!server.io) {
        server.io = initSocket(server);
    }
    return server.io;
}

export function getGlobalIO(): SocketIOServer | null {
    return global.io || null;
}
