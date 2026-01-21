'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Player {
    id: string;
    name: string;
    role: string;
    soldPrice: number | null;
    teamId: string | null;
    teamName?: string;
    teamColor?: string;
}

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
        totalBudgetPool: number;
        totalRemainingBudget: number;
        auctionCompletionPercent: number;
        avgPriceByRole: { [key: string]: number };
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
    teamSpendingComparison: {
        id: string;
        name: string;
        color: string;
        spent: number;
        squadSize: number;
    }[];
    insights: {
        highestSpender: { name: string; color: string; spent: number; squadSize: number };
        lowestSpender: { name: string; color: string; spent: number; squadSize: number };
        mostBalancedTeam: { name: string; color: string; balanceScore: number };
    };
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
    const [modalData, setModalData] = useState<{ title: string; players: Player[] } | null>(null);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);

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

    const fetchAllPlayers = async () => {
        try {
            const response = await fetch(`/api/players?auctionId=${auctionId}`);
            const result = await response.json();
            if (result.success) {
                setAllPlayers(result.players || []);
            }
        } catch (error) {
            console.error('Error fetching players:', error);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchAllPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctionId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const normalizeRole = (role: string) => role.toUpperCase().trim();

    const openModal = (title: string, players: Player[]) => {
        setModalData({ title, players });
    };

    const closeModal = () => {
        setModalData(null);
    };

    const showRolePlayers = (role: string) => {
        const normalizedRole = normalizeRole(role);
        const filtered = allPlayers.filter(p => normalizeRole(p.role) === normalizedRole);
        openModal(`${role} Players`, filtered);
    };

    const showTeamPlayers = (teamId: string, teamName: string) => {
        const filtered = allPlayers.filter(p => p.teamId === teamId);
        openModal(`${teamName} Squad`, filtered);
    };

    const showPriceRangePlayers = (title: string, min: number, max: number) => {
        const filtered = allPlayers.filter(p => {
            if (!p.soldPrice) return false;
            return p.soldPrice >= min && p.soldPrice <= max;
        });
        openModal(title, filtered);
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

    const { overview, teamStats, roleStats, priceRanges, mostExpensivePlayers, teamSpendingComparison, insights } = stats;

    return (
        <div className="min-h-screen bg-[var(--background)] py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Modal */}
                {modalData && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                        onClick={closeModal}
                    >
                        <div 
                            className="card max-w-4xl w-full max-h-[80vh] overflow-auto p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)]">
                                    {modalData.title}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-[var(--foreground)] text-3xl font-bold hover:text-[var(--accent)] transition-colors px-4"
                                >
                                    ×
                                </button>
                            </div>
                            
                            {modalData.players.length === 0 ? (
                                <p className="font-mono text-[var(--muted)]">No players found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {modalData.players.map(player => (
                                        <div key={player.id} className="border-2 border-[var(--border)] p-4">
                                            <div className="font-[var(--font-grotesk)] font-bold text-[var(--foreground)] text-lg mb-1">
                                                {player.name}
                                            </div>
                                            <div className="font-mono text-[var(--muted)] text-xs mb-2 uppercase">
                                                {player.role}
                                            </div>
                                            {player.soldPrice ? (
                                                <>
                                                    <div className="font-mono text-[var(--accent)] font-bold">
                                                        {formatCurrency(player.soldPrice)}
                                                    </div>
                                                    {player.teamName && (
                                                        <div 
                                                            className="font-mono text-xs mt-1"
                                                            style={{ color: player.teamColor || 'var(--foreground)' }}
                                                        >
                                                            {player.teamName}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="font-mono text-[var(--muted)] text-sm">
                                                    UNSOLD
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                        <div className="font-mono text-[var(--muted)] text-xs uppercase mb-2">Auction Progress</div>
                        <div className="text-4xl font-bold text-[var(--foreground)] mb-2">{overview.auctionCompletionPercent}%</div>
                        <div className="text-sm font-mono text-[var(--muted)]">{overview.soldPlayers}/{overview.totalPlayers} Players</div>
                    </div>

                    <div className="card p-6">
                        <div className="font-mono text-[var(--muted)] text-xs uppercase mb-2">Budget Remaining</div>
                        <div className="text-3xl font-bold text-[var(--accent)] mb-2">
                            {formatCurrency(overview.totalRemainingBudget)}
                        </div>
                        <div className="text-sm font-mono text-[var(--muted)]">of {formatCurrency(overview.totalBudgetPool)}</div>
                    </div>
                </div>

                {/* Key Insights */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">🎯 KEY INSIGHTS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-4">
                            <div className="text-xs font-mono text-[var(--muted)] uppercase mb-2">Highest Spender</div>
                            <div className="text-2xl font-bold font-mono mb-1" style={{ color: insights.highestSpender.color }}>
                                {insights.highestSpender.name}
                            </div>
                            <div className="text-sm font-mono text-[var(--foreground)]">
                                {formatCurrency(insights.highestSpender.spent)}
                            </div>
                            <div className="text-xs font-mono text-[var(--muted)] mt-1">
                                {insights.highestSpender.squadSize} players
                            </div>
                        </div>
                        
                        <div className="card p-4">
                            <div className="text-xs font-mono text-[var(--muted)] uppercase mb-2">Most Balanced Squad</div>
                            <div className="text-2xl font-bold font-mono mb-1" style={{ color: insights.mostBalancedTeam.color }}>
                                {insights.mostBalancedTeam.name}
                            </div>
                            <div className="text-sm font-mono text-[var(--accent)]">
                                Balance Score: {insights.mostBalancedTeam.balanceScore.toFixed(1)}
                            </div>
                            <div className="text-xs font-mono text-[var(--muted)] mt-1">
                                Well-distributed roles
                            </div>
                        </div>
                        
                        <div className="card p-4">
                            <div className="text-xs font-mono text-[var(--muted)] uppercase mb-2">Budget Saver</div>
                            <div className="text-2xl font-bold font-mono mb-1" style={{ color: insights.lowestSpender.color }}>
                                {insights.lowestSpender.name}
                            </div>
                            <div className="text-sm font-mono text-[var(--foreground)]">
                                {formatCurrency(insights.lowestSpender.spent)}
                            </div>
                            <div className="text-xs font-mono text-[var(--muted)] mt-1">
                                {insights.lowestSpender.squadSize} players
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Spending Comparison Chart */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">💰 TEAM SPENDING COMPARISON</h2>
                    <div className="space-y-4">
                        {teamSpendingComparison.map((team, index) => {
                            const maxSpent = teamSpendingComparison[0].spent;
                            const widthPercent = maxSpent > 0 ? (team.spent / maxSpent) * 100 : 0;
                            return (
                                <div key={team.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm font-mono">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--muted)]">#{index + 1}</span>
                                            <span className="font-bold" style={{ color: team.color }}>{team.name}</span>
                                            <span className="text-[var(--muted)] text-xs">({team.squadSize} players)</span>
                                        </div>
                                        <span className="text-[var(--foreground)] font-bold">{formatCurrency(team.spent)}</span>
                                    </div>
                                    <div className="w-full border-3 border-[var(--border)] h-8 relative">
                                        <div
                                            className="h-full transition-all duration-500"
                                            style={{ 
                                                width: `${widthPercent}%`,
                                                backgroundColor: team.color
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Average Price by Role */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">💵 AVERAGE PRICE BY ROLE</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(overview.avgPriceByRole).map(([role, avgPrice]) => (
                            <div 
                                key={role} 
                                className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                                onClick={() => showRolePlayers(role)}
                            >
                                <div className="text-xs font-mono text-[var(--muted)] uppercase mb-2">{role}</div>
                                <div className="text-2xl font-bold font-mono text-[var(--accent)]">
                                    {formatCurrency(avgPrice)}
                                </div>
                                <div className="text-[10px] font-mono text-[var(--muted)] mt-2">👆 Click to view</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Price Range Distribution */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">💰 PRICE RANGE DISTRIBUTION</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Budget Players (< ₹5L)', 0, 500000)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.budget}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Budget</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">&lt; ₹5L</div>
                            <div className="text-[10px] font-mono text-[var(--muted)] mt-2">👆 Click to view</div>
                        </div>
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Mid-Range Players (₹5L - ₹20L)', 500000, 2000000)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.midRange}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Mid-Range</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">₹5L - ₹20L</div>
                            <div className="text-[10px] font-mono text-[var(--muted)] mt-2">👆 Click to view</div>
                        </div>
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Premium Players (₹20L - ₹50L)', 2000000, 5000000)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.premium}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Premium</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">₹20L - ₹50L</div>
                            <div className="text-[10px] font-mono text-[var(--muted)] mt-2">👆 Click to view</div>
                        </div>
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Superstar Players (₹50L+)', 5000000, Infinity)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">{priceRanges.superstar}</div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Superstar</div>
                            <div className="text-[var(--muted)] font-mono text-xs mt-1">₹50L+</div>
                            <div className="text-[10px] font-mono text-[var(--muted)] mt-2">👆 Click to view</div>
                        </div>
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="card p-6 mb-8">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6">🎭 ROLE DISTRIBUTION</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(roleStats).map(([role, data]) => (
                            <div 
                                key={role} 
                                className="card p-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
                                onClick={() => showRolePlayers(role)}
                            >
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
                                <div className="text-[10px] font-mono text-[var(--muted)] mt-3 text-center">👆 Click to view</div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Visual Role Distribution Chart */}
                    <div className="space-y-4">
                        <div className="text-sm font-mono text-[var(--muted)] uppercase mb-2">Sold Players Distribution</div>
                        {Object.entries(roleStats).map(([role, data]) => {
                            const totalSold = Object.values(roleStats).reduce((sum, r) => sum + r.sold, 0);
                            const widthPercent = totalSold > 0 ? (data.sold / totalSold) * 100 : 0;
                            return (
                                <div key={role} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm font-mono">
                                        <span className="text-[var(--foreground)] uppercase">{role}</span>
                                        <span className="text-[var(--accent)] font-bold">{data.sold} ({widthPercent.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full border-3 border-[var(--border)] h-6 relative">
                                        <div
                                            className="h-full bg-[var(--accent)] transition-all duration-500"
                                            style={{ width: `${widthPercent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
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
                            <div 
                                key={team.id} 
                                className="card p-6 cursor-pointer hover:border-[var(--accent)] transition-colors"
                                onClick={() => showTeamPlayers(team.id, team.name)}
                            >
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
                                        <span className="text-[10px] font-mono text-[var(--muted)]">👆 Click to view squad</span>
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
