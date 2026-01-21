'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(auctionId: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const mountedRef = useRef(false);

    useEffect(() => {
        // Prevent double initialization in React Strict Mode (development)
        if (socketRef.current?.connected) {
            console.log('🔄 Reusing existing socket connection:', socketRef.current.id);
            setSocket(socketRef.current);
            setIsConnected(true);
            return;
        }

        // Clean up any existing disconnected socket
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
        }

        mountedRef.current = true;

        // Initialize socket connection with reconnection settings
        // Use undefined to auto-connect to current host (fixes IP access issue)
        const socketInstance = io(undefined, {
            path: '/api/socketio',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity, // Keep trying
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            // Add random delay to avoid thundering herd
            randomizationFactor: 0.5,
            // Ensure proper upgrade handling
            upgrade: true,
            // Force websocket transport first
            rememberUpgrade: true,
            // Add query for debugging
            query: {
                auctionId: auctionId,
            },
            // Add extra headers for proxy support
            extraHeaders: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            // Increase timeout for slow connections
            forceNew: false,
            multiplex: true,
        });

        socketInstance.on('connect', () => {
            if (!mountedRef.current) return;
            console.log('✅ Socket connected:', socketInstance.id);
            setIsConnected(true);
            // Join the auction room
            socketInstance.emit('join:auction', auctionId);
        });

        // Handle ping requests from server (for activity tracking)
        socketInstance.on('ping', () => {
            socketInstance.emit('pong');
        });

        // Handle inactivity disconnect warning
        socketInstance.on('disconnect:inactive', (data) => {
            console.warn('⏱️ Disconnected due to inactivity:', data);
            // Could show a notification to the user here
        });

        socketInstance.on('disconnect', (reason) => {
            if (!mountedRef.current) return;
            // Ignore disconnect during cleanup
            if (reason === 'io client disconnect') {
                console.log('🔌 Socket disconnected (cleanup)');
            } else {
                console.log('❌ Socket disconnected:', reason);
            }
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            if (!mountedRef.current) return;
            console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            // Rejoin the auction room after reconnect
            socketInstance.emit('join:auction', auctionId);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔄 Reconnection attempt', attemptNumber);
            }
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error('❌ Reconnection error:', error.message);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('❌ Reconnection failed - max attempts reached');
        });

        socketInstance.on('connect_error', (error) => {
            // Reduce noise in development mode
            if (process.env.NODE_ENV === 'development' && error.message.includes('websocket error')) {
                // This is common in dev due to hot reloads, less noisy logging
                return;
            }
            console.error('Socket connection error:', error.message);
            if (mountedRef.current) {
                setIsConnected(false);
            }
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        return () => {
            mountedRef.current = false;
            // Only disconnect if component is truly unmounting
            // Give it a small delay to handle React Strict Mode remounts
            const timer = setTimeout(() => {
                if (socketRef.current && !mountedRef.current) {
                    socketRef.current.emit('leave:auction', auctionId);
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            }, 100);

            return () => clearTimeout(timer);
        };
    }, [auctionId]);

    return { socket, isConnected };
}
