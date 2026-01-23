'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/ToastProvider';

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
    hasBeenAuctioned?: boolean;
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
    budgetDenomination?: string;
}

export default function AuctioneerControlPanel({
    auctionId,
    currentPlayer,
    players,
    currentBids,
    currency,
    budgetDenomination,
}: AuctioneerControlPanelProps) {
    const { showConfirm } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Helper to format currency with denomination
    const formatCurrency = (amount: number | string) => {
        const num = Number(amount).toFixed(2);
        if (budgetDenomination) {
            return `${num} ${budgetDenomination} ${currency}`;
        }
        return `${num} ${currency}`;
    };
    const [tierFilter, setTierFilter] = useState<'all' | number>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showShortlistedOnly, setShowShortlistedOnly] = useState(false);
    const [showUnsoldOnly, setShowUnsoldOnly] = useState(false);
    const [randomSelection, setRandomSelection] = useState(false);
    const [randomPlayerId, setRandomPlayerId] = useState<string | null>(null);

    const unsoldPlayers = players.filter(p => p.status === 'UNSOLD' && !p.isCurrentlyAuctioning);
    
    // Separate players by tier
    const tier1to3Players = unsoldPlayers.filter(p => (p.marqueeSet || 5) <= 3);
    const tier4to5Players = unsoldPlayers.filter(p => (p.marqueeSet || 5) >= 4);
    
    // For tier 4-5, only show players with team interest
    const tier4to5WithInterest = tier4to5Players.filter(p => 
        p.interestedTeams && p.interestedTeams.length > 0
    );
    
    // Combined list for auctioneer: all tier 1-3 + interested tier 4-5
    let playersToAuction = [...tier1to3Players, ...tier4to5WithInterest];

    // Apply filters
    if (tierFilter !== 'all') {
        playersToAuction = playersToAuction.filter(p => (p.marqueeSet || 5) === tierFilter);
    }
    if (roleFilter !== 'all') {
        playersToAuction = playersToAuction.filter(p => p.role === roleFilter);
    }
    if (showShortlistedOnly) {
        playersToAuction = playersToAuction.filter(p => 
            p.interestedTeams && p.interestedTeams.length > 0
        );
    }
    if (showUnsoldOnly) {
        // Show only players that went unsold but now have team interest (second chance)
        playersToAuction = playersToAuction.filter(p => 
            p.status === 'UNSOLD' && 
            p.hasBeenAuctioned === true && // Player was previously auctioned
            p.interestedTeams && 
            p.interestedTeams.length > 0
        );
    }

    // Sort by tier
    playersToAuction.sort((a, b) => {
        const tierA = a.marqueeSet || 5;
        const tierB = b.marqueeSet || 5;
        return tierA - tierB;
    });

    // Use effect to handle random player selection to avoid infinite loop
    useEffect(() => {
        if (randomSelection && playersToAuction.length > 0) {
            // If no random player selected yet, or the current random player is no longer in the list, pick a new one
            if (!randomPlayerId || !playersToAuction.find(p => p.id === randomPlayerId)) {
                const randomIndex = Math.floor(Math.random() * playersToAuction.length);
                const newRandomPlayer = playersToAuction[randomIndex];
                setRandomPlayerId(newRandomPlayer.id);
            }
        } else if (!randomSelection && randomPlayerId) {
            // Reset random player when random selection is turned off
            setRandomPlayerId(null);
        }
    }, [randomSelection, playersToAuction.length, randomPlayerId]);

    // Apply random selection filter after determining the random player
    if (randomSelection && randomPlayerId) {
        playersToAuction = playersToAuction.filter(p => p.id === randomPlayerId);
    }

    // Get unique roles for filter
    const availableRoles = Array.from(new Set(unsoldPlayers.map(p => p.role).filter(Boolean))) as string[];

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

            // If in random mode and player was started, reset randomPlayerId so a new one gets picked next time
            if (randomSelection) {
                setRandomPlayerId(null);
            }

            // Data updates via socket event (player:auction:start), no need to refresh
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSellPlayer = async () => {
        if (!currentPlayer || !highestBid) return;

        showConfirm(`Sell ${currentPlayer.name} to ${highestBid.team?.shortName} for ${formatCurrency(highestBid.amount)}?`, async () => {
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

            // Data updates via socket event (player:sold), no need to refresh
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
        });
    };

    const handleUnsoldPlayer = async () => {
        if (!currentPlayer) return;

        showConfirm(`Mark ${currentPlayer.name} as UNSOLD?`, async () => {
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

            // Data updates via socket event (player:unsold), no need to refresh
            } catch {
                setError('An error occurred. Please try again.');
            } finally {
                setLoading(false);
            }
        });
    };

    return (
        <div className="space-y-5 md:space-y-5 lg:space-y-6">
            <Card className="p-5 md:p-6 lg:p-6 bg-accent/10 border-accent">
                <h3 className="font-mono text-lg md:text-xl font-bold text-accent mb-4">AUCTIONEER CONTROL PANEL</h3>
                
                {error && (
                    <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                        <p className="font-mono text-sm text-red-500">{error}</p>
                    </div>
                )}

                {currentPlayer ? (
                    <div className="space-y-4">
                        <div className="p-4 md:p-4 lg:p-4 border-3 border-border">
                            <p className="font-mono text-xs md:text-sm text-muted mb-2">CURRENTLY AUCTIONING</p>
                            <h4 className="font-mono text-xl md:text-2xl font-bold mb-2">{currentPlayer.name}</h4>
                            {currentPlayer.role && (
                                <Badge status="active">{currentPlayer.role}</Badge>
                            )}
                            <p className="font-mono text-sm text-muted mt-2">
                                {currentPlayer.description}
                            </p>
                            <div className="mt-3 flex justify-between items-center">
                                <span className="font-mono text-sm text-muted">Base Price:</span>
                                <span className="font-mono font-bold">
                                    {formatCurrency(currentPlayer.basePrice)}
                                </span>
                            </div>
                        </div>

                        {highestBid ? (
                            <div className="p-4 md:p-4 lg:p-4 border-3 border-accent bg-accent/5">
                                <p className="font-mono text-xs md:text-sm text-muted mb-2">HIGHEST BID</p>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p 
                                            className="font-mono text-lg md:text-xl font-bold"
                                            style={{ color: highestBid.team?.color }}
                                        >
                                            {highestBid.team?.shortName || highestBid.user?.username || 'Unknown'}
                                        </p>
                                        <p className="font-mono text-xs md:text-sm text-muted">
                                            @{highestBid.user?.username || 'unknown'}
                                        </p>
                                    </div>
                                    <p className="font-mono text-2xl md:text-3xl font-bold text-accent">
                                        {formatCurrency(highestBid.amount)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 border-3 border-border">
                                <p className="font-mono text-center text-muted">No bids yet...</p>
                            </div>
                        )}

                        <div className="flex gap-2 md:gap-3">
                            <Button
                                variant="primary"
                                onClick={handleSellPlayer}
                                disabled={loading || !highestBid}
                                className="flex-1 text-sm md:text-base"
                            >
                                {loading ? 'PROCESSING...' : '✓ SOLD'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleUnsoldPlayer}
                                disabled={loading}
                                className="flex-1 text-sm md:text-base"
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
                                            <span>{formatCurrency(bid.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6 md:py-8">
                        <p className="font-mono text-sm md:text-base text-muted mb-4">
                            No player is currently being auctioned.
                        </p>
                        <p className="font-mono text-sm text-muted">
                            Select a player from the list below to start.
                        </p>
                    </div>
                )}
            </Card>

            {/* Available Players */}
            {(tier1to3Players.length > 0 || tier4to5WithInterest.length > 0) && (
                <div>
                    {/* Filter Controls */}
                    <Card className="p-4 mb-4">
                        <h4 className="font-mono text-sm font-bold mb-3">FILTERS</h4>
                        <div className="grid md:grid-cols-5 gap-3">
                            {/* Tier Filter */}
                            <div>
                                <label className="font-mono text-xs uppercase tracking-wider mb-2 block">
                                    Tier
                                </label>
                                <select
                                    value={tierFilter}
                                    onChange={(e) => setTierFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                    className="w-full p-2 border-3 border-border bg-background font-mono text-sm"
                                >
                                    <option value="all">All Tiers</option>
                                    <option value="1">T1 - Marquee</option>
                                    <option value="2">T2 - Star</option>
                                    <option value="3">T3 - Established</option>
                                    <option value="4">T4 - Emerging</option>
                                    <option value="5">T5 - Uncapped</option>
                                </select>
                            </div>

                            {/* Role Filter */}
                            <div>
                                <label className="font-mono text-xs uppercase tracking-wider mb-2 block">
                                    Role
                                </label>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full p-2 border-3 border-border bg-background font-mono text-sm"
                                >
                                    <option value="all">All Roles</option>
                                    {availableRoles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Shortlisted Only Checkbox */}
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2 border-3 border-border bg-background hover:border-accent transition-colors w-full">
                                    <input
                                        type="checkbox"
                                        checked={showShortlistedOnly}
                                        onChange={(e) => setShowShortlistedOnly(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-mono text-xs uppercase">
                                        Shortlisted Only
                                    </span>
                                </label>
                            </div>

                            {/* Unsold Only Checkbox (Second Chance) */}
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2 border-3 border-border bg-background hover:border-accent transition-colors w-full">
                                    <input
                                        type="checkbox"
                                        checked={showUnsoldOnly}
                                        onChange={(e) => setShowUnsoldOnly(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-mono text-xs uppercase">
                                        Unsold (2nd Chance)
                                    </span>
                                </label>
                            </div>

                            {/* Random Selection Checkbox */}
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2 border-3 border-accent bg-accent/5 hover:border-accent hover:bg-accent/10 transition-colors w-full">
                                    <input
                                        type="checkbox"
                                        checked={randomSelection}
                                        onChange={(e) => setRandomSelection(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-mono text-xs uppercase text-accent font-bold">
                                        Random Selection
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Filter Summary */}
                        <div className="mt-3 p-2 bg-accent/10 border-2 border-accent/20">
                            <p className="font-mono text-xs text-muted">
                                Showing: {playersToAuction.length} players
                                {tierFilter !== 'all' && ` | Tier ${tierFilter}`}
                                {roleFilter !== 'all' && ` | ${roleFilter}`}
                                {showShortlistedOnly && ' | Shortlisted only'}
                                {showUnsoldOnly && ' | Unsold with interest (2nd chance)'}
                                {randomSelection && ' | Random selection mode'}
                            </p>
                        </div>
                    </Card>

                    <div className="mb-4 p-3 md:p-3 lg:p-3 bg-accent/10 border-2 border-accent/20">
                        <p className="font-mono text-xs text-muted">
                            Showing: All Tier 1-3 players + Tier 4-5 players shortlisted by teams
                        </p>
                        <p className="font-mono text-xs text-muted mt-1">
                            {tier1to3Players.length} marquee players | {tier4to5WithInterest.length} shortlisted lower-tier
                        </p>
                    </div>
                    
                    <h4 className="font-mono text-base md:text-lg font-bold mb-3">
                        NEXT PLAYERS ({playersToAuction.length})
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3 md:gap-3 lg:gap-3">
                        {playersToAuction.length > 0 ? (
                            playersToAuction.map((player) => {
                                const interestedCount = player.interestedTeams?.length || 0;
                                const tierLabel = ['T1', 'T2', 'T3', 'T4', 'T5'][(player.marqueeSet || 5) - 1];
                                
                                return (
                                    <Card 
                                        key={player.id} 
                                        className={`p-3 md:p-4 ${player.isStarPlayer ? 'border-yellow-500 border-4 bg-yellow-500/10' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {player.isStarPlayer && <Badge status="live" className="text-xs">STAR</Badge>}
                                                    <h5 className="font-mono font-bold">{player.name}</h5>
                                                    <Badge status="active" className="text-xs">{tierLabel}</Badge>
                                                </div>
                                                {player.role && (
                                                    <Badge status="active" className="mt-1">{player.role}</Badge>
                                                )}
                                                {interestedCount > 0 && (
                                                    <div className="mt-2">
                                                        <p className="font-mono text-xs text-accent mb-1">
                                                            {interestedCount} Team{interestedCount > 1 ? 's' : ''} Interested
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {player.interestedTeams?.map((it) => (
                                                                <span
                                                                    key={it.team.id}
                                                                    className="font-mono text-xs px-2 py-0.5 border-2"
                                                                    style={{ 
                                                                        borderColor: it.team.color,
                                                                        color: it.team.color,
                                                                    }}
                                                                >
                                                                    {it.team.shortName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="primary"
                                                onClick={() => handleStartPlayer(player.id)}
                                                disabled={loading || !!currentPlayer}
                                                className="text-xs md:text-sm px-2 md:px-3 py-1"
                                            >
                                                START
                                            </Button>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-mono text-muted">Base:</span>
                                            <span className="font-mono font-bold">
                                                {formatCurrency(player.basePrice)}
                                            </span>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="col-span-2 text-center py-8">
                                <p className="font-mono text-muted">No players match the selected filters</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {(tier1to3Players.length === 0 && tier4to5WithInterest.length === 0) && !currentPlayer && (
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
