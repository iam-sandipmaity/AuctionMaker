import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    
    // Ensure WebSocket connections work in production
    async headers() {
        return [
            {
                source: '/api/socketio/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: '*' },
                ],
            },
        ];
    },
};

export default nextConfig;
