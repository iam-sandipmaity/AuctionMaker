import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { AuctionStatus } from '@prisma/client';

export async function createAuction(data: {
    title: string;
    description: string;
    auctionType: 'PRODUCT' | 'TEAM';
    startingPrice: number;
    minIncrement: number;
    startTime: Date;
    endTime: Date;
    maxParticipants?: number;
    currency?: string;
    imageUrl?: string;
    createdById: string;
    status?: AuctionStatus;
    teamBudget?: number;
    minSquadSize?: number;
    maxSquadSize?: number;
}) {
    const createData: any = {
        title: data.title,
        description: data.description,
        auctionType: data.auctionType,
        startingPrice: new Decimal(data.startingPrice),
        currentPrice: new Decimal(data.startingPrice),
        minIncrement: new Decimal(data.minIncrement),
        startTime: data.startTime,
        endTime: data.endTime,
        maxParticipants: data.maxParticipants,
        currency: data.currency || 'USD',
        imageUrl: data.imageUrl,
        createdById: data.createdById,
        status: data.status || (data.startTime <= new Date() ? AuctionStatus.LIVE : AuctionStatus.UPCOMING),
    };

    // Add team auction specific fields
    if (data.auctionType === 'TEAM') {
        if (data.teamBudget) createData.teamBudget = new Decimal(data.teamBudget);
        if (data.minSquadSize) createData.minSquadSize = data.minSquadSize;
        if (data.maxSquadSize) createData.maxSquadSize = data.maxSquadSize;
    }

    return prisma.auction.create({
        data: createData,
    });
}

export async function getAuctions(filters?: {
    status?: AuctionStatus;
    search?: string;
}) {
    return prisma.auction.findMany({
        where: {
            ...(filters?.status && { status: filters.status }),
            ...(filters?.search && {
                OR: [
                    { title: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } },
                ],
            }),
        },
        include: {
            winner: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    bids: true,
                },
            },
        },
        orderBy: [
            { status: 'asc' },
            { endTime: 'asc' },
        ],
    });
}

export async function getAuctionById(id: string) {
    return prisma.auction.findUnique({
        where: { id },
        include: {
            bids: {
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
                orderBy: {
                    timestamp: 'desc',
                },
            },
            winner: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                },
            },
        },
    });
}

export async function updateAuctionStatus(id: string, status: AuctionStatus) {
    return prisma.auction.update({
        where: { id },
        data: { status },
    });
}

export async function updateAuctionPrice(id: string, price: Decimal) {
    return prisma.auction.update({
        where: { id },
        data: { currentPrice: price },
    });
}

export async function setAuctionWinner(id: string, winnerId: string) {
    return prisma.auction.update({
        where: { id },
        data: {
            winnerId,
            status: AuctionStatus.ENDED,
        },
    });
}

export async function getActiveAuctions() {
    return prisma.auction.findMany({
        where: {
            status: AuctionStatus.LIVE,
            endTime: {
                gt: new Date(),
            },
        },
    });
}
