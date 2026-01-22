import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const startPlayerAuctionSchema = z.object({
    auctionId: z.string(),
    playerId: z.string(),
});

const endPlayerAuctionSchema = z.object({
    auctionId: z.string(),
    playerId: z.string(),
    sold: z.boolean(),
    winningBidId: z.string().optional(),
});

// Start auctioning a specific player
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
        const { action } = body;

        if (action === 'start-player') {
            return handleStartPlayerAuction(body, session.user.id);
        } else if (action === 'end-player') {
            return handleEndPlayerAuction(body, session.user.id);
        } else if (action === 'start-auction') {
            return handleStartAuction(body, session.user.id);
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid action' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Auction control error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to perform action' },
            { status: 500 }
        );
    }
}

async function handleStartAuction(body: any, userId: string) {
    const { auctionId } = body;

    // Verify user is the auction creator
    const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        select: { 
            createdById: true,
            auctionType: true,
            status: true,
        },
    });

    if (!auction) {
        return NextResponse.json(
            { success: false, error: 'Auction not found' },
            { status: 404 }
        );
    }

    if (auction.createdById !== userId) {
        return NextResponse.json(
            { success: false, error: 'Only auction creator can start the auction' },
            { status: 403 }
        );
    }

    if (auction.auctionType !== 'TEAM') {
        return NextResponse.json(
            { success: false, error: 'Can only control team auctions' },
            { status: 400 }
        );
    }

    // Update auction status to LIVE
    const updatedAuction = await prisma.auction.update({
        where: { id: auctionId },
        data: { status: 'LIVE' },
    });

    return NextResponse.json({
        success: true,
        message: 'Auction started',
        data: updatedAuction,
    });
}

async function handleStartPlayerAuction(body: any, userId: string) {
    const validatedData = startPlayerAuctionSchema.parse(body);

    // Verify user is the auction creator
    const auction = await prisma.auction.findUnique({
        where: { id: validatedData.auctionId },
        select: { 
            createdById: true,
            auctionType: true,
            currentPlayerId: true,
        },
    });

    if (!auction) {
        return NextResponse.json(
            { success: false, error: 'Auction not found' },
            { status: 404 }
        );
    }

    if (auction.createdById !== userId) {
        return NextResponse.json(
            { success: false, error: 'Only auction creator can control player auctions' },
            { status: 403 }
        );
    }

    if (auction.auctionType !== 'TEAM') {
        return NextResponse.json(
            { success: false, error: 'Can only control player auctions in team auctions' },
            { status: 400 }
        );
    }

    if (auction.currentPlayerId) {
        return NextResponse.json(
            { success: false, error: 'Another player is currently being auctioned' },
            { status: 400 }
        );
    }

    // Verify player exists and is unsold
    const player = await prisma.player.findUnique({
        where: { id: validatedData.playerId },
        select: { 
            id: true,
            status: true,
            auctionId: true,
            basePrice: true,
        },
    });

    if (!player) {
        return NextResponse.json(
            { success: false, error: 'Player not found' },
            { status: 404 }
        );
    }

    if (player.auctionId !== validatedData.auctionId) {
        return NextResponse.json(
            { success: false, error: 'Player does not belong to this auction' },
            { status: 400 }
        );
    }

    if (player.status !== 'UNSOLD') {
        return NextResponse.json(
            { success: false, error: 'Player has already been auctioned' },
            { status: 400 }
        );
    }

    // Update player to currently auctioning and mark as has been auctioned
    await prisma.player.update({
        where: { id: validatedData.playerId },
        data: { 
            isCurrentlyAuctioning: true,
            hasBeenAuctioned: true, // Mark that this player has been put up for auction
        },
    });

    // Update auction's current player
    await prisma.auction.update({
        where: { id: validatedData.auctionId },
        data: { 
            currentPlayerId: validatedData.playerId,
            currentPrice: player.basePrice,
        },
    });

    const updatedPlayer = await prisma.player.findUnique({
        where: { id: validatedData.playerId },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    color: true,
                },
            },
        },
    });

    // Emit WebSocket event with full player data
    const io = (global as any).io;
    if (io && updatedPlayer) {
        io.to(`auction:${validatedData.auctionId}`).emit('player:auction:start', {
            player: updatedPlayer,
        });
        console.log('📢 Emitted player:auction:start event to auction:', validatedData.auctionId);
    }

    return NextResponse.json({
        success: true,
        message: 'Player auction started',
        data: updatedPlayer,
    });
}

