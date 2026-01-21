import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { auctionId } = await request.json();

        if (!auctionId) {
            return NextResponse.json(
                { success: false, error: 'Auction ID is required' },
                { status: 400 }
            );
        }

        // Check if auction exists
        const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
        });

        if (!auction) {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        // Don't track views for auction creator
        if (auction.createdById === session.user.id) {
            return NextResponse.json({ success: true, tracked: false });
        }

        // Verify user exists before tracking (prevent FK constraint violation)
        const userExists = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
        });

        if (!userExists) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Create or update auction view
        await prisma.auctionView.upsert({
            where: {
                userId_auctionId: {
                    userId: session.user.id,
                    auctionId: auctionId,
                },
            },
            create: {
                userId: session.user.id,
                auctionId: auctionId,
            },
            update: {
                lastViewedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, tracked: true });
    } catch (error) {
        console.error('Error tracking auction view:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to track view' },
            { status: 500 }
        );
    }
}
