'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/lib/socket/client';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import AdminTeamManager from '@/components/auction/AdminTeamManager';
import AdminPlayerManager from '@/components/auction/AdminPlayerManager';
import AuctioneerControlPanel from '@/components/auction/AuctioneerControlPanel';
import PlayerPoolView from '@/components/auction/PlayerPoolView';
import { AuctionWithBids } from '@/types';

interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    logo?: string;
    budget: number;
    totalBudget: number;
    squadSize: number;
    users?: any[];
}

interface Player {
    id: string;
    name: string;
    description: string;
    role?: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    isCurrentlyAuctioning: boolean;
    avatarUrl?: string;
    marqueeSet?: number;
    isStarPlayer?: boolean;
    team?: Team;
    interestedTeams?: {
        team: {
            id: string;
            shortName: string;
            color: string;
        };
    }[];
}

interface TeamAuctionRoomClientProps {
    initialAuction: AuctionWithBids & {
        teamBudget?: number;
        minSquadSize?: number;
        maxSquadSize?: number;
    };
}

export default function TeamAuctionRoomClient({ initialAuction }: TeamAuctionRoomClientProps) {
    const { data: session } = useSession();
    const { socket, isConnected } = useSocket(initialAuction.id);
    const [auction, setAuction] = useState(initialAuction);
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [userTeam, setUserTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [tab, setTab] = useState<'auction' | 'teams' | 'players'>('auction');
    const [selectedTeamForSquad, setSelectedTeamForSquad] = useState<Team | null>(null);
    const [showReconnecting, setShowReconnecting] = useState(false);

    const isAdmin = session?.user?.id === auction.createdById;
    const currentPlayer = players.find(p => p.isCurrentlyAuctioning) || null;
    const currentPlayerBids = (auction.bids || [])
        .filter(b => b.playerId === currentPlayer?.id)
        .map(bid => ({
            ...bid,
            amount: Number(bid.amount),
        }));

    // Track auction view
    useEffect(() => {
        const trackView = async () => {
            if (session?.user) {
                try {
                    await fetch('/api/auction-view', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ auctionId: auction.id }),
                    });
                } catch (error) {
                    console.error('Failed to track view:', error);
                }
            }
        };
        trackView();
    }, [auction.id, session?.user]);

    useEffect(() => {
        fetchTeams();
        fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auction.id]);

    // Show reconnecting notification
    useEffect(() => {
        if (auction.status === 'LIVE') {
            if (!isConnected) {
                setShowReconnecting(true);
            } else {
                setShowReconnecting(false);
            }
        }
    }, [isConnected, auction.status]);

    // WebSocket real-time updates - only when data changes
    useEffect(() => {
        if (!socket || auction.status !== 'LIVE') return;

        // Listen for player auction start
        socket.on('player:auction:start', (data: { player: Player }) => {
            console.log('🎯 Player auction started:', data.player.name);
            // Update players list directly with the new data
            setPlayers(prevPlayers => 
                prevPlayers.map(p => ({
                    ...p,
                    isCurrentlyAuctioning: p.id === data.player.id ? true : false
                }))
            );
            // Clear previous bids for new player
            setAuction(prev => ({
                ...prev,
                bids: (prev.bids || []).filter(b => b.playerId !== data.player.id)
            }));
        });

        // Listen for new bids
        socket.on('bid:placed', (data: { bid: any; playerId: string }) => {
            console.log('💰 New bid placed:', data.bid.amount, 'by', data.bid.team?.shortName);
            
            // Update auction bids directly
            setAuction(prev => ({
                ...prev,
                bids: [data.bid, ...(prev.bids || []).filter(b => b.id !== data.bid.id)]
            }));

            // Update team budget in real-time
            if (data.bid.team) {
                setTeams(prevTeams =>
                    prevTeams.map(t =>
                        t.id === data.bid.team.id
                            ? { ...t, budget: data.bid.team.budget }
                            : t
                    )
                );
                
                // Update user team if it's their bid
                if (userTeam?.id === data.bid.team.id) {
                    setUserTeam(prev => prev ? { ...prev, budget: data.bid.team.budget } : null);
                }
            }
        });

        // Listen for player sold
        socket.on('player:sold', (data: { playerId: string; teamId: string; amount: number; team: any }) => {
            console.log('✅ Player sold:', data.playerId, 'to', data.team?.shortName, 'for', data.amount);
            
            // Update player status
            setPlayers(prevPlayers =>
                prevPlayers.map(p =>
                    p.id === data.playerId
                        ? { ...p, status: 'SOLD', soldPrice: data.amount, teamId: data.teamId, isCurrentlyAuctioning: false, team: data.team }
                        : { ...p, isCurrentlyAuctioning: false }
                )
            );

            // Update team budget and squad size directly from socket data (no API call needed)
            if (data.team && data.team.budget !== undefined && data.team.squadSize !== undefined) {
                setTeams(prevTeams =>
                    prevTeams.map(t =>
                        t.id === data.teamId
                            ? { ...t, budget: data.team.budget, squadSize: data.team.squadSize }
                            : t
                    )
                );
                
                // Update user team if it's the winning team
                if (userTeam?.id === data.teamId) {
                    setUserTeam(prev => prev ? { ...prev, budget: data.team.budget, squadSize: data.team.squadSize } : null);
                }
            }
        });

        // Listen for player unsold
        socket.on('player:unsold', (data: { playerId: string }) => {
            console.log('❌ Player went unsold:', data.playerId);
            
            // Update player status to unsold and clear current auctioning
            setPlayers(prevPlayers =>
                prevPlayers.map(p => ({
                    ...p,
                    isCurrentlyAuctioning: false,
                    status: p.id === data.playerId ? 'UNSOLD' : p.status
                }))
            );
        });

        return () => {
            socket.off('player:auction:start');
            socket.off('bid:placed');
            socket.off('player:sold');
            socket.off('player:unsold');
        };
    }, [socket, auction.status, auction.id, userTeam?.id, session?.user?.id]);

    const fetchTeams = async () => {
        try {
            const response = await fetch(`/api/teams?auctionId=${auction.id}`);
            const data = await response.json();
            if (data.success) {
                setTeams(data.data);
                // Check if user is already in a team
                const myTeam = data.data.find((t: Team) => 
                    t.users?.some(u => u.id === session?.user?.id)
                );
                if (myTeam) {
                    setUserTeam(myTeam);
                    setSelectedTeamId(myTeam.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch teams:', error);
        }
    };

    const fetchPlayers = async () => {
        try {
            const response = await fetch(`/api/players?auctionId=${auction.id}`);
            const data = await response.json();
            if (data.success) {
                setPlayers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch players:', error);
        }
    };

    const handleJoinTeam = async () => {
        if (!selectedTeamId) return;

        setLoading(true);
        try {
            const response = await fetch('/api/teams', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId: auction.id,
                    teamId: selectedTeamId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Failed to join team');
                return;
            }

            const team = teams.find(t => t.id === selectedTeamId);
            setUserTeam(team || null);
            fetchTeams();
        } catch {
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartAuction = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start-auction',
                    auctionId: auction.id,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Force page reload to get updated auction status
                window.location.reload();
            } else {
                alert(data.error || 'Failed to start auction');
            }
        } catch (error) {
            console.error('Failed to start auction:', error);
            alert('An error occurred while starting the auction');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleInterest = async (playerId: string, currentlyInterested: boolean) => {
        if (!userTeam) return;

        try {
            const response = await fetch('/api/player-interests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    teamId: userTeam.id,
                    action: currentlyInterested ? 'remove' : 'add',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update player interests in local state
                setPlayers(prevPlayers =>
                    prevPlayers.map(p =>
                        p.id === playerId
                            ? {
                                ...p,
                                interestedTeams: currentlyInterested
                                    ? p.interestedTeams?.filter(it => it.team.id !== userTeam.id)
                                    : [...(p.interestedTeams || []), { team: { id: userTeam.id, shortName: userTeam.shortName, color: userTeam.color } }]
                              }
                            : p
                    )
                );
            } else {
                alert(data.error || 'Failed to update shortlist');
            }
        } catch (error) {
            console.error('Failed to toggle interest:', error);
            alert('An error occurred');
        }
    };

    const handlePlaceBid = async () => {
        if (!currentPlayer || !userTeam) return;

        const amount = Math.round(parseFloat(bidAmount) * 100) / 100;
        if (isNaN(amount) || amount <= 0) {
            setBidError('Invalid bid amount');
            return;
        }

        const highestBid = currentPlayerBids[0];
        const currentHighest = Math.round((highestBid ? Number(highestBid.amount) : Number(currentPlayer.basePrice)) * 100) / 100;
        const increment = Math.round(Number(auction.minIncrement) * 100) / 100;
        // First bid can be at base price, subsequent bids need increment
        const minBid = highestBid ? currentHighest + increment : currentHighest;

        if (amount < minBid) {
            setBidError(`Minimum bid is ${minBid.toFixed(2)} ${auction.currency}`);
            return;
        }

        const teamBudget = Number(userTeam.budget);
        if (amount > teamBudget) {
            setBidError(`Insufficient budget. Available: ${teamBudget.toFixed(2)} ${auction.currency}`);
            return;
        }

        setLoading(true);
        setBidError('');

        try {
            const response = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId: auction.id,
                    playerId: currentPlayer.id,
                    teamId: userTeam.id,
                    amount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setBidError(data.error || 'Failed to place bid');
                return;
            }

            setBidAmount('');
            // Data updates via socket events (bid:placed), no need to refresh
        } catch {
            setBidError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const statusMap = {
        LIVE: 'live' as const,
        UPCOMING: 'upcoming' as const,
        ENDED: 'ended' as const,
    };

    // Admin Setup View
    if (isAdmin && auction.status === 'UPCOMING') {
        return (
            <div className="container section">
                <div className="mb-6 md:mb-8 px-4 md:px-0">
                    <h1 className="mb-2">{auction.title}</h1>
                    <p className="text-base md:text-xl font-mono text-muted mb-4">{auction.description}</p>
                    <Badge status={statusMap[auction.status]}>{auction.status}</Badge>
                </div>

                <div className="mb-6 flex gap-2 md:gap-4 px-4 md:px-0 flex-wrap">
                    <Button
                        variant={tab === 'teams' ? 'primary' : 'secondary'}
                        onClick={() => setTab('teams')}
                        className="text-sm md:text-base px-4 md:px-6 py-2"
                    >
                        TEAMS ({teams.length})
                    </Button>
                    <Button
                        variant={tab === 'players' ? 'primary' : 'secondary'}
                        onClick={() => setTab('players')}
                        className="text-sm md:text-base px-4 md:px-6 py-2"
                    >
                        PLAYERS ({players.length})
                    </Button>
                </div>

                {teams.length > 0 && players.length > 0 && (
                    <Card className="p-4 md:p-6 mb-6 bg-accent/10 border-accent mx-4 md:mx-0">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-mono text-base md:text-lg font-bold text-accent mb-2">
                                    Ready to Start Auction
                                </h3>
                                <p className="font-mono text-xs md:text-sm text-muted">
                                    {teams.length} teams and {players.length} players configured
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleStartAuction}
                                disabled={loading}
                                className="text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 w-full md:w-auto"
                            >
                                {loading ? 'STARTING...' : '🎯 START AUCTION'}
                            </Button>
                        </div>
                    </Card>
                )}

                {tab === 'teams' && (
                    <div className="px-4 md:px-0">
                    <AdminTeamManager
                        auctionId={auction.id}
                        teams={teams}
                        onTeamAdded={fetchTeams}
                        teamBudget={auction.teamBudget || 100}
                        currency={auction.currency}
                    />
                    </div>
                )}

                {tab === 'players' && (
                    <div className="px-4 md:px-0">
                    <AdminPlayerManager
                        auctionId={auction.id}
                        players={players}
                        onPlayerAdded={fetchPlayers}
                        currency={auction.currency}
                    />
                    </div>
                )}
            </div>
        );
    }

    // Team Selection View (for non-admin users before joining)
    if (!isAdmin && !userTeam && auction.status === 'UPCOMING') {
        return (
            <div className="container section">
                <div className="max-w-2xl mx-auto px-4 md:px-0">
                    <h1 className="mb-4 text-center">{auction.title}</h1>
                    <p className="text-base md:text-xl font-mono text-muted mb-8 text-center">
                        {auction.description}
                    </p>

                    <Card className="p-6 md:p-8">
                        <h2 className="mb-6 text-center">SELECT YOUR TEAM</h2>
                        
                        {teams.length === 0 ? (
                            <p className="font-mono text-muted text-center">
                                No teams available yet. Please wait for the admin to set up teams.
                            </p>
                        ) : (
                            <>
                                <div className="space-y-3 mb-6">
                                    {teams.map((team) => {
                                        const isOccupied = team.users && team.users.length > 0;
                                        return (
                                            <label
                                                key={team.id}
                                                className={`flex items-center justify-between p-4 border-3 cursor-pointer hover:border-accent transition-colors ${
                                                    isOccupied ? 'opacity-50 cursor-not-allowed' : ''
                                                } ${selectedTeamId === team.id ? 'border-accent bg-accent/10' : 'border-border'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="radio"
                                                        name="team"
                                                        value={team.id}
                                                        checked={selectedTeamId === team.id}
                                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                                        disabled={isOccupied}
                                                        className="w-5 h-5"
                                                    />
                                                    <div>
                                                        <p 
                                                            className="font-mono text-xl font-bold"
                                                            style={{ color: team.color }}
                                                        >
                                                            {team.shortName}
                                                        </p>
                                                        <p className="font-mono text-sm">{team.name}</p>
                                                    </div>
                                                </div>
                                                {isOccupied && (
                                                    <Badge status="outbid">TAKEN</Badge>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>

                                <Button
                                    variant="primary"
                                    onClick={handleJoinTeam}
                                    disabled={!selectedTeamId || loading}
                                    className="w-full"
                                >
                                    {loading ? 'JOINING...' : 'JOIN TEAM'}
                                </Button>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    // Live Auction View
    return (
        <div className="container section">
            {/* Reconnecting notification */}
            {showReconnecting && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 bg-yellow-500 text-black font-mono text-xs md:text-sm font-bold rounded shadow-lg animate-pulse">
                    🔄 Reconnecting to live updates...
                </div>
            )}

            {/* Header */}
            <div className="mb-6 md:mb-7 lg:mb-8 px-4 lg:px-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
                    <div className="flex-1">
                        <h1 className="mb-2 text-2xl md:text-3xl lg:text-4xl">{auction.title}</h1>
                        <p className="text-base md:text-lg lg:text-xl font-mono text-muted">{auction.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {auction.status === 'LIVE' && (
                            <div className="flex items-center gap-2 px-3 py-1 border-2 border-border rounded">
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="font-mono text-xs text-muted">
                                    {isConnected ? 'LIVE' : 'CONNECTING...'}
                                </span>
                            </div>
                        )}
                        <Badge status={statusMap[auction.status]}>{auction.status}</Badge>
                    </div>
                </div>
                
                {userTeam && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-3 lg:gap-4 flex-wrap mb-4">
                        <p className="font-mono text-sm md:text-base">
                            Your Team: <span style={{ color: userTeam.color }} className="font-bold text-lg md:text-xl">{userTeam.shortName}</span>
                        </p>
                        <p className="font-mono text-sm md:text-base">
                            Budget: <span className="font-bold text-lg md:text-xl text-accent">
                                {Number(userTeam.budget).toFixed(2)} {auction.currency}
                            </span>
                        </p>
                        <p className="font-mono text-sm md:text-base">
                            Squad: <span className="font-bold">{userTeam.squadSize} players</span>
                        </p>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex gap-2 mt-4 flex-wrap">
                    <Button
                        variant={tab === 'auction' ? 'primary' : 'secondary'}
                        onClick={() => setTab('auction')}
                        className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2"
                    >
                        🎯 LIVE AUCTION
                    </Button>
                    <Button
                        variant={tab === 'players' ? 'primary' : 'secondary'}
                        onClick={() => setTab('players')}
                        className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2"
                    >
                        👥 PLAYER POOL
                    </Button>
                    <Button
                        variant={tab === 'teams' ? 'primary' : 'secondary'}
                        onClick={() => setTab('teams')}
                        className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2"
                    >
                        🏆 TEAMS
                    </Button>
                </div>
            </div>

            {tab === 'auction' && (
            <div className="grid lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 px-4 lg:px-0">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4 md:space-y-5 lg:space-y-6 order-1">
                    {isAdmin ? (
                        <AuctioneerControlPanel
                            auctionId={auction.id}
                            currentPlayer={currentPlayer}
                            players={players}
                            currentBids={currentPlayerBids}
                            currency={auction.currency}
                        />
                    ) : (
                        <>
                            {currentPlayer ? (
                                <Card className="p-5 md:p-6 lg:p-8">
                                    <div className="text-center mb-6">
                                        <p className="font-mono text-xs md:text-sm text-muted mb-2">CURRENT PLAYER</p>
                                        <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2">{currentPlayer.name}</h2>
                                        {currentPlayer.role && (
                                            <Badge status="active">{currentPlayer.role}</Badge>
                                        )}
                                        <p className="font-mono text-sm text-muted mt-3">
                                            {currentPlayer.description}
                                        </p>
                                    </div>

                                    {currentPlayerBids.length > 0 ? (
                                        <div className="text-center p-4 md:p-5 lg:p-6 border-3 border-accent bg-accent/10">
                                            <p className="font-mono text-xs md:text-sm text-muted mb-2">HIGHEST BID</p>
                                            <p className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold text-accent mb-2">
                                                {Number(currentPlayerBids[0].amount).toFixed(2)} {auction.currency}
                                            </p>
                                            <p 
                                                className="font-mono text-xl font-bold"
                                                style={{ color: currentPlayerBids[0].team?.color }}
                                            >
                                                {currentPlayerBids[0].team?.shortName}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center p-4 md:p-5 lg:p-6 border-3 border-border">
                                            <p className="font-mono text-xs md:text-sm text-muted mb-2">BASE PRICE</p>
                                            <p className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold">
                                                {Number(currentPlayer.basePrice).toFixed(2)} {auction.currency}
                                            </p>
                                            <p className="font-mono text-sm text-muted mt-2">No bids yet</p>
                                        </div>
                                    )}
                                </Card>
                            ) : (
                                <Card className="p-6 md:p-8 lg:p-12 text-center">
                                    <p className="font-mono text-base md:text-lg lg:text-xl text-muted">
                                        Waiting for auctioneer to start next player...
                                    </p>
                                </Card>
                            )}
                        </>
                    )}

                    {/* Bid Form - Mobile positioned here */}
                    {!isAdmin && currentPlayer && userTeam && (
                        <Card className="p-4 md:p-5 lg:p-6 lg:hidden">
                            <h3 className="mb-4 text-xl md:text-2xl">PLACE BID</h3>
                            
                            {bidError && (
                                <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                                    <p className="font-mono text-sm text-red-500">{bidError}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label={`Amount (${auction.currency})`}
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => {
                                        setBidAmount(e.target.value);
                                        setBidError('');
                                    }}
                                    step="0.01"
                                    min="0"
                                    placeholder={
                                        currentPlayerBids[0]
                                            ? (Number(currentPlayerBids[0].amount) + Number(auction.minIncrement)).toFixed(2)
                                            : Number(currentPlayer.basePrice).toFixed(2)
                                    }
                                />

                                <Button
                                    variant="primary"
                                    onClick={handlePlaceBid}
                                    disabled={loading || !bidAmount}
                                    className="w-full"
                                >
                                    {loading ? 'PLACING BID...' : '🔨 PLACE BID'}
                                </Button>

                                <div className="pt-4 border-t-3 border-border text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Min Next Bid:</span>
                                        <span className="font-mono font-bold">
                                            {currentPlayerBids[0]
                                                ? (Number(currentPlayerBids[0].amount) + Number(auction.minIncrement)).toFixed(2)
                                                : Number(currentPlayer.basePrice).toFixed(2)} {auction.currency}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Your Budget:</span>
                                        <span className="font-mono font-bold text-accent">
                                            {Number(userTeam.budget).toFixed(2)} {auction.currency}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Teams Overview */}
                    <div>
                        <h3 className="font-mono text-base md:text-lg font-bold mb-4">TEAMS</h3>
                        <div className="grid gap-3 md:gap-3 lg:gap-4 sm:grid-cols-2">
                            {teams.map((team) => (
                                <Card 
                                    key={team.id} 
                                    className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" 
                                    style={{ borderColor: team.color }}
                                    onClick={() => setSelectedTeamForSquad(team)}
                                >
                                    <p style={{ color: team.color }} className="font-mono text-xl font-bold mb-1">
                                        {team.shortName}
                                    </p>
                                    <p className="font-mono text-sm text-muted mb-3">{team.name}</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-mono text-muted">Budget:</span>
                                            <span className="font-mono font-bold">
                                                {Number(team.budget).toFixed(2)} {auction.currency}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-mono text-muted">Squad:</span>
                                            <span className="font-mono font-bold">{team.squadSize} players</span>
                                        </div>
                                    </div>
                                    <p className="font-mono text-xs text-accent mt-2">Click to view squad →</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4 md:space-y-5 lg:space-y-6 order-2 lg:order-3">
                    {/* Bid Form */}
                    {!isAdmin && currentPlayer && userTeam && (
                        <Card className="p-4 md:p-5 lg:p-6 hidden lg:block">
                            <h3 className="mb-4 text-xl md:text-2xl">PLACE BID</h3>
                            
                            {bidError && (
                                <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                                    <p className="font-mono text-sm text-red-500">{bidError}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label={`Amount (${auction.currency})`}
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => {
                                        setBidAmount(e.target.value);
                                        setBidError('');
                                    }}
                                    step="0.01"
                                    min="0"
                                    placeholder={
                                        currentPlayerBids[0]
                                            ? (Number(currentPlayerBids[0].amount) + Number(auction.minIncrement)).toFixed(2)
                                            : Number(currentPlayer.basePrice).toFixed(2)
                                    }
                                />

                                <Button
                                    variant="primary"
                                    onClick={handlePlaceBid}
                                    disabled={loading || !bidAmount}
                                    className="w-full"
                                >
                                    {loading ? 'PLACING BID...' : '🔨 PLACE BID'}
                                </Button>

                                <div className="pt-4 border-t-3 border-border text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Min Next Bid:</span>
                                        <span className="font-mono font-bold">
                                            {currentPlayerBids[0]
                                                ? (Number(currentPlayerBids[0].amount) + Number(auction.minIncrement)).toFixed(2)
                                                : Number(currentPlayer.basePrice).toFixed(2)} {auction.currency}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Your Budget:</span>
                                        <span className="font-mono font-bold text-accent">
                                            {Number(userTeam.budget).toFixed(2)} {auction.currency}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Stats */}
                    <Card className="p-6">
                        <h3 className="mb-4">AUCTION STATS</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">Teams:</span>
                                <span className="font-mono text-sm font-bold">{teams.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">Players:</span>
                                <span className="font-mono text-sm font-bold">{players.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">Sold:</span>
                                <span className="font-mono text-sm font-bold">
                                    {players.filter(p => p.status === 'SOLD').length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-mono text-sm text-muted">Unsold:</span>
                                <span className="font-mono text-sm font-bold">
                                    {players.filter(p => p.status === 'UNSOLD').length}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            )}

            {/* Player Pool Tab */}
            {tab === 'players' && (
                <div className="px-4 md:px-0">
                <PlayerPoolView
                    players={players}
                    currency={auction.currency}
                    userTeamId={userTeam?.id}
                    isAdmin={isAdmin}
                    onToggleInterest={userTeam ? handleToggleInterest : undefined}
                />
                </div>
            )}

            {/* Teams Tab */}
            {tab === 'teams' && (
                <div className="px-4 md:px-0">
                    <h3 className="font-mono text-base md:text-lg font-bold mb-4">TEAMS</h3>
                    <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                        {teams.map((team) => (
                            <Card 
                                key={team.id} 
                                className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" 
                                style={{ borderColor: team.color }}
                                onClick={() => setSelectedTeamForSquad(team)}
                            >
                                <p style={{ color: team.color }} className="font-mono text-xl font-bold mb-1">
                                    {team.shortName}
                                </p>
                                <p className="font-mono text-sm text-muted mb-3">{team.name}</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Budget:</span>
                                        <span className="font-mono font-bold">
                                            {Number(team.budget).toFixed(2)} {auction.currency}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Squad:</span>
                                        <span className="font-mono font-bold">{team.squadSize} players</span>
                                    </div>
                                </div>
                                <p className="font-mono text-xs text-accent mt-2">Click to view squad →</p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Team Squad Modal */}
            {selectedTeamForSquad && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedTeamForSquad(null)}
                >
                    <Card 
                        className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 
                                    className="font-mono text-2xl font-bold mb-1"
                                    style={{ color: selectedTeamForSquad.color }}
                                >
                                    {selectedTeamForSquad.shortName}
                                </h2>
                                <p className="font-mono text-muted">{selectedTeamForSquad.name}</p>
                            </div>
                            <Button 
                                variant="secondary"
                                onClick={() => setSelectedTeamForSquad(null)}
                            >
                                CLOSE
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-accent/5 border-2 border-accent/20">
                            <div>
                                <p className="font-mono text-xs text-muted mb-1">BUDGET LEFT</p>
                                <p className="font-mono text-lg font-bold text-accent">
                                    {Number(selectedTeamForSquad.budget).toFixed(2)} {auction.currency}
                                </p>
                            </div>
                            <div>
                                <p className="font-mono text-xs text-muted mb-1">SQUAD SIZE</p>
                                <p className="font-mono text-lg font-bold">
                                    {selectedTeamForSquad.squadSize} players
                                </p>
                            </div>
                            <div>
                                <p className="font-mono text-xs text-muted mb-1">SPENT</p>
                                <p className="font-mono text-lg font-bold">
                                    {(Number(selectedTeamForSquad.totalBudget) - Number(selectedTeamForSquad.budget)).toFixed(2)} {auction.currency}
                                </p>
                            </div>
                        </div>

                        <h3 className="font-mono text-lg font-bold mb-4">SQUAD</h3>
                        
                        {players.filter(p => p.team?.id === selectedTeamForSquad.id).length === 0 ? (
                            <div className="text-center py-8">
                                <p className="font-mono text-muted">No players in squad yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {players
                                    .filter(p => p.team?.id === selectedTeamForSquad.id)
                                    .map((player, index) => (
                                        <div 
                                            key={player.id}
                                            className="flex items-center justify-between p-4 border-2 border-border hover:border-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-lg font-bold text-muted">
                                                    #{index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-mono font-bold text-lg">
                                                        {player.name}
                                                    </p>
                                                    {player.role && (
                                                        <p className="font-mono text-sm text-muted">
                                                            {player.role}
                                                        </p>
                                                    )}
                                                    {player.description && (
                                                        <p className="font-mono text-xs text-muted">
                                                            {player.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-xs text-muted">Sold for</p>
                                                <p className="font-mono text-xl font-bold text-accent">
                                                    {Number(player.soldPrice).toFixed(2)} {auction.currency}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
