import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const createTeamSchema = z.object({
    auctionId: z.string(),
    name: z.string().min(2),
    shortName: z.string().min(2).max(5),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    logo: z.string().url().optional(),
    budget: z.number().positive(),
});

const joinTeamSchema = z.object({
    auctionId: z.string(),
    teamId: z.string(),
});

// Get teams for an auction
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const auctionId = searchParams.get('auctionId');

        if (!auctionId) {
            return NextResponse.json(
                { success: false, error: 'Auction ID is required' },
                { status: 400 }
            );
        }

        const teams = await prisma.team.findMany({
            where: { auctionId },
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                    },
                },
                players: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        soldPrice: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        players: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ success: true, data: teams });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch teams' },
            { status: 500 }
        );
    }
}

// Create a new team
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validatedData = createTeamSchema.parse(body);

        // Verify user is the auction creator
        const auction = await prisma.auction.findUnique({
            where: { id: validatedData.auctionId },
            select: { createdById: true, auctionType: true, teamBudget: true },
        });

        if (!auction) {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        if (auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only auction creator can add teams' },
                { status: 403 }
            );
        }

        if (auction.auctionType !== 'TEAM') {
            return NextResponse.json(
                { success: false, error: 'Can only add teams to team auctions' },
                { status: 400 }
            );
        }

        const budget = new Decimal(validatedData.budget);

        const team = await prisma.team.create({
            data: {
                name: validatedData.name,
                shortName: validatedData.shortName,
                color: validatedData.color,
                logo: validatedData.logo,
                budget: budget,
                totalBudget: budget,
                auctionId: validatedData.auctionId,
            },
        });

        return NextResponse.json(
            { success: true, data: team },
            { status: 201 }
        );
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Team creation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create team' },
            { status: 500 }
        );
    }
}

// Update user's team assignment (user joins a team)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validatedData = joinTeamSchema.parse(body);

        // Verify auction exists and is a team auction
        const auction = await prisma.auction.findUnique({
            where: { id: validatedData.auctionId },
            select: { 
                id: true,
                createdById: true,
                auctionType: true,
                status: true,
            },
        });

        if (!auction) {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        if (auction.auctionType !== 'TEAM') {
            return NextResponse.json(
                { success: false, error: 'Can only join teams in team auctions' },
                { status: 400 }
            );
        }

        // Prevent auction creator from joining as a team
        if (auction.createdById === session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Auction creator cannot join as a team' },
                { status: 403 }
            );
        }

        // Verify user exists in database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found. Please log out and log in again.' },
                { status: 401 }
            );
        }

        // Verify team exists
        const team = await prisma.team.findUnique({
            where: { id: validatedData.teamId },
            include: {
                users: true,
            },
        });

        if (!team) {
            return NextResponse.json(
                { success: false, error: 'Team not found' },
                { status: 404 }
            );
        }

        if (team.auctionId !== validatedData.auctionId) {
            return NextResponse.json(
                { success: false, error: 'Team does not belong to this auction' },
                { status: 400 }
            );
        }

        // Check if team already has a user
        if (team.users.length > 0) {
            return NextResponse.json(
                { success: false, error: 'This team already has a representative' },
                { status: 400 }
            );
        }

        // Update user's team
        await prisma.user.update({
            where: { id: session.user.id },
            data: { teamId: validatedData.teamId },
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Successfully joined team',
            data: { teamId: validatedData.teamId }
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('Team join error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to join team' },
            { status: 500 }
        );
    }
}

// Delete a team
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json(
                { success: false, error: 'Team ID is required' },
                { status: 400 }
            );
        }

        // Verify user is the auction creator
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                auction: {
                    select: { createdById: true, status: true },
                },
                players: true,
            },
        });

        if (!team) {
            return NextResponse.json(
                { success: false, error: 'Team not found' },
                { status: 404 }
            );
        }

        if (team.auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Only auction creator can delete teams' },
                { status: 403 }
            );
        }

        if (team.players.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete team with players' },
                { status: 400 }
            );
        }

        await prisma.team.delete({
            where: { id: teamId },
        });

        return NextResponse.json({ success: true, message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Team deletion error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete team' },
            { status: 500 }
        );
    }
}
