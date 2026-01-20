import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

// Get player interests for a team
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');
        const auctionId = searchParams.get('auctionId');

        if (!teamId && !auctionId) {
            return NextResponse.json(
                { success: false, error: 'Team ID or Auction ID is required' },
                { status: 400 }
            );
        }

        let interests;

        if (teamId) {
            interests = await prisma.playerInterest.findMany({
                where: { teamId },
                include: {
                    player: true,
                },
            });
        } else if (auctionId) {
            // Get all interests for all teams in this auction
            interests = await prisma.playerInterest.findMany({
                where: {
                    team: { auctionId },
                },
                include: {
                    player: true,
                    team: true,
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: interests,
        });
    } catch (error: any) {
        console.error('Get interests error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch interests' },
            { status: 500 }
        );
    }
}

// Toggle player interest
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { playerId, teamId, action } = body;

        if (!playerId || !teamId || !action) {
            return NextResponse.json(
                { success: false, error: 'Player ID, Team ID, and action are required' },
                { status: 400 }
            );
        }

        // Verify user belongs to the team
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { teamId: true },
        });

        if (user?.teamId !== teamId) {
            return NextResponse.json(
                { success: false, error: 'You can only manage interests for your own team' },
                { status: 403 }
            );
        }

        // Verify player is unsold
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { status: true },
        });

        if (!player) {
            return NextResponse.json(
                { success: false, error: 'Player not found' },
                { status: 404 }
            );
        }

        if (player.status !== 'UNSOLD') {
            return NextResponse.json(
                { success: false, error: 'Can only mark interest in unsold players' },
                { status: 400 }
            );
        }

        if (action === 'add') {
            // Add interest
            const interest = await prisma.playerInterest.create({
                data: {
                    playerId,
                    teamId,
                },
                include: {
                    player: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Player added to shortlist',
                data: interest,
            });
        } else if (action === 'remove') {
            // Remove interest
            await prisma.playerInterest.deleteMany({
                where: {
                    playerId,
                    teamId,
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Player removed from shortlist',
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "add" or "remove"' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('Toggle interest error:', error);
        
        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'Player already in shortlist' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to update interest' },
            { status: 500 }
        );
    }
}
