import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const createPlayerSchema = z.object({
    auctionId: z.string(),
    name: z.string().min(2),
    description: z.string().min(5),
    role: z.string().optional(),
    basePrice: z.number().positive(),
    imageUrl: z.string().url().optional(),
    isStarPlayer: z.boolean().optional(),
});

const updatePlayerSchema = z.object({
    playerId: z.string(),
    name: z.string().min(2).optional(),
    description: z.string().min(5).optional(),
    role: z.string().optional(),
    basePrice: z.number().positive().optional(),
    imageUrl: z.string().url().optional(),
    isStarPlayer: z.boolean().optional(),
});

// Get players for an auction
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const auctionId = searchParams.get('auctionId');

        if (!auctionId) {
            return NextResponse.json(
                { success: false, error: 'Auction ID is required' },
                { status: 400 }
            );
        }

        // Get auction to check if user is admin
        const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
            select: { createdById: true },
        });

        const isAdmin = session?.user?.id === auction?.createdById;

        // Get user's team if they have one
        let userTeamId: string | null = null;
        if (session?.user?.id) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { teamId: true },
            });
            userTeamId = user?.teamId || null;
        }

        const players = await prisma.player.findMany({
            where: { auctionId },
            include: {
                team: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        color: true,
                    },
                },
                interestedTeams: {
                    where: isAdmin ? {} : (userTeamId ? { teamId: userTeamId } : { teamId: 'none' }),
                    include: {
                        team: {
                            select: {
                                id: true,
                                shortName: true,
                                color: true,
                                logo: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { auctionOrder: 'asc' },
                { createdAt: 'asc' },
            ],
        });

        return NextResponse.json({ success: true, data: players });
    } catch (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch players' },
            { status: 500 }
        );
    }
}

// Create a new player
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
        const validatedData = createPlayerSchema.parse(body);

        // Verify user is the auction creator
        const auction = await prisma.auction.findUnique({
            where: { id: validatedData.auctionId },
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
                { success: false, error: 'Only auction creator can add players' },
                { status: 403 }
            );
        }

        if (auction.auctionType !== 'TEAM') {
            return NextResponse.json(
                { success: false, error: 'Can only add players to team auctions' },
                { status: 400 }
            );
        }

        // Get the next auction order
        const lastPlayer = await prisma.player.findFirst({
            where: { auctionId: validatedData.auctionId },
            orderBy: { auctionOrder: 'desc' },
            select: { auctionOrder: true },
        });

        const auctionOrder = (lastPlayer?.auctionOrder ?? 0) + 1;

        const player = await prisma.player.create({
            data: {
                name: validatedData.name,
                description: validatedData.description,
                role: validatedData.role,
                basePrice: new Decimal(validatedData.basePrice),
                imageUrl: validatedData.imageUrl,
                auctionId: validatedData.auctionId,
                auctionOrder,
            },
        });

        return NextResponse.json(
            { success: true, data: player },
            { status: 201 }
        );
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Player creation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create player' },
            { status: 500 }
        );
    }
}

// Update a player
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validatedData = updatePlayerSchema.parse(body);

        // Verify user is the auction creator
        const player = await prisma.player.findUnique({
            where: { id: validatedData.playerId },
            include: {
                auction: {
                    select: { createdById: true },
                },
            },
        });

        if (!player) {
            return NextResponse.json(
                { success: false, error: 'Player not found' },
                { status: 404 }
            );
        }

        if (player.auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only auction creator can update players' },
                { status: 403 }
            );
        }

        if (player.status === 'SOLD') {
            return NextResponse.json(
                { success: false, error: 'Cannot update sold players' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (validatedData.name) updateData.name = validatedData.name;
        if (validatedData.description) updateData.description = validatedData.description;
        if (validatedData.role) updateData.role = validatedData.role;
        if (validatedData.basePrice) updateData.basePrice = new Decimal(validatedData.basePrice);
        if (validatedData.imageUrl) updateData.imageUrl = validatedData.imageUrl;

        const updatedPlayer = await prisma.player.update({
            where: { id: validatedData.playerId },
            data: updateData,
        });

        return NextResponse.json({ success: true, data: updatedPlayer });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Player update error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update player' },
            { status: 500 }
        );
    }
}

// Delete a player
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const playerId = searchParams.get('playerId');

        if (!playerId) {
            return NextResponse.json(
                { success: false, error: 'Player ID is required' },
                { status: 400 }
            );
        }

        // Verify user is the auction creator
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: {
                auction: {
                    select: { createdById: true },
                },
            },
        });

        if (!player) {
            return NextResponse.json(
                { success: false, error: 'Player not found' },
                { status: 404 }
            );
        }

        if (player.auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only auction creator can delete players' },
                { status: 403 }
            );
        }

        if (player.status === 'SOLD') {
            return NextResponse.json(
                { success: false, error: 'Cannot delete sold players' },
                { status: 400 }
            );
        }

        await prisma.player.delete({
            where: { id: playerId },
        });

        return NextResponse.json({ success: true, message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Player deletion error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete player' },
            { status: 500 }
        );
    }
}
