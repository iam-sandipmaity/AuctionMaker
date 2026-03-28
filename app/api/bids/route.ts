import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBid } from '@/lib/db/bids';
import { validateBid } from '@/lib/auction/validation';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

const bidSchema = z.object({
    auctionId: z.string(),
    amount: z.number().positive(),
    playerId: z.string().optional(),
    teamId: z.string().optional(),
});

// Get bids for a player
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const playerId = searchParams.get('playerId');

        if (!playerId) {
            return NextResponse.json(
                { success: false, error: 'Player ID is required' },
                { status: 400 }
            );
        }

        const bids = await prisma.bid.findMany({
            where: { playerId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        team: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                color: true,
                                logo: true,
                            },
                        },
                    },
                },
                team: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        color: true,
                        logo: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });

        return NextResponse.json({ success: true, data: bids });
    } catch (error) {
        console.error('Error fetching bids:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch bids' },
            { status: 500 }
        );
    }
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

        const body = await request.json();

        // Enforce two decimals for amount
        const validatedData = bidSchema.parse({
            ...body,
            amount: Math.round(Number(body.amount) * 100) / 100,
        });

        const validation = await validateBid(
            validatedData.auctionId,
            session.user.id,
            validatedData.amount,
            validatedData.playerId
        );

        if (!validation.valid) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        let resolvedTeamId = validatedData.teamId;
        if (validatedData.playerId) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    team: {
                        select: {
                            id: true,
                            auctionId: true,
                        },
                    },
                },
            });

            if (!user?.team || user.team.auctionId !== validatedData.auctionId) {
                return NextResponse.json(
                    { success: false, error: 'Join a team in this auction before bidding' },
                    { status: 403 }
                );
            }

            if (validatedData.teamId && validatedData.teamId !== user.team.id) {
                return NextResponse.json(
                    { success: false, error: 'You can only bid for your own team' },
                    { status: 403 }
                );
            }

            resolvedTeamId = user.team.id;
        }

        const bid = await createBid({
            auctionId: validatedData.auctionId,
            userId: session.user.id,
            amount: validatedData.amount,
            playerId: validatedData.playerId,
            teamId: resolvedTeamId,
        });

        const io = (global as any).io;
        if (io && validatedData.playerId) {
            io.to(`auction:${validatedData.auctionId}`).emit('bid:placed', {
                bid,
                playerId: validatedData.playerId,
            });
            console.log('Emitted bid:placed event to auction:', validatedData.auctionId);
        }

        return NextResponse.json({
            success: true,
            data: bid,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Bid creation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to place bid' },
            { status: 500 }
        );
    }
}
