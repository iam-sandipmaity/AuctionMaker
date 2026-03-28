'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PlayerAvatar from '@/components/auction/PlayerAvatar';
import TeamLogoMark from '@/components/auction/TeamLogoMark';

interface Player {
    id: string;
    name: string;
    description: string;
    role?: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    imageUrl?: string;
    avatarUrl?: string;
    marqueeSet?: number;
    isStarPlayer?: boolean;
    isCurrentlyAuctioning?: boolean;
    hasBeenAuctioned?: boolean;
    previousTeamShortName?: string | null;
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
        logo?: string | null;
    };
    interestedTeams?: {
        team: {
            id: string;
            shortName: string;
            color: string;
            logo?: string | null;
        };
    }[];
    rtmSelections?: {
        team: {
            id: string;
            shortName: string;
            color: string;
            logo?: string | null;
            rtmCardsRemaining?: number;
        };
    }[];
}

interface PlayerPoolViewProps {
    players: Player[];
    currency: string;
    budgetDenomination?: string;
    userTeamId?: string;
    userTeamShortName?: string;
    userTeamRtmCardsRemaining?: number;
    maxRtmSelectionsPerTeam?: number;
    rtmCardsPerTeam?: number;
    auctionStatus?: 'UPCOMING' | 'LIVE' | 'ENDED';
    isAdmin?: boolean;
    onToggleInterest?: (playerId: string, interested: boolean) => Promise<void>;
    onToggleRtm?: (playerId: string, selected: boolean) => Promise<void>;
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
            logo?: string | null;
        };
    };
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
        logo?: string | null;
    };
}

type FilterMode =
    | 'all'
    | 'yet-to-auction'
    | 'unsold'
    | 'sold'
    | 'shortlisted'
    | 'previous-lineup'
    | 'rtm-selected';

