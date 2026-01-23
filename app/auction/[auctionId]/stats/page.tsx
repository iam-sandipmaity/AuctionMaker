'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
        currency: string;
        budgetDenomination?: string | null;
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
    const [isExporting, setIsExporting] = useState(false);

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
            if (result.success && result.data) {
                // Map the API response to our Player interface
                const mappedPlayers = result.data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role || 'Unknown',
                    soldPrice: p.soldPrice ? Number(p.soldPrice) : null,
                    teamId: p.teamId,
                    teamName: p.team?.name,
                    teamColor: p.team?.color
                }));
                setAllPlayers(mappedPlayers);
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
        if (!stats?.auction) return `${amount}`;
        
        const { currency, budgetDenomination } = stats.auction;
        const formattedNumber = amount.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        
        if (budgetDenomination) {
            return `${formattedNumber} ${budgetDenomination} ${currency}`;
        }
        return `${formattedNumber} ${currency}`;
    };

    const normalizeRole = (role: string) => {
        const normalized = role.toUpperCase().trim();
        // Handle hyphenated role names
        if (normalized === 'ALL-ROUNDER') return 'ALLROUNDER';
        if (normalized === 'WICKET-KEEPER') return 'WICKETKEEPER';
        return normalized;
    };

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

    const showPriceRangePlayers = (title: string, minPercent: number, maxPercent: number) => {
        const filtered = allPlayers.filter(p => {
            if (!p.soldPrice || !p.teamId) return false;
            // Find the team to get their budget
            const team = stats?.teamStats.find(t => t.id === p.teamId);
            if (!team) return false;
            
            // Calculate percentage of team budget
            const percentOfBudget = (p.soldPrice / team.totalBudget) * 100;
            return percentOfBudget >= minPercent && percentOfBudget < maxPercent;
        });
        openModal(title, filtered);
    };

    const exportAsPNG = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById('stats-dashboard');
            if (!element) return;
            
            const canvas = await html2canvas(element, {
                backgroundColor: '#000000',
                scale: 1.5,
                logging: false,
                useCORS: true
            });
            
            const link = document.createElement('a');
            link.download = `auction-stats-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png', 0.8);
            link.click();
        } catch (error) {
            console.error('Error exporting PNG:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const exportAsPDF = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById('stats-dashboard');
            if (!element) return;
            
            // A4 dimensions in mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pageWidth - (2 * margin);
            
            // Capture the full content
            const canvas = await html2canvas(element, {
                backgroundColor: '#000000',
                scale: 1.5,
                logging: false,
                useCORS: true
            });
            
            const imgData = canvas.toDataURL('image/png', 0.7);
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Calculate how many pages we need
            const contentHeight = pageHeight - (2 * margin);
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add first page
            pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= contentHeight;
            
            // Add additional pages if needed
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position + margin, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= contentHeight;
            }
            
            pdf.save(`auction-stats-${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setIsExporting(false);
        }
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
                    <div className="text-gray-300 font-mono mt-2">Please try again later</div>
                </div>
            </div>
        );
    }

    const { overview, teamStats, roleStats, priceRanges, mostExpensivePlayers, teamSpendingComparison, insights } = stats;

    return (
        <div className="min-h-screen bg-[var(--background)] py-8 px-4">
            <div className="max-w-7xl mx-auto" id="stats-dashboard">
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
                                <p className="font-mono text-gray-300">No players found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {modalData.players.map(player => {
                                        // Calculate percentage of team budget
                                        const team = player.teamId ? stats?.teamStats.find(t => t.id === player.teamId) : null;
                                        const budgetPercent = player.soldPrice && team 
                                            ? ((player.soldPrice / team.totalBudget) * 100).toFixed(1)
                                            : null;
                                        
                                        return (
                                            <div key={player.id} className="border-2 border-[var(--border)] p-4">
                                                <div className="font-[var(--font-grotesk)] font-bold text-[var(--foreground)] text-lg mb-1">
                                                    {player.name}
                                                </div>
                                                <div className="font-mono text-gray-400 text-xs mb-2 uppercase">
                                                    {player.role}
                                                </div>
                                                {player.soldPrice ? (
                                                    <>
                                                        <div className="font-mono text-[var(--accent)] font-bold">
                                                            {formatCurrency(player.soldPrice)}
                                                        </div>
                                                        {budgetPercent && (
                                                            <div className="font-mono text-[var(--accent)] text-xs mt-1">
                                                                {budgetPercent}% of team budget
                                                            </div>
                                                        )}
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
                                                    <div className="font-mono text-gray-300 text-sm">
                                                        UNSOLD
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="mb-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                        <Link
                            href={`/auction/${auctionId}`}
                            className="font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-2 uppercase text-sm font-bold hover:translate-x-[-2px] transition-transform"
                        >
                            ← BACK TO AUCTION
                        </Link>
                        <div className="flex gap-3">
                            <button
                                onClick={exportAsPNG}
                                disabled={isExporting}
                                className="card px-4 py-2 font-mono text-xs uppercase font-bold text-[var(--foreground)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? 'EXPORTING...' : 'EXPORT PNG'}
                            </button>
                            <button
                                onClick={exportAsPDF}
                                disabled={isExporting}
                                className="card px-4 py-2 font-mono text-xs uppercase font-bold text-[var(--foreground)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? 'EXPORTING...' : 'EXPORT PDF'}
                            </button>
                        </div>
                    </div>
                    <div className="border-l-8 border-[var(--accent)] pl-6">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-2">
                            {stats.auction.title}
                        </h1>
                        <p className="font-mono text-gray-400 uppercase text-sm tracking-wider">ANALYTICS DASHBOARD</p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="card p-6 hover:border-[var(--accent)] transition-colors">
                        <div className="font-mono text-gray-400 text-xs uppercase mb-3 tracking-wider">Total Players</div>
                        <div className="text-4xl font-bold text-[var(--foreground)] mb-3">{overview.totalPlayers}</div>
                        <div className="flex gap-4 text-sm font-mono">
                            <span className="text-[var(--accent)] font-bold">SOLD: {overview.soldPlayers}</span>
                            <span className="text-gray-300">UNSOLD: {overview.unsoldPlayers}</span>
                        </div>
                    </div>

                    <div className="card p-6 hover:border-[var(--accent)] transition-colors">
                        <div className="font-mono text-gray-400 text-xs uppercase mb-3 tracking-wider">Total Spent</div>
                        <div className="text-3xl font-bold text-[var(--foreground)] mb-3">
                            {formatCurrency(overview.totalMoneySpent)}
                        </div>
                        <div className="text-sm font-mono text-gray-300">
                            AVG: {formatCurrency(overview.averagePlayerPrice)}
                        </div>
                    </div>

                    <div className="card p-6 hover:border-[var(--accent)] transition-colors">
                        <div className="font-mono text-gray-400 text-xs uppercase mb-3 tracking-wider">Auction Progress</div>
                        <div className="text-4xl font-bold text-[var(--foreground)] mb-3">{overview.auctionCompletionPercent}%</div>
                        <div className="text-sm font-mono text-gray-300">{overview.soldPlayers}/{overview.totalPlayers} PLAYERS</div>
                    </div>

                    <div className="card p-6 hover:border-[var(--accent)] transition-colors">
                        <div className="font-mono text-gray-400 text-xs uppercase mb-3 tracking-wider">Budget Remaining</div>
                        <div className="text-3xl font-bold text-[var(--accent)] mb-3">
                            {formatCurrency(overview.totalRemainingBudget)}
                        </div>
                        <div className="text-sm font-mono text-gray-300">OF {formatCurrency(overview.totalBudgetPool)}</div>
                    </div>
                </div>

                {/* Market Analysis */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">MARKET ANALYSIS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card p-4 bg-[#0a0a0a]">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Market Liquidity</div>
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">
                                {((overview.totalRemainingBudget / overview.totalBudgetPool) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs font-mono text-gray-300">Budget Still Available</div>
                        </div>
                        
                        <div className="card p-4 bg-[#0a0a0a]">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Avg Spend Per Team</div>
                            <div className="text-2xl font-bold text-[var(--foreground)]">
                                {formatCurrency(overview.totalMoneySpent / teamStats.length)}
                            </div>
                            <div className="text-xs font-mono text-gray-300">Across {teamStats.length} Teams</div>
                        </div>
                        
                        <div className="card p-4 bg-[#0a0a0a]">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Most Expensive</div>
                            <div className="text-2xl font-bold text-[var(--accent)]">
                                {mostExpensivePlayers[0] ? formatCurrency(mostExpensivePlayers[0].soldPrice) : 'N/A'}
                            </div>
                            <div className="text-xs font-mono text-gray-300">{mostExpensivePlayers[0]?.name || 'None'}</div>
                        </div>
                        
                        <div className="card p-4 bg-[#0a0a0a]">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Competition Level</div>
                            <div className="text-3xl font-bold text-[var(--accent)]">
                                {overview.soldPlayers > 0 ? ((overview.totalMoneySpent / overview.soldPlayers / overview.averagePlayerPrice) * 100).toFixed(0) : '0'}%
                            </div>
                            <div className="text-xs font-mono text-gray-300">Market Activity Index</div>
                        </div>
                    </div>
                </div>

                {/* Key Insights */}
                <div className="card p-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">KEY INSIGHTS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-4">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Highest Spender</div>
                            <div className="text-2xl font-bold font-mono mb-1" style={{ color: insights.highestSpender.color }}>
                                {insights.highestSpender.name}
                            </div>
                            <div className="text-sm font-mono text-[var(--foreground)]">
                                {formatCurrency(insights.highestSpender.spent)}
                            </div>
                            <div className="text-xs font-mono text-gray-300 mt-1">
                                {insights.highestSpender.squadSize} players
                            </div>
                        </div>
                        
                        <div className="card p-4">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Most Balanced Squad</div>
                            <div className="text-2xl font-bold font-mono mb-1" style={{ color: insights.mostBalancedTeam.color }}>
                                {insights.mostBalancedTeam.name}
                            </div>
                            <div className="text-sm font-mono text-[var(--accent)]">
                                Balance Score: {insights.mostBalancedTeam.balanceScore.toFixed(1)}
                            </div>
                            <div className="text-xs font-mono text-gray-300 mt-1">
                                Well-distributed roles
                            </div>
                        </div>
                        
                        <div className="card p-4">
                            <div className="text-xs font-mono text-gray-400 uppercase mb-2">Budget Saver</div>
                            <div className="text-2xl font-bold font-mono mb-1" style={{ color: insights.lowestSpender.color }}>
                                {insights.lowestSpender.name}
                            </div>
                            <div className="text-sm font-mono text-[var(--foreground)]">
                                {formatCurrency(insights.lowestSpender.spent)}
                            </div>
                            <div className="text-xs font-mono text-gray-300 mt-1">
                                {insights.lowestSpender.squadSize} players
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Spending Comparison Chart */}
                <div className="card p-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">TEAM SPENDING COMPARISON</h2>
                    <div className="space-y-4">
                        {teamSpendingComparison.map((team, index) => {
                            const maxSpent = teamSpendingComparison[0].spent;
                            const widthPercent = maxSpent > 0 ? (team.spent / maxSpent) * 100 : 0;
                            return (
                                <div key={team.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm font-mono">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">#{index + 1}</span>
                                            <span className="font-bold" style={{ color: team.color }}>{team.name}</span>
                                            <span className="text-gray-300 text-xs">({team.squadSize} players)</span>
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

                {/* Budget Strategy Analysis */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">BUDGET STRATEGY ANALYSIS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Aggressive Spenders */}
                        <div className="card p-5 bg-[#0a0a0a]">
                            <div className="text-sm font-mono text-gray-400 uppercase mb-3">Aggressive Strategy</div>
                            <div className="space-y-3">
                                {teamSpendingComparison
                                    .filter(t => {
                                        const team = teamStats.find(ts => ts.id === t.id);
                                        return team && team.budgetUtilization > 60;
                                    })
                                    .slice(0, 3)
                                    .map((team) => {
                                        const fullTeam = teamStats.find(ts => ts.id === team.id);
                                        return (
                                            <div key={team.id} className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                                                <span className="font-bold" style={{ color: team.color }}>{team.name}</span>
                                                <span className="text-[var(--accent)] font-mono text-sm">{fullTeam?.budgetUtilization.toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                {teamSpendingComparison.filter(t => {
                                    const team = teamStats.find(ts => ts.id === t.id);
                                    return team && team.budgetUtilization > 60;
                                }).length === 0 && (
                                    <div className="text-gray-300 font-mono text-sm">No aggressive spenders yet</div>
                                )}
                            </div>
                        </div>

                        {/* Balanced Approach */}
                        <div className="card p-5 bg-[#0a0a0a]">
                            <div className="text-sm font-mono text-gray-400 uppercase mb-3">Balanced Strategy</div>
                            <div className="space-y-3">
                                {teamSpendingComparison
                                    .filter(t => {
                                        const team = teamStats.find(ts => ts.id === t.id);
                                        return team && team.budgetUtilization >= 30 && team.budgetUtilization <= 60;
                                    })
                                    .slice(0, 3)
                                    .map((team) => {
                                        const fullTeam = teamStats.find(ts => ts.id === team.id);
                                        return (
                                            <div key={team.id} className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                                                <span className="font-bold" style={{ color: team.color }}>{team.name}</span>
                                                <span className="text-[var(--accent)] font-mono text-sm">{fullTeam?.budgetUtilization.toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                {teamSpendingComparison.filter(t => {
                                    const team = teamStats.find(ts => ts.id === t.id);
                                    return team && team.budgetUtilization >= 30 && team.budgetUtilization <= 60;
                                }).length === 0 && (
                                    <div className="text-gray-300 font-mono text-sm">No balanced strategies yet</div>
                                )}
                            </div>
                        </div>

                        {/* Conservative Savers */}
                        <div className="card p-5 bg-[#0a0a0a]">
                            <div className="text-sm font-mono text-gray-400 uppercase mb-3">Conservative Strategy</div>
                            <div className="space-y-3">
                                {teamSpendingComparison
                                    .filter(t => {
                                        const team = teamStats.find(ts => ts.id === t.id);
                                        return team && team.budgetUtilization < 30;
                                    })
                                    .slice(0, 3)
                                    .map((team) => {
                                        const fullTeam = teamStats.find(ts => ts.id === team.id);
                                        return (
                                            <div key={team.id} className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                                                <span className="font-bold" style={{ color: team.color }}>{team.name}</span>
                                                <span className="text-[var(--accent)] font-mono text-sm">{fullTeam?.budgetUtilization.toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                {teamSpendingComparison.filter(t => {
                                    const team = teamStats.find(ts => ts.id === t.id);
                                    return team && team.budgetUtilization < 30;
                                }).length === 0 && (
                                    <div className="text-gray-300 font-mono text-sm">No conservative savers yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Average Price by Role */}
                <div className="card p-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">AVERAGE PRICE BY ROLE</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(overview.avgPriceByRole).map(([role, avgPrice]) => (
                            <div 
                                key={role} 
                                className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                                onClick={() => showRolePlayers(role)}
                            >
                                <div className="text-xs font-mono text-gray-400 uppercase mb-2">{role}</div>
                                <div className="text-2xl font-bold font-mono text-[var(--accent)]">
                                    {formatCurrency(avgPrice)}
                                </div>
                                <div className="text-[10px] font-mono text-gray-400 mt-2">[ CLICK TO VIEW ]</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Price Range Distribution */}
                <div className="card p-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">PRICE RANGE DISTRIBUTION</h2>
                    <div className="text-sm font-mono text-gray-400 mb-4">Based on % of Team Budget</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Budget Players (< 5% of Budget)', 0, 5)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">
                                {allPlayers.filter(p => {
                                    if (!p.soldPrice || !p.teamId) return false;
                                    const team = teamStats.find(t => t.id === p.teamId);
                                    if (!team) return false;
                                    const percent = (p.soldPrice / team.totalBudget) * 100;
                                    return percent < 5;
                                }).length}
                            </div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Budget</div>
                            <div className="text-gray-300 font-mono text-xs mt-1">&lt; 5% of Budget</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-2">[ CLICK TO VIEW ]</div>
                        </div>
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Mid-Range Players (5% - 10% of Budget)', 5, 10)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">
                                {allPlayers.filter(p => {
                                    if (!p.soldPrice || !p.teamId) return false;
                                    const team = teamStats.find(t => t.id === p.teamId);
                                    if (!team) return false;
                                    const percent = (p.soldPrice / team.totalBudget) * 100;
                                    return percent >= 5 && percent < 10;
                                }).length}
                            </div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Mid-Range</div>
                            <div className="text-gray-300 font-mono text-xs mt-1">5% - 10% of Budget</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-2">[ CLICK TO VIEW ]</div>
                        </div>
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Premium Players (10% - 15% of Budget)', 10, 15)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">
                                {allPlayers.filter(p => {
                                    if (!p.soldPrice || !p.teamId) return false;
                                    const team = teamStats.find(t => t.id === p.teamId);
                                    if (!team) return false;
                                    const percent = (p.soldPrice / team.totalBudget) * 100;
                                    return percent >= 10 && percent < 15;
                                }).length}
                            </div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Premium</div>
                            <div className="text-gray-300 font-mono text-xs mt-1">10% - 15% of Budget</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-2">[ CLICK TO VIEW ]</div>
                        </div>
                        <div 
                            className="card p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                            onClick={() => showPriceRangePlayers('Superstar Players (15%+ of Budget)', 15, Infinity)}
                        >
                            <div className="text-3xl font-bold text-[var(--accent)] mb-2">
                                {allPlayers.filter(p => {
                                    if (!p.soldPrice || !p.teamId) return false;
                                    const team = teamStats.find(t => t.id === p.teamId);
                                    if (!team) return false;
                                    const percent = (p.soldPrice / team.totalBudget) * 100;
                                    return percent >= 15;
                                }).length}
                            </div>
                            <div className="text-[var(--foreground)] font-mono font-bold uppercase text-sm">Superstar</div>
                            <div className="text-gray-300 font-mono text-xs mt-1">15%+ of Budget</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-2">[ CLICK TO VIEW ]</div>
                        </div>
                    </div>
                </div>

                {/* Value Analysis - Best Bargains & Overpaid */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">VALUE ANALYSIS</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Best Value Picks */}
                        <div className="card p-5 bg-[#0a0a0a]">
                            <div className="text-lg font-[var(--font-grotesk)] font-bold text-[var(--accent)] mb-4 uppercase">Best Value Picks</div>
                            <div className="space-y-3">
                                {allPlayers
                                    .filter(p => p.soldPrice && p.teamId)
                                    .map(p => {
                                        const roleAvg = overview.avgPriceByRole[normalizeRole(p.role)] || 0;
                                        const savings = roleAvg - (p.soldPrice || 0);
                                        const savingsPercent = roleAvg > 0 ? (savings / roleAvg) * 100 : 0;
                                        return { ...p, savings, savingsPercent };
                                    })
                                    .filter(p => p.savingsPercent > 10)
                                    .sort((a, b) => b.savingsPercent - a.savingsPercent)
                                    .slice(0, 5)
                                    .map((player) => {
                                        const team = teamStats.find(t => t.id === player.teamId);
                                        return (
                                            <div key={player.id} className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                                <div className="flex-1">
                                                    <div className="text-[var(--foreground)] font-bold text-sm">{player.name}</div>
                                                    <div className="text-xs font-mono text-gray-400 uppercase">{player.role}</div>
                                                    <div className="text-xs font-mono" style={{ color: team?.color || 'var(--foreground)' }}>
                                                        {team?.name}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[var(--accent)] font-bold font-mono text-sm">
                                                        {formatCurrency(player.soldPrice || 0)}
                                                    </div>
                                                    <div className="text-[var(--accent)] font-mono text-xs">
                                                        ↓ {player.savingsPercent.toFixed(0)}% below avg
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {allPlayers.filter(p => p.soldPrice && p.teamId).length === 0 && (
                                    <div className="text-gray-300 font-mono text-sm">No data yet</div>
                                )}
                            </div>
                        </div>

                        {/* Premium Acquisitions */}
                        <div className="card p-5 bg-[#0a0a0a]">
                            <div className="text-lg font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-4 uppercase">Premium Acquisitions</div>
                            <div className="space-y-3">
                                {allPlayers
                                    .filter(p => p.soldPrice && p.teamId)
                                    .map(p => {
                                        const roleAvg = overview.avgPriceByRole[normalizeRole(p.role)] || 0;
                                        const premium = (p.soldPrice || 0) - roleAvg;
                                        const premiumPercent = roleAvg > 0 ? (premium / roleAvg) * 100 : 0;
                                        return { ...p, premium, premiumPercent };
                                    })
                                    .filter(p => p.premiumPercent > 20)
                                    .sort((a, b) => b.premiumPercent - a.premiumPercent)
                                    .slice(0, 5)
                                    .map((player) => {
                                        const team = teamStats.find(t => t.id === player.teamId);
                                        return (
                                            <div key={player.id} className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                                                <div className="flex-1">
                                                    <div className="text-[var(--foreground)] font-bold text-sm">{player.name}</div>
                                                    <div className="text-xs font-mono text-gray-400 uppercase">{player.role}</div>
                                                    <div className="text-xs font-mono" style={{ color: team?.color || 'var(--foreground)' }}>
                                                        {team?.name}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[var(--foreground)] font-bold font-mono text-sm">
                                                        {formatCurrency(player.soldPrice || 0)}
                                                    </div>
                                                    <div className="text-gray-300 font-mono text-xs">
                                                        ↑ {player.premiumPercent.toFixed(0)}% above avg
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {allPlayers.filter(p => p.soldPrice && p.teamId).length === 0 && (
                                    <div className="text-gray-300 font-mono text-sm">No data yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spending Efficiency Matrix */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">SPENDING EFFICIENCY</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-[var(--accent)]">
                                    <th className="text-left py-3 px-4 font-[var(--font-grotesk)] font-bold text-[var(--foreground)] uppercase text-sm">Team</th>
                                    <th className="text-right py-3 px-4 font-mono text-gray-400 uppercase text-xs">Squad Size</th>
                                    <th className="text-right py-3 px-4 font-mono text-gray-400 uppercase text-xs">Cost/Player</th>
                                    <th className="text-right py-3 px-4 font-mono text-gray-400 uppercase text-xs">Budget/Slot</th>
                                    <th className="text-right py-3 px-4 font-mono text-gray-400 uppercase text-xs">Efficiency Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats
                                    .map(team => {
                                        const costPerPlayer = team.squadSize > 0 ? team.moneySpent / team.squadSize : 0;
                                        const budgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : team.remainingBudget;
                                        const efficiencyScore = team.squadSize > 0 && team.moneySpent > 0
                                            ? ((team.squadSize / team.maxAllowed) / (team.moneySpent / team.totalBudget)) * 100
                                            : 0;
                                        return { ...team, costPerPlayer, budgetPerSlot, efficiencyScore };
                                    })
                                    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
                                    .map((team, index) => (
                                        <tr key={team.id} className="border-b border-[var(--border)] hover:bg-[#0a0a0a] transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 font-mono text-xs">#{index + 1}</span>
                                                    <div
                                                        className="w-3 h-3 border-2"
                                                        style={{ backgroundColor: team.color, borderColor: team.color }}
                                                    />
                                                    <span className="font-bold text-[var(--foreground)]">{team.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4 font-mono text-[var(--foreground)]">{team.squadSize}</td>
                                            <td className="text-right py-3 px-4 font-mono text-[var(--foreground)] text-sm">
                                                {team.squadSize > 0 ? formatCurrency(team.costPerPlayer) : 'N/A'}
                                            </td>
                                            <td className="text-right py-3 px-4 font-mono text-[var(--accent)] text-sm">
                                                {team.slotsRemaining > 0 ? formatCurrency(team.budgetPerSlot) : 'Full'}
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="font-mono font-bold text-[var(--accent)]">
                                                        {team.efficiencyScore.toFixed(1)}
                                                    </span>
                                                    <div className="w-16 h-2 border border-[var(--border)] relative">
                                                        <div
                                                            className="h-full bg-[var(--accent)]"
                                                            style={{ width: `${Math.min(team.efficiencyScore, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-xs font-mono text-gray-400 italic">
                        * Efficiency Score = Squad Completion vs Budget Utilization Ratio
                    </div>
                </div>

                {/* Squad Balance Scorecard */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">SQUAD BALANCE SCORECARD</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {teamStats.map(team => {
                            const totalPlayers = team.squadSize;
                            const idealDistribution = {
                                BATSMAN: totalPlayers * 0.35,
                                BOWLER: totalPlayers * 0.35,
                                ALLROUNDER: totalPlayers * 0.20,
                                WICKETKEEPER: totalPlayers * 0.10
                            };
                            
                            const deviations = {
                                BATSMAN: totalPlayers > 0 ? Math.abs(team.roleDistribution.BATSMAN - idealDistribution.BATSMAN) / totalPlayers * 100 : 0,
                                BOWLER: totalPlayers > 0 ? Math.abs(team.roleDistribution.BOWLER - idealDistribution.BOWLER) / totalPlayers * 100 : 0,
                                ALLROUNDER: totalPlayers > 0 ? Math.abs(team.roleDistribution.ALLROUNDER - idealDistribution.ALLROUNDER) / totalPlayers * 100 : 0,
                                WICKETKEEPER: totalPlayers > 0 ? Math.abs(team.roleDistribution.WICKETKEEPER - idealDistribution.WICKETKEEPER) / totalPlayers * 100 : 0
                            };
                            
                            const avgDeviation = totalPlayers > 0 
                                ? (deviations.BATSMAN + deviations.BOWLER + deviations.ALLROUNDER + deviations.WICKETKEEPER) / 4 
                                : 0;
                            const balanceScore = Math.max(0, 100 - avgDeviation);
                            
                            return (
                                <div key={team.id} className="card p-5 bg-[#0a0a0a]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 border-2"
                                                style={{ backgroundColor: team.color, borderColor: team.color }}
                                            />
                                            <span className="text-lg font-[var(--font-grotesk)] font-bold text-[var(--foreground)]">
                                                {team.name}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold font-mono text-[var(--accent)]">
                                                {balanceScore.toFixed(0)}
                                            </div>
                                            <div className="text-xs font-mono text-gray-300">BALANCE</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {Object.entries(team.roleDistribution).map(([role, count]) => {
                                            const percent = totalPlayers > 0 ? (count / totalPlayers) * 100 : 0;
                                            return (
                                                <div key={role} className="space-y-1">
                                                    <div className="flex justify-between text-xs font-mono">
                                                        <span className="text-gray-400 uppercase">{role}</span>
                                                        <span className="text-[var(--foreground)]">{count} ({percent.toFixed(0)}%)</span>
                                                    </div>
                                                    <div className="w-full border border-[var(--border)] h-2 relative">
                                                        <div
                                                            className="h-full bg-[var(--accent)]"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Market Trends */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">MARKET ACQUISITION TRENDS</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {teamStats.map(team => {
                            const teamPlayers = allPlayers.filter(p => p.teamId === team.id && p.soldPrice);
                            const budgetPlayers = teamPlayers.filter(p => {
                                const percent = ((p.soldPrice || 0) / team.totalBudget) * 100;
                                return percent < 5;
                            }).length;
                            const midRangePlayers = teamPlayers.filter(p => {
                                const percent = ((p.soldPrice || 0) / team.totalBudget) * 100;
                                return percent >= 5 && percent < 10;
                            }).length;
                            const premiumPlayers = teamPlayers.filter(p => {
                                const percent = ((p.soldPrice || 0) / team.totalBudget) * 100;
                                return percent >= 10 && percent < 15;
                            }).length;
                            const superstarPlayers = teamPlayers.filter(p => {
                                const percent = ((p.soldPrice || 0) / team.totalBudget) * 100;
                                return percent >= 15;
                            }).length;
                            
                            return (
                                <div key={team.id} className="card p-5 bg-[#0a0a0a]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div
                                            className="w-3 h-3 border-2"
                                            style={{ backgroundColor: team.color, borderColor: team.color }}
                                        />
                                        <span className="font-[var(--font-grotesk)] font-bold text-[var(--foreground)] text-sm">
                                            {team.name}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-400">SUPERSTAR</span>
                                            <span className="text-lg font-bold font-mono text-[var(--accent)]">{superstarPlayers}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-400">PREMIUM</span>
                                            <span className="text-lg font-bold font-mono text-[var(--foreground)]">{premiumPlayers}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-400">MID-RANGE</span>
                                            <span className="text-lg font-bold font-mono text-[var(--foreground)]">{midRangePlayers}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono text-gray-400">BUDGET</span>
                                            <span className="text-lg font-bold font-mono text-gray-300">{budgetPlayers}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                                        <div className="text-xs font-mono text-gray-400 mb-2">STRATEGY</div>
                                        <div className="text-sm font-[var(--font-grotesk)] font-bold text-[var(--accent)]">
                                            {superstarPlayers + premiumPlayers > budgetPlayers + midRangePlayers 
                                                ? 'STAR-HEAVY' 
                                                : budgetPlayers > superstarPlayers + premiumPlayers
                                                ? 'VALUE-FOCUSED'
                                                : 'BALANCED'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Team Spending Behavior Heatmap */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">TEAM SPENDING HEATMAP</h2>
                    <div className="text-sm font-mono text-gray-400 mb-6">Spending Intensity by Role Category</div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                            {/* Header */}
                            <div className="grid grid-cols-5 gap-2 mb-2">
                                <div className="font-mono text-xs text-gray-400 uppercase">Team</div>
                                <div className="font-mono text-xs text-gray-400 uppercase text-center">Batsman</div>
                                <div className="font-mono text-xs text-gray-400 uppercase text-center">Bowler</div>
                                <div className="font-mono text-xs text-gray-400 uppercase text-center">Allrounder</div>
                                <div className="font-mono text-xs text-gray-400 uppercase text-center">Wicketkeeper</div>
                            </div>
                            {/* Team Rows */}
                            {teamStats.map(team => {
                                const teamPlayers = allPlayers.filter(p => p.teamId === team.id && p.soldPrice);
                                const roleSpending = {
                                    BATSMAN: teamPlayers.filter(p => normalizeRole(p.role) === 'BATSMAN').reduce((sum, p) => sum + (p.soldPrice || 0), 0),
                                    BOWLER: teamPlayers.filter(p => normalizeRole(p.role) === 'BOWLER').reduce((sum, p) => sum + (p.soldPrice || 0), 0),
                                    ALLROUNDER: teamPlayers.filter(p => normalizeRole(p.role) === 'ALLROUNDER').reduce((sum, p) => sum + (p.soldPrice || 0), 0),
                                    WICKETKEEPER: teamPlayers.filter(p => normalizeRole(p.role) === 'WICKETKEEPER').reduce((sum, p) => sum + (p.soldPrice || 0), 0)
                                };
                                const maxSpending = Math.max(...Object.values(roleSpending), 1);
                                
                                return (
                                    <div key={team.id} className="grid grid-cols-5 gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border-2" style={{ backgroundColor: team.color, borderColor: team.color }} />
                                            <span className="font-bold text-sm text-[var(--foreground)] truncate">{team.shortName}</span>
                                        </div>
                                        {Object.entries(roleSpending).map(([role, spending]) => {
                                            const intensity = (spending / maxSpending) * 100;
                                            const heatColor = intensity > 75 ? 'bg-[var(--accent)]' 
                                                : intensity > 50 ? 'bg-[var(--accent)] opacity-70'
                                                : intensity > 25 ? 'bg-[var(--accent)] opacity-40'
                                                : 'bg-gray-700';
                                            return (
                                                <div key={role} className="relative h-16 border-2 border-[var(--border)] overflow-hidden group cursor-pointer hover:border-[var(--accent)] transition-colors">
                                                    <div 
                                                        className={`absolute inset-0 ${heatColor} transition-all`}
                                                        style={{ height: `${intensity}%`, bottom: 0, top: 'auto' }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="text-center relative z-10">
                                                            <div className="text-xs font-mono font-bold text-[var(--foreground)]">
                                                                {formatCurrency(spending).split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {intensity.toFixed(0)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs font-mono text-gray-400">
                        <span>INTENSITY:</span>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-4 bg-gray-700 border border-[var(--border)]"></div>
                            <span>LOW</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-4 bg-[var(--accent)] opacity-40 border border-[var(--border)]"></div>
                            <span>MED</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-4 bg-[var(--accent)] border border-[var(--border)]"></div>
                            <span>HIGH</span>
                        </div>
                    </div>
                </div>

                {/* Role-wise Spending Breakdown Chart */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">ROLE-WISE SPENDING BREAKDOWN</h2>
                    <div className="space-y-6">
                        {teamStats.map(team => {
                            const teamPlayers = allPlayers.filter(p => p.teamId === team.id && p.soldPrice);
                            const roleSpending = {
                                BATSMAN: teamPlayers.filter(p => normalizeRole(p.role) === 'BATSMAN').reduce((sum, p) => sum + (p.soldPrice || 0), 0),
                                BOWLER: teamPlayers.filter(p => normalizeRole(p.role) === 'BOWLER').reduce((sum, p) => sum + (p.soldPrice || 0), 0),
                                ALLROUNDER: teamPlayers.filter(p => normalizeRole(p.role) === 'ALLROUNDER').reduce((sum, p) => sum + (p.soldPrice || 0), 0),
                                WICKETKEEPER: teamPlayers.filter(p => normalizeRole(p.role) === 'WICKETKEEPER').reduce((sum, p) => sum + (p.soldPrice || 0), 0)
                            };
                            const totalSpending = Object.values(roleSpending).reduce((a, b) => a + b, 0);
                            
                            return (
                                <div key={team.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2" style={{ backgroundColor: team.color, borderColor: team.color }} />
                                            <span className="font-[var(--font-grotesk)] font-bold text-[var(--foreground)]">{team.name}</span>
                                        </div>
                                        <span className="font-mono text-sm text-[var(--accent)] font-bold">{formatCurrency(totalSpending)}</span>
                                    </div>
                                    <div className="flex h-12 border-3 border-[var(--border)] overflow-hidden">
                                        {Object.entries(roleSpending).map(([role, spending], idx) => {
                                            const percent = totalSpending > 0 ? (spending / totalSpending) * 100 : 0;
                                            const colors = ['#00ff88', '#00cc6a', '#00aa55', '#008844'];
                                            return percent > 0 ? (
                                                <div 
                                                    key={role}
                                                    className="relative group cursor-pointer hover:opacity-80 transition-opacity"
                                                    style={{ 
                                                        width: `${percent}%`, 
                                                        backgroundColor: colors[idx]
                                                    }}
                                                >
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
                                                        <div className="text-xs font-mono font-bold">{role.slice(0, 3)}</div>
                                                        <div className="text-[10px] font-mono">{percent.toFixed(0)}%</div>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity" />
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Budget Utilization Rings */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">BUDGET UTILIZATION RINGS</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {teamStats.map(team => {
                            const utilization = team.budgetUtilization;
                            const circumference = 2 * Math.PI * 45;
                            const strokeDashoffset = circumference - (utilization / 100) * circumference;
                            
                            return (
                                <div key={team.id} className="flex flex-col items-center">
                                    <div className="relative w-32 h-32">
                                        {/* Background circle */}
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="64"
                                                cy="64"
                                                r="45"
                                                stroke="var(--border)"
                                                strokeWidth="8"
                                                fill="none"
                                            />
                                            {/* Progress circle */}
                                            <circle
                                                cx="64"
                                                cy="64"
                                                r="45"
                                                stroke={team.color}
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="square"
                                                className="transition-all duration-1000"
                                            />
                                        </svg>
                                        {/* Center text */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-2xl font-bold font-mono text-[var(--foreground)]">
                                                {utilization.toFixed(0)}%
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-400 uppercase">Used</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-center">
                                        <div className="font-bold text-sm" style={{ color: team.color }}>{team.shortName}</div>
                                        <div className="text-xs font-mono text-gray-400">{team.squadSize} players</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Squad Completion Tracker */}
                <div className="card p-6 mb-10 border-[var(--accent)]">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">SQUAD COMPLETION TRACKER</h2>
                    <div className="space-y-4">
                        {teamStats
                            .sort((a, b) => {
                                const aPercent = (a.squadSize / a.minRequired) * 100;
                                const bPercent = (b.squadSize / b.minRequired) * 100;
                                return bPercent - aPercent;
                            })
                            .map((team) => {
                                const completionPercent = Math.min((team.squadSize / team.minRequired) * 100, 100);
                                const isComplete = team.squadSize >= team.minRequired;
                                return (
                                    <div key={team.id} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm font-mono">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 border-2"
                                                    style={{ 
                                                        backgroundColor: team.color,
                                                        borderColor: team.color 
                                                    }}
                                                />
                                                <span className="font-bold text-[var(--foreground)]">{team.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={isComplete ? "text-[var(--accent)]" : "text-gray-300"}>
                                                    {team.squadSize}/{team.minRequired}
                                                </span>
                                                <span className="text-gray-400 text-xs">
                                                    ({completionPercent.toFixed(0)}%)
                                                </span>
                                                {isComplete && (
                                                    <span className="text-[var(--accent)] font-bold text-xs">✓ COMPLETE</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full border-3 border-[var(--border)] h-6 relative">
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    isComplete ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
                                                }`}
                                                style={{ width: `${completionPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="card p-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">ROLE DISTRIBUTION</h2>
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
                                        <span className="text-gray-400">Total:</span>
                                        <span className="text-[var(--foreground)] font-bold">{data.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Sold:</span>
                                        <span className="text-[var(--accent)] font-bold">{data.sold}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Unsold:</span>
                                        <span className="text-gray-300 font-bold">{data.unsold}</span>
                                    </div>
                                </div>
                                <div className="text-[10px] font-mono text-gray-400 mt-3 text-center">[ CLICK TO VIEW ]</div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Visual Role Distribution Chart */}
                    <div className="space-y-4">
                        <div className="text-sm font-mono text-gray-400 uppercase mb-2">Sold Players Distribution</div>
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
                <div className="card p-6 mb-10">
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">MOST EXPENSIVE PLAYERS</h2>
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
                                        <div className="text-sm font-mono text-gray-400 uppercase">{player.role}</div>
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
                    <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)] mb-6 border-l-4 border-[var(--accent)] pl-4">TEAM-WISE ANALYSIS</h2>
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
                                        <span className="text-[10px] font-mono text-gray-400">[ CLICK TO VIEW SQUAD ]</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono text-gray-400 uppercase">Squad Size</div>
                                        <div className="text-2xl font-bold font-mono text-[var(--foreground)]">
                                            {team.squadSize}/{team.maxAllowed}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="card p-3">
                                        <div className="text-xs font-mono text-gray-400 mb-1 uppercase">Money Spent</div>
                                        <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                            {formatCurrency(team.moneySpent)}
                                        </div>
                                    </div>
                                    <div className="card p-3">
                                        <div className="text-xs font-mono text-gray-400 mb-1 uppercase">Remaining Budget</div>
                                        <div className="text-lg font-bold font-mono text-[var(--accent)]">
                                            {formatCurrency(team.remainingBudget)}
                                        </div>
                                    </div>
                                    <div className="card p-3">
                                        <div className="text-xs font-mono text-gray-400 mb-1 uppercase">Budget Used</div>
                                        <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                            {team.budgetUtilization.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Budget Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm font-mono text-gray-400 mb-2 uppercase">
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
                                        <span className="text-gray-400">Squad Progress</span>
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
                                            <div className="text-xs font-mono text-gray-400 uppercase">Players Needed</div>
                                        </div>
                                    )}
                                    <div className="card p-3 text-center">
                                        <div className="text-2xl font-bold font-mono text-[var(--foreground)]">
                                            {team.slotsRemaining}
                                        </div>
                                        <div className="text-xs font-mono text-gray-400 uppercase">Slots Available</div>
                                    </div>
                                </div>

                                {/* Role Distribution */}
                                <div>
                                    <div className="text-sm font-mono text-gray-400 mb-2 uppercase">Role Distribution</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.BATSMAN}
                                            </div>
                                            <div className="text-xs font-mono text-gray-400 uppercase">BAT</div>
                                        </div>
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.BOWLER}
                                            </div>
                                            <div className="text-xs font-mono text-gray-400 uppercase">BOWL</div>
                                        </div>
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.ALLROUNDER}
                                            </div>
                                            <div className="text-xs font-mono text-gray-400 uppercase">AR</div>
                                        </div>
                                        <div className="card p-2 text-center">
                                            <div className="text-lg font-bold font-mono text-[var(--foreground)]">
                                                {team.roleDistribution.WICKETKEEPER}
                                            </div>
                                            <div className="text-xs font-mono text-gray-400 uppercase">
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
