import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    // This endpoint is just for Socket.IO handshake
    // The actual WebSocket connection is handled by Socket.IO
    return new Response('Socket.IO server is running', { status: 200 });
}
