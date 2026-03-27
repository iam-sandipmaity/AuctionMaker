import prisma from '@/lib/db/prisma';

export interface BidValidationResult {
    valid: boolean;
    error?: string;
}

export async function validateBid(
    auctionId: string,
    userId: string,
    amount: number,
    playerId?: string
): Promise<BidValidationResult> {
    const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        select: {
            status: true,
            auctionType: true,
            endTime: true,
            currentPrice: true,
            minIncrement: true,
            currency: true,
            maxParticipants: true,
            currentPlayerId: true,
            rtmStatus: true,
            maxSquadSize: true,
        },
    });

    if (!auction) {
        return { valid: false, error: 'Auction not found' };
    }

    // Check auction status
    if (auction.status !== 'LIVE') {
        return { valid: false, error: 'Auction is not live' };
    }

    // Check if auction has ended (skip for TEAM auctions as they are controlled manually)
    if (auction.auctionType !== 'TEAM' && new Date() > new Date(auction.endTime)) {
        return { valid: false, error: 'Auction has ended' };
    }

    if (auction.auctionType === 'TEAM') {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                team: {
                    select: {
                        id: true,
                        auctionId: true,
                        squadSize: true,
                    },
                },
            },
        });

        if (!user?.team || user.team.auctionId !== auctionId) {
            return { valid: false, error: 'Join a team in this auction before bidding' };
        }

        if (!playerId) {
            return { valid: false, error: 'Player ID is required for team auction bids' };
        }

        if (auction.rtmStatus !== 'NONE') {
            return { valid: false, error: 'Bidding is paused while RTM is being resolved' };
        }

        if (!auction.currentPlayerId || auction.currentPlayerId !== playerId) {
            return { valid: false, error: 'This player is not currently being auctioned' };
        }

        if (auction.maxSquadSize && user.team.squadSize >= auction.maxSquadSize) {
            return {
                valid: false,
                error: `Your squad is full. You cannot bid for more than ${auction.maxSquadSize} players.`,
            };
        }
    }

    // Get current highest bid
    // For team auctions with a specific player, get the highest bid for that player only
    const highestBid = playerId
        ? await prisma.bid.findFirst({
            where: {
                auctionId,
                playerId,
                isWinning: true,
            },
            select: {
                amount: true,
            },
          })
        : await prisma.bid.findFirst({
            where: {
                auctionId,
                isWinning: true,
            },
            select: {
                amount: true,
            },
        });
    
    const currentPrice = highestBid
        ? (typeof highestBid.amount === 'object'
            ? parseFloat(highestBid.amount.toString())
            : highestBid.amount)
        : (typeof auction.currentPrice === 'object'
            ? parseFloat(auction.currentPrice.toString())
            : auction.currentPrice);

    const minIncrement = typeof auction.minIncrement === 'object'
        ? parseFloat(auction.minIncrement.toString())
        : auction.minIncrement;

    // Round to 2 decimals to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedCurrentPrice = Math.round(currentPrice * 100) / 100;
    const roundedMinIncrement = Math.round(minIncrement * 100) / 100;

    // For first bid, allow amount >= currentPrice (base price)
    // For subsequent bids, require amount >= currentPrice + minIncrement
    const minimumBid = highestBid 
        ? roundedCurrentPrice + roundedMinIncrement
        : roundedCurrentPrice;

    if (roundedAmount < minimumBid) {
        return {
            valid: false,
            error: `Bid must be at least ${minimumBid.toFixed(2)} ${auction.currency}`
        };
    }

    // Check max participants if set
    if (auction.maxParticipants) {
        const uniqueBidders = await prisma.bid.findMany({
            where: { auctionId },
            select: { userId: true },
            distinct: ['userId'],
        });

        const hasExistingBid = uniqueBidders.some(bid => bid.userId === userId);
        if (uniqueBidders.length >= auction.maxParticipants && !hasExistingBid) {
            return { valid: false, error: 'Maximum participants reached' };
        }
    }

    return { valid: true };
}
