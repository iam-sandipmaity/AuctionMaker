'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(auctionId: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Initialize socket connection with reconnection settings
        const socketInstance = io({
            path: '/api/socketio',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socketInstance.on('connect', () => {
            console.log('✅ Socket connected:', socketInstance.id);
            setIsConnected(true);
            // Join the auction room
            socketInstance.emit('join:auction', auctionId);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            // Rejoin the auction room after reconnect
            socketInstance.emit('join:auction', auctionId);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Reconnection attempt', attemptNumber);
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error('❌ Reconnection error:', error.message);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('❌ Reconnection failed - max attempts reached');
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            setIsConnected(false);
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave:auction', auctionId);
                socketRef.current.disconnect();
            }
        };
    }, [auctionId]);

    return { socket, isConnected };
}
