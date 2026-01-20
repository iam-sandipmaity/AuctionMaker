'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface Player {
    id: string;
    name: string;
    description: string;
    role?: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    isCurrentlyAuctioning: boolean;
    marqueeSet?: number;
    isStarPlayer?: boolean;
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
    };
    interestedTeams?: {
        team: {
            id: string;
            shortName: string;
            color: string;
        };
    }[];
}

interface Bid {
    id: string;
    amount: number;
    timestamp: Date;
    user?: {
        id: string;
        username: string;
        name: string;
    };
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
    } | null;
}

interface AuctioneerControlPanelProps {
    auctionId: string;
    currentPlayer: Player | null;
    players: Player[];
    currentBids: Bid[];
    currency: string;
    onRefresh: () => void;
}

export default function AuctioneerControlPanel({
    auctionId,
    currentPlayer,
    players,
    currentBids,
    currency,
    onRefresh,
}: AuctioneerControlPanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const unsoldPlayers = players.filter(p => p.status === 'UNSOLD' && !p.isCurrentlyAuctioning);
    
    // Separate players by tier
    const tier1to3Players = unsoldPlayers.filter(p => (p.marqueeSet || 5) <= 3);
    const tier4to5Players = unsoldPlayers.filter(p => (p.marqueeSet || 5) >= 4);
    
    // For tier 4-5, only show players with team interest
    const tier4to5WithInterest = tier4to5Players.filter(p => 
        p.interestedTeams && p.interestedTeams.length > 0
    );
    
    // Combined list for auctioneer: all tier 1-3 + interested tier 4-5
    const playersToAuction = [...tier1to3Players, ...tier4to5WithInterest].sort((a, b) => {
        const tierA = a.marqueeSet || 5;
        const tierB = b.marqueeSet || 5;
        return tierA - tierB;
    });

    const highestBid = currentBids.length > 0 ? currentBids[0] : null;

    const handleStartPlayer = async (playerId: string) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start-player',
                    auctionId,
                    playerId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to start player auction');
                return;
            }

            onRefresh();
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSellPlayer = async () => {
        if (!currentPlayer || !highestBid) return;

        if (!confirm(`Sell ${currentPlayer.name} to ${highestBid.team?.shortName} for ${highestBid.amount} ${currency}?`)) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'end-player',
                    auctionId,
                    playerId: currentPlayer.id,
                    sold: true,
                    winningBidId: highestBid.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to sell player');
                return;
            }

            onRefresh();
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUnsoldPlayer = async () => {
        if (!currentPlayer) return;

        if (!confirm(`Mark ${currentPlayer.name} as UNSOLD?`)) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'end-player',
                    auctionId,
                    playerId: currentPlayer.id,
                    sold: false,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to mark player as unsold');
                return;
            }

            onRefresh();
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-6 bg-accent/10 border-accent">
                <h3 className="font-mono text-xl font-bold text-accent mb-4">🎤 AUCTIONEER CONTROL PANEL</h3>
                
                {error && (
                    <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                        <p className="font-mono text-sm text-red-500">{error}</p>
                    </div>
                )}

                {currentPlayer ? (
                    <div className="space-y-4">
                        <div className="p-4 border-3 border-border">
                            <p className="font-mono text-sm text-muted mb-2">CURRENTLY AUCTIONING</p>
                            <h4 className="font-mono text-2xl font-bold mb-2">{currentPlayer.name}</h4>
                            {currentPlayer.role && (
                                <Badge status="active">{currentPlayer.role}</Badge>
                            )}
                            <p className="font-mono text-sm text-muted mt-2">
                                {currentPlayer.description}
                            </p>
                            <div className="mt-3 flex justify-between items-center">
                                <span className="font-mono text-sm text-muted">Base Price:</span>
                                <span className="font-mono font-bold">
                                    {Number(currentPlayer.basePrice).toFixed(2)} {currency}
                                </span>
                            </div>
                        </div>

                        {highestBid ? (
                            <div className="p-4 border-3 border-accent bg-accent/5">
                                <p className="font-mono text-sm text-muted mb-2">HIGHEST BID</p>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p 
                                            className="font-mono text-xl font-bold"
                                            style={{ color: highestBid.team?.color }}
                                        >
                                            {highestBid.team?.shortName || highestBid.user?.username || 'Unknown'}
                                        </p>
                                        <p className="font-mono text-sm text-muted">
                                            @{highestBid.user?.username || 'unknown'}
                                        </p>
                                    </div>
                                    <p className="font-mono text-3xl font-bold text-accent">
                                        {highestBid.amount} {currency}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 border-3 border-border">
                                <p className="font-mono text-center text-muted">No bids yet...</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                variant="primary"
                                onClick={handleSellPlayer}
                                disabled={loading || !highestBid}
                                className="flex-1"
                            >
                                {loading ? 'PROCESSING...' : '✓ SOLD'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleUnsoldPlayer}
                                disabled={loading}
                                className="flex-1"
                            >
                                UNSOLD
                            </Button>
                        </div>

                        {/* Recent Bids */}
                        {currentBids.length > 1 && (
                            <div className="mt-4">
                                <p className="font-mono text-sm text-muted mb-2">RECENT BIDS</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {currentBids.slice(1, 6).map((bid) => (
                                        <div 
                                            key={bid.id}
                                            className="p-2 border-2 border-border text-sm font-mono flex justify-between"
                                        >
                                            <span style={{ color: bid.team?.color }}>
                                                {bid.team?.shortName || bid.user?.username || 'Unknown'}
                                            </span>
                                            <span>{bid.amount} {currency}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="font-mono text-muted mb-4">
                            No player is currently being auctioned.
                        </p>
                        <p className="font-mono text-sm text-muted">
                            Select a player from the list below to start.
                        </p>
                    </div>
                )}
            </Card>

            {/* Available Players */}
            {playersToAuction.length > 0 && (
                <div>
                    <div className="mb-4 p-3 bg-accent/10 border-2 border-accent/20">
                        <p className="font-mono text-xs text-muted">
                            📋 Showing: All Tier 1-3 players + Tier 4-5 players shortlisted by teams
                        </p>
                        <p className="font-mono text-xs text-muted mt-1">
                            {tier1to3Players.length} marquee players | {tier4to5WithInterest.length} shortlisted lower-tier
                        </p>
                    </div>
                    
                    <h4 className="font-mono text-lg font-bold mb-3">
                        NEXT PLAYERS ({playersToAuction.length})
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                        {playersToAuction.slice(0, 6).map((player) => {
                            const interestedCount = player.interestedTeams?.length || 0;
                            const tierEmoji = ['🌟', '⭐', '✨', '💫', '🔹'][(player.marqueeSet || 5) - 1];
                            
                            return (
                                <Card 
                                    key={player.id} 
                                    className={`p-4 ${player.isStarPlayer ? 'border-yellow-500 border-4 bg-yellow-500/10' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {player.isStarPlayer && <span className="text-xl">⭐</span>}
                                                <h5 className="font-mono font-bold">{player.name}</h5>
                                                <span>{tierEmoji}</span>
                                            </div>
                                            {player.role && (
                                                <Badge status="active">{player.role}</Badge>
                                            )}
                                            {interestedCount > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {player.interestedTeams?.map((it) => (
                                                        <span
                                                            key={it.team.id}
                                                            className="font-mono text-xs px-1 py-0.5"
                                                            style={{ 
                                                                color: it.team.color,
                                                                border: `1px solid ${it.team.color}`,
                                                            }}
                                                        >
                                                            {it.team.shortName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="primary"
                                            onClick={() => handleStartPlayer(player.id)}
                                            disabled={loading || !!currentPlayer}
                                            className="text-sm px-3 py-1"
                                        >
                                            START
                                        </Button>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-mono text-muted">Base:</span>
                                        <span className="font-mono font-bold">
                                            {Number(player.basePrice).toFixed(2)} {currency}
                                        </span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {playersToAuction.length === 0 && !currentPlayer && (
                <div className="text-center py-12">
                    <p className="font-mono text-muted">All eligible players have been auctioned!</p>
                    {tier4to5Players.length > tier4to5WithInterest.length && (
                        <p className="font-mono text-xs text-muted mt-2">
                            ({tier4to5Players.length - tier4to5WithInterest.length} tier 4-5 players not shortlisted by any team)
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
