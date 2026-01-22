'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/ToastProvider';

interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    budget: number;
    totalBudget: number;
    squadSize: number;
    _count: {
        users: number;
        players: number;
    };
}

interface Player {
    id: string;
    name: string;
    description: string;
    role: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    isCurrentlyAuctioning: boolean;
    team?: {
        name: string;
        shortName: string;
        color: string;
    };
}

interface AuctioneerControlProps {
    auctionId: string;
    isCreator: boolean;
    auctionStatus: string;
    currency: string;
}

export default function AuctioneerControl({ 
    auctionId, 
    isCreator, 
    auctionStatus,
    currency 
}: AuctioneerControlProps) {
    const { showToast } = useToast();
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'control'>('control');
    
    // Form states
    const [teamForm, setTeamForm] = useState({
        name: '',
        shortName: '',
        color: '#000000',
        budget: '100',
    });

    const [playerForm, setPlayerForm] = useState({
        name: '',
        description: '',
        role: 'Batsman',
        basePrice: '0.2',
    });

    const currentPlayer = players.find(p => p.isCurrentlyAuctioning);

    const fetchTeams = async () => {
        try {
            const response = await fetch(`/api/teams?auctionId=${auctionId}`);
            const data = await response.json();
            if (data.success) {
                setTeams(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch teams:', error);
        }
    };

    const fetchPlayers = async () => {
        try {
            const response = await fetch(`/api/players?auctionId=${auctionId}`);
            const data = await response.json();
            if (data.success) {
                setPlayers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch players:', error);
        }
    };

    useEffect(() => {
        if (isCreator) {
            fetchTeams();
            fetchPlayers();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctionId, isCreator]);

    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    ...teamForm,
                    budget: parseFloat(teamForm.budget),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Team added successfully!');
                setTeamForm({ name: '', shortName: '', color: '#000000', budget: '100' });
                fetchTeams();
            } else {
                setError(data.error || 'Failed to add team');
            }
        } catch {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    ...playerForm,
                    basePrice: parseFloat(playerForm.basePrice),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Player added successfully!');
                setPlayerForm({ name: '', description: '', role: 'Batsman', basePrice: '0.2' });
                fetchPlayers();
            } else {
                setError(data.error || 'Failed to add player');
            }
        } catch {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleStartAuction = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start-auction',
                    auctionId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Auction started!');
                window.location.reload();
            } else {
                setError(data.error || 'Failed to start auction');
            }
        } catch {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleStartPlayerAuction = async (playerId: string) => {
        setLoading(true);
        setError('');
        setSuccess('');

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

            if (response.ok) {
                setSuccess('Player auction started!');
                fetchPlayers();
                window.location.reload();
            } else {
                setError(data.error || 'Failed to start player auction');
            }
        } catch {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleEndPlayerAuction = async (sold: boolean, winningBidId?: string) => {
        if (!currentPlayer) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/auction-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'end-player',
                    auctionId,
                    playerId: currentPlayer.id,
                    sold,
                    winningBidId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(sold ? 'Player sold!' : 'Player went unsold');
                fetchPlayers();
                fetchTeams();
                window.location.reload();
            } else {
                setError(data.error || 'Failed to end player auction');
            }
        } catch {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isCreator) {
        return null;
    }

    return (
        <Card className="p-6 mb-8 border-4 border-accent">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-mono text-accent">AUCTIONEER CONTROL PANEL</h2>
                {auctionStatus === 'UPCOMING' && teams.length > 0 && players.length > 0 && (
                    <Button onClick={handleStartAuction} variant="primary" disabled={loading}>
                        START AUCTION
                    </Button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-4 border-3 border-red-500 bg-red-500/10">
                    <p className="font-mono text-red-500">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 border-3 border-accent bg-accent/10">
                    <p className="font-mono text-accent">{success}</p>
                </div>
            )}

            <div className="flex gap-4 mb-6">
                <Button
                    variant={activeTab === 'control' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('control')}
                >
                    CONTROL
                </Button>
                <Button
                    variant={activeTab === 'teams' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('teams')}
                >
                    TEAMS ({teams.length})
                </Button>
                <Button
                    variant={activeTab === 'players' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('players')}
                >
                    PLAYERS ({players.length})
                </Button>
            </div>

            {activeTab === 'control' && (
                <div className="space-y-6">
                    <div className="p-6 border-3 border-border bg-background/50">
                        <h3 className="font-mono text-lg mb-4">QUICK STATS</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted font-mono">TEAMS</p>
                                <p className="text-2xl font-bold">{teams.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted font-mono">PLAYERS</p>
                                <p className="text-2xl font-bold">{players.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted font-mono">SOLD</p>
                                <p className="text-2xl font-bold text-accent">
                                    {players.filter(p => p.status === 'SOLD').length}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted font-mono">UNSOLD</p>
                                <p className="text-2xl font-bold">
                                    {players.filter(p => p.status === 'UNSOLD' && !p.isCurrentlyAuctioning).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {currentPlayer && (
                        <div className="p-6 border-4 border-accent bg-accent/10">
                            <h3 className="font-mono text-lg mb-4 text-accent">CURRENTLY AUCTIONING</h3>
                            <div className="mb-4">
                                <h4 className="text-xl font-bold mb-2">{currentPlayer.name}</h4>
                                <p className="text-sm text-muted mb-2">{currentPlayer.role}</p>
                                <p className="text-sm mb-2">{currentPlayer.description}</p>
                                <p className="text-sm font-mono">
                                    Base Price: <span className="font-bold">{currentPlayer.basePrice} {currency}</span>
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <Button 
                                    onClick={() => handleEndPlayerAuction(false)}
                                    variant="secondary"
                                    disabled={loading}
                                >
                                    MARK UNSOLD
                                </Button>
                                <Button 
                                    onClick={() => {
                                        // This would need the winning bid ID - implement based on your bid tracking
                                        showToast('Sell to highest bidder - check bids section', 'info');
                                    }}
                                    variant="primary"
                                    disabled={loading}
                                >
                                    SELL TO HIGHEST BIDDER
                                </Button>
                            </div>
                        </div>
                    )}

                    {!currentPlayer && auctionStatus === 'LIVE' && (
                        <div className="p-6 border-3 border-border">
                            <h3 className="font-mono text-lg mb-4">NEXT PLAYERS</h3>
                            <div className="space-y-3">
                                {players.filter(p => p.status === 'UNSOLD' && !p.isCurrentlyAuctioning).slice(0, 5).map(player => (
                                    <div key={player.id} className="flex items-center justify-between p-4 border-2 border-border">
                                        <div>
                                            <p className="font-bold">{player.name}</p>
                                            <p className="text-sm text-muted">{player.role} • Base: {player.basePrice} {currency}</p>
                                        </div>
                                        <Button
                                            onClick={() => handleStartPlayerAuction(player.id)}
                                            variant="primary"
                                            disabled={loading}
                                        >
                                            START AUCTION
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'teams' && (
                <div className="space-y-6">
                    <form onSubmit={handleAddTeam} className="p-6 border-3 border-border space-y-4">
                        <h3 className="font-mono text-lg mb-4">ADD NEW TEAM</h3>
                        <Input
                            label="Team Name"
                            value={teamForm.name}
                            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                            required
                            placeholder="Mumbai Indians"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Short Name"
                                value={teamForm.shortName}
                                onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value })}
                                required
                                placeholder="MI"
                            />
                            <Input
                                label="Team Color"
                                type="color"
                                value={teamForm.color}
                                onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                                required
                            />
                        </div>
                        <Input
                            label={`Budget (${currency})`}
                            type="number"
                            value={teamForm.budget}
                            onChange={(e) => setTeamForm({ ...teamForm, budget: e.target.value })}
                            required
                            step="0.01"
                        />
                        <Button type="submit" variant="primary" disabled={loading}>
                            ADD TEAM
                        </Button>
                    </form>

                    <div className="grid gap-4">
                        {teams.map(team => (
                            <div key={team.id} className="p-4 border-3" style={{ borderColor: team.color }}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg">{team.name} ({team.shortName})</h4>
                                        <div className="mt-2 space-y-1 text-sm font-mono">
                                            <p>Budget: <span className="font-bold">{team.budget.toString()} / {team.totalBudget.toString()} {currency}</span></p>
                                            <p>Squad: <span className="font-bold">{team._count.players} players</span></p>
                                            <p>Representatives: <span className="font-bold">{team._count.users}</span></p>
                                        </div>
                                    </div>
                                    <div 
                                        className="w-12 h-12 border-3 border-foreground"
                                        style={{ backgroundColor: team.color }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'players' && (
                <div className="space-y-6">
                    <form onSubmit={handleAddPlayer} className="p-6 border-3 border-border space-y-4">
                        <h3 className="font-mono text-lg mb-4">ADD NEW PLAYER</h3>
                        <Input
                            label="Player Name"
                            value={playerForm.name}
                            onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                            required
                            placeholder="Virat Kohli"
                        />
                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Description
                            </label>
                            <textarea
                                value={playerForm.description}
                                onChange={(e) => setPlayerForm({ ...playerForm, description: e.target.value })}
                                required
                                placeholder="Star batsman, former captain..."
                                rows={3}
                                className="w-full"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                    Role
                                </label>
                                <select
                                    value={playerForm.role}
                                    onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
                                    className="w-full"
                                >
                                    <option value="Batsman">Batsman</option>
                                    <option value="Bowler">Bowler</option>
                                    <option value="All-rounder">All-rounder</option>
                                    <option value="Wicket-keeper">Wicket-keeper</option>
                                </select>
                            </div>
                            <Input
                                label={`Base Price (${currency})`}
                                type="number"
                                value={playerForm.basePrice}
                                onChange={(e) => setPlayerForm({ ...playerForm, basePrice: e.target.value })}
                                required
                                step="0.01"
                            />
                        </div>
                        <Button type="submit" variant="primary" disabled={loading}>
                            ADD PLAYER
                        </Button>
                    </form>

                    <div className="space-y-3">
                        {players.map(player => (
                            <div key={player.id} className="p-4 border-3 border-border">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-lg">{player.name}</h4>
                                            <Badge status={player.status === 'SOLD' ? 'winning' : 'active'}>
                                                {player.status}
                                            </Badge>
                                            {player.isCurrentlyAuctioning && (
                                                <Badge status="live">LIVE</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted mb-1">{player.role}</p>
                                        <p className="text-sm mb-2">{player.description}</p>
                                        <div className="text-sm font-mono">
                                            <span className="text-muted">Base: </span>
                                            <span className="font-bold">{player.basePrice} {currency}</span>
                                            {player.soldPrice && (
                                                <>
                                                    <span className="text-muted"> • Sold: </span>
                                                    <span className="font-bold text-accent">{player.soldPrice.toString()} {currency}</span>
                                                </>
                                            )}
                                            {player.team && (
                                                <>
                                                    <span className="text-muted"> • Team: </span>
                                                    <span className="font-bold" style={{ color: player.team.color }}>
                                                        {player.team.shortName}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {player.status === 'UNSOLD' && !player.isCurrentlyAuctioning && auctionStatus === 'LIVE' && (
                                        <Button
                                            onClick={() => handleStartPlayerAuction(player.id)}
                                            variant="primary"
                                            disabled={loading || !!currentPlayer}
                                        >
                                            AUCTION
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
