import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function createBid(data: {
    auctionId: string;
    userId: string;
    amount: number;
    playerId?: string;
    teamId?: string;
}) {
    // For team auctions, set previous bids for this specific player to not winning
    // For product auctions, set all previous bids for the auction to not winning
    if (data.playerId) {
        await prisma.bid.updateMany({
            where: {
                auctionId: data.auctionId,
                playerId: data.playerId,
                isWinning: true,
            },
            data: {
                isWinning: false,
            },
        });
    } else {
        await prisma.bid.updateMany({
            where: {
                auctionId: data.auctionId,
                isWinning: true,
            },
            data: {
                isWinning: false,
            },
        });
    }

    // Create the new bid as winning
    return prisma.bid.create({
        data: {
            auctionId: data.auctionId,
            userId: data.userId,
            amount: new Decimal(data.amount),
            playerId: data.playerId,
            teamId: data.teamId,
            isWinning: true,
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
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
}

export async function getBidsByAuction(auctionId: string) {
    return prisma.bid.findMany({
        where: { auctionId },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
        },
        orderBy: {
            timestamp: 'desc',
        },
    });
}

export async function getHighestBid(auctionId: string) {
    return prisma.bid.findFirst({
        where: {
            auctionId,
            isWinning: true,
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
        },
    });
}

export async function getUserBidsForAuction(userId: string, auctionId: string) {
    return prisma.bid.findMany({
        where: {
            userId,
            auctionId,
        },
        orderBy: {
            timestamp: 'desc',
        },
    });
}

export async function getUserHighestBidForAuction(userId: string, auctionId: string) {
    return prisma.bid.findFirst({
        where: {
            userId,
            auctionId,
        },
        orderBy: {
            amount: 'desc',
        },
    });
}
