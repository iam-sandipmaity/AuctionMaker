'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useToast } from '@/components/ui/ToastProvider';

interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    logo?: string;
    budget: number;
    totalBudget: number;
    squadSize: number;
    rtmCardsRemaining: number;
    users?: Array<{ id: string; name: string; username: string }>;
    _count?: { rtmSelections?: number };
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
    hasBeenAuctioned?: boolean;
    previousTeamShortName?: string | null;
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
    rtmSelections?: {
        team: {
            id: string;
            shortName: string;
            color: string;
            rtmCardsRemaining?: number;
        };
    }[];
}

interface RtmState {
    status: 'AWAITING_RTM_OFFER' | 'AWAITING_WINNER_RESPONSE';
    playerId: string;
    playerName: string;
    originalAmount: number;
    currentAmount: number;
    eligibleTeam: Pick<Team, 'id' | 'name' | 'shortName' | 'color' | 'budget' | 'squadSize' | 'rtmCardsRemaining'>;
    winningTeam: Pick<Team, 'id' | 'name' | 'shortName' | 'color' | 'budget' | 'squadSize' | 'rtmCardsRemaining'>;
}

interface TeamAuctionRoomClientProps {
    initialAuction: AuctionWithBids & {
        teamBudget?: number;
        minSquadSize?: number;
        maxSquadSize?: number;
        maxRtmSelectionsPerTeam?: number;
        rtmCardsPerTeam?: number;
        budgetDenomination?: string;
        rtmStatus?: 'NONE' | 'PENDING';
        pendingRtmPlayerId?: string | null;
        pendingRtmEligibleTeamId?: string | null;
        pendingRtmWinningTeamId?: string | null;
        pendingRtmWinningBidId?: string | null;
        pendingRtmAmount?: number | null;
    };
}