export default function PlayerPoolView({
    players,
    currency,
    budgetDenomination,
    userTeamId,
    userTeamShortName,
    userTeamRtmCardsRemaining,
    maxRtmSelectionsPerTeam = 4,
    rtmCardsPerTeam = 2,
    auctionStatus,
    isAdmin = false,
    onToggleInterest,
    onToggleRtm,
}: PlayerPoolViewProps) {
    const [filter, setFilter] = useState<FilterMode>('all');
    const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
    const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showStarPlayersOnly, setShowStarPlayersOnly] = useState(false);
    const [selectedPlayerForBids, setSelectedPlayerForBids] = useState<Player | null>(null);
    const [playerBids, setPlayerBids] = useState<Bid[]>([]);
    const [loadingBids, setLoadingBids] = useState(false);
    const [rtmLoadingPlayerId, setRtmLoadingPlayerId] = useState<string | null>(null);

    const formatCurrency = (amount: number | string) => {
        const num = Number(amount).toFixed(2);
        if (budgetDenomination) {
            return `${num} ${budgetDenomination} ${currency}`;
        }
        return `${num} ${currency}`;
    };

    const isShortlisted = (playerId: string) =>
        players.find((player) => player.id === playerId)?.interestedTeams?.some((interest) => interest.team.id === userTeamId) || false;

    const isRtmSelected = (playerId: string) =>
        players.find((player) => player.id === playerId)?.rtmSelections?.some((selection) => selection.team.id === userTeamId) || false;

    const yetToAuctionPlayers = players.filter(
        (player) => player.status === 'UNSOLD' && !player.isCurrentlyAuctioning && !player.hasBeenAuctioned
    );
    const actuallyUnsoldPlayers = players.filter(
        (player) => player.status === 'UNSOLD' && !player.isCurrentlyAuctioning && player.hasBeenAuctioned
    );
    const soldPlayers = players.filter((player) => player.status === 'SOLD');
    const myShortlist = isAdmin
        ? players.filter((player) => player.interestedTeams && player.interestedTeams.length > 0)
        : players.filter((player) => player.interestedTeams?.some((interest) => interest.team.id === userTeamId));
    const previousLineupPlayers = userTeamShortName
        ? players.filter((player) => player.previousTeamShortName === userTeamShortName)
        : [];
    const selectedRtmPlayers = userTeamId
        ? players.filter((player) => player.rtmSelections?.some((selection) => selection.team.id === userTeamId))
        : [];
    const starPlayers = players.filter((player) => player.isStarPlayer);
    const roles = Array.from(new Set(players.map((player) => player.role).filter(Boolean))) as string[];
    const canManageRtm = Boolean(userTeamId && userTeamShortName && onToggleRtm && auctionStatus === 'UPCOMING');

    const filteredPlayers = players.filter((player) => {
        if (filter === 'yet-to-auction' && (player.status !== 'UNSOLD' || player.isCurrentlyAuctioning || player.hasBeenAuctioned)) {
            return false;
        }

        if (filter === 'unsold' && (player.status !== 'UNSOLD' || player.isCurrentlyAuctioning || !player.hasBeenAuctioned)) {
            return false;
        }

        if (filter === 'sold' && player.status !== 'SOLD') {
            return false;
        }

        if (filter === 'shortlisted' && !myShortlist.some((shortlistedPlayer) => shortlistedPlayer.id === player.id)) {
            return false;
        }

        if (filter === 'previous-lineup' && player.previousTeamShortName !== userTeamShortName) {
            return false;
        }

        if (filter === 'rtm-selected' && !selectedRtmPlayers.some((selectedPlayer) => selectedPlayer.id === player.id)) {
            return false;
        }

        if (showStarPlayersOnly && !player.isStarPlayer) {
            return false;
        }

        if (tierFilter !== 'all' && player.marqueeSet !== tierFilter) {
            return false;
        }

        if (roleFilter !== 'all' && player.role !== roleFilter) {
            return false;
        }

        if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        return true;
    });

    const getTierBadge = (tier?: number) => {
        if (!tier) return null;
        const labels = ['T1', 'T2', 'T3', 'T4', 'T5'];
        return labels[tier - 1] || 'T5';
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

    const handleToggleRtm = async (playerId: string, selected: boolean) => {
        if (!onToggleRtm) return;

        setRtmLoadingPlayerId(playerId);
        try {
            await onToggleRtm(playerId, selected);
        } finally {
            setRtmLoadingPlayerId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-mono text-xl font-bold mb-2">PLAYER POOL</h3>
                <p className="font-mono text-sm text-muted">
                    Total: {players.length} | Sold: {soldPlayers.length} | Yet to Auction: {yetToAuctionPlayers.length}
                    {userTeamId && ` | Your Shortlist: ${myShortlist.length}`}
                </p>
                {userTeamId && userTeamShortName && (
                    <p className="font-mono text-sm text-muted mt-2">
                        Previous Year Line-up: {previousLineupPlayers.length} | RTM Picks: {selectedRtmPlayers.length}/{maxRtmSelectionsPerTeam} | RTM Cards Left:{' '}
                        {userTeamRtmCardsRemaining ?? rtmCardsPerTeam}
                    </p>
                )}
            </div>

            <Card className="p-4">
                <div className="space-y-4">
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Status</label>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')} className="text-xs">
                                ALL ({players.length})
                            </Button>
                            <Button
                                variant={filter === 'yet-to-auction' ? 'primary' : 'secondary'}
                                onClick={() => setFilter('yet-to-auction')}
                                className="text-xs"
                            >
                                YET TO AUCTION ({yetToAuctionPlayers.length})
                            </Button>
                            <Button
                                variant={filter === 'unsold' ? 'primary' : 'secondary'}
                                onClick={() => setFilter('unsold')}
                                className="text-xs"
                            >
                                UNSOLD ({actuallyUnsoldPlayers.length})
                            </Button>
                            <Button variant={filter === 'sold' ? 'primary' : 'secondary'} onClick={() => setFilter('sold')} className="text-xs">
                                SOLD ({soldPlayers.length})
                            </Button>
                            {(userTeamId || isAdmin) && (
                                <Button
                                    variant={filter === 'shortlisted' ? 'primary' : 'secondary'}
                                    onClick={() => setFilter('shortlisted')}
                                    className="text-xs"
                                >
                                    {isAdmin ? 'ALL SHORTLISTED' : 'SHORTLISTED'} ({myShortlist.length})
                                </Button>
                            )}
                            {userTeamShortName && (
                                <Button
                                    variant={filter === 'previous-lineup' ? 'primary' : 'secondary'}
                                    onClick={() => setFilter('previous-lineup')}
                                    className="text-xs"
                                >
                                    PREVIOUS YEAR LINE-UP ({previousLineupPlayers.length})
                                </Button>
                            )}
                            {userTeamId && (
                                <Button
                                    variant={filter === 'rtm-selected' ? 'primary' : 'secondary'}
                                    onClick={() => setFilter('rtm-selected')}
                                    className="text-xs"
                                >
                                    RTM SELECTED ({selectedRtmPlayers.length})
                                </Button>
                            )}
                            {isAdmin && (
                                <Button
                                    variant={showStarPlayersOnly ? 'primary' : 'secondary'}
                                    onClick={() => setShowStarPlayersOnly(!showStarPlayersOnly)}
                                    className="text-xs"
                                >
                                    STAR PLAYERS ({starPlayers.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Marquee Tier</label>
                            <select
                                value={tierFilter}
                                onChange={(e) => setTierFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                                className="w-full p-2 border-2 border-border bg-background font-mono text-sm"
                            >
                                <option value="all">All Tiers</option>
                                <option value="1">T1 - Marquee</option>
                                <option value="2">T2 - Star</option>
                                <option value="3">T3 - Established</option>
                                <option value="4">T4 - Emerging</option>
                                <option value="5">T5 - Uncapped</option>
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
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
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

            <div className="grid md:grid-cols-2 gap-4">
                {filteredPlayers.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                        <p className="font-mono text-muted">No players found</p>
                    </div>
                ) : (
                    filteredPlayers.map((player) => {
                        const shortlisted = isShortlisted(player.id);
                        const rtmSelected = isRtmSelected(player.id);
                        const interestedCount = player.interestedTeams?.length || 0;
                        const hasBids = player.status === 'SOLD' || Boolean(player.soldPrice);
                        const isPreviousTeamPlayer = Boolean(userTeamShortName && player.previousTeamShortName === userTeamShortName);
                        const canSelectRtmForPlayer = canManageRtm && isPreviousTeamPlayer;
                        const rtmLimitReached = !rtmSelected && selectedRtmPlayers.length >= maxRtmSelectionsPerTeam;

                        return (
                            <Card
                                key={player.id}
                                className={`${player.isCurrentlyAuctioning ? 'border-accent border-4 animate-pulse' : ''} ${
                                    player.isStarPlayer ? 'border-yellow-500 border-2' : ''
                                } ${hasBids ? 'cursor-pointer hover:border-accent' : ''} p-4`}
                                onClick={() => hasBids && fetchBidHistory(player)}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {player.isStarPlayer && <Badge status="live" className="text-xs px-2 py-0">STAR</Badge>}
                                            <h4 className="font-mono font-bold text-lg">{player.name}</h4>
                                            {player.marqueeSet && (
                                                <Badge status="active" className="text-xs px-2 py-0">
                                                    {getTierBadge(player.marqueeSet)}
                                                </Badge>
                                            )}
                                            {player.previousTeamShortName && (
                                                <Badge status="upcoming" className="text-xs px-2 py-0">
                                                    PREV {player.previousTeamShortName}
                                                </Badge>
                                            )}
                                            {rtmSelected && (
                                                <Badge status="live" className="text-xs px-2 py-0">
                                                    RTM SELECTED
                                                </Badge>
                                            )}
                                        </div>
                                        {player.role && <p className="font-mono text-xs text-muted mb-1">{player.role}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        {player.status === 'SOLD' ? (
                                            <Badge status="ended">SOLD</Badge>
                                        ) : player.isCurrentlyAuctioning ? (
                                            <Badge status="live">LIVE</Badge>
                                        ) : (
                                            <Badge status="upcoming">UNSOLD</Badge>
                                        )}
                                        {hasBids && <span className="text-xs text-accent font-mono">View Bids</span>}
                                    </div>
                                </div>

                                <p className="font-mono text-xs text-muted mb-3 line-clamp-2">{player.description}</p>

                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-mono text-xs text-muted">Base Price</p>
                                        <p className="font-mono font-bold text-accent">{formatCurrency(player.basePrice)}</p>
                                    </div>
                                    {player.team && (
                                        <div className="text-right">
                                            <p className="font-mono text-xs text-muted">Sold To</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <TeamLogoMark team={player.team} size="sm" />
                                                <p className="font-mono font-bold" style={{ color: player.team.color }}>
                                                    {player.team.shortName}
                                                </p>
                                            </div>
                                            <p className="font-mono text-xs text-accent">{Number(player.soldPrice).toFixed(2)} {currency}</p>
                                        </div>
                                    )}
                                </div>

                                {interestedCount > 0 && (
                                    <div className="mb-3 p-2 bg-accent/10 border border-accent/20">
                                        <p className="font-mono text-xs mb-1">
                                            {isAdmin ? 'Shortlisted by:' : `${interestedCount} team${interestedCount > 1 ? 's' : ''} interested:`}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {player.interestedTeams?.map((interest) => (
                                                <span
                                                    key={interest.team.id}
                                                    className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-1"
                                                    style={{
                                                        color: interest.team.color,
                                                        border: `2px solid ${interest.team.color}`,
                                                    }}
                                                >
                                                    <TeamLogoMark team={interest.team} size="sm" className="h-5 w-5 text-[8px]" />
                                                    {interest.team.shortName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {player.previousTeamShortName && (
                                    <div className="mb-3 p-2 border border-border/60 bg-background/60">
                                        <p className="font-mono text-xs text-muted">
                                            Previous season franchise: <span className="font-bold text-foreground">{player.previousTeamShortName}</span>
                                        </p>
                                        {isPreviousTeamPlayer && auctionStatus === 'UPCOMING' && (
                                            <p className="font-mono text-xs text-accent mt-1">
                                                This player can be added to your {maxRtmSelectionsPerTeam}-player RTM shortlist before the auction starts.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {userTeamId && player.status === 'UNSOLD' && !player.isCurrentlyAuctioning && onToggleInterest && (
                                        <Button
                                            variant={shortlisted ? 'primary' : 'secondary'}
                                            onClick={() => onToggleInterest(player.id, shortlisted)}
                                            className="w-full text-xs"
                                        >
                                            {shortlisted ? 'SHORTLISTED' : 'ADD TO SHORTLIST'}
                                        </Button>
                                    )}

                                    {canSelectRtmForPlayer && (
                                        <Button
                                            variant={rtmSelected ? 'primary' : 'secondary'}
                                            disabled={rtmLoadingPlayerId === player.id || rtmLimitReached}
                                            onClick={() => handleToggleRtm(player.id, rtmSelected)}
                                            className="w-full text-xs"
                                        >
                                            {rtmLoadingPlayerId === player.id
                                                ? 'UPDATING RTM...'
                                                : rtmSelected
                                                    ? 'REMOVE FROM RTM'
                                                    : rtmLimitReached
                                                        ? 'RTM LIMIT REACHED'
                                                        : 'ADD TO RTM'}
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {selectedPlayerForBids && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeBidModal}>
                    <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <PlayerAvatar player={selectedPlayerForBids} size="lg" />
                                    <div>
                                    <h3 className="font-mono text-2xl font-bold">{selectedPlayerForBids.name}</h3>
                                    <p className="font-mono text-sm text-muted mt-1">Bid History</p>
                                    </div>
                                </div>
                                <Button variant="secondary" onClick={closeBidModal}>
                                    CLOSE
                                </Button>
                            </div>

                            {loadingBids ? (
                                <p className="font-mono text-muted">Loading bid history...</p>
                            ) : playerBids.length === 0 ? (
                                <p className="font-mono text-muted">No bids found for this player.</p>
                            ) : (
                                <div className="space-y-3">
                                    {playerBids.map((bid, index) => (
                                        <div key={bid.id} className="flex items-center justify-between p-3 border-2 border-border">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {(bid.team || bid.user.team) && (
                                                        <TeamLogoMark team={bid.team || bid.user.team!} size="sm" />
                                                    )}
                                                    <p className="font-mono font-bold">
                                                        #{playerBids.length - index} {bid.team?.shortName || bid.user.team?.shortName || bid.user.name}
                                                    </p>
                                                </div>
                                                <p className="font-mono text-xs text-muted">
                                                    {new Date(bid.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <p className="font-mono text-lg font-bold text-accent">{formatCurrency(bid.amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
