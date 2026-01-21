'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AuctionStats {
    auction: {
        id: string;
        title: string;
        status: string;
        totalBudget: number;
    };
    overview: {
        totalPlayers: number;
        soldPlayers: number;
        unsoldPlayers: number;
        availablePlayers: number;
        totalMoneySpent: number;
        averagePlayerPrice: number;
        totalTeams: number;
    };
    teamStats: TeamStat[];
    roleStats: {
        [key: string]: { total: number; sold: number; unsold: number };
    };
    priceRanges: {
        budget: number;
        midRange: number;
        premium: number;
        superstar: number;
    };
    mostExpensivePlayers: {
        name: string;
        role: string;
        soldPrice: number;
        teamName: string;
        teamColor: string;
    }[];
}

interface TeamStat {
    id: string;
    name: string;
    shortName: string;
    color: string;
    squadSize: number;
    moneySpent: number;
    remainingBudget: number;
    totalBudget: number;
    budgetUtilization: number;
    playersNeeded: number;
    slotsRemaining: number;
    minRequired: number;
    maxAllowed: number;
    roleDistribution: {
        BATSMAN: number;
        BOWLER: number;
        ALLROUNDER: number;
        WICKETKEEPER: number;
    };
}

export default function AuctionStatsPage() {
    const params = useParams();
    const auctionId = params.auctionId as string;
    const [stats, setStats] = useState<AuctionStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const response = await fetch(`/api/auctions/${auctionId}/stats`);
            const result = await response.json();
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctionId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="card p-8 text-center">
                    <div className="text-[var(--foreground)] text-xl font-[var(--font-grotesk)] font-bold">LOADING STATISTICS...</div>
                    <div className="mt-4 w-16 h-1 bg-[var(--accent)] mx-auto animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="card p-8 text-center border-[var(--accent)]">
                    <div className="text-[var(--foreground)] text-xl font-[var(--font-grotesk)] font-bold">FAILED TO LOAD STATISTICS</div>
                    <div className="text-[var(--muted)] font-mono mt-2">Please try again later</div>
                </div>
            </div>
        );
    }

    const { overview, teamStats, roleStats, priceRanges, mostExpensivePlayers } = stats;

    return (
        <div className="min-h-screen bg-[var(--background)] py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/auction/${auctionId}`}
                        className="font-mono text-[var(--accent)] hover:underline mb-4 inline-flex items-center gap-2 uppercase text-sm font-bold"
                    >
                        ← Back to Auction
                    </Link>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-2">
                        {stats.auction.title}
                    </h1>
                    <p className="font-mono text-[var(--muted)] uppercase text-sm">📊 ANALYTICS DASHBOARD</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="card p-6">
                        <div className="font-mono text-[var(--muted)] text-xs uppercase mb-2">Total Players</div>
                        <div className="text-4xl font-bold text-[var(--foreground)] mb-2">{overview.totalPlayers}</div>
                        <div className="flex gap-4 text-sm font-mono">
                            <span className="text-[var(--accent)]">Sold: {overview.soldPlayers}</span>
                            <span className="text-[var(--muted)]">Unsold: {overview.unsoldPlayers}</span>
                        </div>
                    </div>

                    <div className="card p-6">
                        <div className="font-mono text-[var(--muted)] text-xs uppercase mb-2">Total Spent</div>
                        <div className="text-3xl font-bold text-[var(--foreground)] mb-2">
                            {formatCurrency(overview.totalMoneySpent)}
                        </div>
                        <div className="text-sm font-mono text-[var(--muted)]">
                            Avg: {formatCurrency(overview.averagePlayerPrice)}
                        </div>
                    </div>

                    <div className="card p-6">
                        <div className="font-mono text-[var(--muted)] text-xs uppercase mb-2">Teams</div>
                        <div className="text-4xl font-bold text-[var(--foreground)] mb-2">{overview.totalTeams}</div>
                        <div className="text-sm font-mono text-[var(--muted)]">Participating</div>
                    </div>

                    <div className="card p-6">
                        <div className="font-mono text-[var(--muted)] text-xs uppercase mb-2">Available Players</div>
                        <div className="text-4xl font-bold text-[var(--foreground)] mb-2">
                            {overview.availablePlayers}
                        </div>
                        <div className="text-sm font-mono text-[var(--muted)]">Yet to auction</div>
                    </div>
                </div>

                {/* Price Range Distribution */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">💰 PRICE RANGE DISTRIBUTION</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card p-4 text-center">
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.budget}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Budget</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">&lt; ₹5L</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.midRange}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Mid-Range</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">₹5L - ₹20L</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.premium}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Premium</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">₹20L - ₹50L</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.superstar}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Superstar</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">₹50L+</div>
                        </div>
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">🎭 ROLE DISTRIBUTION</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {Object.entries(roleStats).map(([role, data]) => (
                            <div key={role} className="card p-4">
                                <div className="text-lg font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-2 uppercase">{role}</div>
                                <div className="space-y-1 text-sm font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">Total:</span>
                                        <span className="text-[var(--foreground)] font-bold">{data.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">Sold:</span>
                                        <span className="text-[var(--accent)] font-bold">{data.sold}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">Unsold:</span>
                                        <span className="text-[var(--muted)] font-bold">{data.unsold}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Expensive Players */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">🏅 MOST EXPENSIVE PLAYERS</h2>
                    <div className="space-y-3">
                        {mostExpensivePlayers.map((player, index) => (
                            <div
                                key={index}
                                className="card flex items-center justify-between p-4 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[6px_6px_0_var(--accent)] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl font-bold font-mono text-[var(--accent)]">#{index + 1}</div>
                                    <div>
                                        <div className="text-[var(--foreground)] font-[var(--font-grotesk)] font-bold">{player.name}</div>
                                        <div className="text-sm font-mono text-[var(--muted)] uppercase">{player.role}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold font-mono text-[var(--accent)]">
                                        {formatCurrency(player.soldPrice)}
                                    </div>
                                    <div
                                        className="text-sm font-[var(--font-grotesk)] font-bold uppercase"
                                        style={{ color: player.teamColor }}
                                    >
                                        {player.teamName}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Statistics */}
                <div className="card p-6">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">🏆 TEAM-WISE ANALYSIS</h2>
                    <div className="space-y-6">
                        {teamStats.map((team) => (
                            <div key={team.id} className="card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 border-3"
                                            style={{ 
                                                backgroundColor: team.color,
                                                borderColor: team.color 
                                            }}
                                        />
                                        <h3 className="text-xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)]">{team.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono text-[var(--muted)] uppercase">Squad Size</div>
                                        <div className="text-2xl font-bold font-mono text-[var(--foreground)]">
                                            {team.squadSize}/{team.maxAllowed}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="card p-3">
                                        <div className="text-xs font-mono text-[var(--muted)] mb-1 uppercase">Money Spent</div>
                                        <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                            {formatCurrency(team.moneySpent)}
                                        </div>
                                    </div>
                                    <div className="card p-3">
                                        <div className="text-xs font-mono text-[var(--muted)] mb-1 uppercase">Remaining Budget</div>
                                        <div className="text-lg font-bold font-mono text-[var(--accent)]">
                                            {formatCurrency(team.remainingBudget)}
                                        </div>
                                    </div>
                                    <div className="card p-3">
                                        <div className="text-xs font-mono text-[var(--muted)] mb-1 uppercase">Budget Used</div>
                                        <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                            {team.budgetUtilization.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Budget Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm font-mono text-[var(--muted)] mb-2 uppercase">
                                        <span>Budget Utilization</span>
                                        <span className="text-[var(--foreground)] font-bold">{team.budgetUtilization.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full border-3 border-[var(--border)] h-6 relative">
                                        <div
                                            className="h-full bg-[var(--accent)]"
                                            style={{ width: `${Math.min(team.budgetUtilization, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Squad Progress */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm font-mono mb-2 uppercase">
                                        <span className="text-[var(--muted)]">Squad Progress</span>
                                        <span className="text-[var(--foreground)] font-bold">
                                            {team.squadSize}/{team.minRequired} required
                                        </span>
                                    </div>
                                    <div className="w-full border-3 border-[var(--border)] h-6 relative">
                                        <div
                                            className={`h-full ${
                                                team.squadSize >= team.minRequired
                                                    ? 'bg-[var(--accent)]'
                                                    : 'bg-[var(--muted)]'
                                            }`}
                                            style={{
                                                width: `${Math.min((team.squadSize / team.minRequired) * 100, 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    {team.playersNeeded > 0 && (
                                        <div className="card p-3 text-center border-[var(--accent)]">
                                            <div className="text-2xl font-bold font-mono text-[var(--accent)]">
                                                {team.playersNeeded}
                                            </div>
                                            <div className="text-xs font-mono text-[var(--muted)] uppercase">Players Needed</div>
                                        </div>
                                    )}
                                    <div className="card p-3 text-center">
                                        <div className="text-2xl font-bold font-mono text-[var(--foreground)]">
                                            {team.slotsRemaining}
                                        </div>
                                        <div className="text-xs font-mono text-[var(--muted)] uppercase">Slots Available</div>
                                    </div>
                                </div>

                                {/* Role Distribution */}
                                <div>
                                    <div className="text-sm font-mono text-[var(--muted)] mb-2 uppercase">Role Distribution</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.BATSMAN}
                                            </div>
                                            <div className="text-xs font-mono text-[var(--muted)] uppercase">BAT</div>
                                        </div>
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.BOWLER}
                                            </div>
                                            <div className="text-xs font-mono text-[var(--muted)] uppercase">BOWL</div>
                                        </div>
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.ALLROUNDER}
                                            </div>
                                            <div className="text-xs font-mono text-[var(--muted)] uppercase">AR</div>
                                        </div>
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.WICKETKEEPER}
                                            </div>
                                            <div className="text-xs font-mono text-[var(--muted)] uppercaset-white">
                                                {team.roleDistribution.WICKETKEEPER}
                                            </div>
                                            <div className="text-xs text-gray-400">WK</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
