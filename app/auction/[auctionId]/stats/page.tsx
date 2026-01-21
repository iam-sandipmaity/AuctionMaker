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
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading statistics...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Failed to load statistics</div>
            </div>
        );
    }

    const { overview, teamStats, roleStats, priceRanges, mostExpensivePlayers } = stats;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/auction/${auctionId}`}
                        className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center gap-2"
                    >
                        ← Back to Auction
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        {stats.auction.title} - Analytics
                    </h1>
                    <p className="text-gray-400">Comprehensive auction statistics and insights</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div className="text-gray-400 text-sm mb-2">Total Players</div>
                        <div className="text-4xl font-bold text-white mb-2">{overview.totalPlayers}</div>
                        <div className="flex gap-4 text-sm">
                            <span className="text-green-400">Sold: {overview.soldPlayers}</span>
                            <span className="text-yellow-400">Unsold: {overview.unsoldPlayers}</span>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div className="text-gray-400 text-sm mb-2">Total Spent</div>
                        <div className="text-3xl font-bold text-white mb-2">
                            {formatCurrency(overview.totalMoneySpent)}
                        </div>
                        <div className="text-sm text-gray-400">
                            Avg: {formatCurrency(overview.averagePlayerPrice)}
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div className="text-gray-400 text-sm mb-2">Teams</div>
                        <div className="text-4xl font-bold text-white mb-2">{overview.totalTeams}</div>
                        <div className="text-sm text-gray-400">Participating</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <div className="text-gray-400 text-sm mb-2">Available Players</div>
                        <div className="text-4xl font-bold text-white mb-2">
                            {overview.availablePlayers}
                        </div>
                        <div className="text-sm text-gray-400">Yet to auction</div>
                    </div>
                </div>

                {/* Price Range Distribution */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Price Range Distribution</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400 mb-2">{priceRanges.budget}</div>
                            <div className="text-gray-300 font-medium">Budget</div>
                            <div className="text-gray-500 text-sm">&lt; ₹5L</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-400 mb-2">{priceRanges.midRange}</div>
                            <div className="text-gray-300 font-medium">Mid-Range</div>
                            <div className="text-gray-500 text-sm">₹5L - ₹20L</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-400 mb-2">{priceRanges.premium}</div>
                            <div className="text-gray-300 font-medium">Premium</div>
                            <div className="text-gray-500 text-sm">₹20L - ₹50L</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-400 mb-2">{priceRanges.superstar}</div>
                            <div className="text-gray-300 font-medium">Superstar</div>
                            <div className="text-gray-500 text-sm">₹50L+</div>
                        </div>
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Role Distribution</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {Object.entries(roleStats).map(([role, data]) => (
                            <div key={role} className="bg-white/5 rounded-lg p-4">
                                <div className="text-lg font-semibold text-white mb-2">{role}</div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total:</span>
                                        <span className="text-white font-medium">{data.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Sold:</span>
                                        <span className="text-green-400 font-medium">{data.sold}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Unsold:</span>
                                        <span className="text-yellow-400 font-medium">{data.unsold}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Expensive Players */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Most Expensive Players</h2>
                    <div className="space-y-3">
                        {mostExpensivePlayers.map((player, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                                    <div>
                                        <div className="text-white font-semibold">{player.name}</div>
                                        <div className="text-sm text-gray-400">{player.role}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-green-400">
                                        {formatCurrency(player.soldPrice)}
                                    </div>
                                    <div
                                        className="text-sm font-medium"
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
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h2 className="text-2xl font-bold text-white mb-6">Team-wise Analysis</h2>
                    <div className="space-y-6">
                        {teamStats.map((team) => (
                            <div key={team.id} className="bg-white/5 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: team.color }}
                                        />
                                        <h3 className="text-xl font-bold text-white">{team.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Squad Size</div>
                                        <div className="text-2xl font-bold text-white">
                                            {team.squadSize}/{team.maxAllowed}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <div className="text-sm text-gray-400 mb-1">Money Spent</div>
                                        <div className="text-lg font-bold text-red-400">
                                            {formatCurrency(team.moneySpent)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-400 mb-1">Remaining Budget</div>
                                        <div className="text-lg font-bold text-green-400">
                                            {formatCurrency(team.remainingBudget)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-400 mb-1">Budget Used</div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {team.budgetUtilization.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Budget Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                                        <span>Budget Utilization</span>
                                        <span>{team.budgetUtilization.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-3">
                                        <div
                                            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                            style={{ width: `${Math.min(team.budgetUtilization, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Squad Progress */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Squad Progress</span>
                                        <span className="text-white">
                                            {team.squadSize}/{team.minRequired} required
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full ${
                                                team.squadSize >= team.minRequired
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                            }`}
                                            style={{
                                                width: `${Math.min((team.squadSize / team.minRequired) * 100, 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    {team.playersNeeded > 0 && (
                                        <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-orange-400">
                                                {team.playersNeeded}
                                            </div>
                                            <div className="text-xs text-gray-300">Players Needed</div>
                                        </div>
                                    )}
                                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-blue-400">
                                            {team.slotsRemaining}
                                        </div>
                                        <div className="text-xs text-gray-300">Slots Available</div>
                                    </div>
                                </div>

                                {/* Role Distribution */}
                                <div>
                                    <div className="text-sm text-gray-400 mb-2">Role Distribution</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="bg-white/5 rounded p-2 text-center">
                                            <div className="text-lg font-bold text-white">
                                                {team.roleDistribution.BATSMAN}
                                            </div>
                                            <div className="text-xs text-gray-400">BAT</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-2 text-center">
                                            <div className="text-lg font-bold text-white">
                                                {team.roleDistribution.BOWLER}
                                            </div>
                                            <div className="text-xs text-gray-400">BOWL</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-2 text-center">
                                            <div className="text-lg font-bold text-white">
                                                {team.roleDistribution.ALLROUNDER}
                                            </div>
                                            <div className="text-xs text-gray-400">AR</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-2 text-center">
                                            <div className="text-lg font-bold text-white">
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
