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

const skipRtmSchema = z.object({
    auctionId: z.string(),
});

const submitRtmOfferSchema = z.object({
    auctionId: z.string(),
    amount: z.number().positive(),
});

const respondRtmCounterSchema = z.object({
    auctionId: z.string(),
    accept: z.boolean(),
});

const clearRtmState = {
    rtmStatus: 'NONE' as const,
    pendingRtmPlayerId: null,
    pendingRtmEligibleTeamId: null,
    pendingRtmWinningTeamId: null,
    pendingRtmWinningBidId: null,
    pendingRtmAmount: null,
};

type TeamSocketData = {
    id: string;
    name: string;
    shortName: string;
    color: string;
    budget: number;
    squadSize: number;
    rtmCardsRemaining: number;
};

function toTeamSocketData(team: {
    id: string;
    name: string;
    shortName: string;
    color: string;
    budget: any;
    squadSize: number;
    rtmCardsRemaining: number;
}): TeamSocketData {
    return {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        color: team.color,
        budget: Number(team.budget),
        squadSize: team.squadSize,
        rtmCardsRemaining: team.rtmCardsRemaining,
    };
}

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
        } else if (action === 'skip-rtm') {
            return handleSkipRtm(body, session.user.id);
        } else if (action === 'submit-rtm-offer') {
            return handleSubmitRtmOffer(body, session.user.id);
        } else if (action === 'respond-rtm-counter') {
            return handleRespondRtmCounter(body, session.user.id);
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

    const auction = await prisma.auction.findUnique({
        where: { id: validatedData.auctionId },
        select: {
            createdById: true,
            auctionType: true,
            currentPlayerId: true,
            rtmStatus: true,
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

    if (auction.currentPlayerId || auction.rtmStatus !== 'NONE') {
        return NextResponse.json(
            { success: false, error: 'Finish the current player and RTM flow before starting the next player' },
            { status: 400 }
        );
    }

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

    await prisma.player.update({
        where: { id: validatedData.playerId },
        data: {
            isCurrentlyAuctioning: true,
            hasBeenAuctioned: true,
        },
    });

    await prisma.auction.update({
        where: { id: validatedData.auctionId },
        data: {
            currentPlayerId: validatedData.playerId,
            currentPrice: player.basePrice,
            ...clearRtmState,
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

    const io = (global as any).io;
    if (io && updatedPlayer) {
        io.to(`auction:${validatedData.auctionId}`).emit('player:auction:start', {
            player: updatedPlayer,
        });
        console.log('Emitted player:auction:start event to auction:', validatedData.auctionId);
    }

    return NextResponse.json({
        success: true,
        message: 'Player auction started',
        data: updatedPlayer,
    });
}

async function handleEndPlayerAuction(body: any, userId: string) {
    const validatedData = endPlayerAuctionSchema.parse(body);

    const auction = await prisma.auction.findUnique({
        where: { id: validatedData.auctionId },
        select: {
            createdById: true,
            currentPlayerId: true,
            rtmStatus: true,
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

    if (auction.rtmStatus !== 'NONE') {
        return NextResponse.json(
            { success: false, error: 'Resolve the pending RTM decision first' },
            { status: 400 }
        );
    }

    const player = await prisma.player.findUnique({
        where: { id: validatedData.playerId },
        select: {
            id: true,
            name: true,
            previousTeamShortName: true,
        },
    });

    if (!player) {
        return NextResponse.json(
            { success: false, error: 'Player not found' },
            { status: 404 }
        );
    }

    const io = (global as any).io;

    if (validatedData.sold && validatedData.winningBidId) {
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

        const eligibleRtmTeam = player.previousTeamShortName
            ? await prisma.team.findFirst({
                where: {
                    auctionId: validatedData.auctionId,
                    shortName: player.previousTeamShortName,
                    id: { not: winningBid.teamId },
                    rtmCardsRemaining: { gt: 0 },
                    rtmSelections: {
                        some: {
                            playerId: player.id,
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    color: true,
                    budget: true,
                    squadSize: true,
                    rtmCardsRemaining: true,
                },
            })
            : null;

        if (eligibleRtmTeam) {
            await prisma.$transaction([
                prisma.player.update({
                    where: { id: validatedData.playerId },
                    data: {
                        isCurrentlyAuctioning: false,
                    },
                }),
                prisma.auction.update({
                    where: { id: validatedData.auctionId },
                    data: {
                        currentPlayerId: null,
                        currentPrice: winningBid.amount,
                        rtmStatus: 'PENDING',
                        pendingRtmPlayerId: player.id,
                        pendingRtmEligibleTeamId: eligibleRtmTeam.id,
                        pendingRtmWinningTeamId: winningBid.teamId,
                        pendingRtmWinningBidId: winningBid.id,
                        pendingRtmAmount: winningBid.amount,
                    },
                }),
            ]);

            if (io) {
                io.to(`auction:${validatedData.auctionId}`).emit('rtm:available', {
                    phase: 'AWAITING_RTM_OFFER',
                    playerId: player.id,
                    playerName: player.name,
                    winningBidId: winningBid.id,
                    amount: Number(winningBid.amount),
                    eligibleTeam: toTeamSocketData(eligibleRtmTeam),
                    winningTeam: toTeamSocketData({
                        id: winningBid.team.id,
                        name: winningBid.team.name,
                        shortName: winningBid.team.shortName,
                        color: winningBid.team.color,
                        budget: winningBid.team.budget,
                        squadSize: winningBid.team.squadSize,
                        rtmCardsRemaining: winningBid.team.rtmCardsRemaining,
                    }),
                });
                console.log('Emitted rtm:available event to auction:', validatedData.auctionId);
            }

            return NextResponse.json({
                success: true,
                message: `${eligibleRtmTeam.shortName} can use RTM for ${player.name}`,
                data: {
                    rtmPending: true,
                    eligibleTeamId: eligibleRtmTeam.id,
                    playerId: player.id,
                    amount: Number(winningBid.amount),
                },
            });
        }

        const saleResult = await finalizeSaleToExistingWinningTeam({
            auctionId: validatedData.auctionId,
            playerId: player.id,
            winningBidId: winningBid.id,
        });

        if (io) {
            io.to(`auction:${validatedData.auctionId}`).emit('player:sold', {
                playerId: player.id,
                teamId: saleResult.team.id,
                amount: saleResult.amount,
                team: toTeamSocketData(saleResult.team),
            });
            console.log('Emitted player:sold event to auction:', validatedData.auctionId);
        }

        return NextResponse.json({
            success: true,
            message: 'Player sold successfully',
            data: {
                rtmPending: false,
                teamId: saleResult.team.id,
            },
        });
    }

    await prisma.$transaction([
        prisma.player.update({
            where: { id: validatedData.playerId },
            data: {
                status: 'UNSOLD',
                isCurrentlyAuctioning: false,
            },
        }),
        prisma.auction.update({
            where: { id: validatedData.auctionId },
            data: {
                currentPlayerId: null,
                currentPrice: new Decimal(0),
                ...clearRtmState,
            },
        }),
    ]);

    if (io) {
        io.to(`auction:${validatedData.auctionId}`).emit('player:unsold', {
            playerId: validatedData.playerId,
        });
        console.log('Emitted player:unsold event to auction:', validatedData.auctionId);
    }

    return NextResponse.json({
        success: true,
        message: 'Player went unsold',
    });
}

async function handleSkipRtm(body: any, userId: string) {
    const validatedData = skipRtmSchema.parse(body);
    const user = await getUserWithTeam(userId);

    if (!user?.team || user.team.auctionId !== validatedData.auctionId) {
        return NextResponse.json(
            { success: false, error: 'Only the RTM-eligible team can skip this RTM prompt' },
            { status: 403 }
        );
    }

    const auction = await getPendingRtmAuction(validatedData.auctionId);

    if (!auction || auction.rtmStatus !== 'PENDING' || !auction.pendingRtmPlayerId || !auction.pendingRtmWinningBidId) {
        return NextResponse.json(
            { success: false, error: 'No RTM offer is pending for this player' },
            { status: 400 }
        );
    }

    if (getPendingRtmPhase(auction) !== 'AWAITING_RTM_OFFER') {
        return NextResponse.json(
            { success: false, error: 'The RTM offer has already been submitted for this player' },
            { status: 400 }
        );
    }

    if (auction.pendingRtmEligibleTeamId !== user.team.id) {
        return NextResponse.json(
            { success: false, error: 'This RTM prompt belongs to another team' },
            { status: 403 }
        );
    }

    const saleResult = await finalizeSaleToExistingWinningTeam({
        auctionId: auction.id,
        playerId: auction.pendingRtmPlayerId,
        winningBidId: auction.pendingRtmWinningBidId,
    });

    emitRtmResolved({
        auctionId: auction.id,
        playerId: auction.pendingRtmPlayerId,
        playerName: auction.pendingRtmPlayer?.name || '',
        outcome: 'skipped',
        teamId: saleResult.team.id,
        amount: saleResult.amount,
    });
    emitPlayerSold({
        auctionId: auction.id,
        playerId: auction.pendingRtmPlayerId,
        teamId: saleResult.team.id,
        amount: saleResult.amount,
        team: saleResult.team,
    });

    return NextResponse.json({
        success: true,
        message: 'RTM skipped. Original winning team keeps the player.',
    });
}

async function handleSubmitRtmOffer(body: any, userId: string) {
    const validatedData = submitRtmOfferSchema.parse({
        ...body,
        amount: Math.round(Number(body.amount) * 100) / 100,
    });
    const user = await getUserWithTeam(userId);

    if (!user?.team || user.team.auctionId !== validatedData.auctionId) {
        return NextResponse.json(
            { success: false, error: 'Only the RTM-eligible team can submit an RTM offer' },
            { status: 403 }
        );
    }

    const auction = await getPendingRtmAuction(validatedData.auctionId);

    if (!auction || auction.rtmStatus !== 'PENDING' || !auction.pendingRtmPlayerId || !auction.pendingRtmWinningBidId || !auction.pendingRtmEligibleTeamId || !auction.pendingRtmWinningTeamId) {
        return NextResponse.json(
            { success: false, error: 'No RTM offer is pending for this player' },
            { status: 400 }
        );
    }

    if (getPendingRtmPhase(auction) !== 'AWAITING_RTM_OFFER') {
        return NextResponse.json(
            { success: false, error: 'The RTM offer has already been submitted for this player' },
            { status: 400 }
        );
    }

    if (auction.pendingRtmEligibleTeamId !== user.team.id) {
        return NextResponse.json(
            { success: false, error: 'This RTM prompt belongs to another team' },
            { status: 403 }
        );
    }

    if (user.team.rtmCardsRemaining <= 0) {
        return NextResponse.json(
            { success: false, error: 'No RTM cards remaining' },
            { status: 400 }
        );
    }

    const winningBidAmount = Number(auction.pendingRtmWinningBid?.amount || 0);
    const counterAmount = validatedData.amount;

    if (counterAmount <= winningBidAmount) {
        return NextResponse.json(
            { success: false, error: 'RTM offer must be higher than the winning bid' },
            { status: 400 }
        );
    }

    if (Number(user.team.budget) < counterAmount) {
        return NextResponse.json(
            { success: false, error: 'Insufficient budget to submit this RTM offer' },
            { status: 400 }
        );
    }

    await prisma.auction.update({
        where: { id: auction.id },
        data: {
            currentPrice: new Decimal(counterAmount),
            rtmStatus: 'PENDING',
            pendingRtmAmount: new Decimal(counterAmount),
        },
    });

    emitRtmCountered({
        auctionId: auction.id,
        playerId: auction.pendingRtmPlayerId,
        playerName: auction.pendingRtmPlayer?.name || '',
        originalAmount: winningBidAmount,
        amount: counterAmount,
        eligibleTeam: user.team,
        winningTeam: auction.pendingRtmWinningTeam!,
    });

    return NextResponse.json({
        success: true,
        message: `${user.team.shortName} submitted an RTM counter-offer`,
        data: {
            playerId: auction.pendingRtmPlayerId,
            amount: counterAmount,
        },
    });
}

async function handleRespondRtmCounter(body: any, userId: string) {
    const validatedData = respondRtmCounterSchema.parse(body);
    const user = await getUserWithTeam(userId);

    if (!user?.team || user.team.auctionId !== validatedData.auctionId) {
        return NextResponse.json(
            { success: false, error: 'Only the current winning team can answer this RTM counter-offer' },
            { status: 403 }
        );
    }

    const auction = await getPendingRtmAuction(validatedData.auctionId);

    if (!auction || auction.rtmStatus !== 'PENDING' || !auction.pendingRtmPlayerId || !auction.pendingRtmWinningBidId || !auction.pendingRtmEligibleTeamId || !auction.pendingRtmWinningTeamId || !auction.pendingRtmAmount) {
        return NextResponse.json(
            { success: false, error: 'No RTM counter-offer is awaiting a decision' },
            { status: 400 }
        );
    }

    if (getPendingRtmPhase(auction) !== 'AWAITING_WINNER_RESPONSE') {
        return NextResponse.json(
            { success: false, error: 'The RTM counter-offer is not ready for the winning team yet' },
            { status: 400 }
        );
    }

    if (auction.pendingRtmWinningTeamId !== user.team.id) {
        return NextResponse.json(
            { success: false, error: 'This RTM counter-offer belongs to another winning team' },
            { status: 403 }
        );
    }

    const counterAmount = Number(auction.pendingRtmAmount);

    if (validatedData.accept) {
        if (Number(user.team.budget) < counterAmount) {
            return NextResponse.json(
                { success: false, error: 'Insufficient budget to keep the player at the new RTM price' },
                { status: 400 }
            );
        }

        const saleResult = await finalizeSaleToExistingWinningTeam({
            auctionId: auction.id,
            playerId: auction.pendingRtmPlayerId,
            winningBidId: auction.pendingRtmWinningBidId,
            amountOverride: counterAmount,
        });

        emitRtmResolved({
            auctionId: auction.id,
            playerId: auction.pendingRtmPlayerId,
            playerName: auction.pendingRtmPlayer?.name || '',
            outcome: 'matched',
            teamId: saleResult.team.id,
            amount: saleResult.amount,
        });
        emitPlayerSold({
            auctionId: auction.id,
            playerId: auction.pendingRtmPlayerId,
            teamId: saleResult.team.id,
            amount: saleResult.amount,
            team: saleResult.team,
        });

        return NextResponse.json({
            success: true,
            message: `${user.team.shortName} kept the player at the RTM counter price`,
        });
    }

    let rtmResult;
    try {
        rtmResult = await finalizeSaleToRtmTeam({
            auction,
            amount: counterAmount,
        });
    } catch (error) {
        if (error instanceof Error && (
            error.message === 'Eligible RTM team not found' ||
            error.message === 'No RTM cards remaining' ||
            error.message === 'Insufficient budget for RTM team' ||
            error.message === 'RTM team representative not found'
        )) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }
        throw error;
    }

    emitRtmResolved({
        auctionId: auction.id,
        playerId: auction.pendingRtmPlayerId,
        playerName: auction.pendingRtmPlayer?.name || '',
        outcome: 'transferred',
        teamId: rtmResult.team.id,
        amount: rtmResult.amount,
    });
    emitPlayerSold({
        auctionId: auction.id,
        playerId: auction.pendingRtmPlayerId,
        teamId: rtmResult.team.id,
        amount: rtmResult.amount,
        team: rtmResult.team,
    });

    return NextResponse.json({
        success: true,
        message: `${rtmResult.team.shortName} won the player via RTM`,
        data: {
            teamId: rtmResult.team.id,
            playerId: auction.pendingRtmPlayerId,
        },
    });
}

async function finalizeSaleToExistingWinningTeam({
    auctionId,
    playerId,
    winningBidId,
    amountOverride,
}: {
    auctionId: string;
    playerId: string;
    winningBidId: string;
    amountOverride?: number;
}) {
    return prisma.$transaction(async (tx) => {
        const winningBid = await tx.bid.findUnique({
            where: { id: winningBidId },
            include: {
                team: true,
            },
        });

        if (!winningBid || !winningBid.teamId || !winningBid.team) {
            throw new Error('Invalid winning bid');
        }

        const saleAmount = amountOverride === undefined
            ? winningBid.amount
            : new Decimal(amountOverride);

        await tx.player.update({
            where: { id: playerId },
            data: {
                status: 'SOLD',
                soldPrice: saleAmount,
                teamId: winningBid.teamId,
                isCurrentlyAuctioning: false,
            },
        });

        const updatedTeam = await tx.team.update({
            where: { id: winningBid.teamId },
            data: {
                budget: new Decimal(winningBid.team.budget.toString()).minus(saleAmount),
                squadSize: { increment: 1 },
            },
        });

        await tx.bid.update({
            where: { id: winningBidId },
            data: {
                amount: saleAmount,
                isWinning: true,
            },
        });

        await tx.auction.update({
            where: { id: auctionId },
            data: {
                currentPlayerId: null,
                currentPrice: new Decimal(0),
                ...clearRtmState,
            },
        });

        return {
            team: updatedTeam,
            amount: Number(saleAmount),
        };
    });
}

async function finalizeSaleToRtmTeam({
    auction,
    amount,
}: {
    auction: NonNullable<Awaited<ReturnType<typeof getPendingRtmAuction>>>;
    amount: number;
}) {
    return prisma.$transaction(async (tx) => {
        const eligibleTeam = await tx.team.findUnique({
            where: { id: auction.pendingRtmEligibleTeamId! },
            include: {
                users: {
                    select: {
                        id: true,
                    },
                    take: 1,
                },
            },
        });

        if (!eligibleTeam) {
            throw new Error('Eligible RTM team not found');
        }

        if (eligibleTeam.rtmCardsRemaining <= 0) {
            throw new Error('No RTM cards remaining');
        }

        if (Number(eligibleTeam.budget) < amount) {
            throw new Error('Insufficient budget for RTM team');
        }

        const rtmUserId = eligibleTeam.users[0]?.id;
        if (!rtmUserId) {
            throw new Error('RTM team representative not found');
        }

        if (auction.pendingRtmWinningBidId) {
            await tx.bid.updateMany({
                where: { id: auction.pendingRtmWinningBidId },
                data: { isWinning: false },
            });
        }

        await tx.bid.create({
            data: {
                auctionId: auction.id,
                userId: rtmUserId,
                amount: new Decimal(amount),
                playerId: auction.pendingRtmPlayerId,
                teamId: eligibleTeam.id,
                isWinning: true,
            },
        });

        await tx.player.update({
            where: { id: auction.pendingRtmPlayerId! },
            data: {
                status: 'SOLD',
                soldPrice: new Decimal(amount),
                teamId: eligibleTeam.id,
                isCurrentlyAuctioning: false,
            },
        });

        const updatedTeam = await tx.team.update({
            where: { id: eligibleTeam.id },
            data: {
                budget: new Decimal(eligibleTeam.budget.toString()).minus(amount),
                squadSize: { increment: 1 },
                rtmCardsRemaining: { decrement: 1 },
            },
        });

        await tx.auction.update({
            where: { id: auction.id },
            data: {
                currentPlayerId: null,
                currentPrice: new Decimal(0),
                ...clearRtmState,
            },
        });

        return {
            team: updatedTeam,
            amount,
        };
    });
}

async function getUserWithTeam(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        include: {
            team: {
                select: {
                    id: true,
                    auctionId: true,
                    name: true,
                    shortName: true,
                    color: true,
                    budget: true,
                    squadSize: true,
                    rtmCardsRemaining: true,
                },
            },
        },
    });
}

async function getPendingRtmAuction(auctionId: string) {
    return prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
            pendingRtmPlayer: {
                select: {
                    id: true,
                    name: true,
                },
            },
            pendingRtmWinningBid: {
                select: {
                    id: true,
                    amount: true,
                },
            },
            pendingRtmWinningTeam: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    color: true,
                    budget: true,
                    squadSize: true,
                    rtmCardsRemaining: true,
                },
            },
        },
    });
}

function getPendingRtmPhase(auction: NonNullable<Awaited<ReturnType<typeof getPendingRtmAuction>>>) {
    const pendingAmount = Number(auction.pendingRtmAmount || 0);
    const winningAmount = Number(auction.pendingRtmWinningBid?.amount || 0);

    return pendingAmount > winningAmount
        ? 'AWAITING_WINNER_RESPONSE'
        : 'AWAITING_RTM_OFFER';
}

function emitRtmCountered({
    auctionId,
    playerId,
    playerName,
    originalAmount,
    amount,
    eligibleTeam,
    winningTeam,
}: {
    auctionId: string;
    playerId: string;
    playerName: string;
    originalAmount: number;
    amount: number;
    eligibleTeam: {
        id: string;
        name: string;
        shortName: string;
        color: string;
        budget: any;
        squadSize: number;
        rtmCardsRemaining: number;
    };
    winningTeam: {
        id: string;
        name: string;
        shortName: string;
        color: string;
        budget: any;
        squadSize: number;
        rtmCardsRemaining: number;
    };
}) {
    const io = (global as any).io;
    if (!io) return;

    io.to(`auction:${auctionId}`).emit('rtm:countered', {
        phase: 'AWAITING_WINNER_RESPONSE',
        playerId,
        playerName,
        originalAmount,
        amount,
        eligibleTeam: toTeamSocketData(eligibleTeam),
        winningTeam: toTeamSocketData(winningTeam),
    });
}

function emitRtmResolved({
    auctionId,
    playerId,
    playerName,
    outcome,
    teamId,
    amount,
}: {
    auctionId: string;
    playerId: string;
    playerName: string;
    outcome: 'skipped' | 'matched' | 'transferred';
    teamId: string;
    amount: number;
}) {
    const io = (global as any).io;
    if (!io) return;

    io.to(`auction:${auctionId}`).emit('rtm:resolved', {
        playerId,
        playerName,
        outcome,
        teamId,
        amount,
    });
}

function emitPlayerSold({
    auctionId,
    playerId,
    teamId,
    amount,
    team,
}: {
    auctionId: string;
    playerId: string;
    teamId: string;
    amount: number;
    team: {
        id: string;
        name: string;
        shortName: string;
        color: string;
        budget: any;
        squadSize: number;
        rtmCardsRemaining: number;
    };
}) {
    const io = (global as any).io;
    if (!io) return;

    io.to(`auction:${auctionId}`).emit('player:sold', {
        playerId,
        teamId,
        amount,
        team: toTeamSocketData(team),
    });
}
