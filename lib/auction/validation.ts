import { getAuctionById } from '@/lib/db/auctions';
import { getUserById } from '@/lib/db/users';
import { getHighestBid } from '@/lib/db/bids';

export interface BidValidationResult {
    valid: boolean;
    error?: string;
}

export async function validateBid(
    auctionId: string,
    userId: string,
    amount: number
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

    // For TEAM auctions, validate team budget instead of user wallet
    if (auction.auctionType === 'TEAM') {
        // Team budget validation will be handled separately
        // Skip user wallet check for team auctions
    } else {
        // Get user details for standard auctions
        const user = await getUserById(userId);
        if (!user) {
            return { valid: false, error: 'User not found' };
        }

        // Check user wallet balance
        const userWallet = typeof user.wallet === 'object'
            ? parseFloat(user.wallet.toString())
            : user.wallet;

        if (userWallet < amount) {
            return { valid: false, error: 'Insufficient wallet balance' };
        }
    }

    // Get current highest bid
    const highestBid = await getHighestBid(auctionId);
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
            error: `Bid must be at least $${minimumBid.toFixed(2)}`
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
