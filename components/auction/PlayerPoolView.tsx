'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface Player {
    id: string;
    name: string;
    description: string;
    role?: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    avatarUrl?: string;
    marqueeSet?: number;
    isStarPlayer?: boolean;
    isCurrentlyAuctioning?: boolean;
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

interface PlayerPoolViewProps {
    players: Player[];
    currency: string;
    userTeamId?: string;
    isAdmin?: boolean;
    onToggleInterest?: (playerId: string, interested: boolean) => Promise<void>;
}

interface Bid {
    id: string;
    amount: number;
    timestamp: string;
    user: {
        id: string;
        name: string;
        username: string;
        team?: {
            id: string;
            name: string;
            shortName: string;
            color: string;
        };
    };
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
    };
}

export default function PlayerPoolView({ 
    players, 
    currency,
    userTeamId,
    isAdmin = false,
    onToggleInterest
}: PlayerPoolViewProps) {
    const [filter, setFilter] = useState<'all' | 'unsold' | 'sold' | 'shortlisted'>('all');
    const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
    const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showStarPlayersOnly, setShowStarPlayersOnly] = useState(false);
    const [selectedPlayerForBids, setSelectedPlayerForBids] = useState<Player | null>(null);
    const [playerBids, setPlayerBids] = useState<Bid[]>([]);
    const [loadingBids, setLoadingBids] = useState(false);

    const unsoldPlayers = players.filter(p => p.status === 'UNSOLD');
    const soldPlayers = players.filter(p => p.status === 'SOLD');
    
    // For admin: show all players with any interests; For teams: show only their shortlisted players
    const myShortlist = isAdmin 
        ? players.filter(p => p.interestedTeams && p.interestedTeams.length > 0)
        : players.filter(p => p.interestedTeams?.some(it => it.team.id === userTeamId));
    
    const starPlayers = players.filter(p => p.isStarPlayer);

    const filteredPlayers = players.filter(p => {
        // Status filter
        if (filter === 'unsold' && p.status !== 'UNSOLD') return false;
        if (filter === 'sold' && p.status !== 'SOLD') return false;
        if (filter === 'shortlisted' && !myShortlist.some(mp => mp.id === p.id)) return false;

        // Star player filter (admin only)
        if (showStarPlayersOnly && !p.isStarPlayer) return false;

        // Tier filter
        if (tierFilter !== 'all' && p.marqueeSet !== tierFilter) return false;

        // Role filter
        if (roleFilter !== 'all' && p.role !== roleFilter) return false;

        // Search filter
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        return true;
    });

    const roles = Array.from(new Set(players.map(p => p.role).filter(Boolean))) as string[];

    const isShortlisted = (playerId: string) => {
        return players.find(p => p.id === playerId)?.interestedTeams?.some(it => it.team.id === userTeamId) || false;
    };

    const getTierBadge = (tier?: number) => {
        if (!tier) return null;
        const colors = ['🌟', '⭐', '✨', '💫', '🔹'];
        return colors[tier - 1] || '🔹';
    };

    const fetchBidHistory = async (player: Player) => {
        setSelectedPlayerForBids(player);
        setLoadingBids(true);
        try {
            const response = await fetch(`/api/bids?playerId=${player.id}`);
            const result = await response.json();
            if (result.success) {
                setPlayerBids(result.data);
            }
        } catch (error) {
            console.error('Error fetching bid history:', error);
        } finally {
            setLoadingBids(false);
        }
    };

    const closeBidModal = () => {
        setSelectedPlayerForBids(null);
        setPlayerBids([]);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-mono text-xl font-bold mb-2">PLAYER POOL</h3>
                <p className="font-mono text-sm text-muted">
                    Total: {players.length} | Sold: {soldPlayers.length} | Unsold: {unsoldPlayers.length}
                    {userTeamId && ` | Your Shortlist: ${myShortlist.length}`}
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="space-y-4">
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Status</label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={filter === 'all' ? 'primary' : 'secondary'}
                                onClick={() => setFilter('all')}
                                className="text-xs"
                            >
                                ALL ({players.length})
                            </Button>
                            <Button
                                variant={filter === 'unsold' ? 'primary' : 'secondary'}
                                onClick={() => setFilter('unsold')}
                                className="text-xs"
                            >
                                UNSOLD ({unsoldPlayers.length})
                            </Button>
                            <Button
                                variant={filter === 'sold' ? 'primary' : 'secondary'}
                                onClick={() => setFilter('sold')}
                                className="text-xs"
                            >
                                SOLD ({soldPlayers.length})
                            </Button>
                            {(userTeamId || isAdmin) && (
                                <Button
                                    variant={filter === 'shortlisted' ? 'primary' : 'secondary'}
                                    onClick={() => setFilter('shortlisted')}
                                    className="text-xs"
                                >
                                    ⭐ {isAdmin ? 'ALL SHORTLISTED' : 'SHORTLISTED'} ({myShortlist.length})
                                </Button>
                            )}
                            {isAdmin && (
                                <Button
                                    variant={showStarPlayersOnly ? 'primary' : 'secondary'}
                                    onClick={() => setShowStarPlayersOnly(!showStarPlayersOnly)}
                                    className="text-xs"
                                >
                                    ⭐ STAR PLAYERS ({starPlayers.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Marquee Tier</label>
                            <select
                                value={tierFilter}
                                onChange={(e) => setTierFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                className="w-full p-2 border-2 border-border bg-background font-mono text-sm"
                            >
                                <option value="all">All Tiers</option>
                                <option value="1">🌟 Tier 1 (Marquee)</option>
                                <option value="2">⭐ Tier 2 (Star)</option>
                                <option value="3">✨ Tier 3 (Established)</option>
                                <option value="4">💫 Tier 4 (Emerging)</option>
                                <option value="5">🔹 Tier 5 (Uncapped)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full p-2 border-2 border-border bg-background font-mono text-sm"
                            >
                                <option value="all">All Roles</option>
                                {roles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Search</label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search player name..."
                                className="w-full p-2 border-2 border-border bg-background font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Players List */}
            <div className="grid md:grid-cols-2 gap-4">
                {filteredPlayers.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                        <p className="font-mono text-muted">No players found</p>
                    </div>
                ) : (
                    filteredPlayers.map((player) => {
                        const shortlisted = isShortlisted(player.id);
                        const interestedCount = player.interestedTeams?.length || 0;

                        const hasBids = player.status === 'SOLD' || player.soldPrice;
                        
                        return (
                            <Card 
                                key={player.id} 
                                className={`p-4 ${player.isCurrentlyAuctioning ? 'border-accent border-4 animate-pulse' : ''} ${player.isStarPlayer ? 'border-yellow-500 border-2' : ''} ${hasBids ? 'cursor-pointer hover:border-accent' : ''}`}
                                onClick={() => hasBids && fetchBidHistory(player)}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {player.isStarPlayer && <span className="text-xl">⭐</span>}
                                            <h4 className="font-mono font-bold text-lg">{player.name}</h4>
                                            {player.marqueeSet && (
                                                <span className="text-lg">{getTierBadge(player.marqueeSet)}</span>
                                            )}
                                        </div>
                                        {player.role && (
                                            <p className="font-mono text-xs text-muted mb-1">{player.role}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1">
                                        {player.status === 'SOLD' ? (
                                            <Badge status="ended">SOLD</Badge>
                                        ) : player.isCurrentlyAuctioning ? (
                                            <Badge status="live">LIVE</Badge>
                                        ) : (
                                            <Badge status="upcoming">UNSOLD</Badge>
                                        )}
                                        {hasBids && (
                                            <span className="text-xs text-accent font-mono">📊 View Bids</span>
                                        )}
                                    </div>
                                </div>

                                <p className="font-mono text-xs text-muted mb-3 line-clamp-2">
                                    {player.description}
                                </p>

                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-mono text-xs text-muted">Base Price</p>
                                        <p className="font-mono font-bold text-accent">
                                            {Number(player.basePrice).toFixed(0)} {currency}
                                        </p>
                                    </div>
                                    {player.team && (
                                        <div className="text-right">
                                            <p className="font-mono text-xs text-muted">Sold To</p>
                                            <p 
                                                className="font-mono font-bold"
                                                style={{ color: player.team.color }}
                                            >
                                                {player.team.shortName}
                                            </p>
                                            <p className="font-mono text-xs text-accent">
                                                {Number(player.soldPrice).toFixed(0)} {currency}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Interested Teams */}
                                {interestedCount > 0 && (
                                    <div className="mb-3 p-2 bg-accent/10 border border-accent/20">
                                        <p className="font-mono text-xs mb-1">
                                            {isAdmin ? 'Shortlisted by:' : `${interestedCount} team${interestedCount > 1 ? 's' : ''} interested:`}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {player.interestedTeams?.map((it) => (
                                                <span
                                                    key={it.team.id}
                                                    className="font-mono text-xs font-bold px-2 py-1"
                                                    style={{ 
                                                        color: it.team.color,
                                                        border: `2px solid ${it.team.color}`,
                                                    }}
                                                >
                                                    {it.team.shortName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Shortlist Button */}
                                {userTeamId && player.status === 'UNSOLD' && !player.isCurrentlyAuctioning && onToggleInterest && (
                                    <Button
                                        variant={shortlisted ? 'primary' : 'secondary'}
                                        onClick={() => onToggleInterest(player.id, shortlisted)}
                                        className="w-full text-xs"
                                    >
                                        {shortlisted ? '⭐ SHORTLISTED' : '☆ ADD TO SHORTLIST'}
                                    </Button>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Bid History Modal */}
            {selectedPlayerForBids && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeBidModal}>
                    <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-mono text-xl font-bold mb-1">
                                        {selectedPlayerForBids.isStarPlayer && '⭐ '}
                                        {selectedPlayerForBids.name}
                                    </h3>
                                    <p className="font-mono text-sm text-muted">{selectedPlayerForBids.role}</p>
                                </div>
                                <button
                                    onClick={closeBidModal}
                                    className="text-2xl hover:text-accent transition-colors"
                                >
                                    ×
                                </button>
                            </div>

                            {selectedPlayerForBids.team && (
                                <div className="mb-4 p-3 border-2 border-border">
                                    <p className="font-mono text-xs text-muted mb-1">SOLD TO</p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-mono font-bold text-lg" style={{ color: selectedPlayerForBids.team.color }}>
                                            {selectedPlayerForBids.team.name}
                                        </p>
                                        <p className="font-mono font-bold text-xl text-accent">
                                            {Number(selectedPlayerForBids.soldPrice).toFixed(0)} {currency}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-3">
                                <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-2">Bid History</h4>
                            </div>

                            {loadingBids ? (
                                <div className="text-center py-8">
                                    <p className="font-mono text-muted">Loading bids...</p>
                                </div>
                            ) : playerBids.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="font-mono text-muted">No bids found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {playerBids.map((bid, index) => {
                                        const teamInfo = bid.team || bid.user.team;
                                        const isWinningBid = index === 0 && selectedPlayerForBids.status === 'SOLD';
                                        
                                        return (
                                            <div
                                                key={bid.id}
                                                className={`p-3 border-2 ${
                                                    isWinningBid 
                                                        ? 'border-accent bg-accent/10' 
                                                        : 'border-border'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {isWinningBid && <span className="text-lg">🏆</span>}
                                                        <div>
                                                            {teamInfo && (
                                                                <p
                                                                    className="font-mono font-bold text-sm"
                                                                    style={{ color: teamInfo.color }}
                                                                >
                                                                    {teamInfo.name}
                                                                </p>
                                                            )}
                                                            <p className="font-mono text-xs text-muted">
                                                                {bid.user.name || bid.user.username}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-mono font-bold text-lg text-accent">
                                                        {Number(bid.amount).toFixed(0)} {currency}
                                                    </p>
                                                </div>
                                                <p className="font-mono text-xs text-muted">
                                                    {new Date(bid.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
