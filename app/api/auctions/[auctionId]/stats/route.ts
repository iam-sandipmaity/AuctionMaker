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

        // Get all teams with their players
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
                _count: {
                    select: { players: true },
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

        const totalMoneySpent = soldPlayers.reduce((sum, p) => sum + (p.soldPrice ? Number(p.soldPrice) : 0), 0);
        const averagePlayerPrice = soldPlayers.length > 0 ? totalMoneySpent / soldPlayers.length : 0;

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

            // Role distribution
            const roleDistribution = {
                BATSMAN: team.players.filter(p => p.role === 'BATSMAN').length,
                BOWLER: team.players.filter(p => p.role === 'BOWLER').length,
                ALLROUNDER: team.players.filter(p => p.role === 'ALLROUNDER').length,
                WICKETKEEPER: team.players.filter(p => p.role === 'WICKETKEEPER').length,
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
                players: team.players,
                roleDistribution,
            };
        });

        // Role-wise distribution across auction
        const roleStats = {
            BATSMAN: {
                total: allPlayers.filter(p => p.role === 'BATSMAN').length,
                sold: soldPlayers.filter(p => p.role === 'BATSMAN').length,
                unsold: unsoldPlayers.filter(p => p.role === 'BATSMAN').length,
            },
            BOWLER: {
                total: allPlayers.filter(p => p.role === 'BOWLER').length,
                sold: soldPlayers.filter(p => p.role === 'BOWLER').length,
                unsold: unsoldPlayers.filter(p => p.role === 'BOWLER').length,
            },
            ALLROUNDER: {
                total: allPlayers.filter(p => p.role === 'ALLROUNDER').length,
                sold: soldPlayers.filter(p => p.role === 'ALLROUNDER').length,
                unsold: unsoldPlayers.filter(p => p.role === 'ALLROUNDER').length,
            },
            WICKETKEEPER: {
                total: allPlayers.filter(p => p.role === 'WICKETKEEPER').length,
                sold: soldPlayers.filter(p => p.role === 'WICKETKEEPER').length,
                unsold: unsoldPlayers.filter(p => p.role === 'WICKETKEEPER').length,
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
                },
                teamStats,
                roleStats,
                priceRanges,
                mostExpensivePlayers,
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