async function handleEndPlayerAuction(body: any, userId: string) {
    const validatedData = endPlayerAuctionSchema.parse(body);

    // Verify user is the auction creator
    const auction = await prisma.auction.findUnique({
        where: { id: validatedData.auctionId },
        select: { 
            createdById: true,
            currentPlayerId: true,
        },
    });

    if (!auction) {
        return NextResponse.json(
            { success: false, error: 'Auction not found' },
            { status: 404 }
        );
    }

    if (auction.createdById !== userId) {
        return NextResponse.json(
            { success: false, error: 'Only auction creator can end player auctions' },
            { status: 403 }
        );
    }

    if (auction.currentPlayerId !== validatedData.playerId) {
        return NextResponse.json(
            { success: false, error: 'This player is not currently being auctioned' },
            { status: 400 }
        );
    }

    // Get the player
    const player = await prisma.player.findUnique({
        where: { id: validatedData.playerId },
    });

    if (!player) {
        return NextResponse.json(
            { success: false, error: 'Player not found' },
            { status: 404 }
        );
    }

    // Variables to store data for socket events
    let soldTeamData: any = null;
    let soldAmount = 0;

    if (validatedData.sold && validatedData.winningBidId) {
        // Get the winning bid
        const winningBid = await prisma.bid.findUnique({
            where: { id: validatedData.winningBidId },
            include: {
                team: true,
                user: true,
            },
        });

        if (!winningBid || !winningBid.teamId || !winningBid.team) {
            return NextResponse.json(
                { success: false, error: 'Invalid winning bid' },
                { status: 400 }
            );
        }

        // Update player as sold
        await prisma.player.update({
            where: { id: validatedData.playerId },
            data: {
                status: 'SOLD',
                soldPrice: winningBid.amount,
                teamId: winningBid.teamId,
                isCurrentlyAuctioning: false,
            },
        });

        // Update team budget and squad size
        const team = winningBid.team;
        const newBudget = new Decimal(team.budget.toString()).minus(winningBid.amount);
        
        const updatedTeam = await prisma.team.update({
            where: { id: winningBid.teamId },
            data: {
                budget: newBudget,
                squadSize: { increment: 1 },
            },
        });

        // Mark winning bid
        await prisma.bid.update({
            where: { id: validatedData.winningBidId },
            data: { isWinning: true },
        });
        
        // Store updated team for socket event
        soldTeamData = updatedTeam;
        soldAmount = Number(winningBid.amount);
    } else {
        // Player went unsold
        await prisma.player.update({
            where: { id: validatedData.playerId },
            data: {
                status: 'UNSOLD',
                isCurrentlyAuctioning: false,
            },
        });
    }

    // Clear current player from auction
    await prisma.auction.update({
        where: { id: validatedData.auctionId },
        data: { 
            currentPlayerId: null,
            currentPrice: new Decimal(0),
        },
    });
    // Emit WebSocket event for player sold/unsold
    const io = (global as any).io;
    if (io) {
        if (validatedData.sold && soldTeamData) {
            io.to(`auction:${validatedData.auctionId}`).emit('player:sold', {
                playerId: validatedData.playerId,
                teamId: soldTeamData.id,
                amount: soldAmount,
                team: {
                    id: soldTeamData.id,
                    name: soldTeamData.name,
                    shortName: soldTeamData.shortName,
                    color: soldTeamData.color,
                    budget: Number(soldTeamData.budget),
                    squadSize: soldTeamData.squadSize,
                },
            });
            console.log('📢 Emitted player:sold event with updated team data to auction:', validatedData.auctionId);
        } else {
            // Player went unsold
            io.to(`auction:${validatedData.auctionId}`).emit('player:unsold', {
                playerId: validatedData.playerId,
            });
            console.log('📢 Emitted player:unsold event to auction:', validatedData.auctionId);
        }
    }
    return NextResponse.json({
        success: true,
        message: validatedData.sold ? 'Player sold successfully' : 'Player went unsold',
    });
}
