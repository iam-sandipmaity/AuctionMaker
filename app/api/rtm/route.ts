import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const toggleRtmSchema = z.object({
    playerId: z.string(),
    action: z.enum(['add', 'remove']),
});

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
        const auctionId = searchParams.get('auctionId');

        if (!auctionId) {
            return NextResponse.json(
                { success: false, error: 'Auction ID is required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                team: {
                    select: {
                        id: true,
                        auctionId: true,
                        shortName: true,
                        rtmCardsRemaining: true,
                        auction: {
                            select: {
                                maxRtmSelectionsPerTeam: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user?.team || user.team.auctionId !== auctionId) {
            return NextResponse.json(
                { success: false, error: 'User is not assigned to a team in this auction' },
                { status: 400 }
            );
        }

        const selections = await prisma.teamRtmPlayer.findMany({
            where: { teamId: user.team.id },
            include: {
                player: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        previousTeamShortName: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                teamId: user.team.id,
                shortName: user.team.shortName,
                rtmCardsRemaining: user.team.rtmCardsRemaining,
                maxSelections: user.team.auction.maxRtmSelectionsPerTeam,
                selections,
            },
        });
    } catch (error) {
        console.error('RTM fetch error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch RTM selections' },
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
        const validatedData = toggleRtmSchema.parse(body);

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                team: {
                    include: {
                        auction: {
                            select: {
                                id: true,
                                status: true,
                                maxRtmSelectionsPerTeam: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user?.team) {
            return NextResponse.json(
                { success: false, error: 'Join a team before selecting RTM players' },
                { status: 400 }
            );
        }

        if (user.team.auction.status !== 'UPCOMING') {
            return NextResponse.json(
                { success: false, error: 'RTM players can only be selected before the auction starts' },
                { status: 400 }
            );
        }

        const player = await prisma.player.findUnique({
            where: { id: validatedData.playerId },
            select: {
                id: true,
                auctionId: true,
                previousTeamShortName: true,
            },
        });

        if (!player || player.auctionId !== user.team.auctionId) {
            return NextResponse.json(
                { success: false, error: 'Player not found in your auction' },
                { status: 404 }
            );
        }

        if (!player.previousTeamShortName || player.previousTeamShortName !== user.team.shortName) {
            return NextResponse.json(
                { success: false, error: 'Only previous-year players from your franchise can be added to RTM' },
                { status: 400 }
            );
        }

        if (validatedData.action === 'add') {
            const currentSelections = await prisma.teamRtmPlayer.count({
                where: { teamId: user.team.id },
            });

            if (currentSelections >= user.team.auction.maxRtmSelectionsPerTeam) {
                return NextResponse.json(
                    { success: false, error: `Each team can select a maximum of ${user.team.auction.maxRtmSelectionsPerTeam} RTM players` },
                    { status: 400 }
                );
            }

            await prisma.teamRtmPlayer.upsert({
                where: {
                    teamId_playerId: {
                        teamId: user.team.id,
                        playerId: player.id,
                    },
                },
                update: {},
                create: {
                    teamId: user.team.id,
                    playerId: player.id,
                },
            });
        } else {
            await prisma.teamRtmPlayer.deleteMany({
                where: {
                    teamId: user.team.id,
                    playerId: player.id,
                },
            });
        }

        const updatedCount = await prisma.teamRtmPlayer.count({
            where: { teamId: user.team.id },
        });

        return NextResponse.json({
            success: true,
            data: {
                teamId: user.team.id,
                selectionCount: updatedCount,
                maxSelections: user.team.auction.maxRtmSelectionsPerTeam,
            },
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('RTM toggle error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update RTM selection' },
            { status: 500 }
        );
    }
}
