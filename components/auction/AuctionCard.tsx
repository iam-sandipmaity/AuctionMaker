import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Timer from '@/components/ui/Timer';
import { AuctionWithBids } from '@/types';

interface AuctionCardProps {
    auction: AuctionWithBids;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
    const bidCount = auction._count?.bids || 0;
    const currentPrice = typeof auction.currentPrice === 'object'
        ? parseFloat(auction.currentPrice.toString())
        : auction.currentPrice;

    const statusMap = {
        LIVE: 'live' as const,
        UPCOMING: 'upcoming' as const,
        ENDED: 'ended' as const,
    };

    return (
        <Link href={`/auction/${auction.id}`}>
            <Card className="h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl">{auction.title}</h3>
                    <Badge status={statusMap[auction.status]}>
                        {auction.status}
                    </Badge>
                </div>

                <p className="text-muted font-mono mb-6 flex-grow line-clamp-2">
                    {auction.description}
                </p>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-t-3 border-border pt-4">
                        <span className="font-mono text-sm text-muted">CURRENT BID</span>
                        <span className="font-mono text-2xl font-bold text-accent">
                            ${currentPrice.toFixed(2)}
                        </span>
                    </div>

                    {auction.status === 'LIVE' && (
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-sm text-muted">TIME LEFT</span>
                            <Timer endTime={auction.endTime} />
                        </div>
                    )}

                    <div className="flex justify-between items-center border-t-3 border-border pt-4">
                        <span className="font-mono text-sm text-muted">BIDDERS</span>
                        <span className="font-mono text-lg font-bold">{bidCount}</span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