export default function TeamAuctionRoomClient({ initialAuction }: TeamAuctionRoomClientProps) {
    const { data: session } = useSession();
    const { socket, isConnected } = useSocket(initialAuction.id);
    const { showToast } = useToast();
    const [auction, setAuction] = useState(initialAuction);
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [userTeam, setUserTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [tab, setTab] = useState<'auction' | 'teams' | 'players'>('auction');
    const [selectedTeamForSquad, setSelectedTeamForSquad] = useState<Team | null>(null);
    const [showReconnecting, setShowReconnecting] = useState(false);
    const [rtmState, setRtmState] = useState<RtmState | null>(null);
    const [rtmDecisionLoading, setRtmDecisionLoading] = useState(false);
    const [rtmOfferAmount, setRtmOfferAmount] = useState('');
    const [rtmOfferError, setRtmOfferError] = useState('');

    const isAdmin = session?.user?.id === auction.createdById;
    const currentPlayer = players.find((player) => player.isCurrentlyAuctioning) || null;
    const currentPlayerBids = (auction.bids || [])
        .filter((bid) => bid.playerId === currentPlayer?.id)
        .map((bid) => ({ ...bid, amount: Number(bid.amount) }));
    const teamShortNames = useMemo(() => Array.from(new Set(teams.map((team) => team.shortName))).sort(), [teams]);
    const isUserEligibleForRtmOffer = Boolean(
        userTeam &&
        rtmState &&
        rtmState.status === 'AWAITING_RTM_OFFER' &&
        userTeam.id === rtmState.eligibleTeam.id
    );
    const isUserHoldingTeam = Boolean(
        userTeam &&
        rtmState &&
        rtmState.status === 'AWAITING_WINNER_RESPONSE' &&
        userTeam.id === rtmState.winningTeam.id
    );

    const formatCurrency = (amount: number | string | null | undefined) => {
        const num = Number(amount || 0).toFixed(2);
        if (auction.budgetDenomination) return `${num} ${auction.budgetDenomination} ${auction.currency}`;
        return `${num} ${auction.currency}`;
    };

    useEffect(() => {
        const trackView = async () => {
            if (!session?.user) return;
            try {
                await fetch('/api/auction-view', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ auctionId: auction.id }),
                });
            } catch (error) {
                console.error('Failed to track view:', error);
            }
        };
        trackView();
    }, [auction.id, session?.user]);

    useEffect(() => {
        fetchTeams();
        fetchPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auction.id, session?.user?.id]);

    useEffect(() => {
        setShowReconnecting(auction.status === 'LIVE' && !isConnected);
    }, [auction.status, isConnected]);

    useEffect(() => {
        const pendingRtmStatus = auction.rtmStatus;

        if (
            pendingRtmStatus &&
            pendingRtmStatus === 'PENDING' &&
            auction.pendingRtmPlayerId &&
            auction.pendingRtmEligibleTeamId &&
            auction.pendingRtmWinningTeamId
        ) {
            const pendingPlayer = players.find((player) => player.id === auction.pendingRtmPlayerId);
            const eligibleTeam = teams.find((team) => team.id === auction.pendingRtmEligibleTeamId);
            const winningTeam = teams.find((team) => team.id === auction.pendingRtmWinningTeamId);
            const winningBid = auction.pendingRtmWinningBidId
                ? (auction.bids || []).find((bid) => bid.id === auction.pendingRtmWinningBidId)
                : null;

            if (pendingPlayer && eligibleTeam && winningTeam) {
                const originalAmount = winningBid
                    ? Number(winningBid.amount)
                    : Number(auction.pendingRtmAmount || 0);
                const pendingAmount = Number(auction.pendingRtmAmount || 0);
                const phase = pendingAmount > originalAmount
                    ? 'AWAITING_WINNER_RESPONSE'
                    : 'AWAITING_RTM_OFFER';

                setRtmState({
                    status: phase,
                    playerId: pendingPlayer.id,
                    playerName: pendingPlayer.name,
                    originalAmount,
                    currentAmount: pendingAmount,
                    eligibleTeam,
                    winningTeam,
                });
                return;
            }
        }

        setRtmState(null);
    }, [
        auction.rtmStatus,
        auction.pendingRtmPlayerId,
        auction.pendingRtmEligibleTeamId,
        auction.pendingRtmWinningTeamId,
        auction.pendingRtmWinningBidId,
        auction.pendingRtmAmount,
        auction.bids,
        players,
        teams,
    ]);

    useEffect(() => {
        if (rtmState?.status === 'AWAITING_RTM_OFFER') {
            setRtmOfferAmount((rtmState.originalAmount + 0.01).toFixed(2));
            setRtmOfferError('');
            return;
        }

        setRtmOfferAmount('');
        setRtmOfferError('');
    }, [rtmState]);

    useEffect(() => {
        if (!socket || auction.status !== 'LIVE') return;

        socket.on('player:auction:start', (data: { player: Player }) => {
            setRtmDecisionLoading(false);
            setRtmState(null);
            setPlayers((prev) => prev.map((player) => ({ ...player, isCurrentlyAuctioning: player.id === data.player.id })));
            setAuction((prev) => ({
                ...prev,
                currentPlayerId: data.player.id,
                currentPrice: Number(data.player.basePrice),
                rtmStatus: 'NONE',
                pendingRtmPlayerId: null,
                pendingRtmEligibleTeamId: null,
                pendingRtmWinningTeamId: null,
                pendingRtmWinningBidId: null,
                pendingRtmAmount: null,
                bids: (prev.bids || []).filter((bid) => bid.playerId !== data.player.id),
            }));
        });

        socket.on('bid:placed', (data: { bid: any }) => {
            setAuction((prev) => ({
                ...prev,
                currentPrice: Number(data.bid.amount),
                bids: [data.bid, ...(prev.bids || []).filter((bid) => bid.id !== data.bid.id)],
            }));
            if (data.bid.team) {
                setTeams((prev) => prev.map((team) => team.id === data.bid.team.id ? { ...team, budget: Number(data.bid.team.budget) } : team));
                if (userTeam?.id === data.bid.team.id) {
                    setUserTeam((prev) => prev ? { ...prev, budget: Number(data.bid.team.budget) } : null);
                }
            }
        });

        socket.on('rtm:available', (data: { phase: 'AWAITING_RTM_OFFER'; playerId: string; playerName: string; winningBidId: string; amount: number; eligibleTeam: Team; winningTeam: Team }) => {
            setPlayers((prev) => prev.map((player) => ({ ...player, isCurrentlyAuctioning: false })));
            setAuction((prev) => ({
                ...prev,
                currentPlayerId: null,
                currentPrice: data.amount,
                rtmStatus: 'PENDING',
                pendingRtmPlayerId: data.playerId,
                pendingRtmEligibleTeamId: data.eligibleTeam.id,
                pendingRtmWinningTeamId: data.winningTeam.id,
                pendingRtmWinningBidId: data.winningBidId,
                pendingRtmAmount: data.amount,
            }));
            setRtmState({
                status: data.phase,
                playerId: data.playerId,
                playerName: data.playerName,
                originalAmount: data.amount,
                currentAmount: data.amount,
                eligibleTeam: data.eligibleTeam,
                winningTeam: data.winningTeam,
            });
        });

        socket.on('rtm:countered', (data: { phase: 'AWAITING_WINNER_RESPONSE'; playerId: string; playerName: string; originalAmount: number; amount: number; eligibleTeam: Team; winningTeam: Team }) => {
            setAuction((prev) => ({
                ...prev,
                currentPrice: data.amount,
                rtmStatus: 'PENDING',
                pendingRtmPlayerId: data.playerId,
                pendingRtmEligibleTeamId: data.eligibleTeam.id,
                pendingRtmWinningTeamId: data.winningTeam.id,
                pendingRtmAmount: data.amount,
            }));
            setRtmState({
                status: data.phase,
                playerId: data.playerId,
                playerName: data.playerName,
                originalAmount: data.originalAmount,
                currentAmount: data.amount,
                eligibleTeam: data.eligibleTeam,
                winningTeam: data.winningTeam,
            });
        });

        socket.on('rtm:resolved', () => {
            setRtmDecisionLoading(false);
            setRtmOfferError('');
            setRtmState(null);
            setAuction((prev) => ({ ...prev, rtmStatus: 'NONE', pendingRtmPlayerId: null, pendingRtmEligibleTeamId: null, pendingRtmWinningTeamId: null, pendingRtmWinningBidId: null, pendingRtmAmount: null }));
        });

        socket.on('player:sold', (data: { playerId: string; teamId: string; amount: number; team: Team }) => {
            setRtmDecisionLoading(false);
            setRtmState(null);
            setPlayers((prev) => prev.map((player) => player.id === data.playerId ? { ...player, status: 'SOLD', soldPrice: data.amount, isCurrentlyAuctioning: false, team: data.team } : { ...player, isCurrentlyAuctioning: false }));
            if (data.team) {
                setTeams((prev) => prev.map((team) => team.id === data.teamId ? { ...team, budget: Number(data.team.budget), squadSize: data.team.squadSize, rtmCardsRemaining: data.team.rtmCardsRemaining ?? team.rtmCardsRemaining } : team));
                if (userTeam?.id === data.teamId) {
                    setUserTeam((prev) => prev ? { ...prev, budget: Number(data.team.budget), squadSize: data.team.squadSize, rtmCardsRemaining: data.team.rtmCardsRemaining ?? prev.rtmCardsRemaining } : null);
                }
            }
            setAuction((prev) => ({ ...prev, currentPlayerId: null, currentPrice: 0, rtmStatus: 'NONE', pendingRtmPlayerId: null, pendingRtmEligibleTeamId: null, pendingRtmWinningTeamId: null, pendingRtmWinningBidId: null, pendingRtmAmount: null }));
        });

        socket.on('player:unsold', (data: { playerId: string }) => {
            setRtmState(null);
            setPlayers((prev) => prev.map((player) => ({ ...player, isCurrentlyAuctioning: false, status: player.id === data.playerId ? 'UNSOLD' : player.status })));
            setAuction((prev) => ({ ...prev, currentPlayerId: null, currentPrice: 0, rtmStatus: 'NONE', pendingRtmPlayerId: null, pendingRtmEligibleTeamId: null, pendingRtmWinningTeamId: null, pendingRtmWinningBidId: null, pendingRtmAmount: null }));
        });

        return () => {
            socket.off('player:auction:start');
            socket.off('bid:placed');
            socket.off('rtm:available');
            socket.off('rtm:countered');
            socket.off('rtm:resolved');
            socket.off('player:sold');
            socket.off('player:unsold');
        };
    }, [socket, auction.status, userTeam?.id]);

    const fetchTeams = async () => {
        try {
            const response = await fetch(`/api/teams?auctionId=${auction.id}`);
            const data = await response.json();
            if (!data.success) return;

            setTeams(data.data);
            const myTeam = data.data.find((team: Team) => team.users?.some((user) => user.id === session?.user?.id));
            if (myTeam) {
                setUserTeam(myTeam);
                setSelectedTeamId(myTeam.id);
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
                body: JSON.stringify({ auctionId: auction.id, teamId: selectedTeamId }),
            });
            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Failed to join team', 'error');
                return;
            }

            await fetchTeams();
            showToast('Joined team successfully', 'success');
        } catch {
            showToast('An error occurred. Please try again.', 'error');
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
                body: JSON.stringify({ action: 'start-auction', auctionId: auction.id }),
            });
            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Failed to start auction', 'error');
                return;
            }

            setAuction((prev) => ({ ...prev, status: 'LIVE' }));
            showToast('Auction started successfully', 'success');
        } catch (error) {
            console.error('Failed to start auction:', error);
            showToast('An error occurred while starting the auction', 'error');
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

            if (!response.ok) {
                showToast(data.error || 'Failed to update shortlist', 'error');
                return;
            }

            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === playerId
                        ? {
                            ...player,
                            interestedTeams: currentlyInterested
                                ? player.interestedTeams?.filter((interest) => interest.team.id !== userTeam.id)
                                : [...(player.interestedTeams || []), { team: { id: userTeam.id, shortName: userTeam.shortName, color: userTeam.color } }],
                        }
                        : player
                )
            );
        } catch (error) {
            console.error('Failed to toggle interest:', error);
            showToast('An error occurred', 'error');
        }
    };

    const handleToggleRtm = async (playerId: string, currentlySelected: boolean) => {
        if (!userTeam) return;

        try {
            const response = await fetch('/api/rtm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: currentlySelected ? 'remove' : 'add' }),
            });
            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Failed to update RTM selection', 'error');
                return;
            }

            setPlayers((prev) =>
                prev.map((player) =>
                    player.id === playerId
                        ? {
                            ...player,
                            rtmSelections: currentlySelected
                                ? player.rtmSelections?.filter((selection) => selection.team.id !== userTeam.id)
                                : [...(player.rtmSelections || []), { team: { id: userTeam.id, shortName: userTeam.shortName, color: userTeam.color, rtmCardsRemaining: userTeam.rtmCardsRemaining } }],
                        }
                        : player
                )
            );
        } catch (error) {
            console.error('Failed to update RTM selection:', error);
            showToast('An error occurred while updating RTM selection', 'error');
        }
    };

    const handleSkipRtm = async () => {
        setRtmDecisionLoading(true);

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'skip-rtm', auctionId: auction.id }),
            });
            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Failed to skip RTM', 'error');
                setRtmDecisionLoading(false);
                return;
            }

            showToast('RTM skipped', 'success');
        } catch (error) {
            console.error('Failed to skip RTM:', error);
            showToast('An error occurred while skipping RTM', 'error');
            setRtmDecisionLoading(false);
        }
    };

    const handleSubmitRtmOffer = async () => {
        if (!rtmState || !userTeam) return;

        const amount = Math.round(parseFloat(rtmOfferAmount) * 100) / 100;
        if (isNaN(amount) || amount <= rtmState.originalAmount) {
            setRtmOfferError(`Offer must be higher than ${formatCurrency(rtmState.originalAmount)}`);
            return;
        }

        if (amount > Number(userTeam.budget)) {
            setRtmOfferError(`Insufficient budget. Available: ${formatCurrency(userTeam.budget)}`);
            return;
        }

        setRtmDecisionLoading(true);
        setRtmOfferError('');

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'submit-rtm-offer', auctionId: auction.id, amount }),
            });
            const data = await response.json();

            if (!response.ok) {
                setRtmOfferError(data.error || 'Failed to submit RTM offer');
                setRtmDecisionLoading(false);
                return;
            }

            showToast('RTM offer submitted', 'success');
        } catch (error) {
            console.error('Failed to submit RTM offer:', error);
            setRtmOfferError('An error occurred while submitting the RTM offer');
            setRtmDecisionLoading(false);
        }
    };

    const handleRespondToRtmCounter = async (accept: boolean) => {
        setRtmDecisionLoading(true);

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'respond-rtm-counter', auctionId: auction.id, accept }),
            });
            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Failed to resolve RTM counter-offer', 'error');
                setRtmDecisionLoading(false);
                return;
            }

            showToast(accept ? 'Player retained at new RTM price' : 'Player transferred via RTM', 'success');
        } catch (error) {
            console.error('Failed to resolve RTM counter-offer:', error);
            showToast('An error occurred while resolving the RTM counter-offer', 'error');
            setRtmDecisionLoading(false);
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
        const minBid = highestBid ? currentHighest + increment : currentHighest;

        if (amount < minBid) {
            setBidError(`Minimum bid is ${formatCurrency(minBid)}`);
            return;
        }

        if (amount > Number(userTeam.budget)) {
            setBidError(`Insufficient budget. Available: ${formatCurrency(userTeam.budget)}`);
            return;
        }

        setLoading(true);
        setBidError('');

        try {
            const response = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auctionId: auction.id, playerId: currentPlayer.id, teamId: userTeam.id, amount }),
            });
            const data = await response.json();

            if (!response.ok) {
                setBidError(data.error || 'Failed to place bid');
                return;
            }

            setBidAmount('');
        } catch {
            setBidError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const statusMap = { LIVE: 'live' as const, UPCOMING: 'upcoming' as const, ENDED: 'ended' as const };

    const renderBidForm = () => {
        if (isAdmin || !currentPlayer || !userTeam || rtmState) return null;

        return (
            <Card className="p-4 md:p-5 lg:p-6">
                <h3 className="mb-4 text-xl md:text-2xl">PLACE BID</h3>
                {bidError && (
                    <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                        <p className="font-mono text-sm text-red-500">{bidError}</p>
                    </div>
                )}
                <div className="space-y-4">
                    <Input
                        label={`Amount (${auction.budgetDenomination ? `${auction.budgetDenomination} ` : ''}${auction.currency})`}
                        type="number"
                        value={bidAmount}
                        onChange={(e) => {
                            setBidAmount(e.target.value);
                            setBidError('');
                        }}
                        step="0.01"
                        min="0"
                        placeholder={currentPlayerBids[0] ? (Number(currentPlayerBids[0].amount) + Number(auction.minIncrement)).toFixed(2) : Number(currentPlayer.basePrice).toFixed(2)}
                    />
                    <Button variant="primary" onClick={handlePlaceBid} disabled={loading || !bidAmount} className="w-full">
                        {loading ? 'PLACING BID...' : 'PLACE BID'}
                    </Button>
                    <div className="pt-4 border-t-3 border-border text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="font-mono text-muted">Min Next Bid:</span>
                            <span className="font-mono font-bold">
                                {currentPlayerBids[0] ? formatCurrency(Number(currentPlayerBids[0].amount) + Number(auction.minIncrement)) : formatCurrency(currentPlayer.basePrice)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-mono text-muted">Your Budget:</span>
                            <span className="font-mono font-bold text-accent">{formatCurrency(userTeam.budget)}</span>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    const renderRtmBanner = () => {
        if (!rtmState) return null;

        return (
            <Card className="p-5 md:p-6 border-accent bg-accent/10">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge status="live">RTM WINDOW</Badge>
                        <span className="font-mono text-sm text-muted">Previous-year franchise decision pending</span>
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold">{rtmState.playerName}</h2>
                        <p className="font-mono text-sm text-muted mt-2">
                            {rtmState.winningTeam.shortName} won the bidding at {formatCurrency(rtmState.originalAmount)}.
                        </p>
                        {rtmState.status === 'AWAITING_RTM_OFFER' ? (
                            <p className="font-mono text-sm text-muted">
                                {rtmState.eligibleTeam.shortName} can use RTM only by entering a higher offer.
                            </p>
                        ) : (
                            <p className="font-mono text-sm text-muted">
                                {rtmState.eligibleTeam.shortName} has offered {formatCurrency(rtmState.currentAmount)}. {rtmState.winningTeam.shortName} must now accept or decline that price.
                            </p>
                        )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 border-2 border-border">
                            <p className="font-mono text-xs text-muted mb-1">CURRENT WINNER</p>
                            <p className="font-mono text-xl font-bold" style={{ color: rtmState.winningTeam.color }}>
                                {rtmState.winningTeam.shortName}
                            </p>
                            {rtmState.status === 'AWAITING_WINNER_RESPONSE' && (
                                <p className="font-mono text-xs text-muted mt-1">
                                    Must decide at {formatCurrency(rtmState.currentAmount)}
                                </p>
                            )}
                        </div>
                        <div className="p-4 border-2 border-border">
                            <p className="font-mono text-xs text-muted mb-1">RTM ELIGIBLE TEAM</p>
                            <p className="font-mono text-xl font-bold" style={{ color: rtmState.eligibleTeam.color }}>
                                {rtmState.eligibleTeam.shortName}
                            </p>
                            <p className="font-mono text-xs text-muted mt-1">
                                RTM cards left: {rtmState.eligibleTeam.rtmCardsRemaining}
                            </p>
                        </div>
                    </div>
                    {isUserEligibleForRtmOffer ? (
                        <div className="space-y-4">
                            {rtmOfferError && (
                                <div className="p-3 border-3 border-red-500 bg-red-500/10">
                                    <p className="font-mono text-sm text-red-500">{rtmOfferError}</p>
                                </div>
                            )}
                            <Input
                                label={`RTM Offer (${auction.budgetDenomination ? `${auction.budgetDenomination} ` : ''}${auction.currency})`}
                                type="number"
                                value={rtmOfferAmount}
                                onChange={(e) => {
                                    setRtmOfferAmount(e.target.value);
                                    setRtmOfferError('');
                                }}
                                step="0.01"
                                min="0"
                                placeholder={(rtmState.originalAmount + 0.01).toFixed(2)}
                            />
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button variant="primary" onClick={handleSubmitRtmOffer} disabled={rtmDecisionLoading || !rtmOfferAmount} className="flex-1">
                                    {rtmDecisionLoading ? 'SUBMITTING...' : 'SUBMIT RTM OFFER'}
                                </Button>
                                <Button variant="secondary" onClick={handleSkipRtm} disabled={rtmDecisionLoading} className="flex-1">
                                    SKIP RTM
                                </Button>
                            </div>
                        </div>
                    ) : isUserHoldingTeam ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button variant="primary" onClick={() => handleRespondToRtmCounter(true)} disabled={rtmDecisionLoading} className="flex-1">
                                {rtmDecisionLoading ? 'SUBMITTING...' : `KEEP AT ${formatCurrency(rtmState.currentAmount)}`}
                            </Button>
                            <Button variant="secondary" onClick={() => handleRespondToRtmCounter(false)} disabled={rtmDecisionLoading} className="flex-1">
                                DECLINE AND RELEASE
                            </Button>
                        </div>
                    ) : (
                        <p className="font-mono text-sm text-muted">
                            {rtmState.status === 'AWAITING_RTM_OFFER'
                                ? `Waiting for ${rtmState.eligibleTeam.shortName} to submit an RTM offer.`
                                : `Waiting for ${rtmState.winningTeam.shortName} to answer the RTM counter-offer.`}
                        </p>
                    )}
                </div>
            </Card>
        );
    };

    if (isAdmin && auction.status === 'UPCOMING') {
        return (
            <div className="container section">
                <div className="mb-6 md:mb-8 px-4 md:px-0">
                    <h1 className="mb-2">{auction.title}</h1>
                    <p className="text-base md:text-xl font-mono text-muted mb-4">{auction.description}</p>
                    <Badge status={statusMap[auction.status]}>{auction.status}</Badge>
                </div>
                <div className="mb-6 flex gap-2 md:gap-4 px-4 md:px-0 flex-wrap">
                    <Button variant={tab === 'teams' ? 'primary' : 'secondary'} onClick={() => setTab('teams')} className="text-sm md:text-base px-4 md:px-6 py-2">
                        TEAMS ({teams.length})
                    </Button>
                    <Button variant={tab === 'players' ? 'primary' : 'secondary'} onClick={() => setTab('players')} className="text-sm md:text-base px-4 md:px-6 py-2">
                        PLAYERS ({players.length})
                    </Button>
                </div>
                {teams.length > 0 && players.length > 0 && (
                    <Card className="p-4 md:p-6 mb-6 bg-accent/10 border-accent mx-4 md:mx-0">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-mono text-base md:text-lg font-bold text-accent mb-2">Ready to Start Auction</h3>
                                <p className="font-mono text-xs md:text-sm text-muted">{teams.length} teams and {players.length} players configured</p>
                                <p className="font-mono text-xs md:text-sm text-muted mt-1">Teams can lock up to 4 RTM players before you start.</p>
                            </div>
                            <Button variant="primary" onClick={handleStartAuction} disabled={loading} className="text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 w-full md:w-auto">
                                {loading ? 'STARTING...' : 'START AUCTION'}
                            </Button>
                        </div>
                    </Card>
                )}
                {tab === 'teams' && (
                    <div className="px-4 md:px-0">
                        <AdminTeamManager auctionId={auction.id} teams={teams} onTeamAdded={fetchTeams} teamBudget={auction.teamBudget || 100} currency={auction.currency} budgetDenomination={auction.budgetDenomination} />
                    </div>
                )}
                {tab === 'players' && (
                    <div className="px-4 md:px-0">
                        <AdminPlayerManager auctionId={auction.id} players={players} teamShortNames={teamShortNames} onPlayerAdded={fetchPlayers} currency={auction.currency} budgetDenomination={auction.budgetDenomination} />
                    </div>
                )}
            </div>
        );
    }

    if (!isAdmin && !userTeam && auction.status === 'UPCOMING') {
        return (
            <div className="container section">
                <div className="max-w-2xl mx-auto px-4 md:px-0">
                    <h1 className="mb-4 text-center">{auction.title}</h1>
                    <p className="text-base md:text-xl font-mono text-muted mb-8 text-center">{auction.description}</p>
                    <Card className="p-6 md:p-8">
                        <h2 className="mb-6 text-center">SELECT YOUR TEAM</h2>
                        {teams.length === 0 ? (
                            <p className="font-mono text-muted text-center">No teams available yet. Please wait for the admin to set up teams.</p>
                        ) : (
                            <>
                                <div className="space-y-3 mb-6">
                                    {teams.map((team) => {
                                        const isOccupied = Boolean(team.users && team.users.length > 0);
                                        return (
                                            <label key={team.id} className={`flex items-center justify-between p-4 border-3 cursor-pointer hover:border-accent transition-colors ${isOccupied ? 'opacity-50 cursor-not-allowed' : ''} ${selectedTeamId === team.id ? 'border-accent bg-accent/10' : 'border-border'}`}>
                                                <div className="flex items-center gap-4">
                                                    <input type="radio" name="team" value={team.id} checked={selectedTeamId === team.id} onChange={(e) => setSelectedTeamId(e.target.value)} disabled={isOccupied} className="w-5 h-5" />
                                                    <div>
                                                        <p className="font-mono text-xl font-bold" style={{ color: team.color }}>{team.shortName}</p>
                                                        <p className="font-mono text-sm">{team.name}</p>
                                                    </div>
                                                </div>
                                                {isOccupied && <Badge status="outbid">TAKEN</Badge>}
                                            </label>
                                        );
                                    })}
                                </div>
                                <Button variant="primary" onClick={handleJoinTeam} disabled={!selectedTeamId || loading} className="w-full">
                                    {loading ? 'JOINING...' : 'JOIN TEAM'}
                                </Button>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="container section">
            {showReconnecting && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-yellow-500 text-black font-mono text-xs md:text-sm font-bold rounded shadow-lg animate-pulse">
                    Reconnecting to live updates...
                </div>
            )}
            <div className="mb-6 md:mb-8 px-4 lg:px-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
                    <div className="flex-1">
                        <h1 className="mb-2 text-2xl md:text-3xl lg:text-4xl">{auction.title}</h1>
                        <p className="text-base md:text-lg lg:text-xl font-mono text-muted">{auction.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {auction.status === 'LIVE' && (
                            <div className="flex items-center gap-2 px-3 py-1 border-2 border-border rounded">
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="font-mono text-xs text-muted">{isConnected ? 'LIVE' : 'CONNECTING...'}</span>
                            </div>
                        )}
                        <Badge status={statusMap[auction.status]}>{auction.status}</Badge>
                    </div>
                </div>
                {userTeam && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap mb-4">
                        <p className="font-mono text-sm md:text-base">Your Team: <span style={{ color: userTeam.color }} className="font-bold text-lg md:text-xl">{userTeam.shortName}</span></p>
                        <p className="font-mono text-sm md:text-base">Budget: <span className="font-bold text-lg md:text-xl text-accent">{formatCurrency(userTeam.budget)}</span></p>
                        <p className="font-mono text-sm md:text-base">Squad: <span className="font-bold">{userTeam.squadSize} players</span></p>
                        <p className="font-mono text-sm md:text-base">RTM Cards: <span className="font-bold">{userTeam.rtmCardsRemaining}</span></p>
                    </div>
                )}
                <div className="flex gap-2 mt-4 flex-wrap">
                    <Button variant={tab === 'auction' ? 'primary' : 'secondary'} onClick={() => setTab('auction')} className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2">LIVE AUCTION</Button>
                    <Button variant={tab === 'players' ? 'primary' : 'secondary'} onClick={() => setTab('players')} className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2">PLAYER POOL</Button>
                    <Button variant={tab === 'teams' ? 'primary' : 'secondary'} onClick={() => setTab('teams')} className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2">TEAMS</Button>
                    <a href={`/auction/${auction.id}/stats`} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="text-sm md:text-base px-3 md:px-5 lg:px-6 py-2">ANALYTICS</Button>
                    </a>
                </div>
            </div>

            {tab === 'auction' && (
                <div className="grid lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 px-4 lg:px-0">
                    <div className="lg:col-span-2 space-y-4 md:space-y-5 lg:space-y-6 order-1">
                        {renderRtmBanner()}
                        {isAdmin ? (
                            <AuctioneerControlPanel auctionId={auction.id} currentPlayer={currentPlayer} players={players} currentBids={currentPlayerBids} currency={auction.currency} budgetDenomination={auction.budgetDenomination} />
                        ) : currentPlayer ? (
                            <Card className="p-5 md:p-6 lg:p-8">
                                <div className="text-center mb-6">
                                    <p className="font-mono text-xs md:text-sm text-muted mb-2">CURRENT PLAYER</p>
                                    <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2">{currentPlayer.name}</h2>
                                    {currentPlayer.role && <Badge status="active">{currentPlayer.role}</Badge>}
                                    <p className="font-mono text-sm text-muted mt-3">{currentPlayer.description}</p>
                                </div>
                                {currentPlayerBids.length > 0 ? (
                                    <div className="text-center p-4 md:p-5 lg:p-6 border-3 border-accent bg-accent/10">
                                        <p className="font-mono text-xs md:text-sm text-muted mb-2">HIGHEST BID</p>
                                        <p className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold text-accent mb-2">{formatCurrency(currentPlayerBids[0].amount)}</p>
                                        <p className="font-mono text-xl font-bold" style={{ color: currentPlayerBids[0].team?.color }}>{currentPlayerBids[0].team?.shortName}</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-4 md:p-5 lg:p-6 border-3 border-border">
                                        <p className="font-mono text-xs md:text-sm text-muted mb-2">BASE PRICE</p>
                                        <p className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold">{formatCurrency(currentPlayer.basePrice)}</p>
                                        <p className="font-mono text-sm text-muted mt-2">No bids yet</p>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card className="p-6 md:p-8 lg:p-12 text-center">
                                <p className="font-mono text-base md:text-lg lg:text-xl text-muted">{rtmState ? 'Waiting for RTM decision...' : 'Waiting for auctioneer to start next player...'}</p>
                            </Card>
                        )}
                        {!isAdmin && <div className="lg:hidden">{renderBidForm()}</div>}
                        <div>
                            <h3 className="font-mono text-base md:text-lg font-bold mb-4">TEAMS</h3>
                            <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                                {teams.map((team) => (
                                    <Card key={team.id} className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" style={{ borderColor: team.color }} onClick={() => setSelectedTeamForSquad(team)}>
                                        <p style={{ color: team.color }} className="font-mono text-xl font-bold mb-1">{team.shortName}</p>
                                        <p className="font-mono text-sm text-muted mb-3">{team.name}</p>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between"><span className="font-mono text-muted">Budget:</span><span className="font-mono font-bold">{formatCurrency(team.budget)}</span></div>
                                            <div className="flex justify-between"><span className="font-mono text-muted">Squad:</span><span className="font-mono font-bold">{team.squadSize} players</span></div>
                                            <div className="flex justify-between"><span className="font-mono text-muted">RTM Cards:</span><span className="font-mono font-bold">{team.rtmCardsRemaining}</span></div>
                                            <div className="flex justify-between"><span className="font-mono text-muted">RTM Picks:</span><span className="font-mono font-bold">{team._count?.rtmSelections || 0}/{auction.maxRtmSelectionsPerTeam ?? 4}</span></div>
                                        </div>
                                        <p className="font-mono text-xs text-accent mt-2">Click to view squad</p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 md:space-y-5 lg:space-y-6 order-2 lg:order-3">
                        {!isAdmin && <div className="hidden lg:block">{renderBidForm()}</div>}
                        <Card className="p-6">
                            <h3 className="mb-4">AUCTION STATS</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between"><span className="font-mono text-sm text-muted">Teams:</span><span className="font-mono text-sm font-bold">{teams.length}</span></div>
                                <div className="flex justify-between"><span className="font-mono text-sm text-muted">Players:</span><span className="font-mono text-sm font-bold">{players.length}</span></div>
                                <div className="flex justify-between"><span className="font-mono text-sm text-muted">Sold:</span><span className="font-mono text-sm font-bold">{players.filter((player) => player.status === 'SOLD').length}</span></div>
                                <div className="flex justify-between"><span className="font-mono text-sm text-muted">Unsold:</span><span className="font-mono text-sm font-bold">{players.filter((player) => player.status === 'UNSOLD').length}</span></div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {tab === 'players' && (
                <div className="px-4 md:px-0">
                    <PlayerPoolView players={players} currency={auction.currency} budgetDenomination={auction.budgetDenomination} userTeamId={userTeam?.id} userTeamShortName={userTeam?.shortName} userTeamRtmCardsRemaining={userTeam?.rtmCardsRemaining} maxRtmSelectionsPerTeam={auction.maxRtmSelectionsPerTeam ?? 4} rtmCardsPerTeam={auction.rtmCardsPerTeam ?? 2} auctionStatus={auction.status} isAdmin={isAdmin} onToggleInterest={userTeam ? handleToggleInterest : undefined} onToggleRtm={userTeam ? handleToggleRtm : undefined} />
                </div>
            )}

            {tab === 'teams' && (
                <div className="px-4 md:px-0">
                    <h3 className="font-mono text-base md:text-lg font-bold mb-4">TEAMS</h3>
                    <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                        {teams.map((team) => (
                            <Card key={team.id} className="p-4 cursor-pointer hover:bg-accent/5 transition-colors" style={{ borderColor: team.color }} onClick={() => setSelectedTeamForSquad(team)}>
                                <p style={{ color: team.color }} className="font-mono text-xl font-bold mb-1">{team.shortName}</p>
                                <p className="font-mono text-sm text-muted mb-3">{team.name}</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="font-mono text-muted">Budget:</span><span className="font-mono font-bold">{formatCurrency(team.budget)}</span></div>
                                    <div className="flex justify-between"><span className="font-mono text-muted">Squad:</span><span className="font-mono font-bold">{team.squadSize} players</span></div>
                                    <div className="flex justify-between"><span className="font-mono text-muted">RTM Cards:</span><span className="font-mono font-bold">{team.rtmCardsRemaining}</span></div>
                                    <div className="flex justify-between"><span className="font-mono text-muted">RTM Picks:</span><span className="font-mono font-bold">{team._count?.rtmSelections || 0}/{auction.maxRtmSelectionsPerTeam ?? 4}</span></div>
                                </div>
                                <p className="font-mono text-xs text-accent mt-2">Click to view squad</p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {selectedTeamForSquad && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedTeamForSquad(null)}>
                    <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="font-mono text-2xl font-bold mb-1" style={{ color: selectedTeamForSquad.color }}>{selectedTeamForSquad.shortName}</h2>
                                <p className="font-mono text-muted">{selectedTeamForSquad.name}</p>
                            </div>
                            <Button variant="secondary" onClick={() => setSelectedTeamForSquad(null)}>CLOSE</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-accent/5 border-2 border-accent/20">
                            <div><p className="font-mono text-xs text-muted mb-1">BUDGET LEFT</p><p className="font-mono text-lg font-bold text-accent">{formatCurrency(selectedTeamForSquad.budget)}</p></div>
                            <div><p className="font-mono text-xs text-muted mb-1">SQUAD SIZE</p><p className="font-mono text-lg font-bold">{selectedTeamForSquad.squadSize} players</p></div>
                            <div><p className="font-mono text-xs text-muted mb-1">SPENT</p><p className="font-mono text-lg font-bold">{formatCurrency(Number(selectedTeamForSquad.totalBudget) - Number(selectedTeamForSquad.budget))}</p></div>
                            <div><p className="font-mono text-xs text-muted mb-1">RTM</p><p className="font-mono text-lg font-bold">{selectedTeamForSquad.rtmCardsRemaining} cards</p></div>
                        </div>
                        <h3 className="font-mono text-lg font-bold mb-4">SQUAD</h3>
                        {players.filter((player) => player.team?.id === selectedTeamForSquad.id).length === 0 ? (
                            <div className="text-center py-8"><p className="font-mono text-muted">No players in squad yet</p></div>
                        ) : (
                            <div className="space-y-2">
                                {players.filter((player) => player.team?.id === selectedTeamForSquad.id).map((player, index) => (
                                    <div key={player.id} className="flex items-center justify-between p-4 border-2 border-border hover:border-accent/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-lg font-bold text-muted">#{index + 1}</span>
                                            <div>
                                                <p className="font-mono font-bold text-lg">{player.name}</p>
                                                {player.role && <p className="font-mono text-sm text-muted">{player.role}</p>}
                                                {player.description && <p className="font-mono text-xs text-muted">{player.description}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-xs text-muted">Sold for</p>
                                            <p className="font-mono text-xl font-bold text-accent">{formatCurrency(player.soldPrice)}</p>
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
