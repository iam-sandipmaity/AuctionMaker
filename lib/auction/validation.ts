import { getAuctionById } from '@/lib/db/auctions';
import { getHighestBid } from '@/lib/db/bids';
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
    // Get auction details
    const auction = await getAuctionById(auctionId);
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

    // Get current highest bid
    // For team auctions with a specific player, get the highest bid for that player only
    const highestBid = playerId 
        ? await prisma.bid.findFirst({
            where: {
                auctionId,
                playerId,
                isWinning: true,
            },
          })
        : await getHighestBid(auctionId);
    
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
        const uniqueBidders = new Set(auction.bids.map(b => b.userId));
        if (uniqueBidders.size >= auction.maxParticipants && !uniqueBidders.has(userId)) {
            return { valid: false, error: 'Maximum participants reached' };
        }
    }

    return { valid: true };
}
