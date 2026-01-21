import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ProfileClient from '@/components/profile/ProfileClient';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    // Fetch user's auctions
    const [createdAuctions, participatedAuctions, visitedAuctions] = await Promise.all([
        // Auctions created by user
        prisma.auction.findMany({
            where: { createdById: session.user.id },
            include: {
                _count: {
                    select: {
                        bids: true,
                        players: true,
                        teams: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),

        // Auctions where user participated (placed bids or joined teams)
        prisma.auction.findMany({
            where: {
                OR: [
                    {
                        bids: {
                            some: {
                                userId: session.user.id,
                            },
                        },
                    },
                    {
                        teams: {
                            some: {
                                users: {
                                    some: {
                                        id: session.user.id,
                                    },
                                },
                            },
                        },
                    },
                ],
                createdById: { not: session.user.id },
            },
            include: {
                _count: {
                    select: {
                        bids: true,
                        players: true,
                        teams: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),

        // Auctions visited (we'll track this via a new AuctionView model)
        prisma.auctionView.findMany({
            where: {
                userId: session.user.id,
                auction: {
                    createdById: { not: session.user.id },
                },
            },
            include: {
                auction: {
                    include: {
                        _count: {
                            select: {
                                bids: true,
                                players: true,
                                teams: true,
                            },
                        },
                    },
                },
            },
            orderBy: { lastViewedAt: 'desc' },
        }),
    ]);

    // Filter out visited auctions that user participated in
    const participatedIds = new Set(participatedAuctions.map(a => a.id));
    const visitedOnly = visitedAuctions
        .filter(v => !participatedIds.has(v.auction.id))
        .map(v => v.auction);

    const serializedCreated = createdAuctions.map(auction => ({
        ...auction,
        startingPrice: parseFloat(auction.startingPrice.toString()),
        currentPrice: parseFloat(auction.currentPrice.toString()),
        minIncrement: parseFloat(auction.minIncrement.toString()),
        teamBudget: auction.teamBudget ? parseFloat(auction.teamBudget.toString()) : null,
    }));

    const serializedParticipated = participatedAuctions.map(auction => ({
        ...auction,
        startingPrice: parseFloat(auction.startingPrice.toString()),
        currentPrice: parseFloat(auction.currentPrice.toString()),
        minIncrement: parseFloat(auction.minIncrement.toString()),
        teamBudget: auction.teamBudget ? parseFloat(auction.teamBudget.toString()) : null,
    }));

    const serializedVisited = visitedOnly.map(auction => ({
        ...auction,
        startingPrice: parseFloat(auction.startingPrice.toString()),
        currentPrice: parseFloat(auction.currentPrice.toString()),
        minIncrement: parseFloat(auction.minIncrement.toString()),
        teamBudget: auction.teamBudget ? parseFloat(auction.teamBudget.toString()) : null,
    }));

    return (
        <ProfileClient
            user={session.user}
            createdAuctions={serializedCreated}
            participatedAuctions={serializedParticipated}
            visitedAuctions={serializedVisited}
        />
    );
}
