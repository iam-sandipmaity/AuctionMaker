import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ auctionId: string }> }
) {
    try {
        const { auctionId } = await params;

        // Get auction details
        const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
            select: {
                id: true,
                title: true,
                status: true,
                teamBudget: true,
                minSquadSize: true,
                maxSquadSize: true,
            },
        });

        if (!auction) {
            return NextResponse.json(
                { error: 'Auction not found' },
                { status: 404 }
            );
        }

        // Get all teams with their sold players
        const teams = await prisma.team.findMany({
            where: { auctionId },
            include: {
                players: {
                    where: { status: 'SOLD' },
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        soldPrice: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Get all players stats
        const allPlayers = await prisma.player.findMany({
            where: { auctionId },
            select: {
                id: true,
                name: true,
                role: true,
                basePrice: true,
                soldPrice: true,
                status: true,
                teamId: true,
            },
        });

        // Calculate statistics
        const soldPlayers = allPlayers.filter(p => p.status === 'SOLD');
        const unsoldPlayers = allPlayers.filter(p => p.status === 'UNSOLD');
        const availablePlayers = allPlayers.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD');

        // Debug: Log unique roles to see what we have
        const uniqueRoles = [...new Set(allPlayers.map(p => p.role).filter(Boolean))];
        console.log('Unique player roles in auction:', uniqueRoles);
        console.log('Total players:', allPlayers.length, 'Sold:', soldPlayers.length);

        // Helper function for role normalization (case-insensitive comparison)
        const normalizeRole = (role: string | null) => role?.toUpperCase().trim() || '';

        const totalMoneySpent = soldPlayers.reduce((sum, p) => sum + (p.soldPrice ? Number(p.soldPrice) : 0), 0);
        const averagePlayerPrice = soldPlayers.length > 0 ? totalMoneySpent / soldPlayers.length : 0;
        
        // Calculate total budget pool
        const totalBudgetPool = teams.reduce((sum, t) => sum + Number(t.totalBudget), 0);
        const totalRemainingBudget = teams.reduce((sum, t) => sum + Number(t.budget), 0);
        const auctionCompletionPercent = allPlayers.length > 0 ? (soldPlayers.length / allPlayers.length) * 100 : 0;
        
        // Calculate average prices by role
        const avgPriceByRole: { [key: string]: number } = {};
        ['BATSMAN', 'BOWLER', 'ALLROUNDER', 'WICKETKEEPER'].forEach(role => {
            const rolePlayers = soldPlayers.filter(p => {
                const normalized = normalizeRole(p.role);
                return normalized === role || 
                       (role === 'ALLROUNDER' && normalized === 'ALL-ROUNDER') ||
                       (role === 'WICKETKEEPER' && normalized === 'WICKET-KEEPER');
            });
            avgPriceByRole[role] = rolePlayers.length > 0 
                ? rolePlayers.reduce((sum, p) => sum + Number(p.soldPrice || 0), 0) / rolePlayers.length 
                : 0;
        });

        // Team statistics
        const teamStats = teams.map(team => {
            const moneySpent = team.players.reduce((sum, p) => sum + (p.soldPrice ? Number(p.soldPrice) : 0), 0);
            const remainingBudget = Number(team.budget);
            const budgetUtilization = ((Number(team.totalBudget) - remainingBudget) / Number(team.totalBudget)) * 100;
            const squadSize = team.squadSize;
            const minRequired = auction.minSquadSize || 11;
            const maxAllowed = auction.maxSquadSize || 25;
            const playersNeeded = Math.max(0, minRequired - squadSize);
            const slotsRemaining = maxAllowed - squadSize;

            // Role distribution - count sold players by role for this team
            const roleDistribution = {
                BATSMAN: team.players.filter(p => normalizeRole(p.role) === 'BATSMAN').length,
                BOWLER: team.players.filter(p => normalizeRole(p.role) === 'BOWLER').length,
                ALLROUNDER: team.players.filter(p => normalizeRole(p.role) === 'ALLROUNDER' || normalizeRole(p.role) === 'ALL-ROUNDER').length,
                WICKETKEEPER: team.players.filter(p => normalizeRole(p.role) === 'WICKETKEEPER' || normalizeRole(p.role) === 'WICKET-KEEPER').length,
            };

            return {
                id: team.id,
                name: team.name,
                shortName: team.shortName,
                color: team.color,
                squadSize,
                moneySpent,
                remainingBudget,
                totalBudget: Number(team.totalBudget),
                budgetUtilization: Math.round(budgetUtilization * 100) / 100,
                playersNeeded,
                slotsRemaining,
                minRequired,
                maxAllowed,
                roleDistribution,
            };
        });

        // Role-wise distribution across auction (case-insensitive comparison)
        const roleStats = {
            BATSMAN: {
                total: allPlayers.filter(p => normalizeRole(p.role) === 'BATSMAN').length,
                sold: soldPlayers.filter(p => normalizeRole(p.role) === 'BATSMAN').length,
                unsold: unsoldPlayers.filter(p => normalizeRole(p.role) === 'BATSMAN').length,
            },
            BOWLER: {
                total: allPlayers.filter(p => normalizeRole(p.role) === 'BOWLER').length,
                sold: soldPlayers.filter(p => normalizeRole(p.role) === 'BOWLER').length,
                unsold: unsoldPlayers.filter(p => normalizeRole(p.role) === 'BOWLER').length,
            },
            ALLROUNDER: {
                total: allPlayers.filter(p => normalizeRole(p.role) === 'ALLROUNDER' || normalizeRole(p.role) === 'ALL-ROUNDER').length,
                sold: soldPlayers.filter(p => normalizeRole(p.role) === 'ALLROUNDER' || normalizeRole(p.role) === 'ALL-ROUNDER').length,
                unsold: unsoldPlayers.filter(p => normalizeRole(p.role) === 'ALLROUNDER' || normalizeRole(p.role) === 'ALL-ROUNDER').length,
            },
            WICKETKEEPER: {
                total: allPlayers.filter(p => normalizeRole(p.role) === 'WICKETKEEPER' || normalizeRole(p.role) === 'WICKET-KEEPER').length,
                sold: soldPlayers.filter(p => normalizeRole(p.role) === 'WICKETKEEPER' || normalizeRole(p.role) === 'WICKET-KEEPER').length,
                unsold: unsoldPlayers.filter(p => normalizeRole(p.role) === 'WICKETKEEPER' || normalizeRole(p.role) === 'WICKET-KEEPER').length,
            },
        };

        // Price range analysis
        const priceRanges = {
            budget: soldPlayers.filter(p => (p.soldPrice ? Number(p.soldPrice) : 0) < 500000).length,
            midRange: soldPlayers.filter(p => {
                const price = p.soldPrice ? Number(p.soldPrice) : 0;
                return price >= 500000 && price < 2000000;
            }).length,
            premium: soldPlayers.filter(p => {
                const price = p.soldPrice ? Number(p.soldPrice) : 0;
                return price >= 2000000 && price < 5000000;
            }).length,
            superstar: soldPlayers.filter(p => (p.soldPrice ? Number(p.soldPrice) : 0) >= 5000000).length,
        };

        // Most expensive players
        const mostExpensivePlayers = soldPlayers
            .sort((a, b) => (b.soldPrice ? Number(b.soldPrice) : 0) - (a.soldPrice ? Number(a.soldPrice) : 0))
            .slice(0, 10)
            .map(p => {
                const team = teams.find(t => t.id === p.teamId);
                return {
                    name: p.name,
                    role: p.role,
                    soldPrice: p.soldPrice ? Number(p.soldPrice) : 0,
                    teamName: team?.name,
                    teamColor: team?.color,
                };
            });
        
        // Team spending comparison (sorted by spending)
        const teamSpendingComparison = teams
            .map(team => {
                const spent = team.players.reduce((sum, p) => sum + Number(p.soldPrice || 0), 0);
                return {
                    id: team.id,
                    name: team.shortName,
                    color: team.color,
                    spent,
                    squadSize: team.squadSize,
                };
            })
            .sort((a, b) => b.spent - a.spent);
        
        // Highest and lowest spenders
        const highestSpender = teamSpendingComparison[0];
        const lowestSpender = teamSpendingComparison[teamSpendingComparison.length - 1];
        
        // Most balanced team (closest to equal role distribution)
        const mostBalancedTeam = teams
            .map(team => {
                const roles = {
                    BATSMAN: team.players.filter(p => normalizeRole(p.role) === 'BATSMAN').length,
                    BOWLER: team.players.filter(p => normalizeRole(p.role) === 'BOWLER').length,
                    ALLROUNDER: team.players.filter(p => normalizeRole(p.role) === 'ALLROUNDER' || normalizeRole(p.role) === 'ALL-ROUNDER').length,
                    WICKETKEEPER: team.players.filter(p => normalizeRole(p.role) === 'WICKETKEEPER' || normalizeRole(p.role) === 'WICKET-KEEPER').length,
                };
                const values = Object.values(roles);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
                return { name: team.shortName, color: team.color, balanceScore: 100 - Math.sqrt(variance) * 10 };
            })
            .sort((a, b) => b.balanceScore - a.balanceScore)[0];

        return NextResponse.json({
            success: true,
            data: {
                auction: {
                    id: auction.id,
                    title: auction.title,
                    status: auction.status,
                    totalBudget: auction.teamBudget ? Number(auction.teamBudget) : 0,
                },
                overview: {
                    totalPlayers: allPlayers.length,
                    soldPlayers: soldPlayers.length,
                    unsoldPlayers: unsoldPlayers.length,
                    availablePlayers: availablePlayers.length,
                    totalMoneySpent,
                    averagePlayerPrice: Math.round(averagePlayerPrice),
                    totalTeams: teams.length,
                    totalBudgetPool,
                    totalRemainingBudget,
                    auctionCompletionPercent: Math.round(auctionCompletionPercent * 10) / 10,
                    avgPriceByRole,
                },
                teamStats,
                roleStats,
                priceRanges,
                mostExpensivePlayers,
                teamSpendingComparison,
                insights: {
                    highestSpender,
                    lowestSpender,
                    mostBalancedTeam,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching auction stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch auction statistics' },
            { status: 500 }
        );
    }
}
