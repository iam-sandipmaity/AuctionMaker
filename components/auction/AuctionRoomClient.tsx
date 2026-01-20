'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Timer from '@/components/ui/Timer';
import Badge from '@/components/ui/Badge';
import BidForm from '@/components/auction/BidForm';
import ActivityFeed from '@/components/auction/ActivityFeed';
import { AuctionWithBids } from '@/types';

interface AuctionRoomClientProps {
    initialAuction: AuctionWithBids;
}

export default function AuctionRoomClient({ initialAuction }: AuctionRoomClientProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [auction, setAuction] = useState(initialAuction);

    const currentPrice = typeof auction.currentPrice === 'object'
        ? parseFloat(auction.currentPrice.toString())
        : auction.currentPrice;

    const minIncrement = typeof auction.minIncrement === 'object'
        ? parseFloat(auction.minIncrement.toString())
        : auction.minIncrement;

    const handleBidPlaced = () => {
        // Refresh auction data
        router.refresh();
    };

    const handleAuctionExpire = () => {
        // Refresh to show ended state
        router.refresh();
    };

    const statusMap = {
        LIVE: 'live' as const,
        UPCOMING: 'upcoming' as const,
        ENDED: 'ended' as const,
    };

    // Determine user status
    const userBids = auction.bids?.filter(b => b.userId === session?.user?.id) || [];
    const highestBid = auction.bids?.find(b => b.isWinning);
    const isWinning = highestBid?.userId === session?.user?.id;
    const hasPlacedBid = userBids.length > 0;
    const isOutbid = hasPlacedBid && !isWinning;

    return (
        <div className="container section">
            {/* Header */}
            <div className="mb-12">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="mb-2">{auction.title}</h1>
                        <p className="text-xl font-mono text-muted">{auction.description}</p>
                    </div>
                    <Badge status={statusMap[auction.status]}>
                        {auction.status}
                    </Badge>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Current Bid Display */}
                    <div className="card p-8">
                        <div className="text-center">
                            <p className="font-mono text-sm text-muted mb-2">CURRENT HIGHEST BID</p>
                            <div className="font-mono text-6xl md:text-8xl font-bold text-accent mb-4 pulse-glow">
                                ${currentPrice.toFixed(2)}
                            </div>
                            {highestBid && (
                                <p className="font-mono text-muted">
                                    by @{highestBid.user?.username || 'Unknown'}
                                </p>
                            )}
                        </div>

                        {auction.status === 'LIVE' && (
                            <div className="mt-8 pt-8 border-t-3 border-border text-center">
                                <p className="font-mono text-sm text-muted mb-2">TIME REMAINING</p>
                                <Timer endTime={auction.endTime} onExpire={handleAuctionExpire} />
                            </div>
                        )}

                        {auction.status === 'ENDED' && auction.winner && (
                            <div className="mt-8 pt-8 border-t-3 border-border text-center">
                                <p className="font-mono text-sm text-muted mb-2">WINNER</p>
                                <p className="font-mono text-2xl font-bold text-accent">
                                    @{auction.winner.username}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* User Status */}
                    {session && auction.status === 'LIVE' && (
                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm text-muted">YOUR STATUS</span>
                                {isWinning && <Badge status="winning">WINNING</Badge>}
                                {isOutbid && <Badge status="outbid">OUTBID</Badge>}
                                {!hasPlacedBid && <Badge status="active">NO BIDS YET</Badge>}
                            </div>
                            {userBids.length > 0 && (
                                <div className="mt-4 pt-4 border-t-3 border-border">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-sm text-muted">YOUR BIDS</span>
                                        <span className="font-mono text-sm font-bold">{userBids.length}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Activity Feed */}
                    <ActivityFeed bids={auction.bids || []} currentUserId={session?.user?.id} />
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Bid Form */}
                    {auction.status === 'LIVE' && (
                        <BidForm
                            auctionId={auction.id}
                            currentPrice={currentPrice}
                            minIncrement={minIncrement}
                            currency={auction.currency}
                            onBidPlaced={handleBidPlaced}
                        />
                    )}

                    {/* Auction Details */}
                    <div className="card p-6">
                        <h3 className="mb-6">DETAILS</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">STARTING PRICE</span>
                                <span className="font-mono text-sm font-bold">
                                    ${typeof auction.startingPrice === 'object'
                                        ? parseFloat(auction.startingPrice.toString()).toFixed(2)
                                        : auction.startingPrice.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">MIN INCREMENT</span>
                                <span className="font-mono text-sm font-bold">
                                    ${minIncrement.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">TOTAL BIDS</span>
                                <span className="font-mono text-sm font-bold">{auction.bids?.length || 0}</span>
                            </div>
                            {auction.maxParticipants && (
                                <div className="flex justify-between">
                                    <span className="font-mono text-sm text-muted">MAX PARTICIPANTS</span>
                                    <span className="font-mono text-sm font-bold">{auction.maxParticipants}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">CURRENCY</span>
                                <span className="font-mono text-sm font-bold">{auction.currency}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
