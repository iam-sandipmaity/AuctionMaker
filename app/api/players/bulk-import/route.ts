import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

interface PlayerImportData {
    name: string;
    description?: string;
    role?: string;
    basePrice: number;
    avatarUrl?: string;
    marqueeSet?: number; // 1-5 (1 = top tier, 5 = low tier)
    isStarPlayer?: boolean; // Admin priority player
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const auctionId = formData.get('auctionId') as string;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!auctionId) {
            return NextResponse.json(
                { success: false, error: 'Auction ID is required' },
                { status: 400 }
            );
        }

        // Verify user is the auction creator
        const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
            select: { createdById: true, auctionType: true },
        });

        if (!auction) {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        if (auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only auction creator can import players' },
                { status: 403 }
            );
        }

        if (auction.auctionType !== 'TEAM') {
            return NextResponse.json(
                { success: false, error: 'Can only import players for team auctions' },
                { status: 400 }
            );
        }

        // Read file content
        const fileContent = await file.text();
        const fileName = file.name.toLowerCase();

        let players: PlayerImportData[] = [];

        // Parse based on file type
        if (fileName.endsWith('.json')) {
            try {
                const parsed = JSON.parse(fileContent);
                players = Array.isArray(parsed) ? parsed : [parsed];
            } catch (jsonError: any) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'Invalid JSON format', 
                        details: [jsonError.message || 'Failed to parse JSON file. Please check your file syntax.']
                    },
                    { status: 400 }
                );
            }
        } else if (fileName.endsWith('.csv')) {
            try {
                players = parseCSV(fileContent);
            } catch (csvError: any) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'Invalid CSV format', 
                        details: [csvError.message || 'Failed to parse CSV file. Please check your file format.']
                    },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { success: false, error: 'Only JSON and CSV files are supported' },
                { status: 400 }
            );
        }

        // Validate players data
        const validationErrors: string[] = [];
        players.forEach((player, index) => {
            if (!player.name || player.name.trim() === '') {
                validationErrors.push(`Row ${index + 1}: Player name is required`);
            }
            if (!player.basePrice || player.basePrice <= 0) {
                validationErrors.push(`Row ${index + 1}: Valid base price is required`);
            }
            if (player.marqueeSet && (player.marqueeSet < 1 || player.marqueeSet > 5)) {
                validationErrors.push(`Row ${index + 1}: Marquee set must be between 1-5`);
            }
        });

        if (validationErrors.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Validation errors', details: validationErrors },
                { status: 400 }
            );
        }

        // Get current max auction order
        const lastPlayer = await prisma.player.findFirst({
            where: { auctionId },
            orderBy: { auctionOrder: 'desc' },
        });

        let currentOrder = lastPlayer?.auctionOrder || 0;

        // Sort players by marquee set (tier 1 first, tier 5 last)
        const sortedPlayers = players.sort((a, b) => {
            const tierA = a.marqueeSet || 5;
            const tierB = b.marqueeSet || 5;
            return tierA - tierB;
        });

        // Create players in bulk
        const createdPlayers = await Promise.all(
            sortedPlayers.map(async (player) => {
                currentOrder++;
                return prisma.player.create({
                    data: {
                        name: player.name.trim(),
                        description: player.description?.trim() || '',
                        role: player.role?.trim() || '',
                        basePrice: player.basePrice,
                        avatarUrl: player.avatarUrl?.trim() || null,
                        marqueeSet: player.marqueeSet || 5,
                        isStarPlayer: player.isStarPlayer || false,
                        status: 'UNSOLD',
                        isCurrentlyAuctioning: false,
                        auctionOrder: currentOrder,
                        auctionId,
                    },
                });
            })
        );

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdPlayers.length} players`,
            data: {
                count: createdPlayers.length,
                players: createdPlayers,
            },
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to import players' },
            { status: 500 }
        );
    }
}

function parseCSV(content: string): PlayerImportData[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row');
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Map headers to expected fields
    const headerMap: Record<string, string> = {
        'name': 'name',
        'player name': 'name',
        'playername': 'name',
        'description': 'description',
        'desc': 'description',
        'role': 'role',
        'position': 'role',
        'type': 'role',
        'player type': 'role',
        'base price': 'basePrice',
        'baseprice': 'basePrice',
        'price': 'basePrice',
        'starting price': 'basePrice',
        'bid start': 'basePrice',
        'avatar': 'avatarUrl',
        'avatar url': 'avatarUrl',
        'avatarurl': 'avatarUrl',
        'image': 'avatarUrl',
        'marquee set': 'marqueeSet',
        'marqueeset': 'marqueeSet',
        'marquee': 'marqueeSet',
        'tier': 'marqueeSet',
        'star player': 'isStarPlayer',
        'starplayer': 'isStarPlayer',
        'star': 'isStarPlayer',
        'priority': 'isStarPlayer',
        'set': 'marqueeSet',
    };

    const players: PlayerImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const player: any = {};

        headers.forEach((header, index) => {
            const field = headerMap[header];
            if (field && values[index]) {
                if (field === 'basePrice' || field === 'marqueeSet') {
                    player[field] = parseFloat(values[index]) || 0;
                } else if (field === 'isStarPlayer') {
                    const val = values[index].toLowerCase();
                    player[field] = val === 'true' || val === 'yes' || val === '1';
                } else {
                    player[field] = values[index];
                }
            }
        });

        if (player.name) {
            players.push(player as PlayerImportData);
        }
    }

    return players;
}
