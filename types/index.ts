import { Decimal } from '@prisma/client/runtime/library';

export type UserStatus = 'active' | 'outbid' | 'winning';

export interface User {
    id: string;
    email: string;
    name: string;
    username: string;
    wallet: number | Decimal;
    totalBudget: number | Decimal;
    createdAt: Date;
    updatedAt: Date;
}

export interface Auction {
    id: string;
    title: string;
    description: string;
    auctionType: 'PRODUCT' | 'TEAM';
    startingPrice: number | Decimal;
    currentPrice: number | Decimal;
    minIncrement: number | Decimal;
    startTime: Date;
    endTime: Date;
    status: 'UPCOMING' | 'LIVE' | 'ENDED';
    maxParticipants?: number | null;
    currency: string;
    imageUrl?: string | null;
    winnerId?: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    // Team auction specific fields
    teamBudget?: number | Decimal | null;
    minSquadSize?: number | null;
    maxSquadSize?: number | null;
    currentPlayerId?: string | null;
}

export interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    logo?: string | null;
    budget: number | Decimal;
    totalBudget: number | Decimal;
    squadSize: number;
    auctionId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Player {
    id: string;
    name: string;
    description: string;
    role?: string | null;
    basePrice: number | Decimal;
    soldPrice?: number | Decimal | null;
    status: 'UNSOLD' | 'SOLD';
    imageUrl?: string | null;
    auctionId: string;
    teamId?: string | null;
    isCurrentlyAuctioning: boolean;
    auctionOrder?: number | null;
    createdAt: Date;
    updatedAt: Date;
    team?: Team;
}

export interface Bid {
    id: string;
    amount: number | Decimal;
    timestamp: Date;
    isWinning: boolean;
    auctionId: string;
    userId: string;
    playerId?: string | null;
    teamId?: string | null;
    user?: Partial<User> & { id: string; username: string; name: string };
    team?: (Partial<Team> & { id: string; name: string; shortName: string; color: string }) | null;
    player?: Player;
}

export interface AuctionWithBids extends Auction {
    bids?: Bid[];
    winner?: Partial<User> & { id: string; username: string; name: string } | null;
    createdBy: Partial<User> & { id: string; username: string; name: string };
    _count?: {
        bids: number;
    };
}

// WebSocket event types
export interface BidPlacedEvent {
    bid: Bid;
    auction: Auction;
    user: {
        id: string;
        username: string;
    };
}

export interface BidAcceptedEvent {
    bid: Bid;
    auction: Auction;
    previousHighBid?: Bid;
}

export interface BidRejectedEvent {
    reason: string;
    amount: number;
}

export interface AuctionUpdatedEvent {
    auction: Auction;
}

export interface AuctionEndedEvent {
    auction: Auction;
    winner?: User;
    winningBid?: Bid;
}

export interface UserOutbidEvent {
    auction: Auction;
    newHighBid: Bid;
}

export interface UserWinningEvent {
    auction: Auction;
    bid: Bid;
}

// API response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface CreateAuctionInput {
    title: string;
    description: string;
    auctionType: 'PRODUCT' | 'TEAM';
    startingPrice: number;
    minIncrement: number;
    duration: number; // in minutes
    maxParticipants?: number;
    currency?: string;
    imageUrl?: string;
    // Team auction specific
    teamBudget?: number;
    minSquadSize?: number;
    maxSquadSize?: number;
}

export interface PlaceBidInput {
    auctionId: string;
    amount: number;
    playerId?: string;
    teamId?: string;
}

export interface AuctionFilters {
    status?: 'UPCOMING' | 'LIVE' | 'ENDED';
    search?: string;
}
