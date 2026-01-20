import { notFound } from 'next/navigation';
import { getAuctionById } from '@/lib/db/auctions';
import AuctionRoomClient from '@/components/auction/AuctionRoomClient';
import TeamAuctionRoomClient from '@/components/auction/TeamAuctionRoomClient';

export const dynamic = 'force-dynamic';

interface AuctionPageProps {
    params: Promise<{
        auctionId: string;
    }>;
}

export default async function AuctionPage({ params }: AuctionPageProps) {
    const { auctionId } = await params;
    const auction = await getAuctionById(auctionId);

    if (!auction) {
        notFound();
    }

    // Serialize Decimal values to numbers for client component
    const serializedAuction = {
        ...auction,
        auctionType: auction.auctionType || 'PRODUCT' as const,
        startingPrice: parseFloat(auction.startingPrice.toString()),
        currentPrice: parseFloat(auction.currentPrice.toString()),
        minIncrement: parseFloat(auction.minIncrement.toString()),
        teamBudget: auction.teamBudget ? parseFloat(auction.teamBudget.toString()) : undefined,
        minSquadSize: auction.minSquadSize ?? undefined,
        maxSquadSize: auction.maxSquadSize ?? undefined,
        bids: auction.bids.map(bid => ({
            ...bid,
            amount: parseFloat(bid.amount.toString()),
        })),
    };

    // Render different components based on auction type
    if (auction.auctionType === 'TEAM') {
        return <TeamAuctionRoomClient initialAuction={serializedAuction} />;
    }

    return <AuctionRoomClient initialAuction={serializedAuction} />;
}
