import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
    params: Promise<{
        auctionId: string;
    }>;
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { auctionId } = await params;

        // Verify auction exists and user is the creator
        const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
        });

        if (!auction) {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        if (auction.createdById !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'You can only delete auctions you created' },
                { status: 403 }
            );
        }

        // Delete auction (cascade will handle related records)
        await prisma.auction.delete({
            where: { id: auctionId },
        });

        return NextResponse.json({
            success: true,
            message: 'Auction deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting auction:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete auction' },
            { status: 500 }
        );
    }
}
